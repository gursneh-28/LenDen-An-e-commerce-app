import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  TextInput, Modal, ScrollView, Animated, Dimensions,
  StatusBar, Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { itemAPI } from "../../services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const CATEGORIES = [
  { key: "all", label: "All", icon: "🏠" },
  { key: "sell", label: "For Sale", icon: "🏷️" },
  { key: "rent", label: "For Rent", icon: "🔑" },
  { key: "electronics", label: "Electronics", icon: "📱" },
  { key: "books", label: "Books", icon: "📚" },
  { key: "clothing", label: "Clothing", icon: "👗" },
  { key: "furniture", label: "Furniture", icon: "🪑" },
  { key: "sports", label: "Sports", icon: "⚽" },
];

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Product Detail Modal ────────────────────────────────────────────────────
function ProductModal({ item, visible, onClose, isWishlisted, onToggleWishlist }) {
  const [imgIndex, setImgIndex] = useState(0);
  if (!item) return null;

  const images = item.images?.length ? item.images : item.image ? [item.image] : [];
  const isRent = item.type === "rent";

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={m.screen}>
        <StatusBar barStyle="light-content" />

        {/* Image carousel */}
        <View style={m.imageContainer}>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              setImgIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
            }}
          >
            {images.map((uri, i) => (
              <Image key={i} source={{ uri }} style={m.image} />
            ))}
          </ScrollView>

          {/* Dots */}
          {images.length > 1 && (
            <View style={m.dots}>
              {images.map((_, i) => (
                <View key={i} style={[m.dot, i === imgIndex && m.dotActive]} />
              ))}
            </View>
          )}

          {/* Close */}
          <TouchableOpacity style={m.closeBtn} onPress={onClose}>
            <Text style={m.closeIcon}>✕</Text>
          </TouchableOpacity>

          {/* Wishlist */}
          <TouchableOpacity style={m.wishBtn} onPress={onToggleWishlist}>
            <Text style={m.wishIcon}>{isWishlisted ? "❤️" : "🤍"}</Text>
          </TouchableOpacity>

          {/* Badge */}
          <View style={m.badge}>
            <Text style={[m.badgeText, isRent ? m.badgeRent : m.badgeSell]}>
              {isRent ? "RENT" : "SELL"}
            </Text>
          </View>
        </View>

        <ScrollView style={m.info} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Price */}
          <Text style={m.price}>₹{item.price?.toLocaleString()}</Text>

          {/* Description */}
          <Text style={m.description}>{item.description}</Text>

          {/* Availability */}
          {isRent && item.availability?.length > 0 && (
            <View style={m.section}>
              <Text style={m.sectionTitle}>📅 Availability</Text>
              {item.availability.map((a, i) => (
                <Text key={i} style={m.availText}>
                  {formatDate(a.start)} → {formatDate(a.end)}
                </Text>
              ))}
            </View>
          )}

          {/* Seller Info */}
          <View style={m.sellerCard}>
            <View style={m.sellerAvatar}>
              <Text style={m.sellerAvatarText}>
                {(item.uploaderName || item.uploadedBy || "?")[0].toUpperCase()}
              </Text>
            </View>
            <View style={m.sellerInfo}>
              <Text style={m.sellerName}>{item.uploaderName || "Seller"}</Text>
              <Text style={m.sellerEmail}>{item.uploadedBy}</Text>
              {item.uploaderPhone && (
                <Text style={m.sellerPhone}>📞 {item.uploaderPhone}</Text>
              )}
            </View>
          </View>

          {item.createdAt && (
            <Text style={m.postedAt}>Posted {timeAgo(item.createdAt)}</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Item Card ───────────────────────────────────────────────────────────────
function ItemCard({ item, onPress, isWishlisted, onToggleWishlist }) {
  const isRent = item.type === "rent";
  const image = item.images?.[0] || item.image;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.92}>
      <View style={s.imageWrap}>
        <Image source={{ uri: image }} style={s.cardImage} />
        <View style={s.badge}>
          <Text style={[s.badgeText, isRent ? s.badgeRent : s.badgeSell]}>
            {isRent ? "RENT" : "SELL"}
          </Text>
        </View>
        <TouchableOpacity style={s.wishBtn} onPress={onToggleWishlist}>
          <Text style={s.wishIcon}>{isWishlisted ? "❤️" : "🤍"}</Text>
        </TouchableOpacity>
        {item.images?.length > 1 && (
          <View style={s.multiImgBadge}>
            <Text style={s.multiImgText}>+{item.images.length - 1}</Text>
          </View>
        )}
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardDescription} numberOfLines={2}>{item.description}</Text>
        <Text style={s.cardPrice}>₹{item.price?.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [wishlist, setWishlist] = useState(new Set());

  // Load wishlist from storage
  const loadWishlist = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("wishlist");
      if (stored) setWishlist(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const saveWishlist = async (newSet) => {
    await AsyncStorage.setItem("wishlist", JSON.stringify([...newSet]));
  };

  const toggleWishlist = (id) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveWishlist(next);
      return next;
    });
  };

  const fetchItems = useCallback(async () => {
    try {
      setError(null);
      const data = await itemAPI.getItems();
      if (data.success) setItems(data.data);
      else setError("Failed to load items.");
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchItems();
    loadWishlist();
  }, [fetchItems, loadWishlist]));

  const onRefresh = () => { setRefreshing(true); fetchItems(); };

  const filtered = items.filter((i) => {
    const matchType = filter === "all" || i.type === filter;
    const matchSearch = !search.trim() ||
      i.description?.toLowerCase().includes(search.toLowerCase()) ||
      i.uploaderName?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  // Render 2-column grid
  const renderItem = ({ item }) => (
    <ItemCard
      item={item}
      onPress={() => setSelectedItem(item)}
      isWishlisted={wishlist.has(item._id)}
      onToggleWishlist={() => toggleWishlist(item._id)}
    />
  );

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>LenDen</Text>
          <Text style={s.headerSub}>{items.length} listings</Text>
        </View>
        <TouchableOpacity style={s.uploadBtn} onPress={() => router.push("/upload")}>
          <Text style={s.uploadBtnText}>+ List</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search items, sellers…"
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={s.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter Horizontal Scroll */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.categories}
        style={s.categoriesScroll}
      >
        {CATEGORIES.map(({ key, label, icon }) => (
          <TouchableOpacity
            key={key}
            style={[s.catPill, filter === key && s.catPillActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={s.catIcon}>{icon}</Text>
            <Text style={[s.catText, filter === key && s.catTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#1a1a1a" />
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchItems}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>📦</Text>
          <Text style={s.emptyText}>No items found</Text>
          <Text style={s.emptySubtext}>
            {search ? "Try a different search" : "Be the first to list something!"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a1a1a" />
          }
        />
      )}

      {/* Product Detail Modal */}
      <ProductModal
        item={selectedItem}
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        isWishlisted={selectedItem ? wishlist.has(selectedItem._id) : false}
        onToggleWishlist={() => selectedItem && toggleWishlist(selectedItem._id)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f7f4" },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 56 : 20, paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#1a1a1a", letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  uploadBtn: {
    backgroundColor: "#1a1a1a", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
  },
  uploadBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Search
  searchRow: { paddingHorizontal: 20, marginBottom: 12 },
  searchBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: "#e5e5e5", gap: 8,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 15, color: "#1a1a1a", padding: 0 },
  clearBtn: { fontSize: 14, color: "#9ca3af", paddingHorizontal: 4 },

  // Categories
  categoriesScroll: { marginBottom: 16 },
  categories: { paddingHorizontal: 20, gap: 8 },
  catPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: "#e9e9e7",
  },
  catPillActive: { backgroundColor: "#1a1a1a" },
  catIcon: { fontSize: 13 },
  catText: { fontWeight: "600", fontSize: 12, color: "#6b7280" },
  catTextActive: { color: "#fff" },

  // Grid
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: { justifyContent: "space-between", marginBottom: 14 },

  // Card
  card: {
    width: CARD_WIDTH, backgroundColor: "#fff", borderRadius: 16,
    overflow: "hidden", shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07,
    shadowRadius: 8, elevation: 3,
  },
  imageWrap: { position: "relative" },
  cardImage: { width: "100%", height: CARD_WIDTH * 1.05, resizeMode: "cover" },
  badge: {
    position: "absolute", top: 8, left: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  badgeRent: { color: "#2563eb" },
  badgeSell: { color: "#16a34a" },
  wishBtn: {
    position: "absolute", top: 6, right: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
    width: 30, height: 30, borderRadius: 15,
    justifyContent: "center", alignItems: "center",
  },
  wishIcon: { fontSize: 14 },
  multiImgBadge: {
    position: "absolute", bottom: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  multiImgText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  cardBody: { padding: 10 },
  cardDescription: { fontSize: 12, color: "#374151", lineHeight: 17, marginBottom: 5 },
  cardPrice: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },

  // States
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { fontSize: 15, color: "#ef4444", fontWeight: "500" },
  retryBtn: { backgroundColor: "#1a1a1a", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: "#fff", fontWeight: "600" },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  emptySubtext: { fontSize: 14, color: "#9ca3af" },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  imageContainer: { position: "relative", height: SCREEN_WIDTH * 1.05 },
  image: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.05, resizeMode: "cover" },
  dots: {
    position: "absolute", bottom: 14, alignSelf: "center",
    flexDirection: "row", gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { backgroundColor: "#fff", width: 18 },
  closeBtn: {
    position: "absolute", top: Platform.OS === "ios" ? 52 : 16, left: 16,
    backgroundColor: "rgba(0,0,0,0.45)", width: 36, height: 36,
    borderRadius: 18, justifyContent: "center", alignItems: "center",
  },
  closeIcon: { color: "#fff", fontSize: 14, fontWeight: "700" },
  wishBtn: {
    position: "absolute", top: Platform.OS === "ios" ? 52 : 16, right: 16,
    backgroundColor: "rgba(255,255,255,0.9)", width: 38, height: 38,
    borderRadius: 19, justifyContent: "center", alignItems: "center",
  },
  wishIcon: { fontSize: 18 },
  badge: {
    position: "absolute", bottom: 14, left: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  badgeRent: { color: "#2563eb" },
  badgeSell: { color: "#16a34a" },

  info: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  price: { fontSize: 28, fontWeight: "800", color: "#1a1a1a", marginBottom: 10 },
  description: { fontSize: 15, color: "#374151", lineHeight: 23, marginBottom: 18 },

  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  availText: { fontSize: 14, color: "#374151", marginBottom: 4 },

  sellerCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#f8f7f4", borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  sellerAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: "#1a1a1a", justifyContent: "center", alignItems: "center",
  },
  sellerAvatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  sellerInfo: { flex: 1 },
  sellerName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 2 },
  sellerEmail: { fontSize: 12, color: "#9ca3af", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  sellerPhone: { fontSize: 13, color: "#374151", marginTop: 4, fontWeight: "500" },

  postedAt: { fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 8 },
});
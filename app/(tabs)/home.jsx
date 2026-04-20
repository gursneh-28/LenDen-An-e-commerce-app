import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  TextInput, ScrollView, Dimensions,
  StatusBar, Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { itemAPI, userAPI } from "../../services/api";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const CATEGORIES = [
  { key: "all",         label: "All",         icon: "🏠" },
  { key: "sell",        label: "For Sale",    icon: "🏷️" },
  { key: "rent",        label: "For Rent",    icon: "🔑" },
  { key: "electronics", label: "Electronics", icon: "📱" },
  { key: "books",       label: "Books",       icon: "📚" },
  { key: "clothing",    label: "Clothing",    icon: "👗" },
  { key: "furniture",   label: "Furniture",   icon: "🪑" },
  { key: "sports",      label: "Sports",      icon: "⚽" },
  { key: "other",       label: "Other",       icon: "📦" },
];

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ✅ FIX: Pure function outside component — no stale closure issues
function applyFilters(list, q, cat) {
  let out = [...list];
  if (cat !== "all") {
    if (cat === "sell" || cat === "rent") {
      out = out.filter((i) => i.type === cat);
    } else {
      out = out.filter(
        (i) => i.category?.toLowerCase() === cat.toLowerCase()
      );
    }
  }
  if (q.trim()) {
    const lower = q.toLowerCase();
    out = out.filter(
      (i) =>
        i.name?.toLowerCase().includes(lower) ||
        i.description?.toLowerCase().includes(lower) ||
        i.uploaderName?.toLowerCase().includes(lower)
    );
  }
  return out;
}

export default function Home() {
  const router = useRouter();

  const [items,          setItems]          = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [search,         setSearch]         = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [wishlist,       setWishlist]       = useState([]);
  const [showWishlist,   setShowWishlist]   = useState(false);
  const [userName,       setUserName]       = useState("");

  // ✅ FIX: Refs to avoid stale closures inside async callbacks
  const searchRef   = useRef("");
  const categoryRef = useRef("all");

  useFocusEffect(
    useCallback(() => {
      setShowWishlist(false);

      AsyncStorage.getItem("user").then((raw) => {
        if (raw) {
          try {
            const u = JSON.parse(raw);
            const name =
              u.username || u.name || u.email?.split("@")[0] || "there";
            setUserName(name.split(" ")[0]);
          } catch {
            setUserName("there");
          }
        }
      });

      fetchItems();
      fetchWishlist();
    }, [])
  );

  const fetchWishlist = async () => {
    try {
      const res = await userAPI.getWishlist();
      if (res.success) {
        // ✅ FIX: Normalize all IDs to strings
        setWishlist((res.data || []).map((id) => String(id)));
      }
    } catch (e) {
      console.log("wishlist fetch error", e);
    }
  };

  const fetchItems = async () => {
    try {
      const data = await itemAPI.getItems();
      const list = Array.isArray(data) ? data : data.data || data.items || [];
      setItems(list);
      // ✅ FIX: Use refs so we always have fresh filter values
      setFiltered(applyFilters(list, searchRef.current, categoryRef.current));
    } catch (e) {
      console.log("fetch error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = (text) => {
    searchRef.current = text;
    setSearch(text);
    setFiltered(applyFilters(items, text, categoryRef.current));
  };

  const handleCategory = (key) => {
    categoryRef.current = key;
    setActiveCategory(key);
    setFiltered(applyFilters(items, searchRef.current, key));
  };

  const toggleWishlist = async (id) => {
    const strId = String(id); // ✅ FIX: always compare as strings
    const isWishlisted = wishlist.includes(strId);

    // Optimistic update
    setWishlist((prev) =>
      isWishlisted ? prev.filter((x) => x !== strId) : [...prev, strId]
    );

    try {
      const res = await userAPI.toggleWishlist(strId);
      if (res.success && res.wishlist) {
        setWishlist(res.wishlist.map((x) => String(x)));
      }
    } catch (e) {
      console.log("wishlist toggle error", e);
      // Rollback on failure
      setWishlist((prev) =>
        isWishlisted ? [...prev, strId] : prev.filter((x) => x !== strId)
      );
    }
  };

  // ✅ FIX: Route to "itemDetail" (camelCase) — matches your actual file app/itemDetail.jsx
  const openItem = (item) => {
    try {
      router.push({
        pathname: "/itemDetail",
        params: { item: JSON.stringify(item) },
      });
    } catch (e) {
      console.log("navigation error", e);
    }
  };

  const wishlistItems = items.filter((i) => wishlist.includes(String(i._id)));
  const displayList   = showWishlist ? wishlistItems : filtered;

  const renderCard = ({ item }) => {
    const wishlisted = wishlist.includes(String(item._id));
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => openItem(item)}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.cardImage}
            onError={(e) => console.log("image load error", e.nativeEvent.error)}
          />
        ) : (
          <View style={[styles.cardImage, styles.noImage]}>
            <Text style={{ fontSize: 32 }}>📦</Text>
          </View>
        )}

        {/* Heart button */}
        <TouchableOpacity
          style={[styles.heartBtn, wishlisted && styles.heartBtnActive]}
          onPress={() => toggleWishlist(item._id)}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons
            name={wishlisted ? "heart" : "heart-outline"}
            size={16}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Sale / Rent badge */}
        <View style={[styles.badge, item.type === "rent" ? styles.badgeRent : styles.badgeSell]}>
          <Text style={styles.badgeText}>
            {item.type === "rent" ? "Rent" : "Sale"}
          </Text>
        </View>

        <View style={styles.cardBody}>
          {!!item.name && (
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          )}
          <Text style={styles.cardPrice}>₹{item.price}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {item.uploaderName} · {timeAgo(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.headerContainer}>
        {/* Greeting row */}
        <View style={styles.greetRow}>
          <View>
            <Text style={styles.greeting}>Hey {userName || "there"} 👋</Text>
            <Text style={styles.subGreeting}>Find something in your org</Text>
          </View>

          {/* Wishlist pill */}
          <TouchableOpacity
            style={[styles.wishlistPill, showWishlist && styles.wishlistPillActive]}
            onPress={() => setShowWishlist((v) => !v)}
            activeOpacity={0.82}
          >
            <Ionicons
              name={showWishlist ? "heart" : "heart-outline"}
              size={17}
              color={showWishlist ? "#fff" : "#e11d48"}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.wishlistPillLabel, showWishlist && styles.wishlistPillLabelActive]}>
              {showWishlist ? "All items" : "Wishlist"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#9ca3af" style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, seller…"
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={handleSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")} style={{ paddingRight: 12 }}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
          keyboardShouldPersistTaps="handled"
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.catPill, active && styles.catPillActive]}
                onPress={() => handleCategory(cat.key)}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[styles.catLabel, active && styles.catLabelActive]}>
                  {cat.label}
                </Text>
                {active && <View style={styles.catUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Wishlist mode header */}
        {showWishlist && (
          <View style={styles.sectionRow}>
            <View style={styles.sectionLeft}>
              <Ionicons name="heart" size={14} color="#e11d48" style={{ marginRight: 5 }} />
              <Text style={styles.sectionTitle}>
                Wishlist · {wishlistItems.length} saved
              </Text>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={displayList}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchItems(); }}
            colors={["#e11d48"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={showWishlist ? "heart-outline" : "cube-outline"}
              size={52}
              color="#e5e7eb"
            />
            <Text style={styles.emptyTitle}>
              {showWishlist ? "Nothing saved yet" : "No items found"}
            </Text>
            <Text style={styles.emptySub}>
              {showWishlist
                ? "Tap ♡ on any listing to save it here"
                : "Be the first to list something!"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f8f8" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerContainer: { backgroundColor: "#fff", paddingBottom: 4 },

  greetRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 14 : 10,
    paddingBottom: 12,
  },
  greeting:    { fontSize: 20, fontWeight: "700", color: "#111" },
  subGreeting: { fontSize: 13, color: "#9ca3af", marginTop: 2 },

  wishlistPill: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: 22, borderWidth: 1.5, borderColor: "#fda4af",
    backgroundColor: "#fff4f5",
    shadowColor: "#e11d48", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
  },
  wishlistPillActive: {
    backgroundColor: "#e11d48", borderColor: "#e11d48",
    shadowOpacity: 0.28,
  },
  wishlistPillLabel:       { fontSize: 13, fontWeight: "700", color: "#e11d48" },
  wishlistPillLabelActive: { color: "#fff" },

  searchRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "#f3f4f6", borderRadius: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111", paddingHorizontal: 8 },

  catScroll:      { paddingHorizontal: 12, paddingBottom: 6, gap: 8 },
  catPill:        { alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, position: "relative" },
  catIcon:        { fontSize: 18, marginBottom: 2 },
  catLabel:       { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  catLabelActive: { color: "#111", fontWeight: "700" },
  catUnderline: {
    position: "absolute", bottom: 0, left: 10, right: 10,
    height: 2.5, backgroundColor: "#f59e0b", borderRadius: 2,
  },

  sectionRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: "#fce7ea",
    backgroundColor: "#fff9fa",
  },
  sectionLeft:  { flexDirection: "row", alignItems: "center" },
  sectionTitle: { fontSize: 13, color: "#e11d48", fontWeight: "700" },

  listContent: { padding: 12, paddingTop: 8 },
  row:         { justifyContent: "space-between", marginBottom: 12 },

  card: {
    width: CARD_WIDTH, backgroundColor: "#fff", borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardImage: { width: "100%", height: CARD_WIDTH * 1.1 },
  noImage:   { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  cardBody:  { padding: 10 },

  cardName:  { fontSize: 13, fontWeight: "700", color: "#111", marginBottom: 2 },
  cardPrice: { fontSize: 14, fontWeight: "700", color: "#e11d48", marginBottom: 2 },
  cardMeta:  { fontSize: 10, color: "#9ca3af" },

  heartBtn: {
    position: "absolute", top: 8, right: 8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.32)",
    alignItems: "center", justifyContent: "center",
  },
  heartBtnActive: {
    backgroundColor: "#e11d48",
    shadowColor: "#e11d48", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 4,
  },

  badge:     { position: "absolute", top: 8, left: 8, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  badgeSell: { backgroundColor: "#6366f1" },
  badgeRent: { backgroundColor: "#f59e0b" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  empty:      { alignItems: "center", paddingTop: 70, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#374151" },
  emptySub:   { fontSize: 13, color: "#9ca3af", textAlign: "center", paddingHorizontal: 40 },
});
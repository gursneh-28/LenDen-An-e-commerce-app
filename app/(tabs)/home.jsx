import React, { useState, useCallback } from "react";
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
  { key: "all", label: "All", icon: "🏠" },
  { key: "sell", label: "For Sale", icon: "🏷️" },
  { key: "rent", label: "For Rent", icon: "🔑" },
  { key: "electronics", label: "Electronics", icon: "📱" },
  { key: "books", label: "Books", icon: "📚" },
  { key: "clothing", label: "Clothing", icon: "👗" },
  { key: "furniture", label: "Furniture", icon: "🪑" },
  { key: "sports", label: "Sports", icon: "⚽" },
  { key: "other", label: "Other", icon: "📦" },
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Home() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [wishlist, setWishlist] = useState([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [userName, setUserName] = useState("");

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("user").then((raw) => {
        if (raw) {
          const u = JSON.parse(raw);
          setUserName(u.name?.split(" ")[0] || "");
        }
      });
      fetchItems();
      fetchWishlist();
    }, [])
  );

  const fetchWishlist = async () => {
    try {
      const res = await userAPI.getWishlist();
      if (res.success) setWishlist(res.data);
    } catch (e) {
      console.log("wishlist fetch error", e);
    }
  };

  // ✅ FIXED fetchItems
  const fetchItems = async () => {
    try {
      const data = await itemAPI.getItems();
      const list = Array.isArray(data) ? data : data.data || data.items || [];
      setItems(list);
      applyFilters(list, search, activeCategory);
    } catch (e) {
      console.log("fetch error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (list, q, cat) => {
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
          i.description?.toLowerCase().includes(lower) ||
          i.uploaderName?.toLowerCase().includes(lower)
      );
    }

    setFiltered(out);
  };

  const handleSearch = (text) => {
    setSearch(text);
    applyFilters(items, text, activeCategory);
  };

  const handleCategory = (key) => {
    setActiveCategory(key);
    applyFilters(items, search, key);
  };

  const toggleWishlist = async (id) => {
    const isWishlisted = wishlist.includes(id);
    setWishlist((prev) =>
      isWishlisted ? prev.filter((x) => x !== id) : [...prev, id]
    );

    try {
      const res = await userAPI.toggleWishlist(id);
      if (res.success) {
        setWishlist(res.wishlist);
      }
    } catch (e) {
      console.log("wishlist toggle error", e);
      // Revert optimism if failed
      setWishlist((prev) =>
        isWishlisted ? [...prev, id] : prev.filter((x) => x !== id)
      );
    }
  };

  const wishlistItems = items.filter((i) => wishlist.includes(i._id));
  const displayList = showWishlist ? wishlistItems : filtered;

  const renderCard = ({ item }) => {
    const wishlisted = wishlist.includes(item._id);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: "/item-detail",
            params: { item: JSON.stringify(item) },
          })
        }
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.noImage]}>
            <Text style={{ fontSize: 32 }}>📦</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => toggleWishlist(item._id)}
        >
          <Ionicons
            name={wishlisted ? "heart" : "heart-outline"}
            size={20}
            color={wishlisted ? "#e11d48" : "#fff"}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.badge,
            item.type === "rent" ? styles.badgeRent : styles.badgeSell,
          ]}
        >
          <Text style={styles.badgeText}>
            {item.type === "rent" ? "Rent" : "Sale"}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardPrice}>₹{item.price}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.cardMeta}>
            {item.uploaderName} · {timeAgo(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ✅ HEADER MOVED OUTSIDE */}
      <View style={styles.headerContainer}>
        <View style={styles.greetRow}>
          <View>
            <Text style={styles.greeting}>Hey {userName || "there"} 👋</Text>
            <Text style={styles.subGreeting}>Find something in your org</Text>
          </View>
          <TouchableOpacity
            style={[styles.wishlistBtn, showWishlist && styles.wishlistBtnActive]}
            onPress={() => setShowWishlist((v) => !v)}
          >
            <Ionicons
              name={showWishlist ? "heart" : "heart-outline"}
              size={22}
              color={showWishlist ? "#fff" : "#e11d48"}
            />
            {wishlist.length > 0 && (
              <View style={styles.badge2}>
                <Text style={styles.badge2Text}>{wishlist.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#9ca3af" style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items, sellers…"
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

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {showWishlist
              ? `❤️ Wishlist (${wishlistItems.length})`
              : `${displayList.length} listings`}
          </Text>
        </View>
      </View>

      <FlatList
        data={displayList}
        keyExtractor={(item) => item._id}
        renderItem={renderCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchItems();
            }}
            colors={["#6366f1"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📦</Text>
            <Text style={styles.emptyTitle}>
              {showWishlist ? "No wishlisted items" : "No items found"}
            </Text>
            <Text style={styles.emptySub}>
              {showWishlist
                ? "Tap ♡ on any listing to save it"
                : "Be the first to list something!"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ✅ YOUR ORIGINAL STYLES (UNCHANGED)
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: "#f8f8f8" },
  center:  { flex: 1, justifyContent: "center", alignItems: "center" },

  headerContainer: { backgroundColor: "#fff", paddingBottom: 8 },
  greetRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 14 : 10, paddingBottom: 10,
  },
  greeting:    { fontSize: 20, fontWeight: "700", color: "#111" },
  subGreeting: { fontSize: 13, color: "#9ca3af", marginTop: 2 },

  wishlistBtn: {
    position: "relative", width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: "#e11d48",
    alignItems: "center", justifyContent: "center", backgroundColor: "#fff",
  },
  wishlistBtnActive: { backgroundColor: "#e11d48", borderColor: "#e11d48" },
  badge2: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: "#e11d48", borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badge2Text: { color: "#fff", fontSize: 10, fontWeight: "700" },

  searchRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "#f3f4f6", borderRadius: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111", paddingHorizontal: 8 },

  catScroll:      { paddingHorizontal: 12, paddingBottom: 4, gap: 8 },
  catPill:        { alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, position: "relative" },
  catIcon:        { fontSize: 18, marginBottom: 2 },
  catLabel:       { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  catLabelActive: { color: "#111", fontWeight: "700" },
  catUnderline: {
    position: "absolute", bottom: 0, left: 10, right: 10,
    height: 2.5, backgroundColor: "#f59e0b", borderRadius: 2,
  },

  sectionRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: "#f3f4f6",
  },
  sectionTitle: { fontSize: 13, color: "#6b7280", fontWeight: "600" },

  listContent: { padding: 12, paddingTop: 0 },
  row:         { justifyContent: "space-between", marginBottom: 12 },

  card: {
    width: CARD_WIDTH, backgroundColor: "#fff", borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  cardImage: { width: "100%", height: CARD_WIDTH * 1.1 },
  noImage:   { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  cardBody:  { padding: 10 },
  cardPrice: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 2 },
  cardDesc:  { fontSize: 12, color: "#6b7280", lineHeight: 16, marginBottom: 4 },
  cardMeta:  { fontSize: 11, color: "#9ca3af" },

  heartBtn: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 14, padding: 4,
  },

  badge:     { position: "absolute", top: 8, left: 8, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeSell: { backgroundColor: "#6366f1" },
  badgeRent: { backgroundColor: "#f59e0b" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  empty:      { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  emptySub:   { fontSize: 13, color: "#9ca3af" },
});
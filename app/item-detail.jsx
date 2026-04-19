import React, { useState, useEffect } from "react";
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, StatusBar, Platform, Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { userAPI, orderAPI } from "../services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const CATEGORY_ICONS = {
  electronics: "📱",
  books:       "📚",
  clothing:    "👗",
  furniture:   "🪑",
  sports:      "⚽",
  other:       "📦",
};

export default function ItemDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse item passed from home/profile
  let item = null;
  try {
    item = JSON.parse(params.item);
  } catch {
    return (
      <View style={s.center}>
        <Text style={{ color: "#6b7280" }}>Item not found.</Text>
      </View>
    );
  }

  const images = item.images?.length ? item.images : item.image ? [item.image] : [];

  const [activeImg,  setActiveImg]  = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [ordering,   setOrdering]   = useState(false);

  // Fetch real wishlist on mount so heart icon is accurate
  useEffect(() => {
    userAPI.getWishlist().then((res) => {
      if (res.success) setWishlisted((res.data || []).includes(item._id));
    }).catch(() => {});
  }, []);

  const handleWishlist = async () => {
    setWishlisted((v) => !v);                          // optimistic
    try {
      const res = await userAPI.toggleWishlist(item._id);
      if (res.success)
        setWishlisted((res.wishlist || []).includes(item._id));  // sync truth
    } catch {
      setWishlisted((v) => !v);                        // revert on error
    }
  };

  const handleOrder = async () => {
    Alert.alert(
      item.type === "rent" ? "Request to Rent" : "Request to Buy",
      `Send a request for "${item.name || "this item"}" to ${item.uploaderName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Request",
          onPress: async () => {
            try {
              setOrdering(true);
              await orderAPI.createOrder({
                itemId: item._id,
                type:   item.type,    // ← "type" not "orderType"
              });
              Alert.alert("Request sent! ✅", "The seller will confirm shortly.");
            } catch (e) {
              Alert.alert("Error", e.message);
            } finally {
              setOrdering(false);
            }
          },
        },
      ]
    );
  };
  
  const categoryIcon = CATEGORY_ICONS[item.category] || "📦";

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Image carousel ── */}
      <View style={s.imageWrap}>
        {images.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImg(idx);
            }}
          >
            {images.map((uri, i) => (
              <Image key={i} source={{ uri }} style={s.heroImage} resizeMode="cover" />
            ))}
          </ScrollView>
        ) : (
          <View style={[s.heroImage, s.noImage]}>
            <Text style={{ fontSize: 52 }}>📦</Text>
          </View>
        )}

        {/* Image dots */}
        {images.length > 1 && (
          <View style={s.dots}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[s.dot, i === activeImg && s.dotActive]}
              />
            ))}
          </View>
        )}

        {/* Back button */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Wishlist button */}
        <TouchableOpacity
          style={[s.wishBtn, wishlisted && s.wishBtnActive]}
          onPress={handleWishlist}
        >
          <Ionicons
            name={wishlisted ? "heart" : "heart-outline"}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Type badge */}
        <View style={[s.typeBadge, item.type === "rent" ? s.badgeRent : s.badgeSell]}>
          <Text style={s.typeBadgeText}>
            {item.type === "rent" ? "🔑 For Rent" : "🏷️ For Sale"}
          </Text>
        </View>
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={s.content}
        contentContainerStyle={s.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Name + price row */}
        <View style={s.titleRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            {!!item.name && (
              <Text style={s.name}>{item.name}</Text>
            )}
            <Text style={s.price}>₹{item.price?.toLocaleString()}</Text>
          </View>
          {/* Category chip */}
          <View style={s.catChip}>
            <Text style={s.catChipIcon}>{categoryIcon}</Text>
            <Text style={s.catChipLabel}>
              {item.category
                ? item.category.charAt(0).toUpperCase() + item.category.slice(1)
                : "Other"}
            </Text>
          </View>
        </View>

        {/* ── Description ── */}
        {!!item.description && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Description</Text>
            <Text style={s.descText}>{item.description}</Text>
          </View>
        )}

        {/* ── Availability (rent only) ── */}
        {item.type === "rent" && item.availability?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Available Dates</Text>
            {item.availability.map((range, i) => (
              <View key={i} style={s.dateRange}>
                <Ionicons name="calendar-outline" size={14} color="#6b7280" style={{ marginRight: 6 }} />
                <Text style={s.dateRangeText}>
                  {formatDate(range.start)} → {formatDate(range.end)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Seller info ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Seller</Text>
          <View style={s.sellerCard}>
            <View style={s.sellerAvatar}>
              <Text style={s.sellerAvatarText}>
                {(item.uploaderName || "?")[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sellerName}>{item.uploaderName || "Unknown"}</Text>
              {!!item.uploaderPhone && (
                <Text style={s.sellerPhone}>{item.uploaderPhone}</Text>
              )}
              <Text style={s.sellerMeta}>Listed {timeAgo(item.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Spacer so content clears the CTA button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── CTA ── */}
      <View style={s.ctaWrap}>
        <View style={s.ctaInner}>
          <View>
            <Text style={s.ctaPrice}>₹{item.price?.toLocaleString()}</Text>
            <Text style={s.ctaLabel}>
              {item.type === "rent" ? "per period" : "one-time"}
            </Text>
          </View>
          <TouchableOpacity
            style={s.ctaBtn}
            onPress={handleOrder}
            disabled={ordering}
          >
            {ordering
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <Text style={s.ctaBtnText}>
                  {item.type === "rent" ? "Request to Rent" : "Request to Buy"}
                </Text>
              )
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const IMAGE_HEIGHT = SCREEN_WIDTH * 1.05;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f7f4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ── Images ──
  imageWrap: { width: SCREEN_WIDTH, height: IMAGE_HEIGHT, backgroundColor: "#e9e9e7" },
  heroImage: { width: SCREEN_WIDTH, height: IMAGE_HEIGHT },
  noImage:   { alignItems: "center", justifyContent: "center" },

  dots: {
    position: "absolute", bottom: 16,
    flexDirection: "row", alignSelf: "center", gap: 6,
  },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { backgroundColor: "#fff", width: 18 },

  backBtn: {
    position: "absolute",
    top: Platform.OS === "android" ? 36 : 52,
    left: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center", justifyContent: "center",
  },
  wishBtn: {
    position: "absolute",
    top: Platform.OS === "android" ? 36 : 52,
    right: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center", justifyContent: "center",
  },
  wishBtnActive: { backgroundColor: "#e11d48" },

  typeBadge: {
    position: "absolute", bottom: 16, left: 16,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  badgeSell:     { backgroundColor: "#6366f1" },
  badgeRent:     { backgroundColor: "#f59e0b" },
  typeBadgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  // ── Content ──
  content:      { flex: 1 },
  contentInner: { padding: 20 },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  name:  { fontSize: 22, fontWeight: "700", color: "#1a1a1a", marginBottom: 4, lineHeight: 28 },
  price: { fontSize: 26, fontWeight: "800", color: "#e11d48" },

  catChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#fff", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: "#e5e5e5",
    alignSelf: "flex-start",
  },
  catChipIcon:  { fontSize: 14 },
  catChipLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280" },

  section: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#f0f0f0",
  },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#9ca3af",
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10,
  },
  descText: { fontSize: 15, color: "#374151", lineHeight: 24 },

  dateRange: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  dateRangeText: { fontSize: 14, color: "#374151", fontWeight: "500" },

  sellerCard:       { flexDirection: "row", alignItems: "center", gap: 12 },
  sellerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#1a1a1a",
    alignItems: "center", justifyContent: "center",
  },
  sellerAvatarText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  sellerName:       { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  sellerPhone:      { fontSize: 13, color: "#6b7280", marginTop: 1 },
  sellerMeta:       { fontSize: 12, color: "#9ca3af", marginTop: 2 },

  // ── CTA bar ──
  ctaWrap: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#f0f0f0",
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    paddingTop: 12, paddingHorizontal: 20,
  },
  ctaInner: { flexDirection: "row", alignItems: "center", gap: 16 },
  ctaPrice: { fontSize: 20, fontWeight: "800", color: "#1a1a1a" },
  ctaLabel: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  ctaBtn: {
    flex: 1, backgroundColor: "#1a1a1a",
    borderRadius: 14, paddingVertical: 15,
    alignItems: "center", justifyContent: "center",
  },
  ctaBtnText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.2 },
});
import React, { useState } from "react";
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getUser, itemRoomId } from "../services/api";

const { width: W } = Dimensions.get("window");

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function ItemDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [imgIndex, setImgIndex] = useState(0);

  // ✅ FIX: Safe JSON parse — prevents crash if params.item is undefined or malformed
  let item = null;
  try {
    if (params.item) {
      item = JSON.parse(params.item);
    }
  } catch (e) {
    console.log("Failed to parse item param:", e);
  }

  if (!item) {
    return (
      <View style={s.centered}>
        <Text style={{ fontSize: 16, color: "#6b7280", marginBottom: 12 }}>
          Item not found.
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = item.images?.length
    ? item.images
    : item.image
    ? [item.image]
    : [];

  const isRent = item.type === "rent";

  const handleChat = async () => {
    try {
      const user = await getUser();
      if (!user) return;

      const roomId = itemRoomId(item._id, user.email, item.uploadedBy);
      const conv = {
        roomId,
        contextType:  "item",
        contextId:    item._id,
        // ✅ FIX: prefer item.name, fallback to description slice
        contextTitle: item.name || item.description?.slice(0, 50) || "Product",
        contextPrice: item.price,
        contextImage: images[0] || null,
        participants: [user.email, item.uploadedBy],
        org:          user.org,
      };
      router.push({
        pathname: "/chat",
        params: { conv: JSON.stringify(conv), myEmail: user.email },
      });
    } catch (e) {
      console.log("handleChat error:", e);
    }
  };

  const handleBuy = () => {
    router.push({
      pathname: "/checkout",
      params: { item: JSON.stringify(item), orderType: isRent ? "rent" : "buy" },
    });
  };

  // ✅ FIX: Safe seller initial — guards against null/undefined
  const sellerInitial =
    (item.uploaderName || item.uploadedBy || "?")[0]?.toUpperCase() || "?";

  return (
    <View style={s.screen}>
      {/* Back button */}
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backBtnText}>←</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image carousel */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setImgIndex(Math.round(e.nativeEvent.contentOffset.x / W))
          }
        >
          {images.length > 0 ? (
            images.map((uri, i) => (
              <Image key={i} source={{ uri }} style={s.image} />
            ))
          ) : (
            <View style={[s.image, s.noImage]}>
              <Text style={s.noImageText}>📦</Text>
            </View>
          )}
        </ScrollView>

        {images.length > 1 && (
          <View style={s.dots}>
            {images.map((_, i) => (
              <View key={i} style={[s.dot, i === imgIndex && s.dotActive]} />
            ))}
          </View>
        )}

        <View style={s.body}>
          {/* Product name — shown at top */}
          {!!item.name && (
            <Text style={s.name}>{item.name}</Text>
          )}

          {/* Price + badge */}
          <View style={s.priceRow}>
            <Text style={s.price}>₹{item.price?.toLocaleString()}</Text>
            <View style={[s.pill, isRent ? s.pillRent : s.pillSell]}>
              <Text style={[s.pillText, isRent ? s.pillTextRent : s.pillTextSell]}>
                {isRent ? "RENT" : "SELL"}
              </Text>
            </View>
          </View>

          {/* Description */}
          {!!item.description && (
            <Text style={s.desc}>{item.description}</Text>
          )}

          {/* Availability */}
          {isRent && item.availability?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Availability</Text>
              {item.availability.map((a, i) => (
                <Text key={i} style={s.availText}>
                  📅 {formatDate(a.start)} → {formatDate(a.end)}
                </Text>
              ))}
            </View>
          )}

          {/* Seller */}
          <View style={s.sellerCard}>
            <View style={s.sellerAvatar}>
              <Text style={s.sellerAvatarText}>{sellerInitial}</Text>
            </View>
            <View style={s.sellerInfo}>
              <Text style={s.sellerName}>{item.uploaderName || "Seller"}</Text>
              <Text style={s.sellerEmail}>{item.uploadedBy}</Text>
              {!!item.uploaderPhone && (
                <Text style={s.sellerPhone}>📞 {item.uploaderPhone}</Text>
              )}
            </View>
          </View>

          {/* Action buttons */}
          <TouchableOpacity style={s.chatBtn} onPress={handleChat}>
            <Text style={s.chatBtnText}>💬  Chat with seller</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.buyBtn} onPress={handleBuy}>
            <Text style={s.buyBtnText}>
              {isRent ? "Book rental  →" : "Buy now  →"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  back:     { color: "#6366f1", fontWeight: "700", fontSize: 16, marginTop: 8 },

  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 16,
    left: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    width: 36, height: 36, borderRadius: 18,
    justifyContent: "center", alignItems: "center",
  },
  backBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },

  image:       { width: W, height: W * 0.85, resizeMode: "cover" },
  noImage:     { backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  noImageText: { fontSize: 48 },

  dots:     { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: -16, marginBottom: 8 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.25)" },
  dotActive:{ width: 18, backgroundColor: "#111" },

  body: { padding: 20 },

  // ✅ NEW: product name style at top of detail
  name: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 10 },

  priceRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  price: { fontSize: 28, fontWeight: "800", color: "#111" },

  pill:         { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  pillSell:     { backgroundColor: "#f0fdf4" },
  pillRent:     { backgroundColor: "#eff6ff" },
  pillText:     { fontSize: 11, fontWeight: "800" },
  pillTextSell: { color: "#16a34a" },
  pillTextRent: { color: "#2563eb" },

  desc: { fontSize: 15, color: "#374151", lineHeight: 24, marginBottom: 20 },

  section:      { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: "700", color: "#9ca3af",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
  },
  availText: { fontSize: 14, color: "#374151", marginBottom: 4 },

  sellerCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#f8f8f8", borderRadius: 16,
    padding: 14, marginBottom: 18,
  },
  sellerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#111", justifyContent: "center", alignItems: "center",
  },
  sellerAvatarText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  sellerInfo:       { flex: 1 },
  sellerName:       { fontSize: 14, fontWeight: "700", color: "#111" },
  sellerEmail:      { fontSize: 12, color: "#9ca3af" },
  sellerPhone:      { fontSize: 13, color: "#374151", marginTop: 3, fontWeight: "500" },

  chatBtn: {
    borderWidth: 1.5, borderColor: "#6366f1", borderRadius: 14,
    paddingVertical: 15, alignItems: "center", marginBottom: 10,
  },
  chatBtnText: { color: "#6366f1", fontWeight: "700", fontSize: 15 },

  buyBtn:     { backgroundColor: "#111", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  buyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { itemAPI } from "../services/api";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function WishCard({ item, onRemove, onView }) {
  const isRent = item.type === "rent";
  const image  = item.images?.[0] || item.image;

  return (
    <TouchableOpacity style={s.card} onPress={onView} activeOpacity={0.9}>
      <View style={s.imageWrap}>
        {image
          ? <Image source={{ uri: image }} style={s.image} />
          : <View style={[s.image, s.imagePlaceholder]} />
        }
        <View style={[s.pill, isRent ? s.pillRent : s.pillSell]}>
          <Text style={[s.pillText, isRent ? s.pillTextRent : s.pillTextSell]}>
            {isRent ? "RENT" : "SELL"}
          </Text>
        </View>
        <TouchableOpacity style={s.heartBtn} onPress={onRemove}>
          <Text style={s.heartIcon}>❤️</Text>
        </TouchableOpacity>
      </View>
      <View style={s.cardBody}>
        <Text style={s.desc} numberOfLines={2}>{item.description}</Text>
        <Text style={s.price}>₹{item.price?.toLocaleString()}</Text>
        {isRent && item.availability?.length > 0 && (
          <Text style={s.avail}>
            📅 {formatDate(item.availability[0].start)} – {formatDate(item.availability[0].end)}
          </Text>
        )}
        <Text style={s.seller} numberOfLines={1}>{item.uploaderName || item.uploadedBy}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function Wishlist() {
  const router = useRouter();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = useCallback(async () => {
    try {
      setLoading(true);
      const [allRes, stored] = await Promise.all([
        itemAPI.getItems(),
        AsyncStorage.getItem("wishlist"),
      ]);
      const ids = new Set(stored ? JSON.parse(stored) : []);
      if (allRes.success) setItems(allRes.data.filter((i) => ids.has(i._id)));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadWishlist(); }, [loadWishlist]));

  const removeItem = async (id) => {
    try {
      const stored = await AsyncStorage.getItem("wishlist");
      const ids    = new Set(stored ? JSON.parse(stored) : []);
      ids.delete(id);
      await AsyncStorage.setItem("wishlist", JSON.stringify([...ids]));
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch {}
  };

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Wishlist</Text>
        <Text style={s.headerCount}>{items.length} items</Text>
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#1a1a1a" /></View>
      ) : items.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>🤍</Text>
          <Text style={s.emptyTitle}>Nothing saved yet</Text>
          <Text style={s.emptySub}>Heart items while browsing to save them here</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => router.push("/home")}>
            <Text style={s.browseBtnText}>Browse listings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <WishCard
              item={item}
              onRemove={() => removeItem(item._id)}
              onView={() => {
                // Navigate to home — in a real app you'd open the product modal directly
                router.push("/home");
              }}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: "#f8f7f4" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 32 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 56 : 20, paddingBottom: 16,
    backgroundColor: "#fff", borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5",
  },
  backBtn:     { width: 60 },
  backBtnText: { fontSize: 14, color: "#1a1a1a", fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  headerCount: { width: 60, textAlign: "right", fontSize: 13, color: "#9ca3af" },

  list: { padding: 16, gap: 14 },

  card:        { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", borderWidth: 0.5, borderColor: "#ebebeb" },
  imageWrap:   { position: "relative" },
  image:       { width: "100%", height: 190, resizeMode: "cover" },
  imagePlaceholder: { backgroundColor: "#e9e9e7" },
  pill: {
    position: "absolute", top: 10, left: 10,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  pillSell:     { },
  pillRent:     { },
  pillText:     { fontSize: 10, fontWeight: "800" },
  pillTextSell: { color: "#16a34a" },
  pillTextRent: { color: "#2563eb" },
  heartBtn: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "rgba(255,255,255,0.9)", width: 34, height: 34,
    borderRadius: 17, justifyContent: "center", alignItems: "center",
  },
  heartIcon: { fontSize: 16 },

  cardBody: { padding: 14, gap: 4 },
  desc:     { fontSize: 14, fontWeight: "600", color: "#1a1a1a", lineHeight: 20 },
  price:    { fontSize: 18, fontWeight: "800", color: "#1a1a1a" },
  avail:    { fontSize: 12, color: "#6b7280" },
  seller:   { fontSize: 12, color: "#9ca3af" },

  emptyIcon:  { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  emptySub:   { fontSize: 14, color: "#9ca3af", textAlign: "center" },
  browseBtn:  { backgroundColor: "#1a1a1a", borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  browseBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
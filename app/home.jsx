import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { itemAPI } from "../services/api";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ItemCard({ item }) {
  const isRent = item.type === "rent";
  return (
    <View style={s.card}>
      <Image source={{ uri: item.image }} style={s.cardImage} />
      <View style={s.badge}>
        <Text style={[s.badgeText, isRent ? s.badgeRent : s.badgeSell]}>
          {isRent ? "RENT" : "SELL"}
        </Text>
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardDescription} numberOfLines={2}>{item.description}</Text>

        {/* Uploader email */}
        <View style={s.uploaderRow}>
          <View style={s.uploaderDot} />
          <Text style={s.uploaderText} numberOfLines={1}>
            {item.uploaderName || item.uploadedBy}
          </Text>
          <Text style={s.uploaderEmail} numberOfLines={1}>{item.uploadedBy}</Text>
        </View>

        <View style={s.cardFooter}>
          <Text style={s.cardPrice}>₹{item.price?.toLocaleString()}</Text>
          {isRent && item.availability?.length > 0 && (
            <View style={s.availRow}>
              <Text style={s.availIcon}>📅</Text>
              <Text style={s.availText}>
                {item.availability.length === 1
                  ? `${formatDate(item.availability[0].start)} – ${formatDate(item.availability[0].end)}`
                  : `${item.availability.length} periods`}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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

  useFocusEffect(useCallback(() => { fetchItems(); }, [fetchItems]));

  const onRefresh = () => { setRefreshing(true); fetchItems(); };
  const filtered = items.filter((i) => filter === "all" || i.type === filter);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <View>
          <Text style={s.headerSub}>{items.length} listings</Text>
        </View>
        <TouchableOpacity style={s.uploadBtn} onPress={() => router.push("/upload")}>
          <Text style={s.uploadBtnText}>+ List</Text>
        </TouchableOpacity>
      </View>

      <View style={s.filters}>
        {[{ key: "all", label: "All" }, { key: "sell", label: "For Sale" }, { key: "rent", label: "For Rent" }].map(({ key, label }) => (
          <TouchableOpacity key={key} style={[s.pill, filter === key && s.pillActive]} onPress={() => setFilter(key)}>
            <Text style={[s.pillText, filter === key && s.pillTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#1a1a1a" /></View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchItems}><Text style={s.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>📦</Text>
          <Text style={s.emptyText}>No items yet</Text>
          <Text style={s.emptySubtext}>Be the first to list something!</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ItemCard item={item} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a1a1a" />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f7f4" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: "700", color: "#1a1a1a", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  uploadBtn: { backgroundColor: "#1a1a1a", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  uploadBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  filters: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#e9e9e7" },
  pillActive: { backgroundColor: "#1a1a1a" },
  pillText: { fontWeight: "600", fontSize: 13, color: "#6b7280" },
  pillTextActive: { color: "#fff" },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 18, marginBottom: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardImage: { width: "100%", height: 190, resizeMode: "cover" },
  badge: { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  badgeRent: { color: "#2563eb" },
  badgeSell: { color: "#16a34a" },
  cardBody: { padding: 14 },
  cardDescription: { fontSize: 15, color: "#1a1a1a", lineHeight: 22, marginBottom: 8 },
  uploaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  uploaderDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#d1d5db" },
  uploaderText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  uploaderEmail: { fontSize: 11, color: "#9ca3af", fontFamily: "monospace" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardPrice: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  availRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  availIcon: { fontSize: 12 },
  availText: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { fontSize: 15, color: "#ef4444", fontWeight: "500" },
  retryBtn: { backgroundColor: "#1a1a1a", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: "#fff", fontWeight: "600" },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  emptySubtext: { fontSize: 14, color: "#9ca3af" },
});
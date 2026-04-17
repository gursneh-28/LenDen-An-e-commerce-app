import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  TextInput, ScrollView, Linking, Platform
} from "react-native";
import { requestAPI } from "../../services/api";
import { Ionicons } from "@expo/vector-icons";

// Time formatter
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 0}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Data Sets
const CATEGORIES = [
  { key: "all", label: "All", icon: "🏠" },
  { key: "carpool", label: "Car Pooling", icon: "🚗" },
  { key: "assignment", label: "Assignments", icon: "📝" },
  { key: "project", label: "Projects", icon: "💻" },
  { key: "item", label: "Borrow Item", icon: "📦" },
  { key: "other", label: "Other", icon: "🤝" },
];

const SORTS = [
  { key: "new", label: "Newest" },
  { key: "old", label: "Oldest" },
  { key: "price_high", label: "Highest Price" },
  { key: "price_low", label: "Lowest Price" },
];

function RequestCard({ item }) {
  const handleContact = () => {
    if (item.requestedBy) {
      Linking.openURL(`mailto:${item.requestedBy}?subject=Regarding your request on LenDen`);
    }
  };

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.8} onPress={handleContact}>
      <View style={s.cardTop}>
        <View style={s.avatarCircle}>
          <Text style={s.avatarText}>
            {(item.requesterName || item.requestedBy || "?")[0].toUpperCase()}
          </Text>
        </View>
        <View style={s.topRight}>
          <Text style={s.requesterName}>{item.requesterName || "Anonymous User"}</Text>
          <Text style={s.requesterEmail}>{item.requestedBy}</Text>
        </View>
        <Text style={s.timeAgo}>{timeAgo(item.createdAt)}</Text>
      </View>

      {item.category && (
        <View style={s.categoryBadge}>
          <Text style={s.categoryBadgeText}>{item.category.toUpperCase()}</Text>
        </View>
      )}

      <Text style={s.workText}>{item.work}</Text>

      <View style={s.cardFooter}>
        <View style={s.budgetBadge}>
          <Text style={s.budgetText}>₹{Number(item.price || 0).toLocaleString()}</Text>
        </View>
        <View style={s.contactBtn}>
          <Ionicons name="mail" size={14} color="#1a1a1a" />
          <Text style={s.contactHint}>Contact</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Help() {
  const [requests, setRequests] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSort, setActiveSort] = useState("new");

  const fetchRequests = async () => {
    try {
      setError(null);
      const data = await requestAPI.getRequests();
      if (data.success) {
        setRequests(data.data);
        applyFilters(data.data, search, activeCategory, activeSort);
      } else {
        setError("Failed to load requests.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const applyFilters = (list, q, cat, sortType) => {
    let out = [...list];

    if (cat !== "all") {
      out = out.filter((r) => (r.category || "other") === cat);
    }

    if (q.trim()) {
      const lower = q.toLowerCase();
      out = out.filter(
        (r) => r.work?.toLowerCase().includes(lower) || r.requesterName?.toLowerCase().includes(lower)
      );
    }

    if (sortType === "new") out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sortType === "old") out.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (sortType === "price_high") out.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (sortType === "price_low") out.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));

    setFiltered(out);
  };

  const handleSearch = (text) => {
    setSearch(text);
    applyFilters(requests, text, activeCategory, activeSort);
  };

  const handleCategory = (key) => {
    setActiveCategory(key);
    applyFilters(requests, search, key, activeSort);
  };

  const handleSort = (key) => {
    setActiveSort(key);
    applyFilters(requests, search, activeCategory, key);
  };

  return (
    <View style={s.screen}>
      <View style={s.headerContainer}>
        <Text style={s.pageTitle}>Campus Help</Text>
        
        {/* Search */}
        <View style={s.searchRow}>
          <Ionicons name="search" size={18} color="#9ca3af" style={{ marginLeft: 12 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search requests, users…"
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")} style={{ paddingRight: 12 }}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[s.catPill, activeCategory === cat.key && s.catPillActive]}
              onPress={() => handleCategory(cat.key)}
            >
              <Text style={s.catIcon}>{cat.icon}</Text>
              <Text style={[s.catLabel, activeCategory === cat.key && s.catLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sorting Dropdown Mock */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortScroll}>
          {SORTS.map((sort) => (
            <TouchableOpacity
              key={sort.key}
              style={[s.sortPill, activeSort === sort.key && s.sortPillActive]}
              onPress={() => handleSort(sort.key)}
            >
              <Text style={[s.sortPillText, activeSort === sort.key && s.sortPillTextActive]}>
                {sort.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>{filtered.length} found</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#1a1a1a" /></View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchRequests}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>🥺</Text>
          <Text style={s.emptyText}>No requests found</Text>
          <Text style={s.emptySubtext}>Try adjusting your filters/search.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <RequestCard item={item} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a1a1a" />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f8f8" },
  headerContainer: { backgroundColor: "#fff", paddingTop: Platform.OS === 'ios' ? 14 : 20, paddingBottom: 8 },
  pageTitle: { fontSize: 24, fontWeight: "800", color: "#111", paddingHorizontal: 16, marginBottom: 12 },
  
  searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 16, backgroundColor: "#f3f4f6", borderRadius: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14, color: "#111", paddingHorizontal: 8 },

  catScroll: { paddingHorizontal: 12, marginBottom: 12, gap: 8 },
  catPill: { alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#f3f4f6" },
  catPillActive: { backgroundColor: "#111", borderColor: "#111" },
  catIcon: { fontSize: 16, marginBottom: 2 },
  catLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  catLabelActive: { color: "#fff" },

  sortScroll: { paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  sortPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f3f4f6" },
  sortPillActive: { backgroundColor: "#eef2ff" },
  sortPillText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  sortPillTextActive: { color: "#4f46e5" },

  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  sectionTitle: { fontSize: 13, color: "#6b7280", fontWeight: "600" },

  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 4 },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1a1a1a", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  topRight: { flex: 1 },
  requesterName: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  requesterEmail: { fontSize: 12, color: "#6b7280" },
  timeAgo: { fontSize: 11, color: "#9ca3af" },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  categoryBadgeText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  workText: { fontSize: 15, fontWeight: "500", color: "#1a1a1a", lineHeight: 22, marginBottom: 16 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12 },
  budgetBadge: { backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  budgetText: { fontSize: 14, fontWeight: "700", color: "#16a34a" },
  contactBtn: { flexDirection: "row", alignItems: "center", backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  contactHint: { fontSize: 12, fontWeight: '600', color: "#1a1a1a" },
  
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, marginTop: 40 },
  errorText: { fontSize: 15, color: "#ef4444", fontWeight: "500" },
  retryBtn: { backgroundColor: "#1a1a1a", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: "#fff", fontWeight: "600" },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  emptySubtext: { fontSize: 14, color: "#9ca3af" },
});
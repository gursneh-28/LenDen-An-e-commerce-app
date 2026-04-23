import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  TextInput, ScrollView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { requestAPI, getUser, requestRoomId, ratingAPI } from "../../services/api";
import { Ionicons } from "@expo/vector-icons";
import RatingModal from "../(userFeature)/RatingModal";

// ── helpers ────────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 0}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── constants ──────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "all",        label: "All",        icon: "🏠" },
  { key: "carpool",    label: "Car Pooling", icon: "🚗" },
  { key: "assignment", label: "Assignments", icon: "📝" },
  { key: "project",    label: "Projects",    icon: "💻" },
  { key: "item",       label: "Borrow Item", icon: "📦" },
  { key: "other",      label: "Other",       icon: "🤝" },
];

const SORTS = [
  { key: "new",        label: "Newest"        },
  { key: "old",        label: "Oldest"        },
  { key: "price_high", label: "Highest Price" },
  { key: "price_low",  label: "Lowest Price"  },
];

// ── RequestCard ────────────────────────────────────────────────────────────────
function RequestCard({ item, onChat, currentUserEmail, onRate, alreadyRated }) {
  const isRequester  = currentUserEmail === item.requestedBy;
  // Only show rate button if resolved + current user is the one who made the request + not yet rated
  const showRateBtn  = item.status === "resolved" && isRequester && !alreadyRated;

  return (
    <View style={s.card}>
      {/* Top row */}
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

      {/* Category badge */}
      {!!item.category && (
        <View style={s.categoryBadge}>
          <Text style={s.categoryBadgeText}>{item.category.toUpperCase()}</Text>
        </View>
      )}

      {/* Request description */}
      <Text style={s.workText}>{item.work}</Text>

      {/* Resolved badge */}
      {item.status === "resolved" && (
        <View style={[s.categoryBadge, { backgroundColor: "#f0fdf4", marginBottom: 8 }]}>
          <Text style={[s.categoryBadgeText, { color: "#15803d" }]}>✓ RESOLVED</Text>
        </View>
      )}

      {/* Footer */}
      <View style={s.cardFooter}>
        <View style={s.budgetBadge}>
          <Text style={s.budgetText}>₹{Number(item.price || 0).toLocaleString()}</Text>
        </View>
        <TouchableOpacity style={s.chatBtn} onPress={onChat} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={14} color="#6366f1" />
          <Text style={s.chatBtnText}>Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Rate button */}
      {showRateBtn && (
        <TouchableOpacity style={s.rateBtn} onPress={() => onRate(item)}>
          <Text style={s.rateBtnText}>⭐ Rate your helper</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function Help() {
  const router = useRouter();

  const [requests,        setRequests]        = useState([]);
  const [filtered,        setFiltered]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [error,           setError]           = useState(null);
  const [search,          setSearch]          = useState("");
  const [activeCategory,  setActiveCategory]  = useState("all");
  const [activeSort,      setActiveSort]      = useState("new");
  const [currentUser,     setCurrentUser]     = useState(null);
  const [ratedRequestIds, setRatedRequestIds] = useState(new Set());
  const [ratingTarget,    setRatingTarget]    = useState(null); // request object to rate

  // ── Filter / sort helper (pure, no setState calls that could loop) ──────────
  const applyFilters = (list, q, cat, sortType) => {
    let out = [...list];

    if (cat !== "all")
      out = out.filter((r) => (r.category || "other") === cat);

    if (q.trim()) {
      const lower = q.toLowerCase();
      out = out.filter(
        (r) =>
          r.work?.toLowerCase().includes(lower) ||
          r.requesterName?.toLowerCase().includes(lower)
      );
    }

    if (sortType === "new")
      out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sortType === "old")
      out.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortType === "price_high")
      out.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    else if (sortType === "price_low")
      out.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));

    setFiltered(out);
  };

  // ── Data fetcher ───────────────────────────────────────────────────────────
  const fetchRequests = async () => {
    try {
      setError(null);

      // Get current user (safely)
      let user = null;
      try { user = await getUser(); } catch (_) {}
      setCurrentUser(user);

      const data = await requestAPI.getRequests();

      if (!data?.success) {
        setError("Failed to load requests.");
        return;
      }

      const list = data.data || [];
      setRequests(list);
      applyFilters(list, search, activeCategory, activeSort);

      // Check rated status only for resolved requests (run in parallel, ignore individual errors)
      const resolvedRequests = list.filter((r) => r.status === "resolved");
      if (resolvedRequests.length > 0 && ratingAPI?.checkRated) {
        const ratedChecks = await Promise.allSettled(
          resolvedRequests.map((r) =>
            ratingAPI.checkRated(r._id, "help").then((res) => ({
              id: r._id,
              rated: !!res?.rated,
            }))
          )
        );
        const ratedSet = new Set(
          ratedChecks
            .filter((r) => r.status === "fulfilled" && r.value?.rated)
            .map((r) => r.value.id)
        );
        setRatedRequestIds(ratedSet);
      }
    } catch (err) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter / sort event handlers ───────────────────────────────────────────
  const handleSearch   = (text) => { setSearch(text);         applyFilters(requests, text,   activeCategory, activeSort); };
  const handleCategory = (key)  => { setActiveCategory(key);  applyFilters(requests, search, key,            activeSort); };
  const handleSort     = (key)  => { setActiveSort(key);      applyFilters(requests, search, activeCategory, key);        };

  // ── Chat handler ───────────────────────────────────────────────────────────
  const handleChat = async (item) => {
    try {
      const user = await getUser();
      if (!user) return;
      if (user.email === item.requestedBy) return; // Can't chat with yourself

      const roomId = requestRoomId(item._id, user.email, item.requestedBy);
      const conv = {
        roomId,
        contextType:  "request",
        contextId:    item._id,
        contextTitle: item.work?.slice(0, 50) || "Help Request",
        contextPrice: item.price,
        contextImage: null,
        participants: [user.email, item.requestedBy],
        org:          user.org,
      };
      router.push({
        pathname: "/chat",
        params: { conv: JSON.stringify(conv), myEmail: user.email },
      });
    } catch (e) {
      console.warn("handleChat error:", e);
    }
  };

  // ── Rating handler ─────────────────────────────────────────────────────────
  const handleRate = (request) => setRatingTarget(request);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      {/* ── Header ── */}
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

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catScroll}
        >
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

        {/* Sort pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.sortScroll}
        >
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

      {/* ── Body ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#1a1a1a" />
        </View>
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
          renderItem={({ item }) => (
            <RequestCard
              item={item}
              onChat={() => handleChat(item)}
              currentUserEmail={currentUser?.email}
              onRate={handleRate}
              alreadyRated={ratedRequestIds.has(item._id)}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRequests(); }}
              tintColor="#1a1a1a"
            />
          }
        />
      )}

      {/* Rating Modal */}
      {!!ratingTarget && (
        <RatingModal
          visible={!!ratingTarget}
          onClose={() => setRatingTarget(null)}
          onSubmitted={() => { setRatingTarget(null); fetchRequests(); }}
          ratedEmail={ratingTarget.requestedBy}
          ratedName={ratingTarget.requesterName}
          contextId={ratingTarget._id}
          contextType="help"
          contextLabel={ratingTarget.work}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: "#f8f8f8" },
  headerContainer: {
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "ios" ? 14 : 20,
    paddingBottom: 8,
  },
  pageTitle: { fontSize: 24, fontWeight: "800", color: "#111", paddingHorizontal: 16, marginBottom: 12 },

  searchRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: "#f3f4f6", borderRadius: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111", paddingHorizontal: 8 },

  catScroll:      { paddingHorizontal: 12, marginBottom: 12, gap: 8 },
  catPill:        { alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#f3f4f6" },
  catPillActive:  { backgroundColor: "#111", borderColor: "#111" },
  catIcon:        { fontSize: 16, marginBottom: 2 },
  catLabel:       { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  catLabelActive: { color: "#fff" },

  sortScroll:          { paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  sortPill:            { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f3f4f6" },
  sortPillActive:      { backgroundColor: "#eef2ff" },
  sortPillText:        { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  sortPillTextActive:  { color: "#4f46e5" },

  sectionRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: "#f3f4f6",
  },
  sectionTitle: { fontSize: 13, color: "#6b7280", fontWeight: "600" },

  list: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },

  cardTop:       { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  avatarCircle:  { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1a1a1a", justifyContent: "center", alignItems: "center" },
  avatarText:    { color: "#fff", fontWeight: "700", fontSize: 16 },
  topRight:      { flex: 1 },
  requesterName: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  requesterEmail:{ fontSize: 12, color: "#6b7280" },
  timeAgo:       { fontSize: 11, color: "#9ca3af" },

  categoryBadge:     { alignSelf: "flex-start", backgroundColor: "#f1f5f9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  categoryBadgeText: { fontSize: 10, fontWeight: "700", color: "#475569" },

  workText:   { fontSize: 15, fontWeight: "500", color: "#1a1a1a", lineHeight: 22, marginBottom: 16 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12 },

  budgetBadge: { backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  budgetText:  { fontSize: 14, fontWeight: "700", color: "#16a34a" },

  chatBtn:     { flexDirection: "row", alignItems: "center", backgroundColor: "#eef2ff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 5 },
  chatBtnText: { fontSize: 13, fontWeight: "700", color: "#6366f1" },

  rateBtn: {
    marginTop: 12,
    backgroundColor: "#fef9ee",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  rateBtnText: { fontSize: 13, fontWeight: "700", color: "#92400e" },

  centered:    { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, marginTop: 40 },
  errorText:   { fontSize: 15, color: "#ef4444", fontWeight: "500" },
  retryBtn:    { backgroundColor: "#1a1a1a", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText:   { color: "#fff", fontWeight: "600" },
  emptyIcon:   { fontSize: 48 },
  emptyText:   { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  emptySubtext:{ fontSize: 14, color: "#9ca3af" },
});
import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { requestAPI } from "../services/api";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function RequestCard({ item }) {
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.avatarCircle}>
          <Text style={s.avatarText}>
            {(item.requesterName || item.requestedBy || "?")[0].toUpperCase()}
          </Text>
        </View>
        <View style={s.topRight}>
          <Text style={s.requesterName}>{item.requesterName || "Anonymous"}</Text>
          <Text style={s.requesterEmail}>{item.requestedBy}</Text>
        </View>
        <Text style={s.timeAgo}>{timeAgo(item.createdAt)}</Text>
      </View>

      <Text style={s.workText}>{item.work}</Text>

      <View style={s.cardFooter}>
        <View style={s.budgetBadge}>
          <Text style={s.budgetText}>₹{Number(item.price)?.toLocaleString()}</Text>
        </View>
        <Text style={s.contactHint}>Contact via email above →</Text>
      </View>
    </View>
  );
}

export default function Help() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    try {
      setError(null);
      const data = await requestAPI.getRequests();
      if (data.success) setRequests(data.data);
      else setError("Failed to load requests.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.headerSub}>{requests.length} requests</Text>
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
      ) : requests.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>🙋</Text>
          <Text style={s.emptyText}>No requests yet</Text>
          <Text style={s.emptySubtext}>Be the first to ask for help!</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
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
  screen: { flex: 1, backgroundColor: "#f8f7f4" },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: "700", color: "#1a1a1a", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#1a1a1a", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  topRight: { flex: 1 },
  requesterName: { fontSize: 13, fontWeight: "700", color: "#1a1a1a" },
  requesterEmail: { fontSize: 11, color: "#6b7280", fontFamily: "monospace" },
  timeAgo: { fontSize: 11, color: "#9ca3af" },
  workText: { fontSize: 15, fontWeight: "600", color: "#1a1a1a", lineHeight: 22, marginBottom: 12 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  budgetBadge: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  budgetText: { fontSize: 12, fontWeight: "600", color: "#16a34a" },
  contactHint: { fontSize: 11, color: "#9ca3af" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { fontSize: 15, color: "#ef4444", fontWeight: "500" },
  retryBtn: { backgroundColor: "#1a1a1a", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: "#fff", fontWeight: "600" },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  emptySubtext: { fontSize: 14, color: "#9ca3af" },
});
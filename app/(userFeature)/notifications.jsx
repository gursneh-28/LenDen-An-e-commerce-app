import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { notificationAPI } from "../../services/api";

// ── Notification type config ───────────────────────────────────────────────────
const TYPE_CONFIG = {
  order:  { icon: "bag-check-outline",       color: "#6366f1", bg: "#eef2ff", label: "Order"  },
  chat:   { icon: "chatbubble-outline",       color: "#0ea5e9", bg: "#e0f2fe", label: "Message"},
  rating: { icon: "star-outline",             color: "#f59e0b", bg: "#fef9ee", label: "Rating" },
  help:   { icon: "hand-left-outline",        color: "#10b981", bg: "#ecfdf5", label: "Help"   },
  system: { icon: "information-circle-outline",color: "#6b7280", bg: "#f3f4f6", label: "Info"  },
};

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Single notification card ───────────────────────────────────────────────────
function NotifCard({ item, onPress, onDelete }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.system;

  return (
    <TouchableOpacity
      style={[s.card, !item.read && s.cardUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.82}
    >
      {/* Unread dot */}
      {!item.read && <View style={s.unreadDot} />}

      {/* Icon */}
      <View style={[s.iconBox, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>

      {/* Content */}
      <View style={s.cardContent}>
        <View style={s.cardTop}>
          <View style={[s.typePill, { backgroundColor: cfg.bg }]}>
            <Text style={[s.typePillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={s.timeText}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={[s.cardTitle, !item.read && s.cardTitleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={s.cardBody} numberOfLines={2}>{item.body}</Text>
      </View>

      {/* Delete */}
      <TouchableOpacity
        style={s.deleteBtn}
        onPress={() => onDelete(item._id)}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="close" size={14} color="#d1d5db" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={s.empty}>
      <View style={s.emptyIconBox}>
        <Ionicons name="notifications-off-outline" size={40} color="#d1d5db" />
      </View>
      <Text style={s.emptyTitle}>All caught up!</Text>
      <Text style={s.emptySub}>New orders, messages and ratings{"\n"}will appear here.</Text>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function Notifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [refreshing,     setRefreshing]    = useState(false);

  const load = async () => {
    try {
      const res = await notificationAPI.getAll();
      if (res?.success) setNotifications(res.data || []);
    } catch (e) {
      console.warn("notifications load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handlePress = async (notif) => {
    // Mark as read
    if (!notif.read) {
      try { await notificationAPI.markRead(notif._id); } catch (_) {}
      setNotifications((prev) =>
        prev.map((n) => n._id === notif._id ? { ...n, read: true } : n)
      );
    }
    // Navigate based on type
    if (notif.type === "chat" && notif.meta?.roomId) {
      router.push("/inbox");
    } else if (notif.type === "order") {
      router.push("/(users)/profile");
    } else if (notif.type === "help") {
      router.push("/(users)/help");
    }
  };

  const handleDelete = async (id) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    try { await notificationAPI.delete(id); } catch (_) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      Alert.alert("Error", "Could not mark all as read.");
    }
  };

  const handleClearAll = () => {
    Alert.alert("Clear all", "Remove all notifications?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear", style: "destructive",
        onPress: async () => {
          const ids = notifications.map((n) => n._id);
          setNotifications([]);
          await Promise.allSettled(ids.map((id) => notificationAPI.delete(id)));
        },
      },
    ]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} style={s.clearBtn}>
            <Text style={s.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      {/* Mark all read bar */}
      {unreadCount > 0 && (
        <TouchableOpacity style={s.markAllBar} onPress={handleMarkAllRead}>
          <Ionicons name="checkmark-done-outline" size={15} color="#6366f1" />
          <Text style={s.markAllText}>Mark all as read ({unreadCount})</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1a1a1a" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id?.toString()}
          renderItem={({ item }) => (
            <NotifCard item={item} onPress={handlePress} onDelete={handleDelete} />
          )}
          contentContainerStyle={[s.list, notifications.length === 0 && { flex: 1 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#1a1a1a"
            />
          }
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f7f4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5",
  },
  backBtn:       { width: 36, height: 36, justifyContent: "center" },
  headerCenter:  { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle:   { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  headerBadge:   { backgroundColor: "#e11d48", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  headerBadgeText:{ fontSize: 11, fontWeight: "800", color: "#fff" },
  clearBtn:      { paddingHorizontal: 12, paddingVertical: 6 },
  clearBtnText:  { fontSize: 13, fontWeight: "600", color: "#ef4444" },

  markAllBar: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#eef2ff", paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: "#e0e7ff",
  },
  markAllText: { fontSize: 13, fontWeight: "600", color: "#6366f1" },

  list: { paddingVertical: 8, paddingHorizontal: 16 },
  separator: { height: 6 },

  card: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#fff", borderRadius: 14,
    padding: 14, gap: 12,
    borderWidth: 0.5, borderColor: "#e5e5e5",
    position: "relative",
  },
  cardUnread: {
    backgroundColor: "#fefefe",
    borderColor: "#e0e7ff",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  unreadDot: {
    position: "absolute", top: 14, left: 6,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#6366f1",
  },

  iconBox: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
    flexShrink: 0,
  },

  cardContent: { flex: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },

  typePill:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typePillText: { fontSize: 10, fontWeight: "700" },
  timeText:     { fontSize: 11, color: "#9ca3af" },

  cardTitle:       { fontSize: 14, fontWeight: "600", color: "#6b7280", marginBottom: 2 },
  cardTitleUnread: { color: "#1a1a1a", fontWeight: "700" },
  cardBody:        { fontSize: 13, color: "#6b7280", lineHeight: 18 },

  deleteBtn: { padding: 2, marginTop: 2 },

  empty:       { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyIconBox:{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center", marginBottom: 4 },
  emptyTitle:  { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptySub:    { fontSize: 14, color: "#9ca3af", textAlign: "center", lineHeight: 22 },
});

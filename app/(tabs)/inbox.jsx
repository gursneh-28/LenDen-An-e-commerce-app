import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { chatAPI, getUser } from "../../services/api";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function ConvItem({ conv, myEmail, onPress }) {
  const isItem    = conv.contextType === "item";
  const otherEmail = conv.participants.find((p) => p !== myEmail) || "";
  const otherName  = otherEmail.split("@")[0];

  return (
    <TouchableOpacity style={s.convRow} onPress={onPress} activeOpacity={0.82}>
      <View style={[s.avatar, isItem ? s.avatarItem : s.avatarReq]}>
        <Text style={s.avatarText}>{otherName[0]?.toUpperCase() || "?"}</Text>
      </View>
      <View style={s.convBody}>
        <View style={s.convTop}>
          <Text style={s.convName} numberOfLines={1}>{otherName}</Text>
          <Text style={s.convTime}>{timeAgo(conv.lastMessageAt)}</Text>
        </View>
        <Text style={[s.convContext, isItem ? s.ctxItem : s.ctxReq]} numberOfLines={1}>
          {isItem ? "📦 " : "🤝 "}{conv.contextTitle}
        </Text>
        <Text style={s.convPreview} numberOfLines={1}>{conv.lastMessage}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function Inbox() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [myEmail, setMyEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [user, res] = await Promise.all([getUser(), chatAPI.getConversations()]);
      setMyEmail(user?.email || "");
      if (res.success) setConversations(res.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const itemConvs    = conversations.filter((c) => c.contextType === "item");
  const requestConvs = conversations.filter((c) => c.contextType === "request");

  const openChat = (conv) => {
    router.push({
      pathname: "/chat",
      params: { conv: JSON.stringify(conv), myEmail },
    });
  };

  if (loading) return <View style={s.centered}><ActivityIndicator color="#111" /></View>;

  if (conversations.length === 0) {
    return (
      <View style={s.centered}>
        <Text style={s.emptyIcon}>💬</Text>
        <Text style={s.emptyTitle}>No messages yet</Text>
        <Text style={s.emptySub}>Start a chat from any product or help request</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Messages</Text>
        <Text style={s.headerSub}>{conversations.length} conversations</Text>
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => ""}
        renderItem={null}
        ListHeaderComponent={
          <>
            {itemConvs.length > 0 && (
              <>
                <View style={s.divider}><Text style={s.dividerText}>Products</Text></View>
                {itemConvs.map((conv) => (
                  <ConvItem key={conv.roomId} conv={conv} myEmail={myEmail} onPress={() => openChat(conv)} />
                ))}
              </>
            )}
            {requestConvs.length > 0 && (
              <>
                <View style={s.divider}><Text style={s.dividerText}>Help Requests</Text></View>
                {requestConvs.map((conv) => (
                  <ConvItem key={conv.roomId} conv={conv} myEmail={myEmail} onPress={() => openChat(conv)} />
                ))}
              </>
            )}
          </>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 32 },

  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111" },
  headerSub:   { fontSize: 12, color: "#9ca3af", marginTop: 2 },

  divider:     { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#f8f8f8" },
  dividerText: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },

  convRow:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6", gap: 12 },
  avatar:    { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  avatarItem:{ backgroundColor: "#6366f1" },
  avatarReq: { backgroundColor: "#f59e0b" },
  avatarText:{ fontSize: 17, fontWeight: "700", color: "#fff" },

  convBody:    { flex: 1, minWidth: 0 },
  convTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  convName:    { fontSize: 14, fontWeight: "700", color: "#111", flex: 1 },
  convTime:    { fontSize: 11, color: "#9ca3af", marginLeft: 6 },
  convContext: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
  ctxItem:     { color: "#6366f1" },
  ctxReq:      { color: "#d97706" },
  convPreview: { fontSize: 12, color: "#6b7280" },

  emptyIcon:  { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  emptySub:   { fontSize: 13, color: "#9ca3af", textAlign: "center" },
});
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { io }        from "socket.io-client";
import AsyncStorage  from "@react-native-async-storage/async-storage";
import { chatAPI, SOCKET_URL } from "../services/api";

function timeStr(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function Chat() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const conv   = params.conv   ? JSON.parse(params.conv)   : null;
  const myEmail = params.myEmail || "";

  const [messages,  setMessages]  = useState([]);
  const [text,      setText]      = useState("");
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const socketRef = useRef(null);
  const listRef   = useRef(null);

  const isItem   = conv?.contextType === "item";
  const roomId   = conv?.roomId;
  const otherEmail = conv?.participants?.find((p) => p !== myEmail) || "";
  const otherName  = otherEmail.split("@")[0];

  // ── Load history + connect socket ──
  useEffect(() => {
    if (!roomId) return;

    // 1. Fetch existing messages from REST
    chatAPI.getMessages(roomId).then((res) => {
      if (res.success) setMessages(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));

    // 2. Connect Socket.io
    const connectSocket = async () => {
      const token = await AsyncStorage.getItem("token");
      const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join_room", roomId);
      });

      socket.on("new_message", (msg) => {
        setMessages((prev) => {
          // Avoid duplicates (optimistic update already added it)
          if (prev.some((m) => m._id?.toString() === msg._id?.toString())) return prev;
          return [...prev, msg];
        });
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      });

      socket.on("connect_error", (err) => console.log("Socket error:", err.message));
    };

    connectSocket();

    return () => {
      socketRef.current?.emit("leave_room", roomId);
      socketRef.current?.disconnect();
    };
  }, [roomId]);

  // ── Send message ──
  const sendMessage = useCallback(() => {
    if (!text.trim() || !socketRef.current) return;

    const payload = {
      roomId,
      text:           text.trim(),
      recipientEmail: otherEmail,
      recipientName:  otherName,
      contextType:    conv.contextType,
      contextId:      conv.contextId,
      contextTitle:   conv.contextTitle,
      contextPrice:   conv.contextPrice,
      contextImage:   conv.contextImage,
      org:            conv.org,
    };

    // Optimistic update
    const optimistic = {
      _id:         `opt_${Date.now()}`,
      roomId,
      senderEmail: myEmail,
      text:        text.trim(),
      createdAt:   new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

    socketRef.current.emit("send_message", payload);
  }, [text, roomId, otherEmail, conv, myEmail]);

  const renderMessage = ({ item }) => {
    const isMine = item.senderEmail === myEmail;
    return (
      <View style={[s.bubbleWrap, isMine ? s.bubbleMineWrap : s.bubbleTheirsWrap]}>
        <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
          <Text style={[s.bubbleText, isMine ? s.bubbleTextMine : s.bubbleTextTheirs]}>
            {item.text}
          </Text>
        </View>
        <Text style={[s.bubbleTime, isMine ? s.timeRight : s.timeLeft]}>
          {timeStr(item.createdAt)}
        </Text>
      </View>
    );
  };

  if (!conv) return <View style={s.centered}><Text>No conversation data.</Text></View>;

  const contextBg    = isItem ? "#eff6ff" : "#fef9ee";
  const contextBorder = isItem ? "#dbeafe" : "#fde68a";
  const contextColor  = isItem ? "#1d4ed8" : "#92400e";
  const contextSub    = isItem ? "#3b82f6" : "#b45309";

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={[s.headerAvatar, isItem ? s.avItem : s.avReq]}>
          <Text style={s.headerAvatarText}>{otherName[0]?.toUpperCase() || "?"}</Text>
        </View>
        <View style={s.headerInfo}>
          <Text style={s.headerName}>{otherName}</Text>
          <Text style={s.headerEmail} numberOfLines={1}>{otherEmail}</Text>
        </View>
      </View>

      {/* Context banner — item or request */}
      <View style={[s.contextBanner, { backgroundColor: contextBg, borderBottomColor: contextBorder }]}>
        {conv.contextImage ? (
          <Image source={{ uri: conv.contextImage }} style={s.contextImg} />
        ) : (
          <View style={[s.contextImg, { backgroundColor: isItem ? "#c7d2fe" : "#fde68a" }]} />
        )}
        <View style={s.contextInfo}>
          <Text style={[s.contextTitle, { color: contextColor }]} numberOfLines={1}>
            {conv.contextTitle}
          </Text>
          {conv.contextPrice != null && (
            <Text style={[s.contextPrice, { color: contextSub }]}>
              ₹{Number(conv.contextPrice).toLocaleString()} · {isItem ? "Product" : "Help Request"}
            </Text>
          )}
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={s.centered}><ActivityIndicator color="#111" /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, i) => (item._id?.toString() || i.toString())}
          renderItem={renderMessage}
          contentContainerStyle={s.messageList}
          showsVerticalScrollIndicator={false}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.centered}>
              <Text style={s.emptyText}>Say hello! 👋</Text>
            </View>
          }
        />
      )}

      {/* Input bar */}
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={1000}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim()}
        >
          <Text style={s.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: "#f8f8f8" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb",
  },
  backBtn:  { padding: 4 },
  backText: { fontSize: 22, color: "#6366f1", fontWeight: "700" },
  headerAvatar:     { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  avItem:           { backgroundColor: "#6366f1" },
  avReq:            { backgroundColor: "#f59e0b" },
  headerAvatarText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  headerInfo:       { flex: 1 },
  headerName:       { fontSize: 14, fontWeight: "700", color: "#111" },
  headerEmail:      { fontSize: 11, color: "#9ca3af" },

  contextBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  contextImg:   { width: 40, height: 40, borderRadius: 8, resizeMode: "cover", flexShrink: 0 },
  contextInfo:  { flex: 1, minWidth: 0 },
  contextTitle: { fontSize: 13, fontWeight: "700" },
  contextPrice: { fontSize: 11, marginTop: 1 },

  messageList: { padding: 14, gap: 8, flexGrow: 1 },
  bubbleWrap:         { marginBottom: 6 },
  bubbleMineWrap:     { alignItems: "flex-end" },
  bubbleTheirsWrap:   { alignItems: "flex-start" },
  bubble:             { maxWidth: "72%", paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16 },
  bubbleMine:         { backgroundColor: "#111", borderBottomRightRadius: 4 },
  bubbleTheirs:       { backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#e5e7eb", borderBottomLeftRadius: 4 },
  bubbleText:         { fontSize: 14, lineHeight: 20 },
  bubbleTextMine:     { color: "#fff" },
  bubbleTextTheirs:   { color: "#111" },
  bubbleTime:         { fontSize: 10, color: "#9ca3af", marginTop: 3 },
  timeRight:          { textAlign: "right" },
  timeLeft:           { textAlign: "left" },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "#fff",
    borderTopWidth: 0.5, borderTopColor: "#e5e7eb",
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
  },
  input: {
    flex: 1, backgroundColor: "#f3f4f6", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
    color: "#111", maxHeight: 120,
  },
  sendBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: "#111", justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { backgroundColor: "#d1d5db" },
  sendBtnText:     { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: -2 },

  emptyText: { fontSize: 14, color: "#9ca3af" },
});
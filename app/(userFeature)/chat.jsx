import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Image, Modal, Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { io }        from "socket.io-client";
import AsyncStorage  from "@react-native-async-storage/async-storage";
import { chatAPI, SOCKET_URL } from "../../services/api";

function timeStr(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ── Message action sheet ───────────────────────────────────────────────────────
function MessageActionSheet({ visible, isMine, onEdit, onDelete, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={as.backdrop} onPress={onClose}>
        <View style={as.sheet}>
          {isMine && (
            <TouchableOpacity style={as.row} onPress={onEdit}>
              <View style={[as.iconBox, { backgroundColor: "#eef2ff" }]}>
                <Text style={as.icon}>✏️</Text>
              </View>
              <Text style={as.rowLabel}>Edit message</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[as.row, as.rowDanger]} onPress={onDelete}>
            <View style={[as.iconBox, { backgroundColor: "#fef2f2" }]}>
              <Text style={as.icon}>🗑️</Text>
            </View>
            <Text style={as.rowLabelDanger}>
              {isMine ? "Delete for everyone" : "Delete for me"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[as.row, { borderBottomWidth: 0 }]} onPress={onClose}>
            <View style={[as.iconBox, { backgroundColor: "#f3f4f6" }]}>
              <Text style={as.icon}>✕</Text>
            </View>
            <Text style={[as.rowLabel, { color: "#6b7280" }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function Chat() {
  const router  = useRouter();
  const params  = useLocalSearchParams();

  let conv = null;
  try { conv = params.conv ? JSON.parse(params.conv) : null; } catch {}
  const myEmail = params.myEmail || "";

  const [messages,       setMessages]       = useState([]);
  const [text,           setText]           = useState("");
  const [loading,        setLoading]        = useState(true);
  const [selectedMsg,    setSelectedMsg]    = useState(null);   // message object for action sheet
  const [editingMsg,     setEditingMsg]     = useState(null);   // message being edited
  const [editText,       setEditText]       = useState("");

  const socketRef    = useRef(null);
  const listRef      = useRef(null);
  const isSendingRef = useRef(false);
  const inputRef     = useRef(null);

  const isItem     = conv?.contextType === "item";
  const roomId     = conv?.roomId;
  const otherEmail = conv?.participants?.find((p) => p !== myEmail) || "";
  const otherName  = otherEmail.split("@")[0];

  useEffect(() => {
    if (!roomId) return;

    chatAPI.getMessages(roomId)
      .then((res) => { if (res.success) setMessages(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));

    const connectSocket = async () => {
      const token  = await AsyncStorage.getItem("token");
      const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => socket.emit("join_room", roomId));

      socket.on("new_message", (msg) => {
        setMessages((prev) => {
          const alreadyExists = prev.some(
            (m) =>
              (m._id && msg._id && m._id.toString() === msg._id.toString()) ||
              (m._id?.startsWith?.("opt_") && m.senderEmail === msg.senderEmail && m.text === msg.text)
          );
          if (alreadyExists) {
            return prev.map((m) =>
              m._id?.startsWith?.("opt_") && m.senderEmail === msg.senderEmail && m.text === msg.text
                ? msg : m
            );
          }
          return [...prev, msg];
        });
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      });

      // Listen for edits from other user
      socket.on("message_edited", ({ messageId, newText }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m._id?.toString() === messageId ? { ...m, text: newText, edited: true } : m
          )
        );
      });

      // Listen for deletes from other user
      socket.on("message_deleted", ({ messageId }) => {
        setMessages((prev) => prev.filter((m) => m._id?.toString() !== messageId));
      });

      socket.on("connect_error", (err) => console.log("Socket error:", err.message));
    };

    connectSocket();

    return () => {
      socketRef.current?.emit("leave_room", roomId);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  // ── Send new message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || !socketRef.current) return;
    if (isSendingRef.current) return;
    isSendingRef.current = true;

    setText("");

    const payload = {
      roomId,
      text:           trimmed,
      recipientEmail: otherEmail,
      recipientName:  otherName,
      contextType:    conv.contextType,
      contextId:      conv.contextId,
      contextTitle:   conv.contextTitle,
      contextPrice:   conv.contextPrice,
      contextImage:   conv.contextImage,
      org:            conv.org,
    };

    const optimistic = {
      _id:         `opt_${Date.now()}`,
      roomId,
      senderEmail: myEmail,
      text:        trimmed,
      createdAt:   new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

    socketRef.current.emit("send_message", payload);
    setTimeout(() => { isSendingRef.current = false; }, 300);
  }, [text, roomId, otherEmail, otherName, conv, myEmail]);

  // ── Long press → open action sheet ──────────────────────────────────────────
  const handleLongPress = (msg) => {
    // Don't allow actions on optimistic messages
    if (msg._id?.startsWith?.("opt_")) return;
    setSelectedMsg(msg);
  };

  // ── Edit: open edit input ────────────────────────────────────────────────────
  const handleEdit = () => {
    setEditingMsg(selectedMsg);
    setEditText(selectedMsg.text);
    setSelectedMsg(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Confirm edit ─────────────────────────────────────────────────────────────
  const confirmEdit = async () => {
    if (!editText.trim() || editText.trim() === editingMsg.text) {
      cancelEdit();
      return;
    }
    const msgId   = editingMsg._id?.toString();
    const newText = editText.trim();

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => m._id?.toString() === msgId ? { ...m, text: newText, edited: true } : m)
    );

    // Emit to socket so other user sees it
    socketRef.current?.emit("edit_message", { roomId, messageId: msgId, newText });

    // Persist to backend
    try {
      await chatAPI.editMessage(msgId, newText);
    } catch (e) {
      console.warn("edit failed:", e);
    }

    cancelEdit();
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setEditText("");
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const msg    = selectedMsg;
    const isMine = msg.senderEmail === myEmail;
    const msgId  = msg._id?.toString();
    setSelectedMsg(null);

    if (isMine) {
      // Delete for everyone — remove from UI + backend + broadcast
      setMessages((prev) => prev.filter((m) => m._id?.toString() !== msgId));
      socketRef.current?.emit("delete_message", { roomId, messageId: msgId });
      try { await chatAPI.deleteMessage(msgId); } catch (e) { console.warn("delete failed:", e); }
    } else {
      // Delete for me only — just remove from local UI
      setMessages((prev) => prev.filter((m) => m._id?.toString() !== msgId));
    }
  };

  // ── Render bubble ────────────────────────────────────────────────────────────
  const renderMessage = ({ item }) => {
    const isMine      = item.senderEmail === myEmail;
    const isEditing   = editingMsg?._id?.toString() === item._id?.toString();

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.85}
        delayLongPress={350}
      >
        <View style={[s.bubbleWrap, isMine ? s.bubbleMineWrap : s.bubbleTheirsWrap]}>
          <View style={[
            s.bubble,
            isMine ? s.bubbleMine : s.bubbleTheirs,
            isEditing && s.bubbleEditing,
          ]}>
            <Text style={[s.bubbleText, isMine ? s.bubbleTextMine : s.bubbleTextTheirs]}>
              {item.text}
            </Text>
            {item.edited && (
              <Text style={[s.editedLabel, isMine && s.editedLabelMine]}>edited</Text>
            )}
          </View>
          <Text style={[s.bubbleTime, isMine ? s.timeRight : s.timeLeft]}>
            {timeStr(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!conv) {
    return (
      <View style={s.centered}>
        <Text style={{ color: "#6b7280" }}>No conversation data.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: "#6366f1", fontWeight: "700" }}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const contextBg     = isItem ? "#eff6ff" : "#fef9ee";
  const contextBorder = isItem ? "#dbeafe" : "#fde68a";
  const contextColor  = isItem ? "#1d4ed8" : "#92400e";
  const contextSub    = isItem ? "#3b82f6" : "#b45309";

  const isEditMode = !!editingMsg;

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
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
          <Text style={s.headerName}>{otherName.toUpperCase()}</Text>
          <Text style={s.headerEmail} numberOfLines={1}>{otherEmail}</Text>
        </View>
      </View>

      {/* Context banner */}
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
        <View style={s.centered}>
          <ActivityIndicator color="#111" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, i) => item._id?.toString() || i.toString()}
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

      {/* Edit mode banner */}
      {isEditMode && (
        <View style={s.editBanner}>
          <View style={s.editBannerLeft}>
            <Text style={s.editBannerTitle}>✏️ Editing message</Text>
            <Text style={s.editBannerPreview} numberOfLines={1}>{editingMsg.text}</Text>
          </View>
          <TouchableOpacity onPress={cancelEdit} style={s.editBannerClose}>
            <Text style={s.editBannerCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View style={s.inputBar}>
        <TextInput
          ref={inputRef}
          style={[s.input, isEditMode && s.inputEditing]}
          value={isEditMode ? editText : text}
          onChangeText={isEditMode ? setEditText : setText}
          placeholder={isEditMode ? "Edit your message…" : "Type a message…"}
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={1000}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        {isEditMode ? (
          // Edit mode: tick to confirm, X to cancel
          <View style={s.editBtns}>
            <TouchableOpacity style={s.editCancelBtn} onPress={cancelEdit}>
              <Text style={s.editCancelText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.sendBtn, !editText.trim() && s.sendBtnDisabled]}
              onPress={confirmEdit}
              disabled={!editText.trim()}
            >
              <Text style={s.sendBtnText}>✓</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim()}
          >
            <Text style={s.sendBtnText}>↑</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action sheet */}
      <MessageActionSheet
        visible={!!selectedMsg}
        isMine={selectedMsg?.senderEmail === myEmail}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onClose={() => setSelectedMsg(null)}
      />
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
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
  backBtn:          { padding: 4 },
  backText:         { fontSize: 22, color: "#6366f1", fontWeight: "700" },
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

  messageList:      { padding: 14, gap: 8, flexGrow: 1 },
  bubbleWrap:       { marginBottom: 6 },
  bubbleMineWrap:   { alignItems: "flex-end" },
  bubbleTheirsWrap: { alignItems: "flex-start" },
  bubble:           { maxWidth: "72%", paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16 },
  bubbleMine:       { backgroundColor: "#111", borderBottomRightRadius: 4 },
  bubbleTheirs:     { backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#e5e7eb", borderBottomLeftRadius: 4 },
  bubbleEditing:    { opacity: 0.6 },
  bubbleText:       { fontSize: 14, lineHeight: 20 },
  bubbleTextMine:   { color: "#fff" },
  bubbleTextTheirs: { color: "#111" },
  bubbleTime:       { fontSize: 10, color: "#9ca3af", marginTop: 3 },
  timeRight:        { textAlign: "right" },
  timeLeft:         { textAlign: "left" },
  editedLabel:      { fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  editedLabelMine:  { color: "rgba(255,255,255,0.45)" },

  // Edit banner above input
  editBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 0.5, borderTopColor: "#e0e7ff",
  },
  editBannerLeft:       { flex: 1 },
  editBannerTitle:      { fontSize: 12, fontWeight: "700", color: "#6366f1" },
  editBannerPreview:    { fontSize: 12, color: "#6b7280", marginTop: 1 },
  editBannerClose:      { padding: 4 },
  editBannerCloseText:  { fontSize: 16, color: "#6366f1", fontWeight: "700" },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "#fff",
    borderTopWidth: 0.5, borderTopColor: "#e5e7eb",
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
  },
  input: {
    flex: 1, backgroundColor: "#f3f4f6", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: "#111", maxHeight: 120,
  },
  inputEditing: { backgroundColor: "#eef2ff", borderWidth: 1, borderColor: "#c7d2fe" },

  editBtns:      { flexDirection: "row", gap: 6 },
  editCancelBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  editCancelText:{ fontSize: 14, color: "#6b7280", fontWeight: "700" },

  sendBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: "#111", justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { backgroundColor: "#d1d5db" },
  sendBtnText:     { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: -2 },

  emptyText: { fontSize: 14, color: "#9ca3af" },
});

// ── Action sheet styles ────────────────────────────────────────────────────────
const as = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6",
  },
  rowDanger:      { },
  iconBox:        { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  icon:           { fontSize: 18 },
  rowLabel:       { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  rowLabelDanger: { fontSize: 15, fontWeight: "600", color: "#ef4444" },
});
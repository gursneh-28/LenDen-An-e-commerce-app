import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, Modal,
  TextInput, RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { itemAPI, requestAPI, getUser, clearSession } from "./services/api";

// ── Edit Item Modal ───────────────────────────────────────────────────────────
function EditItemModal({ item, visible, onClose, onSave }) {
  const [description, setDescription] = useState(item?.description || "");
  const [price, setPrice] = useState(String(item?.price || ""));
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (item) {
      setDescription(item.description || "");
      setPrice(String(item.price || ""));
    }
  }, [item]);

  const handleSave = async () => {
    if (!description.trim() || !price.trim()) {
      Alert.alert("Missing fields", "Please fill in both fields.");
      return;
    }
    try {
      setSaving(true);
      await itemAPI.updateItem(item._id, { description, price: Number(price) });
      onSave();
      onClose();
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <Text style={m.sheetTitle}>Edit Listing</Text>
          <Text style={m.sheetLabel}>Description</Text>
          <TextInput
            style={[m.input, m.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholderTextColor="#9ca3af"
            placeholder="Describe the item…"
          />
          <Text style={m.sheetLabel}>Price (₹)</Text>
          <TextInput
            style={m.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholderTextColor="#9ca3af"
            placeholder="0.00"
          />
          <View style={m.btnRow}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={m.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={m.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Edit Request Modal ────────────────────────────────────────────────────────
function EditRequestModal({ item, visible, onClose, onSave }) {
  const [work, setWork] = useState(item?.work || "");
  const [price, setPrice] = useState(String(item?.price || ""));
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (item) {
      setWork(item.work || "");
      setPrice(String(item.price || ""));
    }
  }, [item]);

  const handleSave = async () => {
    if (!work.trim() || !price.trim()) {
      Alert.alert("Missing fields", "Please fill in both fields.");
      return;
    }
    try {
      setSaving(true);
      await requestAPI.updateRequest(item._id, { work, price: Number(price) });
      onSave();
      onClose();
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <Text style={m.sheetTitle}>Edit Request</Text>
          <Text style={m.sheetLabel}>Work Description</Text>
          <TextInput
            style={[m.input, m.textArea]}
            value={work}
            onChangeText={setWork}
            multiline
            placeholderTextColor="#9ca3af"
            placeholder="Describe the work…"
          />
          <Text style={m.sheetLabel}>Price (₹)</Text>
          <TextInput
            style={m.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholderTextColor="#9ca3af"
            placeholder="0.00"
          />
          <View style={m.btnRow}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={m.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={m.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── My Item Card ──────────────────────────────────────────────────────────────
function MyItemCard({ item, onEdit, onDelete }) {
  const isRent = item.type === "rent";
  return (
    <View style={s.histCard}>
      <Image source={{ uri: item.image }} style={s.histImage} />
      <View style={s.histBody}>
        <View style={s.histTop}>
          <View style={[s.typePill, isRent ? s.typeRent : s.typeSell]}>
            <Text style={s.typePillText}>{isRent ? "RENT" : "SELL"}</Text>
          </View>
          <Text style={s.histPrice}>₹{item.price?.toLocaleString()}</Text>
        </View>
        <Text style={s.histDesc} numberOfLines={2}>{item.description}</Text>
        <View style={s.histActions}>
          <TouchableOpacity style={s.editBtn} onPress={() => onEdit(item)}>
            <Text style={s.editBtnText}>✏️  Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(item._id, "item")}>
            <Text style={s.deleteBtnText}>🗑  Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── My Request Card ───────────────────────────────────────────────────────────
function MyRequestCard({ item, onEdit, onDelete }) {
  return (
    <View style={s.reqCard}>
      <View style={s.reqTop}>
        <Text style={s.reqWork} numberOfLines={2}>{item.work}</Text>
        <Text style={s.reqPrice}>₹{Number(item.price)?.toLocaleString()}</Text>
      </View>
      <Text style={s.reqMeta}>
        Posted {new Date(item.createdAt).toLocaleDateString("en-GB", {
          day: "numeric", month: "short", year: "numeric",
        })}
      </Text>
      <View style={s.histActions}>
        <TouchableOpacity style={s.editBtn} onPress={() => onEdit(item)}>
          <Text style={s.editBtnText}>✏️  Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(item._id, "request")}>
          <Text style={s.deleteBtnText}>🗑  Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Profile Screen ────────────────────────────────────────────────────────────
export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [myItems, setMyItems] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("items");

  // Separate state for each modal type
  const [editingItem, setEditingItem] = useState(null);
  const [editItemVisible, setEditItemVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editRequestVisible, setEditRequestVisible] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const u = await getUser();
      setUser(u);
      const [itemsRes, reqsRes] = await Promise.all([
        itemAPI.getMyItems(),
        requestAPI.getMyRequests(),
      ]);
      if (itemsRes.success) setMyItems(itemsRes.data);
      if (reqsRes.success) setMyRequests(reqsRes.data);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));
  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const handleEditItem = (item) => { setEditingItem(item); setEditItemVisible(true); };
  const handleEditRequest = (req) => { setEditingRequest(req); setEditRequestVisible(true); };

  const handleDelete = (id, type) => {
    Alert.alert("Delete?", `Remove this ${type} permanently?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            if (type === "item") {
              await itemAPI.deleteItem(id);
              setMyItems((prev) => prev.filter((i) => i._id !== id));
            } else {
              await requestAPI.deleteRequest(id);
              setMyRequests((prev) => prev.filter((r) => r._id !== id));
            }
          } catch (err) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive",
        onPress: async () => { await clearSession(); router.replace("/login"); },
      },
    ]);
  };

  if (loading) {
    return <View style={s.centered}><ActivityIndicator size="large" color="#1a1a1a" /></View>;
  }

  return (
    <View style={s.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a1a1a" />}
      >
        {/* Profile Header */}
        <View style={s.profileHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {(user?.username || user?.email || "U")[0].toUpperCase()}
            </Text>
          </View>
          <Text style={s.userName}>{user?.username || "Your Name"}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statNum}>{myItems.length}</Text>
              <Text style={s.statLabel}>Listings</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statNum}>{myRequests.length}</Text>
              <Text style={s.statLabel}>Requests</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statNum}>{myItems.filter((i) => i.type === "rent").length}</Text>
              <Text style={s.statLabel}>Renting</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, tab === "items" && s.tabActive]} onPress={() => setTab("items")}>
            <Text style={[s.tabText, tab === "items" && s.tabTextActive]}>Listings ({myItems.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, tab === "requests" && s.tabActive]} onPress={() => setTab("requests")}>
            <Text style={[s.tabText, tab === "requests" && s.tabTextActive]}>Requests ({myRequests.length})</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={s.content}>
          {tab === "items" ? (
            myItems.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>📦</Text>
                <Text style={s.emptyText}>No listings yet</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => router.push("/upload")}>
                  <Text style={s.emptyBtnText}>+ Add Listing</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myItems.map((item) => (
                <MyItemCard key={item._id} item={item} onEdit={handleEditItem} onDelete={handleDelete} />
              ))
            )
          ) : (
            myRequests.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>🙋</Text>
                <Text style={s.emptyText}>No requests yet</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => router.push("/request")}>
                  <Text style={s.emptyBtnText}>+ Post Request</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myRequests.map((req) => (
                <MyRequestCard key={req._id} item={req} onEdit={handleEditRequest} onDelete={handleDelete} />
              ))
            )
          )}
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Log Out</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Item Edit Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          visible={editItemVisible}
          onClose={() => setEditItemVisible(false)}
          onSave={fetchAll}
        />
      )}

      {/* Request Edit Modal */}
      {editingRequest && (
        <EditRequestModal
          item={editingRequest}
          visible={editRequestVisible}
          onClose={() => setEditRequestVisible(false)}
          onSave={fetchAll}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f7f4" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileHeader: { alignItems: "center", paddingTop: 64, paddingBottom: 28, paddingHorizontal: 20, backgroundColor: "#1a1a1a" },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#333", justifyContent: "center", alignItems: "center", marginBottom: 12, borderWidth: 2, borderColor: "#444" },
  avatarText: { fontSize: 30, color: "#fff", fontWeight: "700" },
  userName: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 4 },
  userEmail: { fontSize: 13, color: "#9ca3af", marginBottom: 24 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  stat: { alignItems: "center", paddingHorizontal: 24 },
  statNum: { fontSize: 22, fontWeight: "700", color: "#fff" },
  statLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: "#333" },
  tabs: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#1a1a1a" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#9ca3af" },
  tabTextActive: { color: "#1a1a1a" },
  content: { padding: 16 },
  histCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, marginBottom: 12, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  histImage: { width: 90, height: 100, resizeMode: "cover" },
  histBody: { flex: 1, padding: 12 },
  histTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  typeRent: { backgroundColor: "#eff6ff" },
  typeSell: { backgroundColor: "#f0fdf4" },
  typePillText: { fontSize: 10, fontWeight: "700", color: "#374151" },
  histPrice: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  histDesc: { fontSize: 12, color: "#6b7280", lineHeight: 17, marginBottom: 8 },
  histActions: { flexDirection: "row", gap: 8 },
  reqCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  reqTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, gap: 8 },
  reqWork: { fontSize: 15, fontWeight: "600", color: "#1a1a1a", flex: 1 },
  reqPrice: { fontSize: 15, fontWeight: "700", color: "#16a34a", flexShrink: 0 },
  reqMeta: { fontSize: 11, color: "#9ca3af", marginBottom: 10 },
  editBtn: { backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  deleteBtn: { backgroundColor: "#fef2f2", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  deleteBtnText: { fontSize: 12, fontWeight: "600", color: "#ef4444" },
  emptyBox: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#6b7280" },
  emptyBtn: { backgroundColor: "#1a1a1a", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  emptyBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  logoutBtn: { marginHorizontal: 20, marginTop: 8, borderWidth: 1, borderColor: "#fca5a5", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  logoutText: { color: "#ef4444", fontWeight: "700", fontSize: 15 },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginBottom: 20 },
  sheetLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: "#f8f7f4", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1a1a1a", marginBottom: 16, borderWidth: 1, borderColor: "#e5e5e5" },
  textArea: { height: 80, textAlignVertical: "top" },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cancelText: { fontWeight: "600", color: "#6b7280" },
  saveBtn: { flex: 1, backgroundColor: "#1a1a1a", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveText: { fontWeight: "700", color: "#fff" },
});
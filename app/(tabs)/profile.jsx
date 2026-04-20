import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, Modal,
  TextInput, RefreshControl, Platform, Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { itemAPI, requestAPI, orderAPI, userAPI, getUser, clearSession } from "../../services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_W = (SCREEN_WIDTH - 48) / 2;

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "";

const ORDER_STATUS = {
  pending:   { bg: "#fef9ee", text: "#b45309", label: "Pending"   },
  confirmed: { bg: "#eff6ff", text: "#1d4ed8", label: "Confirmed" },
  completed: { bg: "#f0fdf4", text: "#15803d", label: "Completed" },
  cancelled: { bg: "#fef2f2", text: "#b91c1c", label: "Cancelled" },
};

function StatusPill({ status }) {
  const st = ORDER_STATUS[status] || ORDER_STATUS.pending;
  return (
    <View style={[s.statusPill, { backgroundColor: st.bg }]}>
      <Text style={[s.statusPillText, { color: st.text }]}>{st.label}</Text>
    </View>
  );
}

function TypePill({ type }) {
  const isRent = type === "rent";
  return (
    <View style={[s.pill, isRent ? s.pillRent : s.pillSell]}>
      <Text style={[s.pillText, isRent ? s.pillTextRent : s.pillTextSell]}>
        {isRent ? "RENT" : "SELL"}
      </Text>
    </View>
  );
}

function ActionBtn({ label, variant, onPress, style }) {
  const map = {
    edit:    { bg: "#f3f4f6", color: "#374151" },
    delete:  { bg: "#fef2f2", color: "#ef4444" },
    confirm: { bg: "#f0fdf4", color: "#15803d" },
    info:    { bg: "#eff6ff", color: "#1d4ed8" },
  };
  const st = map[variant] || map.edit;
  return (
    <TouchableOpacity
      style={[s.actionBtn, { backgroundColor: st.bg }, style]}
      onPress={onPress}
    >
      <Text style={[s.actionBtnText, { color: st.color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ItemThumb({ item, style }) {
  const uri = item?.images?.[0] || item?.image || item?.itemImage;
  return uri
    ? <Image source={{ uri }} style={style} />
    : <View style={[style, s.imgPlaceholder]} />;
}

function EmptyState({ icon, text, btnText, onPress }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>{icon}</Text>
      <Text style={s.emptyText}>{text}</Text>
      {btnText && (
        <TouchableOpacity style={s.emptyBtn} onPress={onPress}>
          <Text style={s.emptyBtnText}>{btnText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Wishlist Modal ────────────────────────────────────────────────────────────
function WishlistModal({ visible, onClose, allItems, wishlistIds, onToggle, router }) {
  const wishlisted = allItems.filter((i) => wishlistIds.includes(String(i._id)));

  const renderCard = ({ item }) => (
    <TouchableOpacity
      style={wl.card}
      activeOpacity={0.88}
      onPress={() => {
        onClose();
        router.push({
          pathname: "/itemDetail",
          params: { item: JSON.stringify(item) },
        });
      }}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={wl.cardImg} />
      ) : (
        <View style={[wl.cardImg, wl.noImg]}>
          <Text style={{ fontSize: 28 }}>📦</Text>
        </View>
      )}

      <TouchableOpacity
        style={wl.heartBtn}
        onPress={() => onToggle(item._id)}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="heart" size={15} color="#fff" />
      </TouchableOpacity>

      <View style={[wl.typeBadge, item.type === "rent" ? wl.badgeRent : wl.badgeSell]}>
        <Text style={wl.typeBadgeText}>{item.type === "rent" ? "Rent" : "Sale"}</Text>
      </View>

      <View style={wl.cardBody}>
        {!!item.name && <Text style={wl.name} numberOfLines={1}>{item.name}</Text>}
        <Text style={wl.price}>₹{item.price}</Text>
        {!!item.description && (
          <Text style={wl.desc} numberOfLines={2}>{item.description}</Text>
        )}
        <Text style={wl.meta}>{item.uploaderName}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={wl.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={wl.sheet}>
        <View style={wl.handle} />
        <View style={wl.sheetHeader}>
          <View style={wl.sheetTitleRow}>
            <Ionicons name="heart" size={20} color="#e11d48" style={{ marginRight: 8 }} />
            <Text style={wl.sheetTitle}>Wishlist</Text>
            <View style={wl.countBadge}>
              <Text style={wl.countBadgeText}>{wishlisted.length}</Text>
            </View>
          </View>
          <TouchableOpacity style={wl.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {wishlisted.length === 0 ? (
          <View style={wl.empty}>
            <Ionicons name="heart-outline" size={56} color="#fda4af" />
            <Text style={wl.emptyTitle}>Nothing saved yet</Text>
            <Text style={wl.emptySub}>
              Tap ♡ on any listing in the home feed to save it here
            </Text>
            <TouchableOpacity style={wl.browseBtn} onPress={onClose}>
              <Text style={wl.browseBtnText}>Browse listings</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={wishlisted}
            keyExtractor={(item) => String(item._id)}
            renderItem={renderCard}
            numColumns={2}
            columnWrapperStyle={wl.row}
            contentContainerStyle={wl.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Edit Item Modal ───────────────────────────────────────────────────────────
function EditItemModal({ item, visible, onClose, onSave }) {
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [price,       setPrice]       = useState("");
  const [saving,      setSaving]      = useState(false);

  React.useEffect(() => {
    if (item) {
      setName(item.name || "");
      setDescription(item.description || "");
      setPrice(String(item.price || ""));
    }
  }, [item]);

  const save = async () => {
    if (!name.trim())
      return Alert.alert("Missing name", "Product name is required.");
    if (!price.trim() || isNaN(Number(price)))
      return Alert.alert("Invalid price", "Enter a valid price.");
    try {
      setSaving(true);
      await itemAPI.updateItem(item._id, {
        name:        name.trim(),
        description: description,
        price:       Number(price),
      });
      onSave();
      onClose();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <Text style={m.title}>Edit listing</Text>
          <Text style={m.label}>
            Product Name <Text style={{ color: "#ef4444" }}>*</Text>
          </Text>
          <TextInput
            style={m.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Sony Headphones"
            placeholderTextColor="#9ca3af"
            maxLength={80}
          />
          <Text style={m.label}>
            Description{" "}
            <Text style={{ color: "#9ca3af", fontWeight: "400", fontSize: 11 }}>
              (optional)
            </Text>
          </Text>
          <TextInput
            style={[m.input, m.ta]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Condition, details…"
            placeholderTextColor="#9ca3af"
          />
          <Text style={m.label}>Price (₹)</Text>
          <TextInput
            style={m.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
          />
          <View style={m.btnRow}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={m.saveBtn} onPress={save} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={m.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Edit Request Modal ────────────────────────────────────────────────────────
function EditRequestModal({ item, visible, onClose, onSave }) {
  const [work,   setWork]   = useState("");
  const [price,  setPrice]  = useState("");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (item) {
      setWork(item.work || "");
      setPrice(String(item.price || ""));
    }
  }, [item]);

  const save = async () => {
    if (!work.trim() || !price.trim())
      return Alert.alert("Missing fields", "Fill in both fields.");
    try {
      setSaving(true);
      await requestAPI.updateRequest(item._id, { work, price: Number(price) });
      onSave();
      onClose();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <Text style={m.title}>Edit request</Text>
          <Text style={m.label}>Work description</Text>
          <TextInput
            style={[m.input, m.ta]}
            value={work}
            onChangeText={setWork}
            multiline
            placeholder="Describe the work…"
            placeholderTextColor="#9ca3af"
          />
          <Text style={m.label}>Budget (₹)</Text>
          <TextInput
            style={m.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
          />
          <View style={m.btnRow}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={m.saveBtn} onPress={save} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={m.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Tab: Selling ──────────────────────────────────────────────────────────────
function SellingTab({ myItems, incomingOrders, onEditItem, onDeleteItem, onOrderAction, router }) {
  return (
    <>
      <Text style={s.secLabel}>My listings ({myItems.length})</Text>
      {myItems.length === 0 ? (
        <EmptyState
          icon="📦"
          text="No listings yet"
          btnText="+ Add listing"
          onPress={() => router.push("/upload")}
        />
      ) : (
        myItems.map((item) => (
          <View key={item._id} style={s.card}>
            <ItemThumb item={item} style={s.cardImg} />
            <View style={s.cardBody}>
              <View style={s.cardTop}>
                <TypePill type={item.type} />
                <Text style={s.price}>₹{item.price?.toLocaleString()}</Text>
              </View>
              {!!item.name && (
                <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
              )}
              {!!item.description && (
                <Text style={s.desc} numberOfLines={2}>{item.description}</Text>
              )}
              <View style={s.actRow}>
                <ActionBtn label="✏️ Edit"   variant="edit"   onPress={() => onEditItem(item)} />
                <ActionBtn label="🗑 Delete" variant="delete" onPress={() => onDeleteItem(item._id, "item")} />
              </View>
            </View>
          </View>
        ))
      )}

      {incomingOrders.length > 0 && (
        <>
          <Text style={[s.secLabel, { marginTop: 20 }]}>
            Incoming orders ({incomingOrders.length})
          </Text>
          {incomingOrders.map((order) => (
            <View key={order._id} style={s.card}>
              <ItemThumb item={order} style={s.cardImg} />
              <View style={s.cardBody}>
                <View style={s.cardTop}>
                  <TypePill type={order.orderType === "rent" ? "rent" : "sell"} />
                  <Text style={s.price}>₹{order.itemPrice?.toLocaleString()}</Text>
                </View>
                {!!order.itemName && (
                  <Text style={s.cardName} numberOfLines={1}>{order.itemName}</Text>
                )}
                <Text style={s.desc} numberOfLines={1}>{order.itemDescription}</Text>
                <View style={s.cardMeta}>
                  <Text style={s.metaText}>From: {order.buyerName || order.buyerEmail}</Text>
                  <StatusPill status={order.status} />
                </View>
                {order.rentStart && (
                  <Text style={s.metaText}>
                    {formatDate(order.rentStart)} → {formatDate(order.rentEnd)}
                  </Text>
                )}
                {order.paymentStatus === "paid" && (
                  <Text style={[s.metaText, { color: "#15803d" }]}>💳 Payment received</Text>
                )}
                {order.status === "pending" && (
                  <View style={[s.actRow, { marginTop: 6 }]}>
                    <ActionBtn label="✓ Confirm" variant="confirm" onPress={() => onOrderAction(order._id, "confirmed")} />
                    <ActionBtn label="✕ Decline" variant="delete"  onPress={() => onOrderAction(order._id, "cancelled")} />
                  </View>
                )}
                {order.status === "confirmed" && (
                  <ActionBtn
                    label="✓ Mark completed"
                    variant="confirm"
                    style={{ marginTop: 6 }}
                    onPress={() => onOrderAction(order._id, "completed")}
                  />
                )}
              </View>
            </View>
          ))}
        </>
      )}
    </>
  );
}

// ─── Tab: Buying ───────────────────────────────────────────────────────────────
function BuyingTab({ myOrders, onOrderAction, router }) {
  if (myOrders.length === 0) {
    return (
      <EmptyState
        icon="🛍️"
        text="No purchases yet"
        btnText="Browse listings"
        onPress={() => router.push("/(tabs)/home")}
      />
    );
  }

  const active = myOrders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const past   = myOrders.filter((o) =>  ["completed", "cancelled"].includes(o.status));

  return (
    <>
      {active.length > 0 && (
        <>
          <Text style={s.secLabel}>Active ({active.length})</Text>
          {active.map((order) => (
            <View key={order._id} style={s.card}>
              <ItemThumb item={order} style={s.cardImg} />
              <View style={s.cardBody}>
                <View style={s.cardTop}>
                  <TypePill type={order.orderType === "rent" ? "rent" : "sell"} />
                  <Text style={s.price}>₹{order.itemPrice?.toLocaleString()}</Text>
                </View>
                {!!order.itemName && (
                  <Text style={s.cardName} numberOfLines={1}>{order.itemName}</Text>
                )}
                <Text style={s.desc} numberOfLines={1}>{order.itemDescription}</Text>
                <View style={s.cardMeta}>
                  <Text style={s.metaText}>Seller: {order.sellerName || order.sellerEmail}</Text>
                  <StatusPill status={order.status} />
                </View>
                {order.rentStart && (
                  <Text style={s.metaText}>
                    {formatDate(order.rentStart)} → {formatDate(order.rentEnd)}
                  </Text>
                )}
                {order.paymentStatus === "paid" ? (
                  <Text style={[s.metaText, { color: "#15803d", marginTop: 4 }]}>
                    💳 Paid via Razorpay
                  </Text>
                ) : order.status === "pending" ? (
                  <Text style={[s.metaText, { color: "#b45309", marginTop: 4 }]}>
                    ⏳ Awaiting seller confirmation
                  </Text>
                ) : null}
                {order.status === "confirmed" && (
                  <View style={[s.actRow, { marginTop: 6 }]}>
                    <ActionBtn label="✓ Mark received" variant="confirm" onPress={() => onOrderAction(order._id, "completed")} />
                    <ActionBtn label="Cancel"          variant="delete"  onPress={() => onOrderAction(order._id, "cancelled")} />
                  </View>
                )}
                {order.status === "pending" && (
                  <ActionBtn
                    label="Cancel request"
                    variant="delete"
                    style={{ marginTop: 6 }}
                    onPress={() => onOrderAction(order._id, "cancelled")}
                  />
                )}
              </View>
            </View>
          ))}
        </>
      )}

      {past.length > 0 && (
        <>
          <Text style={[s.secLabel, { marginTop: 20 }]}>History ({past.length})</Text>
          {past.map((order) => (
            <View key={order._id} style={[s.card, { opacity: 0.65 }]}>
              <ItemThumb item={order} style={s.cardImg} />
              <View style={s.cardBody}>
                <View style={s.cardTop}>
                  <TypePill type={order.orderType === "rent" ? "rent" : "sell"} />
                  <Text style={s.price}>₹{order.itemPrice?.toLocaleString()}</Text>
                </View>
                {!!order.itemName && (
                  <Text style={s.cardName} numberOfLines={1}>{order.itemName}</Text>
                )}
                <Text style={s.desc} numberOfLines={1}>{order.itemDescription}</Text>
                <View style={s.cardMeta}>
                  <Text style={s.metaText}>{formatDate(order.createdAt)}</Text>
                  <StatusPill status={order.status} />
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </>
  );
}

// ─── Tab: Requests ─────────────────────────────────────────────────────────────
function RequestsTab({ myRequests, onEdit, onDelete, router }) {
  if (myRequests.length === 0) {
    return (
      <EmptyState
        icon="🙋"
        text="No requests yet"
        btnText="+ Post request"
        onPress={() => router.push("/request")}
      />
    );
  }
  return (
    <>
      <Text style={s.secLabel}>My service requests ({myRequests.length})</Text>
      {myRequests.map((req) => (
        <View key={req._id} style={s.reqCard}>
          <View style={s.reqTop}>
            <Text style={s.reqWork} numberOfLines={2}>{req.work}</Text>
            <Text style={s.reqPrice}>₹{Number(req.price)?.toLocaleString()}</Text>
          </View>
          <Text style={s.metaText}>Posted {formatDate(req.createdAt)}</Text>
          <View style={[s.actRow, { marginTop: 8 }]}>
            <ActionBtn label="✏️ Edit"   variant="edit"   onPress={() => onEdit(req)} />
            <ActionBtn label="🗑 Delete" variant="delete" onPress={() => onDelete(req._id, "request")} />
          </View>
        </View>
      ))}
    </>
  );
}

// ─── Main Profile Screen ───────────────────────────────────────────────────────
export default function Profile() {
  const router = useRouter();

  const [user,           setUser]        = useState(null);
  const [allItems,       setAllItems]    = useState([]);
  const [myItems,        setMyItems]     = useState([]);
  const [myRequests,     setMyRequests]  = useState([]);
  const [myOrders,       setMyOrders]    = useState([]);
  const [incomingOrders, setIncoming]    = useState([]);
  const [wishlistIds,    setWishlistIds] = useState([]);
  const [loading,        setLoading]     = useState(true);
  const [refreshing,     setRefreshing]  = useState(false);
  const [tab,            setTab]         = useState("selling");
  const [showWishlist,   setShowWishlist]= useState(false);

  const [editingItem,     setEditingItem]     = useState(null);
  const [editItemVisible, setEditItemVisible] = useState(false);
  const [editingReq,      setEditingReq]      = useState(null);
  const [editReqVisible,  setEditReqVisible]  = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [u, allItemsRes, itemsRes, reqsRes, myOrdersRes, sellingOrdersRes] =
        await Promise.all([
          getUser(),
          itemAPI.getItems(),
          itemAPI.getMyItems(),
          requestAPI.getMyRequests(),
          orderAPI.getMyOrders(),
          orderAPI.getSellingOrders(),
        ]);

      setUser(u);

      const orgItems = Array.isArray(allItemsRes)
        ? allItemsRes
        : allItemsRes?.data || allItemsRes?.items || [];
      setAllItems(orgItems);

      if (itemsRes.success)         setMyItems(itemsRes.data         || []);
      if (reqsRes.success)          setMyRequests(reqsRes.data       || []);
      if (myOrdersRes.success)      setMyOrders(myOrdersRes.data     || []);
      if (sellingOrdersRes.success) setIncoming(sellingOrdersRes.data || []);

      try {
        const wishlistRes = await userAPI.getWishlist();
        if (wishlistRes.success) {
          const validIds = orgItems.map((i) => String(i._id));
          const cleaned = (wishlistRes.data || [])
            .map(String)
            .filter((id) => validIds.includes(id));
          setWishlistIds(cleaned);
        }
      } catch (wErr) {
        console.log("wishlist fetch error:", wErr.message);
      }
    } catch (e) {
      console.log("fetchAll error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const handleWishlistToggle = async (itemId) => {
    const strId = String(itemId);
    const isIn  = wishlistIds.includes(strId);
    setWishlistIds((prev) =>
      isIn ? prev.filter((x) => x !== strId) : [...prev, strId]
    );
    try {
      const res = await userAPI.toggleWishlist(strId);
      if (res.success && res.wishlist) {
        setWishlistIds(res.wishlist.map(String));
      }
    } catch {
      setWishlistIds((prev) =>
        isIn ? [...prev, strId] : prev.filter((x) => x !== strId)
      );
    }
  };

  const handleDelete = (id, type) => {
    Alert.alert("Delete?", `Remove this ${type} permanently?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (type === "item") {
              await itemAPI.deleteItem(id);
              setMyItems((p) => p.filter((i) => i._id !== id));
            } else {
              await requestAPI.deleteRequest(id);
              setMyRequests((p) => p.filter((r) => r._id !== id));
            }
          } catch (e) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const handleOrderAction = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      fetchAll();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await clearSession();
          router.replace("/login");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    );
  }

  const TABS = [
    { key: "selling",  label: `Selling (${myItems.length})`     },
    { key: "buying",   label: `Buying (${myOrders.length})`     },
    { key: "requests", label: `Requests (${myRequests.length})` },
  ];

  const wishlistCount = allItems.filter((i) =>
    wishlistIds.includes(String(i._id))
  ).length;

  const displayName  = user?.username || user?.name || user?.email?.split("@")[0] || "User";
  const avatarLetter = displayName[0]?.toUpperCase() || "U";

  return (
    <View style={s.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAll(); }}
            tintColor="#fff"
          />
        }
      >
        {/* ── Header — CHANGE 1: logout button removed, only wishlist heart remains ── */}
        <View style={s.header}>
          <View style={s.coverStrip} />
          <View style={s.avatarRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{avatarLetter}</Text>
            </View>
            {/* Only the wishlist heart icon here now */}
            <TouchableOpacity onPress={() => setShowWishlist(true)} style={s.heartIconBtn}>
              <Ionicons name="heart" size={22} color="#e11d48" />
            </TouchableOpacity>
          </View>

          <Text style={s.userName}>{displayName}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>
          {!!user?.org && <Text style={s.userOrg}>{user.org}</Text>}

          <View style={s.statsRow}>
            {[
              { n: myItems.length,   l: "Listings"  },
              { n: wishlistCount,    l: "Wishlist"  },
              { n: myOrders.length,  l: "Orders"    },
              { n: myRequests.length,l: "Requests"  },
            ].map((st, i, arr) => (
              <React.Fragment key={st.l}>
                <View style={s.stat}>
                  <Text style={s.statNum}>{st.n}</Text>
                  <Text style={s.statLabel}>{st.l}</Text>
                </View>
                {i < arr.length - 1 && <View style={s.statDiv} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsWrap}>
          <View style={s.tabs}>
            {TABS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[s.tab, tab === key && s.tabActive]}
                onPress={() => setTab(key)}
              >
                <Text style={[s.tabText, tab === key && s.tabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Tab content */}
        <View style={s.content}>
          {tab === "selling" && (
            <SellingTab
              myItems={myItems}
              incomingOrders={incomingOrders}
              onEditItem={(i) => { setEditingItem(i); setEditItemVisible(true); }}
              onDeleteItem={handleDelete}
              onOrderAction={handleOrderAction}
              router={router}
            />
          )}
          {tab === "buying" && (
            <BuyingTab
              myOrders={myOrders}
              onOrderAction={handleOrderAction}
              router={router}
            />
          )}
          {tab === "requests" && (
            <RequestsTab
              myRequests={myRequests}
              onEdit={(r) => { setEditingReq(r); setEditReqVisible(true); }}
              onDelete={handleDelete}
              router={router}
            />
          )}
        </View>

        {/* ── CHANGE 2: Logout button at the bottom center ── */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={s.logoutBtnText}>Log out</Text>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>

      <WishlistModal
        visible={showWishlist}
        onClose={() => setShowWishlist(false)}
        allItems={allItems}
        wishlistIds={wishlistIds}
        onToggle={handleWishlistToggle}
        router={router}
      />

      {editingItem && (
        <EditItemModal
          item={editingItem}
          visible={editItemVisible}
          onClose={() => setEditItemVisible(false)}
          onSave={fetchAll}
        />
      )}
      {editingReq && (
        <EditRequestModal
          item={editingReq}
          visible={editReqVisible}
          onClose={() => setEditReqVisible(false)}
          onSave={fetchAll}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: "#f8f7f4" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  header:     { backgroundColor: "#1a1a1a", paddingBottom: 20 },
  coverStrip: { height: 52, backgroundColor: "#2a2a2a" },
  avatarRow:  {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-end", paddingHorizontal: 20,
  },
  avatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "#333", borderWidth: 3, borderColor: "#1a1a1a",
    justifyContent: "center", alignItems: "center", marginTop: -34,
  },
  avatarText: { fontSize: 26, color: "#fff", fontWeight: "700" },

  // Only the heart icon remains in the header top-right
  heartIconBtn: { padding: 8, paddingBottom: 6, justifyContent: "center", alignItems: "center" },

  userName:  { fontSize: 20, fontWeight: "700", color: "#fff", paddingHorizontal: 20, marginTop: 10 },
  userEmail: {
    fontSize: 12, color: "#9ca3af", paddingHorizontal: 20, marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  userOrg: { fontSize: 11, color: "#666", paddingHorizontal: 20, marginTop: 2 },

  statsRow: {
    flexDirection: "row", marginTop: 16,
    borderTopWidth: 0.5, borderTopColor: "#333", paddingTop: 14,
  },
  stat:      { flex: 1, alignItems: "center" },
  statNum:   { fontSize: 18, fontWeight: "700", color: "#fff" },
  statLabel: { fontSize: 9, color: "#666", marginTop: 2 },
  statDiv:   { width: 0.5, height: 28, backgroundColor: "#333" },

  tabsWrap:      { backgroundColor: "#fff", borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5" },
  tabs:          { flexDirection: "row" },
  tab:           { paddingVertical: 13, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive:     { borderBottomColor: "#1a1a1a" },
  tabText:       { fontSize: 12, fontWeight: "700", color: "#9ca3af" },
  tabTextActive: { color: "#1a1a1a" },

  content:  { padding: 16 },
  secLabel: {
    fontSize: 10, fontWeight: "700", color: "#9ca3af",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
  },

  card: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 14,
    marginBottom: 10, overflow: "hidden",
    borderWidth: 0.5, borderColor: "#ebebeb",
  },
  cardImg:        { width: 84, height: 96, resizeMode: "cover" },
  imgPlaceholder: { backgroundColor: "#e9e9e7" },
  cardBody:       { flex: 1, padding: 10 },
  cardTop:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardMeta:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 3, marginBottom: 3 },
  cardName:       { fontSize: 13, fontWeight: "700", color: "#1a1a1a", marginBottom: 2 },
  price:          { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  desc:           { fontSize: 12, color: "#6b7280", lineHeight: 17, marginBottom: 6 },
  metaText:       { fontSize: 10, color: "#9ca3af" },
  actRow:         { flexDirection: "row", gap: 6, flexWrap: "wrap" },

  pill:         { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  pillSell:     { backgroundColor: "#f0fdf4" },
  pillRent:     { backgroundColor: "#eff6ff" },
  pillText:     { fontSize: 9, fontWeight: "800" },
  pillTextSell: { color: "#16a34a" },
  pillTextRent: { color: "#2563eb" },

  statusPill:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusPillText: { fontSize: 9, fontWeight: "800" },
  actionBtn:      { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  actionBtnText:  { fontSize: 11, fontWeight: "700" },

  reqCard:  { backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 0.5, borderColor: "#ebebeb" },
  reqTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3, gap: 8 },
  reqWork:  { fontSize: 13, fontWeight: "600", color: "#1a1a1a", flex: 1, lineHeight: 18 },
  reqPrice: { fontSize: 14, fontWeight: "700", color: "#16a34a", flexShrink: 0 },

  // Logout button — centered at the bottom of all content
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 40,
    marginTop: 24,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fca5a5",
    backgroundColor: "#fff",
  },
  logoutBtnText: { color: "#ef4444", fontWeight: "700", fontSize: 15 },

  empty:        { alignItems: "center", paddingVertical: 44, gap: 8 },
  emptyIcon:    { fontSize: 38 },
  emptyText:    { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  emptyBtn:     { backgroundColor: "#1a1a1a", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

const wl = StyleSheet.create({
  backdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: "88%",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  handle: {
    width: 38, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb",
    alignSelf: "center", marginTop: 10, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  sheetTitleRow: { flexDirection: "row", alignItems: "center" },
  sheetTitle:    { fontSize: 18, fontWeight: "700", color: "#111" },
  countBadge: {
    marginLeft: 8, backgroundColor: "#fce7ea", borderRadius: 10,
    minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  countBadgeText: { fontSize: 12, fontWeight: "800", color: "#e11d48" },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center",
  },
  listContent: { padding: 12 },
  row:         { justifyContent: "space-between", marginBottom: 12 },
  card: {
    width: CARD_W, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardImg:       { width: "100%", height: CARD_W * 1.05 },
  noImg:         { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  cardBody:      { padding: 9 },
  name:          { fontSize: 12, fontWeight: "700", color: "#111", marginBottom: 1 },
  price:         { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 2 },
  desc:          { fontSize: 11, color: "#6b7280", lineHeight: 15, marginBottom: 3 },
  meta:          { fontSize: 10, color: "#9ca3af" },
  heartBtn: {
    position: "absolute", top: 8, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#e11d48", alignItems: "center", justifyContent: "center",
    shadowColor: "#e11d48", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45, shadowRadius: 5, elevation: 5,
  },
  typeBadge:     { position: "absolute", top: 8, left: 8, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  badgeSell:     { backgroundColor: "#6366f1" },
  badgeRent:     { backgroundColor: "#f59e0b" },
  typeBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  empty:         { alignItems: "center", paddingVertical: 52, paddingHorizontal: 40, gap: 10 },
  emptyTitle:    { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptySub:      { fontSize: 13, color: "#9ca3af", textAlign: "center", lineHeight: 19 },
  browseBtn:     { marginTop: 8, backgroundColor: "#1a1a1a", borderRadius: 22, paddingHorizontal: 24, paddingVertical: 11 },
  browseBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

const m = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet:     { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  title:     { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginBottom: 20 },
  label:     { fontSize: 11, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  input:     { backgroundColor: "#f8f7f4", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1a1a1a", marginBottom: 16, borderWidth: 1, borderColor: "#e5e5e5" },
  ta:        { height: 80, textAlignVertical: "top" },
  btnRow:    { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cancelText:{ fontWeight: "600", color: "#6b7280" },
  saveBtn:   { flex: 1, backgroundColor: "#1a1a1a", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveText:  { fontWeight: "700", color: "#fff" },
});
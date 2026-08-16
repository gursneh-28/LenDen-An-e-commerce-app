import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Dimensions, Alert, ActivityIndicator,
  Linking, Modal, TextInput, Clipboard, ToastAndroid
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getUser, itemRoomId, userAPI, ratingAPI, orderAPI } from "../../services/api";
import { Ionicons } from "@expo/vector-icons";
import { RatingBadge } from "../components/StarRating";

const { width: W } = Dimensions.get("window");

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── UPI Payment Modal ────────────────────────────────────────────────────────
function UPIModal({ visible, onClose, item, isRent }) {
  const [paid,    setPaid]    = useState(false);
  const [placing, setPlacing] = useState(false);

  const upiId   = item?.uploaderUPI || null;
  const amount  = item?.price;
  const name    = item?.uploaderName || "Seller";

  const openUPI = (app) => {
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Payment for ${item?.name || "item"}`)}`;
    Linking.openURL(upiUrl).catch(() => {
      Alert.alert("App not found", `Could not open ${app}. Try another UPI app.`);
    });
  };

  const confirmOrder = async () => {
    try {
      setPlacing(true);
      const user = await getUser();
      if (!user) return;
      await orderAPI.createOrder({
        itemId:        item._id,
        itemName:      item.name,
        itemDescription: item.description,
        itemPrice:     item.price,
        itemImage:     item.images?.[0] || item.image || null,
        sellerEmail:   item.uploadedBy,
        sellerName:    item.uploaderName,
        orderType:     isRent ? "rent" : "buy",
        paymentMethod: "upi",
        paymentStatus: "paid",
      });
      onClose();
      Alert.alert("✅ Order placed!", "Your order has been placed successfully. The seller will be notified.");
    } catch (e) {
      Alert.alert("Error", e.message || "Could not place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          {/* Handle */}
          <View style={m.handle} />

          <Text style={m.title}>Pay ₹{amount?.toLocaleString()}</Text>
          <Text style={m.sub}>to {name}</Text>

          {upiId ? (
            <>
              {/* UPI ID display */}
              <View style={m.upiBox}>
                <Ionicons name="at" size={18} color="#6366f1" />
                <Text style={m.upiId}>{upiId}</Text>
              </View>

              <Text style={m.orText}>Pay using</Text>

              {/* UPI App buttons */}
              <View style={m.appRow}>
                <TouchableOpacity style={m.appBtn} onPress={() => openUPI("GPay")}>
                  <Text style={m.appEmoji}>🟢</Text>
                  <Text style={m.appLabel}>GPay</Text>
                </TouchableOpacity>
                <TouchableOpacity style={m.appBtn} onPress={() => openUPI("PhonePe")}>
                  <Text style={m.appEmoji}>🟣</Text>
                  <Text style={m.appLabel}>PhonePe</Text>
                </TouchableOpacity>
                <TouchableOpacity style={m.appBtn} onPress={() => openUPI("Paytm")}>
                  <Text style={m.appEmoji}>🔵</Text>
                  <Text style={m.appLabel}>Paytm</Text>
                </TouchableOpacity>
                <TouchableOpacity style={m.appBtn} onPress={() => openUPI("BHIM")}>
                  <Text style={m.appEmoji}>🇮🇳</Text>
                  <Text style={m.appLabel}>BHIM</Text>
                </TouchableOpacity>
              </View>

              {/* Confirm after paying */}
              <View style={m.divider} />
              <Text style={m.confirmNote}>
                After paying, tap below to confirm your order
              </Text>

              <TouchableOpacity
                style={[m.confirmBtn, placing && { opacity: 0.6 }]}
                onPress={confirmOrder}
                disabled={placing}
              >
                {placing
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={m.confirmBtnText}>✅  I've paid — confirm order</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Seller hasn't added UPI — show chat option */}
              <View style={m.noUpiBox}>
                <Ionicons name="information-circle-outline" size={32} color="#f59e0b" />
                <Text style={m.noUpiText}>
                  This seller hasn't added a UPI ID yet.{"\n"}
                  Contact them via chat to arrange payment.
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
            <Text style={m.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ItemDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [imgIndex,        setImgIndex]        = useState(0);
  const [isWishlisted,    setIsWishlisted]    = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [sellerRating,    setSellerRating]    = useState({ average: 0, count: 0 });
  const [showUPI,         setShowUPI]         = useState(false); // ✅ NEW

  const item = useMemo(() => {
    try {
      return params.item ? JSON.parse(params.item) : null;
    } catch (e) {
      console.warn("Failed to parse item param:", e);
      return null;
    }
  }, [params.item]);

  useEffect(() => {
    if (!item?.uploadedBy) return;
    ratingAPI
      .getUserSummary(item.uploadedBy)
      .then((res) => { if (res?.success && res.data) setSellerRating(res.data); })
      .catch(() => {});
  }, [item?.uploadedBy]);

  useEffect(() => {
    if (item?._id) {
      checkWishlistStatus();
    } else {
      setLoading(false);
    }
  }, [item?._id]);

  const checkWishlistStatus = async () => {
    try {
      const res = await userAPI.getWishlist();
      if (res?.success && Array.isArray(res.data)) {
        const ids = res.data.map((id) => String(id));
        setIsWishlisted(ids.includes(String(item._id)));
      }
    } catch (e) {
      console.warn("checkWishlist error:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleWishlist = async () => {
    if (wishlistLoading || !item) return;
    const wasWishlisted = isWishlisted;
    setWishlistLoading(true);
    setIsWishlisted(!wasWishlisted);
    try {
      const res = await userAPI.toggleWishlist(item._id);
      if (res?.success) {
        if (Array.isArray(res.wishlist)) {
          setIsWishlisted(res.wishlist.map((id) => String(id)).includes(String(item._id)));
        }
      } else {
        setIsWishlisted(wasWishlisted);
      }
    } catch (e) {
      console.warn("toggleWishlist error:", e);
      setIsWishlisted(wasWishlisted);
      Alert.alert("Error", e?.message || "Failed to update wishlist");
    } finally {
      setWishlistLoading(false);
    }
  };

  if (!item) {
    return (
      <View style={s.centered}>
        <Text style={{ fontSize: 16, color: "#6b7280", marginBottom: 12 }}>Item not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return <View style={s.centered}><ActivityIndicator size="large" color="#e11d48" /></View>;
  }

  const images  = item.images?.length ? item.images : item.image ? [item.image] : [];
  const isRent  = item.type === "rent";
  const sellerInitial = (item.uploaderName || item.uploadedBy || "?")[0]?.toUpperCase() || "?";

  const handleChat = async () => {
    try {
      const user = await getUser();
      if (!user) return;
      const roomId = itemRoomId(item._id, user.email, item.uploadedBy);
      const conv = {
        roomId,
        contextType:  "item",
        contextId:    item._id,
        contextTitle: item.name || item.description?.slice(0, 50) || "Product",
        contextPrice: item.price,
        contextImage: images[0] || null,
        participants: [user.email, item.uploadedBy],
        org:          user.org,
      };
      router.push({ pathname: "/chat", params: { conv: JSON.stringify(conv), myEmail: user.email } });
    } catch (e) {
      console.warn("handleChat error:", e);
      Alert.alert("Error", "Could not start chat");
    }
  };

  return (
    <View style={s.screen}>
      {/* Back button */}
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backBtnText}>←</Text>
      </TouchableOpacity>

      {/* Wishlist button */}
      <TouchableOpacity style={s.wishlistBtn} onPress={toggleWishlist} disabled={wishlistLoading}>
        {wishlistLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons
            name={isWishlisted ? "heart" : "heart-outline"}
            size={24}
            color={isWishlisted ? "#e11d48" : "#fff"}
          />
        )}
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image carousel */}
        <ScrollView
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setImgIndex(Math.round(e.nativeEvent.contentOffset.x / W))
          }
        >
          {images.length > 0 ? (
            images.map((uri, i) => <Image key={i} source={{ uri }} style={s.image} />)
          ) : (
            <View style={[s.image, s.noImage]}>
              <Text style={s.noImageText}>📦</Text>
            </View>
          )}
        </ScrollView>

        {images.length > 1 && (
          <View style={s.dots}>
            {images.map((_, i) => (
              <View key={i} style={[s.dot, i === imgIndex && s.dotActive]} />
            ))}
          </View>
        )}

        <View style={s.body}>
          {!!item.name && <Text style={s.name}>{item.name}</Text>}

          <View style={s.priceRow}>
            <Text style={s.price}>₹{item.price?.toLocaleString()}</Text>
            <View style={[s.pill, isRent ? s.pillRent : s.pillSell]}>
              <Text style={[s.pillText, isRent ? s.pillTextRent : s.pillTextSell]}>
                {isRent ? "RENT" : "SELL"}
              </Text>
            </View>
          </View>

          {!!item.description && <Text style={s.desc}>{item.description}</Text>}

          {isRent && item.availability?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Availability</Text>
              {item.availability.map((a, i) => (
                <Text key={i} style={s.availText}>
                  📅 {formatDate(a.start)} → {formatDate(a.end)}
                </Text>
              ))}
            </View>
          )}

          {/* Seller card */}
          <View style={s.sellerCard}>
            <View style={s.sellerAvatar}>
              <Text style={s.sellerAvatarText}>{sellerInitial}</Text>
            </View>
            <View style={s.sellerInfo}>
              <Text style={s.sellerName}>{item.uploaderName || "Seller"}</Text>
              <RatingBadge
                rating={sellerRating.average}
                count={sellerRating.count}
                style={{ marginTop: 4 }}
              />
              <Text style={s.sellerEmail}>{item.uploadedBy}</Text>
              {!!item.uploaderPhone && (
                <Text style={s.sellerPhone}>📞 {item.uploaderPhone}</Text>
              )}
            </View>
          </View>

          {/* Chat button */}
          <TouchableOpacity style={s.chatBtn} onPress={handleChat}>
            <Text style={s.chatBtnText}>💬  Chat with seller</Text>
          </TouchableOpacity>

          {/* ✅ NEW: UPI Buy button */}
          <TouchableOpacity style={s.buyBtn} onPress={() => setShowUPI(true)}>
            <Text style={s.buyBtnText}>
              {isRent ? "Book rental  →" : "Buy now  →"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ✅ NEW: UPI Payment Modal */}
      <UPIModal
        visible={showUPI}
        onClose={() => setShowUPI(false)}
        item={item}
        isRent={isRent}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  back:     { color: "#6366f1", fontWeight: "700", fontSize: 16, marginTop: 8 },

  backBtn: {
    position: "absolute", top: Platform.OS === "ios" ? 52 : 16, left: 16, zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.4)", width: 36, height: 36, borderRadius: 18,
    justifyContent: "center", alignItems: "center",
  },
  backBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },

  wishlistBtn: {
    position: "absolute", top: Platform.OS === "ios" ? 52 : 16, right: 16, zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.4)", width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
  },

  image:       { width: W, height: W * 0.85, resizeMode: "cover" },
  noImage:     { backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  noImageText: { fontSize: 48 },

  dots:      { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: -16, marginBottom: 8 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.25)" },
  dotActive: { width: 18, backgroundColor: "#111" },

  body: { padding: 20 },
  name: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 10 },

  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  price:    { fontSize: 28, fontWeight: "800", color: "#111" },

  pill:         { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  pillSell:     { backgroundColor: "#f0fdf4" },
  pillRent:     { backgroundColor: "#eff6ff" },
  pillText:     { fontSize: 11, fontWeight: "800" },
  pillTextSell: { color: "#16a34a" },
  pillTextRent: { color: "#2563eb" },

  desc: { fontSize: 15, color: "#374151", lineHeight: 24, marginBottom: 20 },

  section:      { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  availText:    { fontSize: 14, color: "#374151", marginBottom: 4 },

  sellerCard:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f8f8f8", borderRadius: 16, padding: 14, marginBottom: 18 },
  sellerAvatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: "#111", justifyContent: "center", alignItems: "center" },
  sellerAvatarText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  sellerInfo:       { flex: 1 },
  sellerName:       { fontSize: 14, fontWeight: "700", color: "#111" },
  sellerEmail:      { fontSize: 12, color: "#9ca3af" },
  sellerPhone:      { fontSize: 13, color: "#374151", marginTop: 3, fontWeight: "500" },

  chatBtn:     { borderWidth: 1.5, borderColor: "#6366f1", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginBottom: 10 },
  chatBtnText: { color: "#6366f1", fontWeight: "700", fontSize: 15 },
  buyBtn:      { backgroundColor: "#111", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  buyBtnText:  { color: "#fff", fontSize: 16, fontWeight: "700" },
});

// ─── UPI Modal Styles ─────────────────────────────────────────────────────────
const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: Platform.OS === "ios" ? 44 : 24,
  },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb", alignSelf: "center", marginBottom: 20 },

  title: { fontSize: 24, fontWeight: "800", color: "#111", textAlign: "center" },
  sub:   { fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 20, marginTop: 4 },

  upiBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f0f0ff", borderRadius: 12,
    padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: "#e0e0ff",
  },
  upiId: { fontSize: 16, fontWeight: "700", color: "#6366f1", flex: 1 },

  orText: { fontSize: 12, color: "#9ca3af", textAlign: "center", marginBottom: 12, fontWeight: "600" },

  appRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 24 },
  appBtn: { alignItems: "center", gap: 6, padding: 12, borderRadius: 14, backgroundColor: "#f8f8f8", minWidth: 68 },
  appEmoji: { fontSize: 28 },
  appLabel: { fontSize: 12, fontWeight: "600", color: "#374151" },

  divider: { height: 1, backgroundColor: "#f3f4f6", marginBottom: 16 },
  confirmNote: { fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 14 },

  confirmBtn: { backgroundColor: "#111", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 10 },
  confirmBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  noUpiBox: { alignItems: "center", padding: 24, gap: 12, backgroundColor: "#fffbeb", borderRadius: 14, marginBottom: 20 },
  noUpiText: { fontSize: 14, color: "#92400e", textAlign: "center", lineHeight: 22 },

  cancelBtn: { paddingVertical: 14, alignItems: "center" },
  cancelText: { fontSize: 14, color: "#9ca3af", fontWeight: "600" },
});

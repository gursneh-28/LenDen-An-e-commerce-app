import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, Alert, ActivityIndicator, Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser, orderAPI } from "../../services/api";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value, valueStyle, last }) {
  return (
    <View style={[s.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function PaymentPill({ icon, label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[s.payPill, selected && s.payPillSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={s.payPillIcon}>{icon}</Text>
      <Text style={[s.payPillLabel, selected && s.payPillLabelSelected]}>{label}</Text>
      {selected && (
        <View style={s.payPillCheck}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function Checkout() {
  const router  = useRouter();
  const params  = useLocalSearchParams();

  const [user,      setUser]      = useState(null);
  const [placing,   setPlacing]   = useState(false);
  const [payMethod, setPayMethod] = useState("cod");

  let item = null;
  try { item = params.item ? JSON.parse(params.item) : null; } catch (_) {}

  const orderType = params.orderType || "buy";
  const isRent    = orderType === "rent";

  useEffect(() => {
    getUser().then(setUser).catch(() => {});
  }, []);

  if (!item) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>Item not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backLinkText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const itemImage   = item.images?.[0] || item.image || null;
  const price       = Number(item.price) || 0;
  const [platformFee, setPlatformFee] = useState(Math.round(price * 0.02));
  const [total,       setTotal]       = useState(price + Math.round(price * 0.02));

  const handlePlaceOrder = async () => {
    if (!user) return Alert.alert("Not logged in", "Please log in to continue.");
    try {
      setPlacing(true);
      const res = await orderAPI.createOrder({
        itemId:        item._id,
        type:          orderType,
        paymentMethod: payMethod,
        ...(isRent && item.availability?.[0]
          ? {
              rentStart: item.availability[0].start,
              rentEnd:   item.availability[0].end,
            }
          : {}),
      });
    
      if (res?.success) {
        // Update displayed amounts with backend-confirmed values
        if (res.platformFee != null) setPlatformFee(res.platformFee);
        if (res.total       != null) setTotal(res.total);
      
        Alert.alert(
          "🎉 Order placed!",
          isRent
            ? "Rental confirmed! The seller will reach out shortly."
            : "Order confirmed! The seller will reach out shortly.",
          [{ text: "Done", onPress: () => router.replace("/(users)/home") }]
        );
      } else {
        throw new Error(res?.message || "Order failed");
      }
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not place order. Try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isRent ? "Book Rental" : "Checkout"}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

        {/* Item summary */}
        <Section title="Item">
          <View style={s.itemRow}>
            {itemImage ? (
              <Image source={{ uri: itemImage }} style={s.itemThumb} />
            ) : (
              <View style={[s.itemThumb, s.itemThumbEmpty]}>
                <Text style={{ fontSize: 26 }}>📦</Text>
              </View>
            )}
            <View style={s.itemInfo}>
              <Text style={s.itemName} numberOfLines={2}>
                {item.name || item.description?.slice(0, 60) || "Item"}
              </Text>
              <Text style={s.itemSeller}>
                by {item.uploaderName || item.uploadedBy?.split("@")[0] || "Seller"}
              </Text>
              <View style={[s.typePill, isRent ? s.pillRent : s.pillSell]}>
                <Text style={[s.typePillText, isRent ? s.pillTextRent : s.pillTextSell]}>
                  {isRent ? "RENTAL" : "PURCHASE"}
                </Text>
              </View>
            </View>
          </View>

          {isRent && item.availability?.length > 0 && (
            <View style={s.availRow}>
              <Ionicons name="calendar-outline" size={13} color="#6b7280" />
              <Text style={s.availText}>
                {item.availability.map(a => `${formatDate(a.start)} – ${formatDate(a.end)}`).join(", ")}
              </Text>
            </View>
          )}
        </Section>

        {/* Buyer details */}
        <Section title="Your details">
          <InfoRow label="Name"  value={user?.username || user?.name || "—"} />
          <InfoRow label="Email" value={user?.email || "—"} />
          <InfoRow label="Phone" value={user?.phoneNumber || "Not set"} last />
        </Section>

        {/* Payment method */}
        <Section title="Payment method">
          <View style={s.payRow}>
            <PaymentPill
              icon="💵"
              label="Cash on delivery"
              selected={payMethod === "cod"}
              onPress={() => setPayMethod("cod")}
            />
            <PaymentPill
              icon="📲"
              label="UPI"
              selected={payMethod === "upi"}
              onPress={() => setPayMethod("upi")}
            />
          </View>
          {payMethod === "upi" && (
            <View style={s.upiNote}>
              <Ionicons name="information-circle-outline" size={14} color="#2563eb" />
              <Text style={s.upiNoteText}>
                UPI details will be shared by the seller after order confirmation.
              </Text>
            </View>
          )}
        </Section>

        {/* Price breakdown */}
        <Section title="Price breakdown">
          <InfoRow label={isRent ? "Rental price" : "Item price"} value={`₹${price.toLocaleString()}`} />
          <InfoRow label="Platform fee (2%)" value={`₹${platformFee.toLocaleString()}`} />
          <View style={s.divider} />
          <InfoRow
            label="Total payable"
            value={`₹${total.toLocaleString()}`}
            valueStyle={s.totalValue}
            last
          />
        </Section>

        {/* Trust note */}
        <View style={s.noteBox}>
          <Ionicons name="shield-checkmark-outline" size={15} color="#16a34a" />
          <Text style={s.noteText}>
            Transactions happen directly between buyer and seller on campus.
            LenDen facilitates the connection and keeps a record.
          </Text>
        </View>

      </ScrollView>

      {/* Sticky footer */}
      <View style={s.footer}>
        <View>
          <Text style={s.footerLabel}>Total payable</Text>
          <Text style={s.footerAmount}>₹{total.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[s.placeBtn, placing && s.placeBtnOff]}
          onPress={handlePlaceOrder}
          disabled={placing}
          activeOpacity={0.85}
        >
          {placing
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.placeBtnText}>{isRent ? "Confirm booking →" : "Place order →"}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: "#f8f7f4" },
  centered:     { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText:    { fontSize: 16, color: "#6b7280" },
  backLinkText: { color: "#6366f1", fontWeight: "700", fontSize: 15 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5",
  },
  backBtn:     { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },

  section:      { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 10, fontWeight: "700", color: "#9ca3af",
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 0.5, borderColor: "#e5e5e5",
    paddingHorizontal: 14, paddingVertical: 4,
  },

  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6",
  },
  infoLabel:  { fontSize: 13, color: "#6b7280" },
  infoValue:  { fontSize: 13, fontWeight: "600", color: "#1a1a1a", maxWidth: "60%", textAlign: "right" },
  totalValue: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },
  divider:    { height: 0.5, backgroundColor: "#e5e5e5", marginVertical: 2 },

  itemRow:        { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 8 },
  itemThumb:      { width: 72, height: 72, borderRadius: 10, resizeMode: "cover" },
  itemThumbEmpty: { backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  itemInfo:       { flex: 1, gap: 4, paddingTop: 2 },
  itemName:       { fontSize: 15, fontWeight: "700", color: "#1a1a1a", lineHeight: 20 },
  itemSeller:     { fontSize: 12, color: "#9ca3af" },

  typePill:     { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  pillSell:     { backgroundColor: "#f0fdf4" },
  pillRent:     { backgroundColor: "#eff6ff" },
  typePillText: { fontSize: 10, fontWeight: "800" },
  pillTextSell: { color: "#16a34a" },
  pillTextRent: { color: "#2563eb" },

  availRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingTop: 10, paddingBottom: 6,
    borderTopWidth: 0.5, borderTopColor: "#f3f4f6",
  },
  availText: { fontSize: 12, color: "#6b7280", flex: 1 },

  payRow:               { flexDirection: "row", gap: 10, paddingVertical: 10 },
  payPill:              { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: "#e5e5e5", backgroundColor: "#fff" },
  payPillSelected:      { borderColor: "#1a1a1a", backgroundColor: "#f8f7f4" },
  payPillIcon:          { fontSize: 18 },
  payPillLabel:         { fontSize: 12, fontWeight: "600", color: "#9ca3af", flex: 1 },
  payPillLabelSelected: { color: "#1a1a1a" },
  payPillCheck:         { width: 18, height: 18, borderRadius: 9, backgroundColor: "#1a1a1a", justifyContent: "center", alignItems: "center" },

  upiNote:     { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#eff6ff", borderRadius: 8, padding: 10, marginBottom: 8 },
  upiNoteText: { fontSize: 12, color: "#2563eb", flex: 1, lineHeight: 18 },

  noteBox:  { flexDirection: "row", alignItems: "flex-start", gap: 8, marginHorizontal: 16, marginTop: 16, backgroundColor: "#f0fdf4", borderRadius: 10, padding: 12 },
  noteText: { fontSize: 12, color: "#16a34a", flex: 1, lineHeight: 18 },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: 16, backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 0.5, borderTopColor: "#e5e5e5",
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
  },
  footerLabel:  { fontSize: 11, color: "#9ca3af", fontWeight: "600" },
  footerAmount: { fontSize: 22, fontWeight: "800", color: "#1a1a1a" },
  placeBtn:     { flex: 1, backgroundColor: "#1a1a1a", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  placeBtnOff:  { backgroundColor: "#9ca3af" },
  placeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

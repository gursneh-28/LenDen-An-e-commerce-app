import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator,
} from "react-native";
import { ratingAPI } from "../../services/api";
import { StarDisplay } from "../components/StarRating";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ReviewCard({ rating }) {
  const typeLabel = rating.contextType === "order" ? "Purchase" : "Help";
  const typeBg    = rating.contextType === "order" ? "#eff6ff" : "#fef9ee";
  const typeColor = rating.contextType === "order" ? "#1d4ed8" : "#b45309";

  const raterDisplay = rating.raterName
    || (rating.raterEmail ? rating.raterEmail.split("@")[0] : "Anonymous");
  const avatarLetter = raterDisplay[0]?.toUpperCase() || "?";

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{avatarLetter}</Text>
        </View>
        <View style={s.cardInfo}>
          <View style={s.cardInfoTop}>
            <Text style={s.raterName}>{raterDisplay}</Text>
            <StarDisplay rating={rating.stars} showNumber={false} size={12} />
          </View>
          <View style={s.metaRow}>
            <Text style={s.timeAgo}>{timeAgo(rating.createdAt)}</Text>
            <View style={[s.typePill, { backgroundColor: typeBg }]}>
              <Text style={[s.typePillText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
          </View>
        </View>
      </View>
      {!!rating.comment && <Text style={s.comment}>{rating.comment}</Text>}
    </View>
  );
}

export default function MyRatings() {
  const [ratings, setRatings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ratingAPI.getMyRatings()
      .then((res) => {
        if (res?.success) {
          setRatings(res.data || []);
          setSummary(res.summary || null);
        }
      })
      .catch(() => {
        setRatings([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#1a1a1a" />
      </View>
    );
  }

  if (ratings.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyIcon}>⭐</Text>
        <Text style={s.emptyTitle}>No ratings yet</Text>
        <Text style={s.emptySub}>Complete transactions to receive your first rating</Text>
      </View>
    );
  }

  return (
    <View>
      {summary && summary.count > 0 && (
        <View style={s.summaryCard}>
          <Text style={s.summaryScore}>{Number(summary.average).toFixed(1)}</Text>
          <StarDisplay rating={summary.average} size={18} showNumber={false} />
          <Text style={s.summaryCount}>
            Based on {summary.count} {summary.count === 1 ? "rating" : "ratings"}
          </Text>
        </View>
      )}

      <Text style={s.sectionLabel}>Recent reviews</Text>
      {ratings.map((r) => (
        <ReviewCard key={r._id?.toString() || r.createdAt} rating={r} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  center: { paddingVertical: 32, alignItems: "center" },

  summaryCard: {
    alignItems: "center", backgroundColor: "#fff",
    borderRadius: 14, padding: 20, marginBottom: 16,
    borderWidth: 0.5, borderColor: "#e5e5e5",
  },
  summaryScore: { fontSize: 40, fontWeight: "800", color: "#1a1a1a", lineHeight: 48 },
  summaryCount: { fontSize: 12, color: "#9ca3af", marginTop: 6 },

  sectionLabel: {
    fontSize: 10, fontWeight: "700", color: "#9ca3af",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
  },

  card: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 0.5, borderColor: "#ebebeb",
  },
  cardTop:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  avatar:      { width: 32, height: 32, borderRadius: 16, backgroundColor: "#374151", justifyContent: "center", alignItems: "center", flexShrink: 0 },
  avatarText:  { fontSize: 13, fontWeight: "700", color: "#fff" },
  cardInfo:    { flex: 1 },
  cardInfoTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  raterName:   { fontSize: 13, fontWeight: "700", color: "#1a1a1a" },
  metaRow:     { flexDirection: "row", alignItems: "center", gap: 6 },
  timeAgo:     { fontSize: 10, color: "#9ca3af" },
  typePill:    { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 },
  typePillText:{ fontSize: 9, fontWeight: "700" },
  comment:     { fontSize: 12, color: "#374151", lineHeight: 18 },

  empty:      { alignItems: "center", paddingVertical: 36, gap: 8 },
  emptyIcon:  { fontSize: 36 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#374151" },
  emptySub:   { fontSize: 12, color: "#9ca3af", textAlign: "center" },
});
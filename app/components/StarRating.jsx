import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

// ── Display only — shows filled/empty stars + optional numeric label ──────────
export function StarDisplay({ rating = 0, count, size = 13, showNumber = true }) {
  const rounded = Math.round(rating * 2) / 2; // round to nearest 0.5
  return (
    <View style={d.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={[d.star, { fontSize: size, color: i <= rounded ? "#f59e0b" : "#e5e7eb" }]}
        >
          ★
        </Text>
      ))}
      {showNumber && rating > 0 && (
        <Text style={[d.num, { fontSize: size - 1 }]}>{rating.toFixed(1)}</Text>
      )}
      {count != null && (
        <Text style={[d.count, { fontSize: size - 2 }]}>({count})</Text>
      )}
    </View>
  );
}

// ── Interactive picker — lets user tap to select 1–5 stars ───────────────────
export function StarPicker({ value = 0, onChange, size = 32 }) {
  return (
    <View style={d.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onChange(i)}
          hitSlop={{ top: 8, right: 4, bottom: 8, left: 4 }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: size, color: i <= value ? "#f59e0b" : "#e5e7eb" }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Compact badge — e.g. "★ 4.6" shown on seller card ───────────────────────
export function RatingBadge({ rating, count, style }) {
  if (!rating || rating === 0) return null;
  return (
    <View style={[d.badge, style]}>
      <Text style={d.badgeStar}>★</Text>
      <Text style={d.badgeNum}>{rating.toFixed(1)}</Text>
      {count != null && <Text style={d.badgeCount}>{count} ratings</Text>}
    </View>
  );
}

const d = StyleSheet.create({
  row:        { flexDirection: "row", alignItems: "center", gap: 2 },
  star:       { lineHeight: 18 },
  num:        { fontWeight: "700", color: "#b45309", marginLeft: 3 },
  count:      { color: "#9ca3af", marginLeft: 2 },
  badge:      { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#fef9ee", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeStar:  { fontSize: 11, color: "#f59e0b" },
  badgeNum:   { fontSize: 11, fontWeight: "700", color: "#b45309" },
  badgeCount: { fontSize: 10, color: "#9ca3af", marginLeft: 2 },
});
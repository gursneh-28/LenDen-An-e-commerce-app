import React, { useState } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from "react-native";
import { StarPicker } from "./StarRating";
import { ratingAPI } from "../../services/api";

// ── RatingModal ───────────────────────────────────────────────────────────────
// Props:
//   visible       bool
//   onClose       () => void
//   onSubmitted   () => void   — called after successful submission
//   ratedEmail    string       — who is being rated
//   ratedName     string       — display name
//   contextId     string       — orderId or requestId
//   contextType   "order" | "help"
//   contextLabel  string       — e.g. "HP Laptop" or "DS Assignment help"
export default function RatingModal({
  visible, onClose, onSubmitted,
  ratedEmail, ratedName, contextId, contextType, contextLabel,
}) {
  const [stars,    setStars]   = useState(0);
  const [comment,  setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setStars(0); setComment(""); };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (stars === 0) return Alert.alert("Select stars", "Please select at least 1 star.");
    try {
      setSubmitting(true);
      await ratingAPI.submit({
        ratedEmail,
        stars,
        comment: comment.trim(),
        contextId,
        contextType,
      });
      reset();
      onSubmitted?.();
      onClose();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={handleClose} />
      <View style={s.sheet}>
        <View style={s.handle} />

        <Text style={s.title}>Rate your experience</Text>
        <Text style={s.subtitle}>
          How was your experience with{" "}
          <Text style={{ fontWeight: "700", color: "#1a1a1a" }}>{ratedName || ratedEmail}</Text>
          {contextLabel ? ` for "${contextLabel}"` : ""}?
        </Text>

        {/* Stars */}
        <View style={s.starsRow}>
          <StarPicker value={stars} onChange={setStars} size={40} />
        </View>
        {stars > 0 && (
          <Text style={s.starLabel}>{LABELS[stars]}</Text>
        )}

        {/* Comment */}
        <TextInput
          style={s.input}
          value={comment}
          onChangeText={setComment}
          placeholder="Add a comment (optional)…"
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={200}
        />
        <Text style={s.charCount}>{comment.length}/200</Text>

        {/* Buttons */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.submitBtn, stars === 0 && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting || stars === 0}
          >
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.submitText}>Submit rating</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 24, paddingBottom: Platform.OS === "ios" ? 44 : 28,
  },
  handle:    { width: 38, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb", alignSelf: "center", marginBottom: 18 },
  title:     { fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginBottom: 6 },
  subtitle:  { fontSize: 14, color: "#6b7280", lineHeight: 20, marginBottom: 22 },
  starsRow:  { alignItems: "center", marginBottom: 6 },
  starLabel: { textAlign: "center", fontSize: 14, fontWeight: "700", color: "#f59e0b", marginBottom: 18 },
  input: {
    backgroundColor: "#f8f7f4", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#1a1a1a",
    borderWidth: 1, borderColor: "#e5e5e5",
    minHeight: 80, textAlignVertical: "top",
    marginTop: 16, marginBottom: 4,
  },
  charCount:       { fontSize: 11, color: "#9ca3af", textAlign: "right", marginBottom: 20 },
  btnRow:          { flexDirection: "row", gap: 12 },
  cancelBtn:       { flex: 1, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cancelText:      { fontWeight: "600", color: "#6b7280", fontSize: 15 },
  submitBtn:       { flex: 1, backgroundColor: "#1a1a1a", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  submitBtnDisabled: { backgroundColor: "#d1d5db" },
  submitText:      { fontWeight: "700", color: "#fff", fontSize: 15 },
});

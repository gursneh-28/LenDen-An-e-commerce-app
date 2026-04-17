import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { itemAPI } from "../../services/api";

const MAX_IMAGES = 5;

const CATEGORIES = [
  { key: "electronics", label: "Electronics", icon: "📱" },
  { key: "books",       label: "Books",       icon: "📚" },
  { key: "clothing",    label: "Clothing",    icon: "👗" },
  { key: "furniture",   label: "Furniture",   icon: "🪑" },
  { key: "sports",      label: "Sports",      icon: "⚽" },
  { key: "other",       label: "Other",       icon: "📦" },
];

export default function Upload() {
  const router = useRouter();
  const [type, setType]               = useState("sell");
  const [images, setImages]           = useState([]);
  const [description, setDescription] = useState("");
  const [price, setPrice]             = useState("");
  const [category, setCategory]       = useState("other");   // ← new
  const [loading, setLoading]         = useState(false);

  const [dateRanges, setDateRanges]       = useState([]);
  const [currentRange, setCurrentRange]   = useState({ start: null, end: null });
  const [pickerMode, setPickerMode]       = useState(null);
  const [showPicker, setShowPicker]       = useState(false);

  // ── Image picking with crop ────────────────────────────────────────────────
  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      return Alert.alert("Max images", `You can upload up to ${MAX_IMAGES} images.`);
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera roll access is needed.");
      return;
    }

    const remaining = MAX_IMAGES - images.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });

    if (result.canceled) return;

    const processed = await Promise.all(
      result.assets.slice(0, remaining).map(async (asset) => {
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1080 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          return manipulated;
        } catch {
          return asset;
        }
      })
    );

    setImages((prev) => [...prev, ...processed].slice(0, MAX_IMAGES));
  };

  const pickWithCamera = async () => {
    if (images.length >= MAX_IMAGES) {
      return Alert.alert("Max images", `You can upload up to ${MAX_IMAGES} images.`);
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera access is needed.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled) return;

    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImages((prev) => [...prev, manipulated].slice(0, MAX_IMAGES));
    } catch {
      setImages((prev) => [...prev, result.assets[0]].slice(0, MAX_IMAGES));
    }
  };

  const cropImage = async (index) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (result.canceled) return;
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImages((prev) => prev.map((img, i) => (i === index ? manipulated : img)));
    } catch {
      setImages((prev) => prev.map((img, i) => (i === index ? result.assets[0] : img)));
    }
  };

  const removeImage = (index) => setImages((prev) => prev.filter((_, i) => i !== index));

  const showImageOptions = () => {
    Alert.alert("Add Photo", "Choose source", [
      { text: "Camera",  onPress: pickWithCamera },
      { text: "Gallery", onPress: pickImages },
      { text: "Cancel",  style: "cancel" },
    ]);
  };

  // ── Date range helpers ─────────────────────────────────────────────────────
  const openPicker = (mode) => { setPickerMode(mode); setShowPicker(true); };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (!selectedDate) return;
    setCurrentRange((prev) => ({ ...prev, [pickerMode]: selectedDate }));
  };

  const addDateRange = () => {
    if (!currentRange.start || !currentRange.end)
      return Alert.alert("Incomplete range", "Please select both a start and end date.");
    if (currentRange.end < currentRange.start)
      return Alert.alert("Invalid range", "End date must be after start date.");
    setDateRanges((prev) => [...prev, { ...currentRange }]);
    setCurrentRange({ start: null, end: null });
  };

  const removeDateRange = (index) =>
    setDateRanges((prev) => prev.filter((_, i) => i !== index));

  const formatDate = (d) =>
    d
      ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "Select date";

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (images.length === 0)
      return Alert.alert("Missing image", "Please add at least one photo.");
    if (!description.trim())
      return Alert.alert("Missing description", "Add a description.");
    if (!price.trim() || isNaN(Number(price)))
      return Alert.alert("Invalid price", "Enter a valid price.");
    if (type === "rent" && dateRanges.length === 0)
      return Alert.alert("No availability", "Add at least one availability range.");

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("type", type);
      formData.append("description", description);
      formData.append("price", price);
      formData.append("category", category);   // ← new

      images.forEach((img, index) => {
        formData.append("images", {
          uri:  img.uri,
          name: `upload_${index}.jpg`,
          type: "image/jpeg",
        });
      });

      if (type === "rent") {
        formData.append(
          "availability",
          JSON.stringify(
            dateRanges.map((r) => ({
              start: r.start.toISOString(),
              end:   r.end.toISOString(),
            }))
          )
        );
      }

      const data = await itemAPI.uploadItem(formData);
      if (data.success) {
        Alert.alert("Success 🎉", "Item uploaded!", [
          { text: "OK", onPress: () => router.push("/home") },
        ]);
        setImages([]);
        setDescription("");
        setPrice("");
        setCategory("other");
        setDateRanges([]);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Sell / Rent Toggle */}
      <View style={s.toggle}>
        {["sell", "rent"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.toggleBtn, type === t && s.toggleActive]}
            onPress={() => setType(t)}
          >
            <Text style={[s.toggleText, type === t && s.toggleTextActive]}>
              {t === "sell" ? "Sell" : "Rent Out"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Image Section */}
      <Text style={s.label}>Photos ({images.length}/{MAX_IMAGES})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.imagesRow}>
        {images.length < MAX_IMAGES && (
          <TouchableOpacity style={s.addImageBtn} onPress={showImageOptions}>
            <Text style={s.addImageIcon}>📷</Text>
            <Text style={s.addImageText}>Add Photo</Text>
          </TouchableOpacity>
        )}

        {images.map((img, index) => (
          <View key={index} style={s.thumbWrap}>
            <Image source={{ uri: img.uri }} style={s.thumb} />
            {index === 0 && (
              <View style={s.primaryBadge}>
                <Text style={s.primaryBadgeText}>Cover</Text>
              </View>
            )}
            <View style={s.thumbActions}>
              <TouchableOpacity style={s.thumbActionBtn} onPress={() => cropImage(index)}>
                <Text style={s.thumbActionIcon}>✂️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.thumbActionBtn, s.thumbRemoveBtn]}
                onPress={() => removeImage(index)}
              >
                <Text style={s.thumbActionIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
      <Text style={s.imageHint}>First photo will be the cover. Tap ✂️ to crop.</Text>

      {/* Description */}
      <Text style={[s.label, { marginTop: 18 }]}>Description</Text>
      <TextInput
        style={[s.input, s.textArea]}
        placeholder="Describe the item…"
        placeholderTextColor="#9ca3af"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      {/* Price */}
      <Text style={s.label}>Price {type === "rent" ? "(per day / period)" : ""}</Text>
      <TextInput
        style={s.input}
        placeholder="₹ 0.00"
        placeholderTextColor="#9ca3af"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />

      {/* ── Category picker (new) ── */}
      <Text style={s.label}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 20 }}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {CATEGORIES.map((cat) => {
          const active = category === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setCategory(cat.key)}
              style={[s.catChip, active && s.catChipActive]}
            >
              <Text style={s.catChipIcon}>{cat.icon}</Text>
              <Text style={[s.catChipLabel, active && s.catChipLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Date ranges for rent */}
      {type === "rent" && (
        <View style={s.availabilitySection}>
          <Text style={s.label}>Availability Dates</Text>

          {dateRanges.map((r, i) => (
            <View key={i} style={s.rangeChip}>
              <Text style={s.rangeChipText}>
                {formatDate(r.start)} → {formatDate(r.end)}
              </Text>
              <TouchableOpacity onPress={() => removeDateRange(i)}>
                <Text style={s.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={s.rangePicker}>
            <TouchableOpacity style={s.dateBtn} onPress={() => openPicker("start")}>
              <Text style={s.dateBtnLabel}>From</Text>
              <Text style={[s.dateBtnValue, currentRange.start && s.dateBtnValueSet]}>
                {formatDate(currentRange.start)}
              </Text>
            </TouchableOpacity>
            <Text style={s.arrow}>→</Text>
            <TouchableOpacity style={s.dateBtn} onPress={() => openPicker("end")}>
              <Text style={s.dateBtnLabel}>To</Text>
              <Text style={[s.dateBtnValue, currentRange.end && s.dateBtnValueSet]}>
                {formatDate(currentRange.end)}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.addRangeBtn} onPress={addDateRange}>
            <Text style={s.addRangeBtnText}>+ Add Date Range</Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={
                pickerMode === "start"
                  ? currentRange.start || new Date()
                  : currentRange.end || new Date()
              }
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              minimumDate={
                pickerMode === "end" ? currentRange.start || new Date() : new Date()
              }
              onChange={onDateChange}
            />
          )}
          {Platform.OS === "ios" && showPicker && (
            <TouchableOpacity style={s.doneBtn} onPress={() => setShowPicker(false)}>
              <Text style={s.doneBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.submitText}>Upload Item</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: "#f8f7f4" },
  container: { padding: 24, paddingBottom: 60 },

  toggle: {
    flexDirection: "row", backgroundColor: "#e9e9e7",
    borderRadius: 12, padding: 4, marginBottom: 24,
  },
  toggleBtn:        { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  toggleActive:     { backgroundColor: "#1a1a1a" },
  toggleText:       { fontWeight: "600", color: "#6b7280", fontSize: 15 },
  toggleTextActive: { color: "#fff" },

  label: {
    fontSize: 13, fontWeight: "600", color: "#6b7280",
    marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5,
  },

  // Images
  imagesRow: { flexDirection: "row", marginBottom: 6 },
  addImageBtn: {
    width: 100, height: 110, borderRadius: 14,
    backgroundColor: "#e9e9e7", justifyContent: "center",
    alignItems: "center", marginRight: 10, gap: 6,
    borderWidth: 1.5, borderColor: "#d1d5db", borderStyle: "dashed",
  },
  addImageIcon: { fontSize: 26 },
  addImageText: { fontSize: 11, fontWeight: "600", color: "#6b7280" },
  thumbWrap:    { position: "relative", marginRight: 10 },
  thumb:        { width: 100, height: 110, borderRadius: 14, resizeMode: "cover" },
  primaryBadge: {
    position: "absolute", top: 6, left: 6,
    backgroundColor: "#1a1a1a", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  primaryBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  thumbActions:     { position: "absolute", top: 6, right: 6, flexDirection: "column", gap: 4 },
  thumbActionBtn: {
    backgroundColor: "rgba(255,255,255,0.9)", width: 26, height: 26,
    borderRadius: 13, justifyContent: "center", alignItems: "center",
  },
  thumbRemoveBtn: { backgroundColor: "rgba(239,68,68,0.9)" },
  thumbActionIcon: { fontSize: 11 },
  imageHint:       { fontSize: 11, color: "#9ca3af", marginBottom: 4 },

  input: {
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 13, fontSize: 16, color: "#1a1a1a", marginBottom: 16,
    borderWidth: 1, borderColor: "#e5e5e5",
  },
  textArea: { height: 90, textAlignVertical: "top", paddingTop: 13 },

  // Category chips (new)
  catChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: "#e5e5e5", gap: 6,
  },
  catChipActive:      { backgroundColor: "#1a1a1a", borderColor: "#1a1a1a" },
  catChipIcon:        { fontSize: 16 },
  catChipLabel:       { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  catChipLabelActive: { color: "#fff" },

  availabilitySection: { marginBottom: 16 },
  rangeChip: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 8, borderWidth: 1, borderColor: "#e5e5e5",
  },
  rangeChipText: { fontSize: 14, color: "#1a1a1a", fontWeight: "500" },
  removeBtn:     { color: "#ef4444", fontSize: 16, paddingLeft: 8 },
  rangePicker:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  dateBtn: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: "#e5e5e5",
  },
  dateBtnLabel:    { fontSize: 11, color: "#9ca3af", fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  dateBtnValue:    { fontSize: 13, color: "#9ca3af" },
  dateBtnValueSet: { color: "#1a1a1a", fontWeight: "500" },
  arrow:           { fontSize: 18, color: "#9ca3af" },
  addRangeBtn: {
    borderWidth: 1.5, borderColor: "#1a1a1a", borderStyle: "dashed",
    borderRadius: 12, paddingVertical: 12, alignItems: "center", marginBottom: 8,
  },
  addRangeBtnText: { fontWeight: "600", color: "#1a1a1a", fontSize: 14 },
  doneBtn:         { alignSelf: "flex-end", paddingHorizontal: 16, paddingVertical: 8, marginTop: 8 },
  doneBtnText:     { color: "#2563eb", fontWeight: "600", fontSize: 15 },

  submitBtn:  { backgroundColor: "#1a1a1a", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
});

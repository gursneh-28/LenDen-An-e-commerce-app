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
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { itemAPI } from "./services/api";

export default function Upload() {
  const router = useRouter();
  const [type, setType] = useState("sell");
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const [dateRanges, setDateRanges] = useState([]);
  const [currentRange, setCurrentRange] = useState({ start: null, end: null });
  const [pickerMode, setPickerMode] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera roll access is needed.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const openPicker = (mode) => {
    setPickerMode(mode);
    setShowPicker(true);
  };

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

  const handleSubmit = async () => {
    if (!image) return Alert.alert("Missing image", "Please select an image.");
    if (!description.trim()) return Alert.alert("Missing description", "Add a description.");
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
      formData.append("image", {
        uri: image.uri,
        name: "upload.jpg",
        type: "image/jpeg",
      });
      if (type === "rent") {
        formData.append(
          "availability",
          JSON.stringify(
            dateRanges.map((r) => ({
              start: r.start.toISOString(),
              end: r.end.toISOString(),
            }))
          )
        );
      }

      const data = await itemAPI.uploadItem(formData);
      if (data.success) {
        Alert.alert("Success 🎉", "Item uploaded!", [
          { text: "OK", onPress: () => router.push("/home") },
        ]);
        setImage(null);
        setDescription("");
        setPrice("");
        setDateRanges([]);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.heading}>List an Item</Text>

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

      <TouchableOpacity style={s.imagePicker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image.uri }} style={s.imagePreview} />
        ) : (
          <View style={s.imagePlaceholder}>
            <Text style={s.imagePlaceholderIcon}>📷</Text>
            <Text style={s.imagePlaceholderText}>Tap to add photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={s.label}>Description</Text>
      <TextInput
        style={[s.input, s.textArea]}
        placeholder="Describe the item…"
        placeholderTextColor="#9ca3af"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <Text style={s.label}>Price {type === "rent" ? "(per day / period)" : ""}</Text>
      <TextInput
        style={s.input}
        placeholder="₹ 0.00"
        placeholderTextColor="#9ca3af"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />

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
              minimumDate={pickerMode === "end" ? currentRange.start || new Date() : new Date()}
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
  screen: { flex: 1, backgroundColor: "#f8f7f4" },
  container: { padding: 24, paddingBottom: 60 },
  heading: { fontSize: 28, fontWeight: "700", color: "#1a1a1a", marginBottom: 24, letterSpacing: -0.5 },
  toggle: { flexDirection: "row", backgroundColor: "#e9e9e7", borderRadius: 12, padding: 4, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  toggleActive: { backgroundColor: "#1a1a1a" },
  toggleText: { fontWeight: "600", color: "#6b7280", fontSize: 15 },
  toggleTextActive: { color: "#fff" },
  imagePicker: { height: 200, borderRadius: 16, overflow: "hidden", marginBottom: 20, backgroundColor: "#e9e9e7" },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  imagePlaceholderIcon: { fontSize: 36 },
  imagePlaceholderText: { color: "#9ca3af", fontSize: 14, fontWeight: "500" },
  label: { fontSize: 13, fontWeight: "600", color: "#6b7280", marginBottom: 6, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, color: "#1a1a1a", marginBottom: 16, borderWidth: 1, borderColor: "#e5e5e5" },
  textArea: { height: 90, textAlignVertical: "top", paddingTop: 13 },
  availabilitySection: { marginBottom: 16 },
  rangeChip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: "#e5e5e5" },
  rangeChipText: { fontSize: 14, color: "#1a1a1a", fontWeight: "500" },
  removeBtn: { color: "#ef4444", fontSize: 16, paddingLeft: 8 },
  rangePicker: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  dateBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#e5e5e5" },
  dateBtnLabel: { fontSize: 11, color: "#9ca3af", fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  dateBtnValue: { fontSize: 13, color: "#9ca3af" },
  dateBtnValueSet: { color: "#1a1a1a", fontWeight: "500" },
  arrow: { fontSize: 18, color: "#9ca3af" },
  addRangeBtn: { borderWidth: 1.5, borderColor: "#1a1a1a", borderStyle: "dashed", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginBottom: 8 },
  addRangeBtnText: { fontWeight: "600", color: "#1a1a1a", fontSize: 14 },
  doneBtn: { alignSelf: "flex-end", paddingHorizontal: 16, paddingVertical: 8, marginTop: 8 },
  doneBtnText: { color: "#2563eb", fontWeight: "600", fontSize: 15 },
  submitBtn: { backgroundColor: "#1a1a1a", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
});
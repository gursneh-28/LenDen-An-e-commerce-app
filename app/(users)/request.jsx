import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, Alert, ScrollView, ActivityIndicator, Platform 
} from "react-native";
import { useRouter } from "expo-router";
import { requestAPI } from "../../services/api";

const CATEGORIES = [
  { key: "carpool", label: "Car Pooling", icon: "🚗" },
  { key: "assignment", label: "Assignments", icon: "📝" },
  { key: "project", label: "Projects", icon: "💻" },
  { key: "item", label: "Borrow Item", icon: "📦" },
  { key: "other", label: "Other", icon: "🤝" },
];

export default function RequestScreen() {
  const router = useRouter();
  const [work, setWork] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("other");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!work.trim()) return Alert.alert("Missing Info", "Please describe what help you need.");
    if (!price.trim() || isNaN(Number(price))) return Alert.alert("Invalid Budget", "Please enter a valid numeric budget.");

    try {
      setLoading(true);
      const data = { work, price: Number(price), category };
      const res = await requestAPI.createRequest(data);
      
      Alert.alert("Success 🎉", "Your request is live!", [
        { text: "OK", onPress: () => router.push("/help") }
      ]);

      setWork("");
      setPrice("");
      setCategory("other");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <Text style={s.title}>Request Help</Text>
        <Text style={s.subtitle}>Post a task and let campus help you out.</Text>
      </View>

      <Text style={s.label}>Category</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={s.catScroll}
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
              <Text style={s.catIcon}>{cat.icon}</Text>
              <Text style={[s.catLabel, active && s.catLabelActive]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={[s.label, { marginTop: 24 }]}>Task Description</Text>
      <TextInput
        placeholder="E.g., Need a ride to the airport tomorrow at 6 AM..."
        style={[s.input, s.textArea]}
        value={work}
        onChangeText={setWork}
        multiline
        numberOfLines={4}
        placeholderTextColor="#9ca3af"
      />

      <Text style={s.label}>Budget / Willing to pay (₹)</Text>
      <TextInput
        placeholder="0 if volunteering/free"
        style={s.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholderTextColor="#9ca3af"
      />

      <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.submitText}>Submit Request</Text>
        )}
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f7f4" },
  container: { padding: 24 },
  header: { marginBottom: 30, marginTop: Platform.OS === 'ios' ? 10 : 20 },
  title: { fontSize: 32, fontWeight: "800", color: "#1a1a1a", letterSpacing: -1 },
  subtitle: { fontSize: 15, color: "#6b7280", marginTop: 6 },
  
  label: { fontSize: 13, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  
  catScroll: { marginBottom: 10 },
  catChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: "#e5e5e5", gap: 6 },
  catChipActive: { backgroundColor: "#1a1a1a", borderColor: "#1a1a1a" },
  catIcon: { fontSize: 16 },
  catLabel: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  catLabelActive: { color: "#fff" },

  input: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: "#1a1a1a", marginBottom: 24, borderWidth: 1, borderColor: "#e5e5e5" },
  textArea: { height: 110, textAlignVertical: "top", paddingTop: 14 },
  
  submitBtn: { backgroundColor: "#1a1a1a", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 20 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 }
});
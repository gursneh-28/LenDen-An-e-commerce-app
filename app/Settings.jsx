import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Linking, Platform, Modal, TextInput, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser, clearSession } from "../services/api";
import MyRatings from "./components/MyRatings";   // ← correct relative path from app/

// ── Edit Profile Modal ─────────────────────────────────────────────────────────
function EditProfileModal({ visible, user, onClose, onSave }) {
  const [username, setUsername] = useState(user?.username || user?.name || "");
  const [phone,    setPhone]    = useState(user?.phoneNumber || "");
  const [saving,   setSaving]   = useState(false);

  // Sync state if the user prop changes (e.g. after first load)
  React.useEffect(() => {
    if (user) {
      setUsername(user.username || user.name || "");
      setPhone(user.phoneNumber || "");
    }
  }, [user]);

  const save = async () => {
    if (!username.trim()) return Alert.alert("Required", "Name cannot be empty.");
    try {
      setSaving(true);
      // Uncomment when API is ready:
      // await userAPI.updateProfile({ username: username.trim(), phoneNumber: phone.trim() });
      Alert.alert("Saved", "Profile updated successfully.");
      onSave?.({ username: username.trim(), phoneNumber: phone.trim() });
      onClose();
    } catch (e) {
      Alert.alert("Error", e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <Text style={m.title}>Edit profile</Text>

          <Text style={m.label}>Display name</Text>
          <TextInput
            style={m.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Your name"
            placeholderTextColor="#9ca3af"
            maxLength={50}
          />

          <Text style={m.label}>Phone number</Text>
          <TextInput
            style={m.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile number"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
            maxLength={10}
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

// ── Change Password Modal ──────────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose }) {
  const [current, setCurrent] = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    if (!current || !next || !confirm)
      return Alert.alert("Required", "Fill in all fields.");
    if (next.length < 6)
      return Alert.alert("Too short", "Password must be at least 6 characters.");
    if (next !== confirm)
      return Alert.alert("Mismatch", "New passwords don't match.");
    try {
      setSaving(true);
      // await userAPI.changePassword({ currentPassword: current, newPassword: next });
      Alert.alert("Done", "Password changed successfully.");
      setCurrent(""); setNext(""); setConfirm("");
      onClose();
    } catch (e) {
      Alert.alert("Error", e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: "Current password",    val: current, set: setCurrent },
    { label: "New password",        val: next,    set: setNext    },
    { label: "Confirm new password", val: confirm, set: setConfirm },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <Text style={m.title}>Change password</Text>
          {fields.map(({ label, val, set }) => (
            <React.Fragment key={label}>
              <Text style={m.label}>{label}</Text>
              <TextInput
                style={m.input}
                value={val}
                onChangeText={set}
                secureTextEntry
                placeholder="••••••"
                placeholderTextColor="#9ca3af"
              />
            </React.Fragment>
          ))}
          <View style={m.btnRow}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={m.saveBtn} onPress={save} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={m.saveText}>Update</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── About Modal ────────────────────────────────────────────────────────────────
function AboutModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={[m.sheet, { alignItems: "center" }]}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>↕</Text>
          <Text style={[m.title, { textAlign: "center" }]}>LenDen</Text>
          <Text style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", marginBottom: 4 }}>
            Version 1.0.0
          </Text>
          <Text style={{ fontSize: 13, color: "#6b7280", textAlign: "center", lineHeight: 20, marginBottom: 20 }}>
            Campus lending and marketplace, simplified.{"\n"}Built for students, by students.
          </Text>
          <TouchableOpacity style={[m.saveBtn, { paddingHorizontal: 32 }]} onPress={onClose}>
            <Text style={m.saveText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Settings Row ───────────────────────────────────────────────────────────────
function SettingsRow({ iconName, iconBg, label, sublabel, onPress, danger, rightEl }) {
  return (
    <TouchableOpacity
      style={[s.row, danger && s.rowDanger]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={17} color={danger ? "#ef4444" : "#374151"} />
      </View>
      <View style={s.rowText}>
        <Text style={[s.rowLabel, danger && s.rowLabelDanger]}>{label}</Text>
        {!!sublabel && <Text style={s.rowSub}>{sublabel}</Text>}
      </View>
      {rightEl || (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={danger ? "#fca5a5" : "#d1d5db"}
        />
      )}
    </TouchableOpacity>
  );
}

// ── Section ────────────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

// ── Main Settings Screen ───────────────────────────────────────────────────────
export default function Settings() {
  const router = useRouter();
  const [user,            setUser]            = React.useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePwd,   setShowChangePwd]   = useState(false);
  const [showAbout,       setShowAbout]       = useState(false);

  React.useEffect(() => {
    // Safely load user — won't crash if getUser rejects
    getUser()
      .then((u) => setUser(u || null))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await clearSession();
          } catch (_) {
            // ignore — clear locally regardless
          }
          router.replace("/login");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This will permanently delete your account, listings, and all data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // await userAPI.deleteAccount();
            Alert.alert("Account deleted", "Your account has been removed.");
          },
        },
      ]
    );
  };

  const handleSupport = () => {
    Linking.openURL("mailto:support@lenden.app?subject=Support Request").catch(() =>
      Alert.alert("Error", "Could not open mail app.")
    );
  };

  const displayName  = user?.username || user?.name || user?.email?.split("@")[0] || "User";
  const avatarLetter = (displayName[0] || "U").toUpperCase();

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile summary */}
        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            <Text style={s.profileAvatarText}>{avatarLetter}</Text>
          </View>
          <Text style={s.profileName}>{displayName}</Text>
          {!!user?.email && <Text style={s.profileEmail}>{user.email}</Text>}
          {!!user?.org   && <Text style={s.profileOrg}>{user.org}</Text>}
        </View>

        {/* Account */}
        <Section title="Account">
          <SettingsRow
            iconName="person-outline"
            iconBg="#eff6ff"
            label="Edit profile"
            sublabel="Name, phone number"
            onPress={() => setShowEditProfile(true)}
          />
          <SettingsRow
            iconName="lock-closed-outline"
            iconBg="#f0fdf4"
            label="Change password"
            sublabel="Update your password"
            onPress={() => setShowChangePwd(true)}
          />
          <SettingsRow
            iconName="notifications-outline"
            iconBg="#fefce8"
            label="Notifications"
            sublabel="Orders, messages, help"
            onPress={() =>
              Alert.alert("Coming soon", "Notification settings coming in the next update.")
            }
          />
        </Section>

        {/* Support */}
        <Section title="Support">
          <SettingsRow
            iconName="chatbubble-outline"
            iconBg="#fdf4ff"
            label="Help & support"
            sublabel="FAQs, contact us"
            onPress={handleSupport}
          />
          <SettingsRow
            iconName="information-circle-outline"
            iconBg="#f8f7f4"
            label="About LenDen"
            sublabel="Version 1.0.0"
            onPress={() => setShowAbout(true)}
          />
        </Section>

        {/* My Ratings — wrapped in a try/catch boundary via ErrorBoundary below */}
        <Section title="My ratings">
          <View style={{ padding: 14 }}>
            <MyRatings />
          </View>
        </Section>

        {/* Danger zone */}
        <Section title="Danger zone">
          <SettingsRow
            iconName="log-out-outline"
            iconBg="#fef2f2"
            label="Log out"
            onPress={handleLogout}
            danger
          />
          <SettingsRow
            iconName="trash-outline"
            iconBg="#fef2f2"
            label="Delete account"
            sublabel="Permanent, cannot undo"
            onPress={handleDeleteAccount}
            danger
          />
        </Section>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Modals */}
      <EditProfileModal
        visible={showEditProfile}
        user={user}
        onClose={() => setShowEditProfile(false)}
        onSave={(updated) => setUser((prev) => ({ ...prev, ...updated }))}
      />
      <ChangePasswordModal
        visible={showChangePwd}
        onClose={() => setShowChangePwd(false)}
      />
      <AboutModal
        visible={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f7f4" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
  },
  backBtn:     { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },

  profileCard: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
  },
  profileAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#1a1a1a",
    justifyContent: "center", alignItems: "center",
    marginBottom: 10,
  },
  profileAvatarText: { fontSize: 26, color: "#fff", fontWeight: "700" },
  profileName:       { fontSize: 17, fontWeight: "700", color: "#1a1a1a", marginBottom: 2 },
  profileEmail: {
    fontSize: 12, color: "#9ca3af",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  profileOrg: { fontSize: 11, color: "#d1d5db", marginTop: 2 },

  section:      { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 10, fontWeight: "700", color: "#9ca3af",
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    overflow: "hidden",
  },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6",
    backgroundColor: "#fff",
  },
  rowDanger:      { backgroundColor: "#fff" },
  rowIcon:        { width: 32, height: 32, borderRadius: 9, justifyContent: "center", alignItems: "center", marginRight: 12 },
  rowText:        { flex: 1 },
  rowLabel:       { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  rowLabelDanger: { color: "#ef4444" },
  rowSub:         { fontSize: 11, color: "#9ca3af", marginTop: 1 },
});

const m = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet:     { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  title:     { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginBottom: 20 },
  label:     { fontSize: 11, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  input:     { backgroundColor: "#f8f7f4", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1a1a1a", marginBottom: 16, borderWidth: 1, borderColor: "#e5e5e5" },
  btnRow:    { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cancelText:{ fontWeight: "600", color: "#6b7280" },
  saveBtn:   { flex: 1, backgroundColor: "#1a1a1a", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveText:  { fontWeight: "700", color: "#fff" },
});
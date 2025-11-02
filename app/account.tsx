import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../components/ThemeProvider";
import { useAuth } from "../src/features/auth/useAuth";
import { useRouter } from "expo-router";
import { GlassCard } from "../components/GlassCard";
import { supabase } from "../lib/supabase";

interface UserData {
  email: string;
  displayName: string;
  fullName?: string;
  avatarUrl?: string | null;
}

export default function Account() {
  const { colors } = useTheme();
  const { session, guest } = useAuth();
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, [session]);

  const loadUserData = async () => {
    try {
      setLoading(true);

      if (!supabase || !session?.user) {
        if (guest) {
          setUserData({
            email: "Guest User",
            displayName: "Guest",
          });
          setDisplayName("Guest");
        }
        return;
      }

      const { data, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (data?.user) {
        const email = data.user.email || "No email";
        const userDisplayName =
          data.user.user_metadata?.display_name ||
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.username ||
          (email.includes("@") ? email.split("@")[0] : "User");

        const fullName = data.user.user_metadata?.full_name || "";
        const avatarUrl = data.user.user_metadata?.avatar_url || null;

        const userDataObj: UserData = {
          email,
          displayName: userDisplayName,
          fullName,
          avatarUrl,
        };

        setUserData(userDataObj);
        setDisplayName(userDisplayName);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      Alert.alert("Error", "Failed to load user data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!supabase || !session?.user) {
      Alert.alert("Error", "You must be signed in to update your profile.");
      return;
    }

    if (!displayName.trim()) {
      Alert.alert("Error", "Display name cannot be empty.");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
        },
      });

      if (error) {
        throw error;
      }

      Alert.alert("Success", "Profile updated successfully!");
      await loadUserData();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", error.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!supabase || !session?.user?.email) {
      Alert.alert("Error", "You must be signed in to update your password.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long.");
      return;
    }

    Alert.alert(
      "Change Password",
      "Are you sure you want to change your password?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change",
          onPress: async () => {
            if (!supabase) return;

            try {
              setSaving(true);

              const { error } = await supabase.auth.updateUser({
                password: newPassword,
              });

              if (error) {
                throw error;
              }

              Alert.alert("Success", "Password changed successfully!");
              setNewPassword("");
            } catch (error: any) {
              console.error("Error changing password:", error);
              Alert.alert("Error", error.message || "Failed to change password. Please try again.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { borderColor: colors.primary + "40", backgroundColor: colors.cardBackground }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Account</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { borderColor: colors.primary + "40", backgroundColor: colors.cardBackground }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Account</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <GlassCard style={{ padding: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                borderWidth: 2,
                borderColor: colors.primary,
                backgroundColor: colors.cardBackground,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="person-circle" size={48} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
                {userData?.displayName || "User"}
              </Text>
              <Text style={{ color: colors.textSecondary }}>{userData?.email || "No email"}</Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={{ padding: 20, marginBottom: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Profile</Text>
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>Display name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              style={[styles.input, { borderColor: colors.primary + "40", color: colors.text, backgroundColor: colors.cardBackground }]}
              placeholder="Enter display name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={{ color: colors.background, fontWeight: "600" }}>Save profile</Text>
            )}
          </Pressable>
        </GlassCard>

        <GlassCard style={{ padding: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Security</Text>
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>New password</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              style={[styles.input, { borderColor: colors.primary + "40", color: colors.text, backgroundColor: colors.cardBackground }]}
              placeholder="Enter new password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />
          </View>
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
            onPress={handleChangePassword}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={{ color: colors.background, fontWeight: "600" }}>Update password</Text>
            )}
          </Pressable>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  actionButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 420,
  },
});

import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "../src/features/auth/useAuth";
import { supabase } from "../lib/supabase";
import { GlassCard } from "./GlassCard";
import { useRouter } from "expo-router";

interface UserData {
  email: string;
  displayName: string;
  profilePicture?: string | null;
}

export const AccountCard: React.FC = () => {
  const { colors } = useTheme();
  const { session, guest } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

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
            profilePicture: null,
          });
        }
        return;
      }

      const { data, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (data?.user) {
        const email = data.user.email || "No email";
        const displayName =
          data.user.user_metadata?.display_name ||
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.username ||
          (email.includes("@") ? email.split("@")[0] : "User");
        const profilePicture = data.user.user_metadata?.avatar_url || null;

        setUserData({
          email,
          displayName,
          profilePicture,
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setUserData({
        email: session?.user?.email || "Error loading email",
        displayName: "User",
        profilePicture: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    router.push("/account" as any);
  };

  if (loading) {
    return (
      <GlassCard style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </GlassCard>
    );
  }

  return (
    <Pressable onPress={handlePress}>
      <GlassCard style={styles.card}>
        <View style={styles.content}>
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.primary + "55",
              },
            ]}
          >
            {userData?.profilePicture ? (
              <Text>Profile Image</Text>
            ) : (
              <Ionicons name="person-circle-outline" size={36} color={colors.primary} />
            )}
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.displayName, { color: colors.text }]}>
              {userData?.displayName || "User"}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>
              {userData?.email || "No email"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
        </View>
      </GlassCard>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
    padding: 18,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: "700",
  },
  email: {
    marginTop: 2,
  },
});

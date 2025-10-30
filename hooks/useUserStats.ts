import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { UserStats } from '../types/supabase';

const USER_ID_KEY = 'focusup-user-id';

type ThemeMode = 'focus' | 'break';
type AttributeKey = 'PH' | 'CO' | 'EM' | 'SO';

// Helper function to check if string is a valid UUID
const isUuid = (s: string) => /^[0-9a-fA-F-]{36}$/.test(s);

const normalizeStats = (
  stats?: Partial<UserStats>,
  fallbackTotalSprints: number = 0
): UserStats => ({
  id: stats?.id ?? '',
  user_id: stats?.user_id ?? '',
  total_coins: stats?.total_coins ?? 40,
  current_streak: stats?.current_streak ?? 0,
  longest_streak: stats?.longest_streak ?? 0,
  total_focus_time: stats?.total_focus_time ?? 0,
  total_sessions: stats?.total_sessions ?? 0,
  total_sprints: stats?.total_sprints ?? fallbackTotalSprints,
  updated_at: stats?.updated_at ?? new Date().toISOString(),
});

export const useUserStats = () => {
  const [userStats, setUserStats] = useState<UserStats>(() => normalizeStats());
  const [loading, setLoading] = useState(true);
  const [profileImageUri, setProfileImageUriState] = useState<string | null>(null);

  const getUserId = async (): Promise<string> => {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  };

  const saveStatsLocally = async (userId: string, stats: UserStats) => {
    await AsyncStorage.setItem(`user-stats-${userId}`, JSON.stringify(stats));
  };

  const loadProfileImage = async (userId: string) => {
    try {
      const storedUri = await AsyncStorage.getItem(`profile-image-${userId}`);
      if (storedUri) {
        setProfileImageUriState(storedUri);
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const loadStats = async () => {
    try {
      const userId = await getUserId();

      let localStats: UserStats | null = null;
      try {
        const localRaw = await AsyncStorage.getItem(`user-stats-${userId}`);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          localStats = normalizeStats(parsed);
          setUserStats(localStats);
        }
      } catch (error) {
        console.error('Error parsing local stats:', error);
      }

      if (!supabase || !isUuid(userId)) {
        setLoading(false);
        loadProfileImage(userId);
        return;
      }

      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newStats, error: insertError } = await supabase
          .from('user_stats')
          .insert({
            user_id: userId,
            total_coins: 40,
            current_streak: 0,
            longest_streak: 0,
            total_focus_time: 0,
            total_sessions: 0,
          })
          .select()
          .single();

        if (!insertError && newStats) {
          const normalized = normalizeStats(newStats, localStats?.total_sprints ?? 0);
          setUserStats(normalized);
          await saveStatsLocally(userId, normalized);
          await loadProfileImage(userId);
        }
      } else if (!error && data) {
        const normalized = normalizeStats(data, localStats?.total_sprints ?? 0);
        setUserStats(normalized);
        await saveStatsLocally(userId, normalized);
        await loadProfileImage(userId);
      }
    } catch (err) {
      console.error('Error loading user stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const addCoins = async (amount: number) => {
    const newTotal = userStats.total_coins + amount;
    const updatedStats = { ...userStats, total_coins: newTotal };
    setUserStats(updatedStats);

    try {
      const userId = await getUserId();
      await saveStatsLocally(userId, updatedStats);

      if (supabase && isUuid(userId)) {
        await supabase
          .from('user_stats')
          .update({ total_coins: newTotal })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error updating coins:', error);
    }
  };

  const updateStreak = async (newStreak: number) => {
    const longestStreak = Math.max(userStats.longest_streak, newStreak);
    const updatedStats = {
      ...userStats,
      current_streak: newStreak,
      longest_streak: longestStreak,
    };
    setUserStats(updatedStats);

    try {
      const userId = await getUserId();
      await saveStatsLocally(userId, updatedStats);

      if (supabase && isUuid(userId)) {
        await supabase
          .from('user_stats')
          .update({
            current_streak: newStreak,
            longest_streak: longestStreak,
          })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  const addFocusSession = async (duration: number) => {
    const updatedStats = {
      ...userStats,
      total_focus_time: userStats.total_focus_time + duration,
      total_sessions: userStats.total_sessions + 1,
    };
    setUserStats(updatedStats);

    try {
      const userId = await getUserId();
      await saveStatsLocally(userId, updatedStats);

      if (supabase && isUuid(userId)) {
        await supabase
          .from('user_stats')
          .update({
            total_focus_time: updatedStats.total_focus_time,
            total_sessions: updatedStats.total_sessions,
          })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error updating focus session:', error);
    }
  };

  const incrementSprints = async (amount: number = 1) => {
    const updatedStats = {
      ...userStats,
      total_sprints: (userStats.total_sprints ?? 0) + amount,
    };
    setUserStats(updatedStats);

    try {
      const userId = await getUserId();
      await saveStatsLocally(userId, updatedStats);

      if (supabase && isUuid(userId)) {
        await supabase
          .from('user_stats')
          .update({ total_sprints: updatedStats.total_sprints })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.warn('Error updating total sprints remotely:', error);
    }
  };

  const addXP = async (attribute: AttributeKey, amount: number) => {
    try {
      // Get current attributes or use defaults
      const currentAttributes = userStats.attributes || { PH: 0, CO: 0, EM: 0, SO: 0 };

      // Add XP to the specified attribute
      const updatedAttributes = {
        ...currentAttributes,
        [attribute]: (currentAttributes[attribute] || 0) + amount,
      };

      const updatedStats = {
        ...userStats,
        attributes: updatedAttributes,
      };

      setUserStats(updatedStats);

      const userId = await getUserId();
      await saveStatsLocally(userId, updatedStats);

      if (supabase && isUuid(userId)) {
        await supabase
          .from('user_stats')
          .update({ attributes: updatedAttributes })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error updating XP:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return {
    userStats,
    loading,
    addCoins,
    addXP,
    updateStreak,
    addFocusSession,
    incrementSprints,
    refetch: loadStats,
    profileImageUri,
    setProfileImageUri: async (uri: string | null) => {
      setProfileImageUriState(uri);
      try {
        const userId = await getUserId();
        if (uri) {
          await AsyncStorage.setItem(`profile-image-${userId}`, uri);
        } else {
          await AsyncStorage.removeItem(`profile-image-${userId}`);
        }
      } catch (error) {
        console.error('Error saving profile image:', error);
      }
    },
  };
};

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { UserStats } from '../types/supabase';
import { RewardEngine } from '../src/features/rewards/RewardEngine';
import { DailyTracker } from '../src/features/rewards/DailyTracker';

const USER_ID_KEY = 'focusup-user-id';

let sharedProfileImageUri: string | null = null;
const profileImageListeners = new Set<(uri: string | null) => void>();

const emitProfileImage = (uri: string | null) => {
  sharedProfileImageUri = uri;
  profileImageListeners.forEach(listener => listener(uri));
};

type ThemeMode = 'focus' | 'break';
type AttributeKey = 'PH' | 'CO' | 'EM' | 'SO';

const rewardEngine = new RewardEngine();
const dailyTracker = new DailyTracker();

// Helper function to check if string is a valid UUID
const isUuid = (s: string) => /^[0-9a-fA-F-]{36}$/.test(s);

const normalizeStats = (
  stats?: Partial<UserStats>,
  fallbackTotalSprints: number = 0
): UserStats => ({
  id: stats?.id ?? '',
  user_id: stats?.user_id ?? '',
  total_coins: stats?.total_coins ?? 0,
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
  const [profileImageUri, setProfileImageUriState] = useState<string | null>(() => sharedProfileImageUri);

  useEffect(() => {
    const listener = (uri: string | null) => setProfileImageUriState(uri);
    profileImageListeners.add(listener);
    return () => {
      profileImageListeners.delete(listener);
    };
  }, []);

  const getUserId = async (): Promise<string> => {
    // First check if user is authenticated with Supabase
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        // If logged in with Google, use their Supabase user ID
        if (session?.user?.id) {
          return session.user.id; // ✅ Real Google OAuth ID
        }
      } catch (error) {
        console.error('Error getting session:', error);
      }
    }

    // Guest mode: Use local storage ID
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      // Generate guest ID (prefixed with 'guest_' for clarity)
      userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      setProfileImageUriState(storedUri);
      emitProfileImage(storedUri);
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
            total_coins: 0,
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
    try {
      const userId = await getUserId();
      const newTotal = userStats.total_coins + amount;

      // Update Supabase FIRST for authenticated users
      if (supabase && isUuid(userId)) {
        const { data, error } = await supabase
          .from('user_stats')
          .update({ total_coins: newTotal })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;

        // Sync with local state from database response
        if (data) {
          const normalized = normalizeStats(data, userStats.total_sprints);
          setUserStats(normalized);
          await saveStatsLocally(userId, normalized);
          return;
        }
      }

      // Fallback for guest users (local only)
      const updatedStats = { ...userStats, total_coins: newTotal };
      setUserStats(updatedStats);
      await saveStatsLocally(userId, updatedStats);
    } catch (error) {
      console.error('Error updating coins:', error);
      // Rollback on error - refetch from database
      await loadStats();
    }
  };

  const updateStreak = async (newStreak: number) => {
    try {
      const userId = await getUserId();
      const longestStreak = Math.max(userStats.longest_streak, newStreak);

      // Update Supabase FIRST for authenticated users
      if (supabase && isUuid(userId)) {
        const { data, error } = await supabase
          .from('user_stats')
          .update({
            current_streak: newStreak,
            longest_streak: longestStreak,
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;

        // Sync with local state from database response
        if (data) {
          const normalized = normalizeStats(data, userStats.total_sprints);
          setUserStats(normalized);
          await saveStatsLocally(userId, normalized);
          return;
        }
      }

      // Fallback for guest users (local only)
      const updatedStats = {
        ...userStats,
        current_streak: newStreak,
        longest_streak: longestStreak,
      };
      setUserStats(updatedStats);
      await saveStatsLocally(userId, updatedStats);
    } catch (error) {
      console.error('Error updating streak:', error);
      await loadStats();
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
      const userId = await getUserId();

      // Get current attributes or use defaults
      const currentAttributes = userStats.attributes || { PH: 0, CO: 0, EM: 0, SO: 0 };

      // Add XP to the specified attribute
      const updatedAttributes = {
        ...currentAttributes,
        [attribute]: (currentAttributes[attribute] || 0) + amount,
      };

      // Update Supabase FIRST for authenticated users
      if (supabase && isUuid(userId)) {
        const { data, error } = await supabase
          .from('user_stats')
          .update({ attributes: updatedAttributes })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;

        // Sync with local state from database response
        if (data) {
          const normalized = normalizeStats(data, userStats.total_sprints);
          setUserStats(normalized);
          await saveStatsLocally(userId, normalized);
          return;
        }
      }

      // Fallback for guest users (local only)
      const updatedStats = {
        ...userStats,
        attributes: updatedAttributes,
      };
      setUserStats(updatedStats);
      await saveStatsLocally(userId, updatedStats);
    } catch (error) {
      console.error('Error updating XP:', error);
      await loadStats();
    }
  };

  // NEW: Add XP with context and diminishing returns
  const addXPWithContext = async (
    attribute: AttributeKey,
    context: {
      duringFocus: boolean;
      streak: number;
    }
  ) => {
    const userId = await getUserId();
    const habitNumber = (await dailyTracker.getHabitCount(userId)) + 1;
    const allWorked = await dailyTracker.allAttributesWorkedToday(userId);

    const result = rewardEngine.calculateHabitXP({
      itemNumber: habitNumber,
      duringFocus: context.duringFocus,
      isDuplicate: false,
      isRapidCompletion: false,
      timeOfDay: new Date().getHours(),
      streak: context.streak,
      allAttributesWorkedToday: allWorked,
    });

    if (result.success) {
      await addXP(attribute, result.amount);
      await dailyTracker.incrementHabit(userId, attribute);
    }

    return result;
  };

  // NEW: Add coins with context and diminishing returns
  const addCoinsWithContext = async (
    priority: 'low' | 'medium' | 'high',
    context: {
      duringFocus: boolean;
      isDuplicate: boolean;
      isRapid: boolean;
    }
  ) => {
    const userId = await getUserId();
    const taskNumber = (await dailyTracker.getTaskCount(userId)) + 1;

    const result = rewardEngine.calculateTaskCoins(priority, {
      itemNumber: taskNumber,
      duringFocus: context.duringFocus,
      isDuplicate: context.isDuplicate,
      isRapidCompletion: context.isRapid,
      timeOfDay: new Date().getHours(),
      streak: userStats.current_streak,
      allAttributesWorkedToday: false,
    });

    if (result.success) {
      await addCoins(result.amount);
      await dailyTracker.incrementTask(userId);
    }

    return result;
  };

  // NEW: Get character level
  const getCharacterLevel = (): number => {
    const attributes = userStats.attributes || { PH: 0, CO: 0, EM: 0, SO: 0 };
    return rewardEngine.calculateCharacterLevel(attributes, userStats.total_coins);
  };

  // NEW: Check if can level up
  const checkLevelUp = () => {
    const currentLevel = getCharacterLevel();
    const attributes = userStats.attributes || { PH: 0, CO: 0, EM: 0, SO: 0 };
    return rewardEngine.canLevelUp(currentLevel, attributes, userStats.total_coins);
  };

  // NEW: Perform level up
  const levelUpCharacter = async (): Promise<boolean> => {
    const levelCheck = checkLevelUp();
    if (!levelCheck.canLevel || !levelCheck.cost) return false;

    await addCoins(-levelCheck.cost);
    return true;
  };

  /**
   * Migrate guest data to authenticated account when user signs in
   */
  const migrateGuestToAuth = async (guestId: string, authId: string) => {
    if (!supabase) return;

    console.log(`Migrating data from guest ${guestId} to auth ${authId}`);

    try {
      // 1. Migrate user_stats
      const { data: guestStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', guestId)
        .single();

      if (guestStats) {
        await supabase
          .from('user_stats')
          .upsert({
            user_id: authId,
            total_coins: guestStats.total_coins,
            current_streak: guestStats.current_streak,
            longest_streak: guestStats.longest_streak,
            total_focus_time: guestStats.total_focus_time,
            total_sessions: guestStats.total_sessions,
            total_sprints: guestStats.total_sprints,
            attributes: guestStats.attributes,
          });
      }

      // 2. Migrate tasks
      await supabase
        .from('tasks')
        .update({ user_id: authId })
        .eq('user_id', guestId);

      // 3. Migrate habits
      await supabase
        .from('habits')
        .update({ user_id: authId })
        .eq('user_id', guestId);

      // 4. Migrate habit_completions
      await supabase
        .from('habit_completions')
        .update({ user_id: authId })
        .eq('user_id', guestId);

      // 5. Migrate focus_sessions
      await supabase
        .from('focus_sessions')
        .update({ user_id: authId })
        .eq('user_id', guestId);

      console.log('✅ Migration complete');
    } catch (error) {
      console.error('Error migrating guest data:', error);
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
      emitProfileImage(uri);
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
    // NEW: Export new reward methods
    addXPWithContext,
    addCoinsWithContext,
    getCharacterLevel,
    checkLevelUp,
    levelUpCharacter,
    rewardEngine, // Export for UI use
    migrateGuestToAuth, // Export for auth migration
    getUserId, // Export for external use
  };
};

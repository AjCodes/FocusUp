import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert, Modal } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../src/features/auth/useAuth';
import { useTheme } from '../../components/ThemeProvider';
import { GlassCard } from '../../components/GlassCard';
import { TopBar } from '../../components/TopBar';
import { useUserStats } from '../../hooks/useUserStats';
import { Habit, HabitCompletion } from '../../types/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'focusup-user-id';
type FocusAttributeKey = 'PH' | 'CO' | 'EM' | 'SO';

const FOCUS_ATTRIBUTES: { key: FocusAttributeKey; label: string; emoji: string }[] = [
  { key: 'PH', label: 'Physical', emoji: '\u{1F4AA}' },
  { key: 'CO', label: 'Cognitive', emoji: '\u{1F9E0}' },
  { key: 'EM', label: 'Heart', emoji: '\u{2764}\u{FE0F}' },
  { key: 'SO', label: 'Soul', emoji: '\u{1F30C}' },
];

const normalizeFocusAttribute = (attr: string): FocusAttributeKey => {
  switch (attr) {
    case 'PH':
    case 'CO':
    case 'EM':
    case 'SO':
      return attr;
    case 'SP':
      return 'SO';
    default:
      return 'CO';
  }
};

export default function Habits() {
  const { colors } = useTheme();
  const { userStats, addCoins } = useUserStats();
  const { session } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabit, setNewHabit] = useState({
    title: '',
    cue: '',
    focus_attribute: 'CO' as FocusAttributeKey,
  });

  const getUserId = async (): Promise<string> => {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  };

  const loadHabits = async () => {
    try {
      const userId = await getUserId();
      const loadFromStorage = async () => {
        try {
          const localHabits = await AsyncStorage.getItem(`habits-${userId}`);
          if (localHabits) {
            const parsed: Habit[] = JSON.parse(localHabits).map((habit: Habit) => ({
              ...habit,
              focus_attribute: normalizeFocusAttribute(habit.focus_attribute as string) as Habit['focus_attribute'],
            }));
            setHabits(parsed);
          }
          const localCompletions = await AsyncStorage.getItem(`habit-completions-${userId}`);
          if (localCompletions) {
            setCompletions(JSON.parse(localCompletions));
          }
        } catch (storageError) {
          console.error('Error loading habits from storage:', storageError);
        }
      };
      await loadFromStorage();
      if (!supabase || !session?.user?.id) {
        setLoading(false);
        return;
      }
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      const { data: completionsData, error: completionsError } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('user_id', session.user.id);
      if (!habitsError && habitsData) {
        const normalized = (habitsData as Habit[]).map(habit => ({
          ...habit,
          focus_attribute: normalizeFocusAttribute(habit.focus_attribute as string) as Habit['focus_attribute'],
        }));
        setHabits(normalized);
        await AsyncStorage.setItem(`habits-${userId}`, JSON.stringify(normalized));
      } else if (habitsError) {
        console.warn('Supabase habit fetch failed, continuing with cached data:', habitsError.message);
      }
      if (!completionsError && completionsData) {
        setCompletions(completionsData as HabitCompletion[]);
        await AsyncStorage.setItem(`habit-completions-${userId}`, JSON.stringify(completionsData));
      } else if (completionsError) {
        console.warn('Supabase habit completion fetch failed:', completionsError.message);
      }
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const addHabit = async () => {
    if (!newHabit.title.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }
    try {
      const userId = await getUserId();
      const trimmedTitle = newHabit.title.trim();
      const trimmedCue = newHabit.cue.trim();
      let createdHabit: Habit | null = null;
      if (supabase && session?.user?.id) {
        const { data, error } = await supabase
          .from('habits')
          .insert({
            title: trimmedTitle,
            cue: trimmedCue || null,
            focus_attribute: newHabit.focus_attribute,
            user_id: session.user.id,
          })
          .select()
          .single();
        if (!error && data) {
          createdHabit = data as Habit;
        } else if (error) {
          console.warn('Supabase add habit failed, using local storage fallback:', error.message);
        }
      }
      if (!createdHabit) {
        createdHabit = {
          id: `habit_${Date.now()}`,
          title: trimmedTitle,
          cue: trimmedCue || null,
          focus_attribute: newHabit.focus_attribute,
          created_at: new Date().toISOString(),
          user_id: userId,
        };
      }
      const normalizedHabit: Habit = {
        ...createdHabit,
        focus_attribute: normalizeFocusAttribute(createdHabit.focus_attribute as string) as Habit['focus_attribute'],
      };
      setHabits(prev => {
        const updated = [normalizedHabit, ...prev];
        AsyncStorage.setItem(`habits-${userId}`, JSON.stringify(updated)).catch(err =>
          console.error('Error caching habits locally:', err)
        );
        return updated;
      });
      setNewHabit({ title: '', cue: '', focus_attribute: 'CO' as FocusAttributeKey });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding habit:', error);
      Alert.alert('Error', 'Failed to add habit');
    }
  };

  const toggleHabitCompletion = async (habit: Habit) => {
    try {
      const userId = await getUserId();
      const today = new Date().toDateString();
      const existingCompletion = completions.find(
        c => c.habit_id === habit.id && new Date(c.completed_at).toDateString() === today
      );
      if (existingCompletion) {
        if (!supabase || !session?.user?.id) {
          const updatedCompletions = completions.filter(c => c.id !== existingCompletion.id);
          setCompletions(updatedCompletions);
          await AsyncStorage.setItem(`habit-completions-${userId}`, JSON.stringify(updatedCompletions));
          return;
        }
        const { error } = await supabase
          .from('habit_completions')
          .delete()
          .eq('id', existingCompletion.id);
        if (!error) {
          setCompletions(prev => prev.filter(c => c.id !== existingCompletion.id));
          await AsyncStorage.setItem(`habit-completions-${userId}`, 
            JSON.stringify(completions.filter(c => c.id !== existingCompletion.id)));
        }
      } else {
        if (!supabase || !session?.user?.id) {
          const completion: HabitCompletion = {
            id: `completion_${Date.now()}`,
            habit_id: habit.id,
            completed_at: new Date().toISOString(),
            user_id: userId,
          };
          const updatedCompletions = [completion, ...completions];
          setCompletions(updatedCompletions);
          await AsyncStorage.setItem(`habit-completions-${userId}`, JSON.stringify(updatedCompletions));
          return;
        }
        const { data, error } = await supabase
          .from('habit_completions')
          .insert({
            habit_id: habit.id,
            user_id: session!.user!.id,
          })
          .select()
          .single();
        if (!error && data) {
          const completion = data as HabitCompletion;
          setCompletions(prev => {
            const updated = [completion, ...prev];
            AsyncStorage.setItem(`habit-completions-${userId}`, JSON.stringify(updated)).catch(err =>
              console.error('Error caching habit completions:', err)
            );
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Error toggling habit completion:', error);
    }
  };

  const deleteHabit = async (habit: Habit) => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = await getUserId();
              if (!supabase || !session?.user?.id) {
                const updatedHabits = habits.filter(h => h.id !== habit.id);
                const updatedCompletions = completions.filter(c => c.habit_id !== habit.id);
                setHabits(updatedHabits);
                setCompletions(updatedCompletions);
                await AsyncStorage.setItem(`habits-${userId}`, JSON.stringify(updatedHabits));
                await AsyncStorage.setItem(`habit-completions-${userId}`, JSON.stringify(updatedCompletions));
                return;
              }
              const { error } = await supabase
                .from('habits')
                .delete()
                .eq('id', habit.id);
              if (!error) {
                setHabits(prev => {
                  const updatedHabits = prev.filter(h => h.id !== habit.id);
                  AsyncStorage.setItem(`habits-${userId}`, JSON.stringify(updatedHabits)).catch(err =>
                    console.error('Error caching habits locally:', err)
                  );
                  return updatedHabits;
                });
                setCompletions(prev => {
                  const updatedCompletions = prev.filter(c => c.habit_id !== habit.id);
                  AsyncStorage.setItem(`habit-completions-${userId}`, JSON.stringify(updatedCompletions)).catch(err =>
                    console.error('Error caching habit completions locally:', err)
                  );
                  return updatedCompletions;
                });
              }
            } catch (error) {
              console.error('Error deleting habit:', error);
            }
          },
        },
      ]
    );
  };

  const getHabitStreak = (habitId: string) => {
    const habitCompletions = completions
      .filter(c => c.habit_id === habitId)
      .map(c => new Date(c.completed_at).toDateString())
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    if (habitCompletions.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < habitCompletions.length; i++) {
      const completionDate = new Date(habitCompletions[i]);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      if (completionDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const isCompletedToday = (habitId: string) => {
    const today = new Date().toDateString();
    return completions.some(
      c => c.habit_id === habitId && new Date(c.completed_at).toDateString() === today
    );
  };

  const getAttributeEmoji = (attribute: string) => {
    return FOCUS_ATTRIBUTES.find(a => a.key === attribute)?.emoji || '🎯';
  };

  useEffect(() => {
    loadHabits();
  }, []);

  const renderHabit = ({ item: habit }: { item: Habit }) => {
    const streak = getHabitStreak(habit.id);
    const completedToday = isCompletedToday(habit.id);
    return (
      <GlassCard key={habit.id} style={{ marginVertical: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => toggleHabitCompletion(habit)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: completedToday ? colors.success : colors.cardBackground,
              borderWidth: 2,
              borderColor: completedToday ? colors.success : colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {completedToday && <Text style={{ color: colors.background, fontSize: 16 }}>✓</Text>}
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600' }}>
                {habit.title}
              </Text>
              <Text style={{ fontSize: 14 }}>{getAttributeEmoji(habit.focus_attribute)}</Text>
            </View>
            {habit.cue && (
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                {habit.cue}
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                🔥 {streak} day streak
              </Text>
              {completedToday && (
                <Text style={{ fontSize: 12, color: colors.success }}>
                  +5 coins
                </Text>
              )}
            </View>
          </View>
          <Pressable
            onPress={() => deleteHabit(habit)}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: colors.cardBackground,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>🗑️</Text>
          </Pressable>
        </View>
      </GlassCard>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1E293B' }}>
      <View style={{ flex: 1, padding: 16, paddingTop: 60 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text }}>
            Daily Rituals
          </Text>
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: colors.background, fontWeight: '600' }}>+ Add</Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.textSecondary, marginBottom: 20, fontSize: 16 }}>
          Level up your consistency streaks and earn coins with every check-in.
        </Text>
        {loading ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>
            Loading habits...
          </Text>
        ) : habits.length === 0 ? (
          <GlassCard style={{ marginTop: 40 }}>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 16 }}>
              No habits yet
            </Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              Log a ritual to see its streak and mark it complete each day.
            </Text>
          </GlassCard>
        ) : (
          <FlatList
            data={habits}
            renderItem={renderHabit}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <GlassCard style={{ width: '100%', maxWidth: 400 }}>
            <Text style={{
              color: colors.text,
              fontSize: 20,
              fontWeight: 'bold',
              marginBottom: 20,
              textAlign: 'center',
            }}>
              Track a new ritual
            </Text>
            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
              Habit name
            </Text>
            <TextInput
              value={newHabit.title}
              onChangeText={(text) => setNewHabit(prev => ({ ...prev, title: text }))}
              placeholder="What habit do you want to build?"
              placeholderTextColor={colors.textSecondary}
              style={{
                backgroundColor: colors.cardBackground,
                borderWidth: 1,
                borderColor: colors.primary,
                borderRadius: 8,
                padding: 12,
                color: colors.text,
                marginBottom: 16,
              }}
            />
            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
              When, where, or why? (optional cue)
            </Text>
            <TextInput
              value={newHabit.cue}
              onChangeText={(text) => setNewHabit(prev => ({ ...prev, cue: text }))}
              placeholder="e.g., After morning coffee, Before bed"
              placeholderTextColor={colors.textSecondary}
              style={{
                backgroundColor: colors.cardBackground,
                borderWidth: 1,
                borderColor: colors.primary,
                borderRadius: 8,
                padding: 12,
                color: colors.text,
                marginBottom: 16,
              }}
            />
            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
              Attribute focus
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {FOCUS_ATTRIBUTES.map((attr) => (
                <Pressable
                  key={attr.key}
                  onPress={() => setNewHabit(prev => ({ ...prev, focus_attribute: attr.key as FocusAttributeKey }))}
                  style={{
                    backgroundColor: newHabit.focus_attribute === attr.key ? colors.primary : colors.cardBackground,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.primary,
                  }}
                >
                  <Text style={{
                    color: newHabit.focus_attribute === attr.key ? colors.background : colors.text,
                    fontSize: 12,
                    fontWeight: '600',
                  }}>
                    {attr.emoji} {attr.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => setShowAddModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: colors.cardBackground,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={addHabit}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.background, fontWeight: '600' }}>Add habit</Text>
              </Pressable>
            </View>
            <Text style={{
              color: colors.textSecondary,
              fontSize: 12,
              textAlign: 'center',
              marginTop: 12,
            }}>
              Progress resets each morning - keep your streak alive.
            </Text>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}



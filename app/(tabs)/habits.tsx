import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert, Modal, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../src/features/auth/useAuth';
import { useTheme } from '../../components/ThemeProvider';
import { GlassCard } from '../../components/GlassCard';
import { TopBar } from '../../components/TopBar';
import { useUserStats } from '../../hooks/useUserStats';
import { Habit, HabitCompletion } from '../../types/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppData } from '../../store/appData';
import { Ionicons } from '@expo/vector-icons';
import { SwipeableRow } from '../../components/SwipeableRow';

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
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [newHabit, setNewHabit] = useState({
    title: '',
    cue: '',
    focus_attribute: 'CO' as FocusAttributeKey,
  });

  // Use appData store
  const habits = useAppData(state => state.habits);
  const refreshAll = useAppData(state => state.refreshAll);
  const createHabit = useAppData(state => state.createHabit);
  const updateHabit = useAppData(state => state.updateHabit);
  const deleteHabit = useAppData(state => state.deleteHabit);

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
      const userId = session?.user?.id ?? await getUserId();
      
      // Load habits from store
      await refreshAll(userId);
      
      // Load completions separately (not in store yet)
      if (supabase && session?.user?.id) {
        const { data: completionsData, error: completionsError } = await supabase
          .from('habit_completions')
          .select('*')
          .eq('user_id', session.user.id);
        if (!completionsError && completionsData) {
          setCompletions(completionsData as HabitCompletion[]);
        }
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
      const userId = session?.user?.id ?? await getUserId();
      const trimmedTitle = newHabit.title.trim();
      const trimmedCue = newHabit.cue.trim();

      // Create habit - this already does optimistic update
      await createHabit(userId, trimmedTitle, trimmedCue || null, newHabit.focus_attribute);

      // Clear form immediately
      setNewHabit({ title: '', cue: '', focus_attribute: 'CO' as FocusAttributeKey });
      setShowAddModal(false);

      // Refresh after a short delay to ensure database sync (for authenticated users)
      // This won't overwrite the optimistic update due to duplicate checking
      setTimeout(async () => {
        try {
          await refreshAll(userId);
        } catch (err) {
          // Silent fail - optimistic update already showed the item
          console.warn('Background refresh failed:', err);
        }
      }, 500);
    } catch (error) {
      console.error('Error adding habit:', error);
      Alert.alert('Error', 'Failed to add habit');
    }
  };

  const editHabit = async () => {
    if (!editingHabit || !newHabit.title.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }
    try {
      const userId = session?.user?.id ?? await getUserId();
      const trimmedTitle = newHabit.title.trim();
      const trimmedCue = newHabit.cue.trim();

      // Update habit
      await updateHabit(editingHabit.id, {
        title: trimmedTitle,
        cue: trimmedCue || null,
        focus_attribute: newHabit.focus_attribute,
      }, userId);

      // Clear form immediately
      setNewHabit({ title: '', cue: '', focus_attribute: 'CO' as FocusAttributeKey });
      setEditingHabit(null);

      // Refresh after a short delay
      setTimeout(async () => {
        try {
          await refreshAll(userId);
        } catch (err) {
          console.warn('Background refresh failed:', err);
        }
      }, 300);
    } catch (error) {
      console.error('Error updating habit:', error);
      Alert.alert('Error', 'Failed to update habit');
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

  const deleteHabitHandler = async (habit: Habit) => {
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
              const userId = session?.user?.id ?? await getUserId();
              await deleteHabit(habit.id, userId);
              
              // Remove related completions
              const updatedCompletions = completions.filter(c => c.habit_id !== habit.id);
              setCompletions(updatedCompletions);
              
              // Refresh to sync
              await refreshAll(userId);
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
    const attr = FOCUS_ATTRIBUTES.find(a => a.key === habit.focus_attribute);
    
    return (
      <SwipeableRow
        key={habit.id}
        onSwipeRight={() => toggleHabitCompletion(habit)}
        onSwipeLeft={() => deleteHabitHandler(habit)}
        rightActionColor={colors.success}
        leftActionColor="#EF4444"
        rightIcon="checkmark-circle"
        leftIcon="trash"
      >
        <GlassCard style={{ marginVertical: 6 }} padding={20}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
            <Pressable
              onPress={() => toggleHabitCompletion(habit)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: completedToday ? colors.success : `${colors.background}35`,
                borderWidth: 2,
                borderColor: completedToday ? colors.success : `${colors.primary}55`,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: colors.primary,
                shadowOpacity: completedToday ? 0.3 : 0.12,
                shadowRadius: 6,
                elevation: completedToday ? 5 : 0,
              }}
            >
              <Ionicons
                name={completedToday ? 'checkmark' : 'ellipse-outline'}
                size={18}
                color={completedToday ? colors.background : `${colors.primary}AA`}
              />
            </Pressable>
            <Pressable style={{ flex: 1, gap: 6 }} onPress={() => {
              setEditingHabit(habit);
              setNewHabit({
                title: habit.title,
                cue: habit.cue || '',
                focus_attribute: habit.focus_attribute as FocusAttributeKey,
              });
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 17, color: colors.text, fontWeight: '600', flexShrink: 1 }}>
                  {habit.title}
                </Text>
                {attr && (
                  <View style={{
                    backgroundColor: `${colors.primary}22`,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: `${colors.primary}44`,
                  }}>
                    <Text style={{ fontSize: 12, color: colors.text }}>
                      {attr.emoji} {attr.label}
                    </Text>
                  </View>
                )}
              </View>
              {habit.cue && (
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' }}>
                  {habit.cue}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => deleteHabitHandler(habit)}
              style={{
                padding: 8,
                borderRadius: 10,
                backgroundColor: colors.cardBackground,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 2,
              }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{
                alignSelf: 'flex-start',
                backgroundColor: completedToday ? `${colors.success}26` : colors.cardBackground,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: completedToday ? `${colors.success}70` : `${colors.primary}22`,
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: completedToday ? colors.success : colors.textSecondary,
                }}>
                  {completedToday ? 'Completed - swipe to undo' : 'Tap card to edit'}
                </Text>
              </View>
            </View>
            <View style={{
              backgroundColor: `${colors.primary}28`,
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: `${colors.primary}55`,
            }}>
              <Text style={{ fontSize: 12, color: colors.text, fontWeight: '700', letterSpacing: 0.3 }}>
                {streak} day streak!!
              </Text>
            </View>
          </View>
        </GlassCard>
      </SwipeableRow>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: 16, paddingTop: 60 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text }}>
            Daily Rituals
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            {habits.length} rituals
          </Text>
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
            contentContainerStyle={{ paddingBottom: 140, paddingTop: 4 }}
          />
        )}
      </View>
      <Pressable
        onPress={() => setShowAddModal(true)}
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]}
      >
        <Ionicons name="add" size={26} color={colors.background} />
      </Pressable>
      <Modal
        visible={showAddModal || !!editingHabit}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setEditingHabit(null);
          setNewHabit({ title: '', cue: '', focus_attribute: 'CO' as FocusAttributeKey });
        }}
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
              {editingHabit ? 'Edit Ritual' : 'Track a new ritual'}
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
                onPress={() => {
                  setShowAddModal(false);
                  setEditingHabit(null);
                  setNewHabit({ title: '', cue: '', focus_attribute: 'CO' as FocusAttributeKey });
                }}
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
                onPress={editingHabit ? editHabit : addHabit}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.background, fontWeight: '600' }}>
                  {editingHabit ? 'Update habit' : 'Add habit'}
                </Text>
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

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
});


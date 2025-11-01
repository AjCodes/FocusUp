import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useTheme } from './ThemeProvider';
import { GlassCard } from './GlassCard';
import { useAppData } from '../store/appData';
import type { Task, Habit, FocusSessionTask, FocusSessionHabit } from '../types/supabase';
import { Ionicons } from '@expo/vector-icons';
import type { AttributeKey } from '../src/features/rewards/types';

const FOCUS_ATTRIBUTES = {
  PH: { label: 'Physical', emoji: '💪', color: '#10B981' },
  CO: { label: 'Cognitive', emoji: '🧠', color: '#3B82F6' },
  EM: { label: 'Heart', emoji: '❤️', color: '#EF4444' },
  SO: { label: 'Soul', emoji: '🌌', color: '#8B5CF6' },
};

const WELL_DONE_MESSAGES = [
  'Excellent work! 🎯',
  'You\'re crushing it! 💪',
  'Keep up the momentum! 🚀',
  'Outstanding focus! ⭐',
  'You\'re on fire! 🔥',
];

interface EndSessionModalProps {
  visible: boolean;
  sessionId: string | null;
  userId: string;
  duration: number;
  onClose: () => void;
  onEnterBreak: () => void;
}

export const EndSessionModal: React.FC<EndSessionModalProps> = ({
  visible,
  sessionId,
  userId,
  duration,
  onClose,
  onEnterBreak,
}) => {
  const { colors } = useTheme();
  const tasks = useAppData(state => state.tasks);
  const habits = useAppData(state => state.habits);
  const sessionTasks = useAppData(state => state.sessionTasks);
  const sessionHabits = useAppData(state => state.sessionHabits);
  const completeSession = useAppData(state => state.completeSession);
  
  const [doneTaskIds, setDoneTaskIds] = useState<Set<string>>(new Set());
  const [performedHabitIds, setPerformedHabitIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [rewards, setRewards] = useState<{
    coins: number;
    xp: Record<AttributeKey, number>;
    messages: string[];
  } | null>(null);
  
  // Animated values
  const coinsAnim = useRef(new Animated.Value(0)).current;
  const xpAnims = useRef({
    PH: new Animated.Value(0),
    CO: new Animated.Value(0),
    EM: new Animated.Value(0),
    SO: new Animated.Value(0),
  }).current;
  const [message] = useState(WELL_DONE_MESSAGES[Math.floor(Math.random() * WELL_DONE_MESSAGES.length)]);

  // Get tasks and habits for this session
  const sessionTaskItems = sessionTasks
    .map(st => tasks.find(t => t.id === st.task_id))
    .filter((t): t is Task => t !== undefined);
  
  const sessionHabitItems = sessionHabits
    .map(sh => habits.find(h => h.id === sh.habit_id))
    .filter((h): h is Habit => h !== undefined);

  useEffect(() => {
    if (visible && sessionTaskItems.length === 0 && sessionHabitItems.length === 0) {
      // Auto-complete if nothing selected
      setTimeout(() => {
        handleConfirm();
      }, 1000);
    }
  }, [visible]);

  const animateValue = (animValue: Animated.Value, toValue: number, duration: number = 1500) => {
    return Animated.timing(animValue, {
      toValue,
      duration,
      useNativeDriver: false,
    });
  };

  const handleConfirm = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      const result = await completeSession({
        sessionId,
        doneTaskIds: Array.from(doneTaskIds),
        performedHabitIds: Array.from(performedHabitIds),
        userId,
        duration,
      });

      setRewards(result);
      setCompleted(true);

      // Animate counters
      Animated.parallel([
        animateValue(coinsAnim, result.coins),
        animateValue(xpAnims.PH, result.xp.PH),
        animateValue(xpAnims.CO, result.xp.CO),
        animateValue(xpAnims.EM, result.xp.EM),
        animateValue(xpAnims.SO, result.xp.SO),
      ]).start();
    } catch (error: any) {
      console.error('Error completing session:', error);
      // Handle error - maybe show error message
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = (taskId: string) => {
    setDoneTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleHabitToggle = (habitId: string) => {
    setPerformedHabitIds(prev => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        next.delete(habitId);
      } else {
        next.add(habitId);
      }
      return next;
    });
  };

  const handleEnterBreak = () => {
    setDoneTaskIds(new Set());
    setPerformedHabitIds(new Set());
    setCompleted(false);
    setRewards(null);
    coinsAnim.setValue(0);
    Object.values(xpAnims).forEach(anim => anim.setValue(0));
    onEnterBreak();
    onClose();
  };

  // Use state for display values - update via intervals during animation
  const [coinsDisplay, setCoinsDisplay] = useState(0);
  const [xpDisplays, setXpDisplays] = useState<Record<AttributeKey, number>>({ PH: 0, CO: 0, EM: 0, SO: 0 });

  // Update display values during animation
  useEffect(() => {
    if (!completed || !rewards) return;
    
    let frameCount = 0;
    const maxFrames = 30; // ~1.5 seconds at 20fps
    
    const updateInterval = setInterval(() => {
      frameCount++;
      
      // Calculate progress (0 to 1)
      const progress = Math.min(frameCount / maxFrames, 1);
      
      // Update coins
      setCoinsDisplay(Math.floor(rewards.coins * progress));
      
      // Update XP
      setXpDisplays({
        PH: Math.floor(rewards.xp.PH * progress),
        CO: Math.floor(rewards.xp.CO * progress),
        EM: Math.floor(rewards.xp.EM * progress),
        SO: Math.floor(rewards.xp.SO * progress),
      });
      
      if (frameCount >= maxFrames) {
        clearInterval(updateInterval);
        setCoinsDisplay(rewards.coins);
        setXpDisplays(rewards.xp);
      }
    }, 50);
    
    return () => clearInterval(updateInterval);
  }, [completed, rewards]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <GlassCard style={styles.modalCard}>
          {!completed ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>
                Session Complete!
              </Text>

              {/* Tasks Section */}
              {sessionTaskItems.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Tasks
                  </Text>
                  <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                    {sessionTaskItems.map((task) => {
                      const isDone = doneTaskIds.has(task.id);
                      return (
                        <Pressable
                          key={task.id}
                          onPress={() => handleTaskToggle(task.id)}
                          style={[
                            styles.item,
                            {
                              backgroundColor: isDone
                                ? colors.success + '20'
                                : colors.cardBackground,
                              borderColor: isDone ? colors.success : colors.primary + '40',
                            }
                          ]}
                        >
                          <View style={styles.itemContent}>
                            <View style={[
                              styles.checkbox,
                              {
                                backgroundColor: isDone ? colors.success : 'transparent',
                                borderColor: colors.success,
                              }
                            ]}>
                              {isDone && (
                                <Ionicons name="checkmark" size={16} color={colors.background} />
                              )}
                            </View>
                            <Text style={[styles.itemText, { color: colors.text, flex: 1 }]}>
                              {task.title}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Habits Section */}
              {sessionHabitItems.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Habits
                  </Text>
                  <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                    {sessionHabitItems.map((habit) => {
                      const isPerformed = performedHabitIds.has(habit.id);
                      const attr = FOCUS_ATTRIBUTES[habit.focus_attribute];
                      return (
                        <Pressable
                          key={habit.id}
                          onPress={() => handleHabitToggle(habit.id)}
                          style={[
                            styles.item,
                            {
                              backgroundColor: isPerformed
                                ? attr.color + '20'
                                : colors.cardBackground,
                              borderColor: isPerformed ? attr.color : colors.primary + '40',
                            }
                          ]}
                        >
                          <View style={styles.itemContent}>
                            <View style={[
                              styles.checkbox,
                              {
                                backgroundColor: isPerformed ? attr.color : 'transparent',
                                borderColor: attr.color,
                              }
                            ]}>
                              {isPerformed && (
                                <Ionicons name="checkmark" size={16} color={colors.background} />
                              )}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={[styles.itemText, { color: colors.text }]}>
                                  {habit.title}
                                </Text>
                                <Text style={{ fontSize: 14 }}>{attr.emoji}</Text>
                              </View>
                              {habit.cue && (
                                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                                  {habit.cue}
                                </Text>
                              )}
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Footer */}
              <View style={styles.footer}>
                <Pressable
                  onPress={handleConfirm}
                  disabled={loading}
                  style={[
                    styles.button,
                    styles.confirmButton,
                    {
                      backgroundColor: loading ? colors.cardBackground : colors.primary,
                      opacity: loading ? 0.5 : 1,
                    }
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={{ color: colors.background, fontWeight: '600' }}>
                      Complete Session
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {/* Rewards Display */}
              <Text style={[styles.title, { color: colors.text }]}>
                {message}
              </Text>

              {/* Coins */}
              <View style={styles.rewardItem}>
                <Text style={[styles.rewardLabel, { color: colors.textSecondary }]}>Coins</Text>
                <Text style={[styles.rewardValue, { color: colors.success }]}>
                  +{completed ? coinsDisplay : (rewards?.coins || 0)}
                </Text>
              </View>

              {/* XP by Attribute */}
              {(rewards?.xp.PH || 0) + (rewards?.xp.CO || 0) + (rewards?.xp.EM || 0) + (rewards?.xp.SO || 0) > 0 && (
                <View style={styles.xpSection}>
                  <Text style={[styles.xpSectionTitle, { color: colors.textSecondary }]}>Experience</Text>
                  {Object.entries(FOCUS_ATTRIBUTES).map(([key, attr]) => {
                    const xp = rewards?.xp[key as AttributeKey] || 0;
                    if (xp === 0) return null;
                    return (
                      <View key={key} style={styles.xpItem}>
                        <Text style={{ fontSize: 16 }}>{attr.emoji}</Text>
                        <Text style={[styles.xpLabel, { color: colors.text }]}>{attr.label}</Text>
                      <Text style={[styles.xpValue, { color: attr.color }]}>
                        +{completed ? xpDisplays[key as AttributeKey] : xp}
                      </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Messages */}
              {rewards?.messages && rewards.messages.length > 0 && (
                <View style={styles.messagesSection}>
                  {rewards.messages.map((msg, idx) => (
                    <Text key={idx} style={[styles.messageText, { color: colors.textSecondary }]}>
                      {msg}
                    </Text>
                  ))}
                </View>
              )}

              {/* Enter Break Button */}
              <View style={styles.footer}>
                <Pressable
                  onPress={handleEnterBreak}
                  style={[styles.button, styles.breakButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={{ color: colors.background, fontWeight: '600' }}>
                    Enter Break Mode
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  list: {
    maxHeight: 200,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    marginTop: 20,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  breakButton: {
    // backgroundColor set dynamically
  },
  rewardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  rewardLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  rewardValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  xpSection: {
    marginTop: 16,
  },
  xpSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  xpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  xpLabel: {
    flex: 1,
    fontSize: 14,
  },
  xpValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  messagesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  messageText: {
    fontSize: 13,
    marginBottom: 4,
  },
});


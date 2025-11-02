import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { GlassCard } from './GlassCard';
import { useAppData } from '../store/appData';
import type { Task, Habit } from '../types/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/features/auth/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FOCUS_ATTRIBUTES = {
  PH: { label: 'Physical', emoji: '💪', color: '#10B981' },
  CO: { label: 'Cognitive', emoji: '🧠', color: '#3B82F6' },
  EM: { label: 'Heart', emoji: '❤️', color: '#EF4444' },
  SO: { label: 'Soul', emoji: '🌌', color: '#8B5CF6' },
};

interface FocusSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (taskIds: string[], habitIds: string[]) => void;
}

export const FocusSelectModal: React.FC<FocusSelectModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const { colors } = useTheme();
  const { session } = useAuth();
  const tasks = useAppData(state => state.tasks);
  const habits = useAppData(state => state.habits);
  const refreshAll = useAppData(state => state.refreshAll);
  const [activeTab, setActiveTab] = useState<'tasks' | 'habits'>('tasks');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedHabitIds, setSelectedHabitIds] = useState<Set<string>>(new Set());

  // Refresh data when modal opens
  useEffect(() => {
    if (visible) {
      const loadData = async () => {
        const userId = session?.user?.id ?? await AsyncStorage.getItem('focusup-user-id') ?? '';
        if (userId) {
          await refreshAll(userId);
        }
      };
      loadData();
    }
  }, [visible]);

  // Filter incomplete tasks
  const incompleteTasks = tasks.filter(task => !task.done);

  const handleTaskToggle = (taskId: string) => {
    setSelectedTaskIds(prev => {
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
    setSelectedHabitIds(prev => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        next.delete(habitId);
      } else {
        next.add(habitId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedTaskIds), Array.from(selectedHabitIds));
    setSelectedTaskIds(new Set());
    setSelectedHabitIds(new Set());
    onClose();
  };

  const handleClose = () => {
    setSelectedTaskIds(new Set());
    setSelectedHabitIds(new Set());
    onClose();
  };

  const totalSelected = selectedTaskIds.size + selectedHabitIds.size;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={handleClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()} style={{ maxHeight: '85%', width: '100%' }}>
          <GlassCard style={styles.modalCard}>
            <Text style={[styles.title, { color: colors.text }]}>
              Select Tasks & Habits
            </Text>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <Pressable
                onPress={() => setActiveTab('tasks')}
                style={[
                  styles.tab,
                  activeTab === 'tasks' && { backgroundColor: colors.primary }
                ]}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'tasks' ? colors.background : colors.textSecondary }
                ]}>
                  Tasks
                </Text>
                {activeTab === 'tasks' && selectedTaskIds.size > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.background }]}>
                    <Text style={[styles.badgeText, { color: colors.primary }]}>
                      {selectedTaskIds.size}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('habits')}
                style={[
                  styles.tab,
                  activeTab === 'habits' && { backgroundColor: colors.primary }
                ]}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'habits' ? colors.background : colors.textSecondary }
                ]}>
                  Habits
                </Text>
                {activeTab === 'habits' && selectedHabitIds.size > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.background }]}>
                    <Text style={[styles.badgeText, { color: colors.primary }]}>
                      {selectedHabitIds.size}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <View style={styles.content}>
                {incompleteTasks.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="clipboard-outline" size={48} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                      No tasks available
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                      Create tasks first to add to your session
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 8 }}
                  >
                    {incompleteTasks.map((task) => {
                      const isSelected = selectedTaskIds.has(task.id);
                      return (
                        <Pressable
                          key={task.id}
                          onPress={() => handleTaskToggle(task.id)}
                          style={[
                            styles.item,
                            {
                              backgroundColor: isSelected
                                ? colors.primary + '30'
                                : colors.cardBackground,
                              borderColor: isSelected ? colors.primary : colors.primary + '40',
                            }
                          ]}
                        >
                          <View style={styles.itemContent}>
                            <View style={[
                              styles.checkbox,
                              {
                                backgroundColor: isSelected ? colors.primary : 'transparent',
                                borderColor: colors.primary,
                              }
                            ]}>
                              {isSelected && (
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
                )}
              </View>
            )}

            {/* Habits Tab */}
            {activeTab === 'habits' && (
              <View style={styles.content}>
                {habits.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="fitness-outline" size={48} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                      No habits available
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                      Create a habit first to add to your session
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 8 }}
                  >
                    {habits.map((habit) => {
                      const isSelected = selectedHabitIds.has(habit.id);
                      const attr = FOCUS_ATTRIBUTES[habit.focus_attribute];
                      return (
                        <Pressable
                          key={habit.id}
                          onPress={() => handleHabitToggle(habit.id)}
                          style={[
                            styles.item,
                            {
                              backgroundColor: isSelected
                                ? colors.primary + '30'
                                : colors.cardBackground,
                              borderColor: isSelected ? colors.primary : colors.primary + '40',
                            }
                          ]}
                        >
                          <View style={styles.itemContent}>
                            <View style={[
                              styles.checkbox,
                              {
                                backgroundColor: isSelected ? colors.primary : 'transparent',
                                borderColor: colors.primary,
                              }
                            ]}>
                              {isSelected && (
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
                )}
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Pressable
                onPress={handleConfirm}
                disabled={totalSelected === 0}
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor: totalSelected === 0 ? colors.cardBackground : colors.primary,
                    opacity: totalSelected === 0 ? 0.5 : 1,
                    borderColor: totalSelected === 0 ? colors.primary + '40' : colors.primary,
                    shadowColor: colors.primary,
                  }
                ]}
              >
                <Text style={{
                  color: totalSelected === 0 ? colors.textSecondary : colors.background,
                  fontWeight: '700',
                  fontSize: 16,
                }}>
                  {totalSelected === 0 ? 'Select items to continue' : `Confirm (${totalSelected} selected)`}
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: '95%',
    minWidth: 320,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    minHeight: 150,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  list: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1.5,
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
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  confirmButton: {
    minWidth: '70%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
});

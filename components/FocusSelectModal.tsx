import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (visible) {
      const loadData = async () => {
        const userId = session?.user?.id ?? (await AsyncStorage.getItem('focusup-user-id')) ?? '';
        if (userId) {
          await refreshAll(userId);
        }
      };
      loadData();
    }
  }, [visible]);

  const incompleteTasks = tasks.filter(task => !task.done);

  const handleTaskToggle = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const handleHabitToggle = (habitId: string) => {
    setSelectedHabitIds(prev => {
      const next = new Set(prev);
      next.has(habitId) ? next.delete(habitId) : next.add(habitId);
      return next;
    });
  };

  const handleConfirm = async () => {
    const taskIdsArray = Array.from(selectedTaskIds);
    const habitIdsArray = Array.from(selectedHabitIds);

    console.log('🎯 Modal handleConfirm called with:', { taskIdsArray, habitIdsArray });

    // Clear selections first
    setSelectedTaskIds(new Set());
    setSelectedHabitIds(new Set());

    // Call the parent's onConfirm and wait for it
    await onConfirm(taskIdsArray, habitIdsArray);

    console.log('✅ Modal onConfirm completed');
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
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable onPress={e => e.stopPropagation()} style={styles.cardWrapper}>
          <GlassCard style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}> 
            <Text style={[styles.title, { color: colors.text }]}>Select Tasks & Habits</Text>

            <View style={styles.tabContainer}>
              <Pressable
                onPress={() => setActiveTab('tasks')}
                style={[
                  styles.tab,
                  {
                    backgroundColor: activeTab === 'tasks' ? colors.primary : colors.cardBackground,
                    borderColor: colors.primary + '40',
                  },
                ]}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'tasks' ? colors.background : colors.text },
                ]}>
                  Tasks
                </Text>
                {selectedTaskIds.size > 0 && (
                  <View style={styles.badge}>
                    <Text style={{ color: colors.background, fontSize: 12 }}>{selectedTaskIds.size}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('habits')}
                style={[
                  styles.tab,
                  {
                    backgroundColor: activeTab === 'habits' ? colors.primary : colors.cardBackground,
                    borderColor: colors.primary + '40',
                  },
                ]}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'habits' ? colors.background : colors.text },
                ]}>
                  Habits
                </Text>
                {selectedHabitIds.size > 0 && (
                  <View style={styles.badge}>
                    <Text style={{ color: colors.background, fontSize: 12 }}>{selectedHabitIds.size}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            <View style={styles.content}>
              {activeTab === 'tasks' ? (
                incompleteTasks.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="list-outline" size={42} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No tasks ready.</Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                    {incompleteTasks.map(task => {
                      const isSelected = selectedTaskIds.has(task.id);
                      return (
                        <Pressable
                          key={task.id}
                          onPress={() => handleTaskToggle(task.id)}
                          style={[
                            styles.item,
                            {
                              backgroundColor: isSelected ? colors.primary + '30' : colors.cardBackground,
                              borderColor: isSelected ? colors.primary : colors.cardBackground,
                            },
                          ]}
                        >
                          <Ionicons
                            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                            size={22}
                            color={isSelected ? colors.primary : colors.textSecondary}
                            style={{ marginRight: 12 }}
                          />
                          <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>{task.title}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )
              ) : habits.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="fitness-outline" size={42} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No habits saved yet.</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                  {habits.map(habit => {
                    const isSelected = selectedHabitIds.has(habit.id);
                    const attr = FOCUS_ATTRIBUTES[habit.focus_attribute as keyof typeof FOCUS_ATTRIBUTES];
                    return (
                      <Pressable
                        key={habit.id}
                        onPress={() => handleHabitToggle(habit.id)}
                        style={[
                          styles.item,
                          {
                            backgroundColor: isSelected ? colors.primary + '30' : colors.cardBackground,
                            borderColor: isSelected ? colors.primary : colors.cardBackground,
                          },
                        ]}
                      >
                        <View style={{ marginRight: 12, flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={isSelected ? colors.primary : colors.textSecondary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{habit.title}</Text>
                          {habit.cue ? (
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{habit.cue}</Text>
                          ) : null}
                        </View>
                        <View style={{ backgroundColor: attr.color + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                          <Text style={{ color: attr.color, fontSize: 12 }}>{attr.emoji}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.footer}>
              <Pressable
                onPress={handleClose}
                style={[styles.footerButton, { backgroundColor: colors.cardBackground, borderColor: colors.primary + '40' }]}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                disabled={totalSelected === 0}
                style={[
                  styles.footerButton,
                  {
                    backgroundColor: totalSelected === 0 ? colors.cardBackground : colors.primary,
                    opacity: totalSelected === 0 ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={{ color: totalSelected === 0 ? colors.textSecondary : colors.background, fontWeight: '700' }}>
                  Confirm ({totalSelected})
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
    backgroundColor: 'rgba(4,6,20,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  modalCard: {
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  content: {
    maxHeight: 380,
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
});

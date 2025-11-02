import React, { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../src/features/auth/useAuth";
import { useTheme } from "../../components/ThemeProvider";
import { GlassCard } from "../../components/GlassCard";
import { Task } from "../../types/supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleError, showSuccess } from "../../utils/errorHandler";
import { useLoading } from "../../hooks/useLoading";
import { STORAGE_KEYS } from "../../src/constants/app";
import { useAppData } from "../../store/appData";
import { Ionicons } from "@expo/vector-icons";
import { SwipeableRow } from "../../components/SwipeableRow";
import { AddTaskModal, TaskDraft } from "../../components/AddTaskModal";

export default function Tasks() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const { loading, withLoading } = useLoading(true);
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});
  const [showComposer, setShowComposer] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Use appData store
  const allTasks = useAppData(state => state.tasks);
  const refreshAll = useAppData(state => state.refreshAll);
  const createTask = useAppData(state => state.createTask);
  const updateTask = useAppData(state => state.updateTask);
  const deleteTask = useAppData(state => state.deleteTask);

  // Filter tasks by tab
  const activeTasks = allTasks.filter(t => !t.done).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const completedTasks = allTasks.filter(t => t.done).sort((a, b) => {
    const aDate = a.completed_at ? new Date(a.completed_at).getTime() : 0;
    const bDate = b.completed_at ? new Date(b.completed_at).getTime() : 0;
    return bDate - aDate;
  });

  const getUserId = async (): Promise<string> => {
    let userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
    }
    return userId;
  };

  async function load() {
    await withLoading((async () => {
      try {
        const userId = session?.user?.id ?? await getUserId();
        await refreshAll(userId);
      } catch (error) {
        handleError(error, 'Load tasks');
      }
    })());
  }

  const handleCreateTask = async (draft: TaskDraft) => {
    setCreatingTask(true);
    try {
      const userId = session?.user?.id ?? await getUserId();
      await createTask(userId, draft.title, draft.description, draft.deadline_at ?? null);
      showSuccess('Quest added!', 'Lock it into a sprint to earn rewards.');

      setTimeout(async () => {
        try {
          await refreshAll(userId);
        } catch (err) {
          console.warn('Background refresh failed:', err);
        }
      }, 300);
    } catch (error) {
      handleError(error, 'Add task');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleEditTask = async (draft: TaskDraft) => {
    if (!editingTask) return;
    setCreatingTask(true);
    try {
      const userId = session?.user?.id ?? await getUserId();
      await updateTask(editingTask.id, {
        title: draft.title,
        description: draft.description || null,
        deadline_at: draft.deadline_at,
      }, userId);
      showSuccess('Quest updated!');
      setEditingTask(null);

      setTimeout(async () => {
        try {
          await refreshAll(userId);
        } catch (err) {
          console.warn('Background refresh failed:', err);
        }
      }, 300);
    } catch (error) {
      handleError(error, 'Update task');
    } finally {
      setCreatingTask(false);
    }
  };

  async function toggle(task: Task) {
    setOperationLoading(prev => ({ ...prev, [task.id]: true }));
    try {
      const userId = session?.user?.id ?? await getUserId();
      const newDoneState = !task.done;

      // Update via store (includes optimistic update)
      await updateTask(task.id, {
        done: newDoneState,
        completed_at: newDoneState ? new Date().toISOString() : null,
      }, userId);

      // Refresh to ensure sync
      await refreshAll(userId);

      // Show completion message
      if (newDoneState) {
        showSuccess('Quest completed!', 'Finish your sprint to earn coins');
      }
    } catch (error) {
      handleError(error, 'Toggle task');
    } finally {
      setOperationLoading(prev => ({ ...prev, [task.id]: false }));
    }
  }

  async function remove(task: Task) {
    Alert.alert(
      'Delete Quest',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setOperationLoading(prev => ({ ...prev, [`delete_${task.id}`]: true }));
            try {
              const userId = session?.user?.id ?? await getUserId();
              await deleteTask(task.id, userId);
              await refreshAll(userId);
              showSuccess('Quest deleted');
            } catch (error) {
              handleError(error, 'Delete task');
            } finally {
              setOperationLoading(prev => ({ ...prev, [`delete_${task.id}`]: false }));
            }
          },
        },
      ]
    );
  }

  useEffect(() => { load(); }, []);

  const formatDeadline = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateStr = parsed.toDateString();
    if (dateStr === today.toDateString()) return 'Today';
    if (dateStr === tomorrow.toDateString()) return 'Tomorrow';

    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getDeadlineColor = (deadline?: string | null) => {
    if (!deadline) return colors.textSecondary;

    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '#EF4444'; // Overdue - red
    if (diffDays === 0) return '#F59E0B'; // Today - amber
    if (diffDays === 1) return '#F59E0B'; // Tomorrow - amber
    if (diffDays <= 3) return '#10B981'; // Due soon - green
    return colors.textSecondary; // Future - gray
  };

  const renderTask = ({ item: task }: { item: Task }) => {
    const isLoading = operationLoading[task.id];
    const deadlineLabel = formatDeadline(task.deadline_at);

    return (
      <SwipeableRow
        key={task.id}
        onSwipeRight={!task.done ? () => toggle(task) : undefined}
        onSwipeLeft={() => remove(task)}
        rightActionColor={colors.success}
        leftActionColor="#EF4444"
        rightIcon="checkmark-circle"
        leftIcon="trash"
        disabled={isLoading}
      >
        <GlassCard style={{ marginVertical: 6, opacity: isLoading ? 0.6 : 1 }} padding={20}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
            <Pressable
              onPress={() => toggle(task)}
              disabled={isLoading}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: task.done ? colors.success : `${colors.background}35`,
                borderWidth: 2,
                borderColor: task.done ? colors.success : `${colors.primary}55`,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: colors.primary,
                shadowOpacity: task.done ? 0.3 : 0.12,
                shadowRadius: 6,
                elevation: task.done ? 5 : 0,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={task.done ? colors.background : colors.primary} />
              ) : (
                <Ionicons
                  name={task.done ? 'checkmark' : 'ellipse-outline'}
                  size={20}
                  color={task.done ? colors.background : `${colors.primary}AA`}
                />
              )}
            </Pressable>
            <Pressable style={{ flex: 1, gap: 8 }} onPress={() => setEditingTask(task)}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 17,
                  fontWeight: '600',
                  textDecorationLine: task.done ? 'line-through' : 'none',
                  opacity: task.done ? 0.6 : 1,
                }}
              >
                {task.title}
              </Text>
              {task.description ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                  {task.description}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                {!task.done && (
                  <View
                    style={{
                      backgroundColor: `${colors.primary}18`,
                      borderRadius: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                      Tap card to edit
                    </Text>
                  </View>
                )}
                {deadlineLabel && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: `${getDeadlineColor(task.deadline_at)}22`,
                      borderRadius: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderWidth: 1,
                      borderColor: `${getDeadlineColor(task.deadline_at)}44`,
                    }}
                  >
                    <Ionicons name="calendar" size={14} color={getDeadlineColor(task.deadline_at)} />
                    <Text style={{ color: getDeadlineColor(task.deadline_at), fontSize: 12, fontWeight: '700' }}>
                      {deadlineLabel}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
            <Pressable
              onPress={() => remove(task)}
              disabled={isLoading}
              style={{
                padding: 8,
                borderRadius: 12,
                backgroundColor: colors.cardBackground,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        </GlassCard>
      </SwipeableRow>
    );
  };

  const tasksToShow = activeTab === 'active' ? activeTasks : completedTasks;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: 16, paddingTop: 60 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text }}>
            Quest Log
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            {activeTasks.length} active
          </Text>
        </View>
        
        {/* Tab Bar */}
        <View style={[styles.tabContainer, { backgroundColor: colors.cardBackground, borderColor: colors.primary + '33' }]}>
          <Pressable
            onPress={() => setActiveTab('active')}
            style={[
              styles.tab,
              activeTab === 'active' && { backgroundColor: colors.primary }
            ]}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'active' ? colors.background : colors.textSecondary }
            ]}>
              Active
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('completed')}
            style={[
              styles.tab,
              activeTab === 'completed' && { backgroundColor: colors.primary }
            ]}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'completed' ? colors.background : colors.textSecondary }
            ]}>
              Completed
            </Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.textSecondary, marginBottom: 16, fontSize: 16 }}>
          Capture quests, stack your streak, and trade victories for loot.
        </Text>
        {!supabase ? (
          <GlassCard>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Supabase is not configured. Tasks will be stored locally.
            </Text>
          </GlassCard>
        ) : loading ? (
          <GlassCard>
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Loading tasks...</Text>
            </View>
          </GlassCard>
        ) : tasksToShow.length === 0 ? (
          <GlassCard>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 16 }}>
              {activeTab === 'active' ? 'No active tasks yet' : 'No completed tasks yet'}
            </Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              {activeTab === 'active' 
                ? 'Everything you capture here will be ready for your next focus.'
                : 'Completed tasks will appear here.'}
            </Text>
          </GlassCard>
        ) : (
          <FlatList
            data={tasksToShow}
            renderItem={renderTask}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 140, paddingTop: 4 }}
          />
        )}
      </View>
      <Pressable
        onPress={() => setShowComposer(true)}
        disabled={creatingTask}
        style={[
          styles.fab,
          {
            backgroundColor: `${colors.primary}`,
            shadowColor: colors.primary,
          },
        ]}
      >
        {creatingTask ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Ionicons name="add" size={26} color={colors.background} />
        )}
      </Pressable>
      <AddTaskModal
        visible={showComposer}
        onClose={() => setShowComposer(false)}
        onSubmit={handleCreateTask}
      />
      <AddTaskModal
        visible={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={handleEditTask}
        initialValues={editingTask ? {
          title: editingTask.title,
          description: editingTask.description || '',
          deadline_at: editingTask.deadline_at,
        } : undefined}
        editMode={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
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

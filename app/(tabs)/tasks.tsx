import React, { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet, Alert, Animated } from "react-native";
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
import { Toast } from "../../components/Toast";

export default function Tasks() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const { loading, withLoading } = useLoading(true);
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});
  const [showComposer, setShowComposer] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

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
      showToast('✨ Quest added to your log!', 'success');

      setTimeout(async () => {
        try {
          await refreshAll(userId);
        } catch (err) {
          console.warn('Background refresh failed:', err);
        }
      }, 300);
    } catch (error) {
      handleError(error, 'Add task');
      showToast('Failed to add quest', 'error');
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
      showToast('📝 Quest updated successfully!', 'success');
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
      showToast('Failed to update quest', 'error');
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
        showToast('🎉 Quest completed!', 'success');
      } else {
        showToast('Quest marked as active', 'info');
      }
    } catch (error) {
      handleError(error, 'Toggle task');
      showToast('Failed to update quest', 'error');
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
              showToast('🗑️ Quest deleted from log', 'success');
            } catch (error) {
              handleError(error, 'Delete task');
              showToast('Failed to delete quest', 'error');
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
        <GlassCard style={{ marginVertical: 5, opacity: isLoading ? 0.6 : 1 }} padding={14}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <Pressable
              onPress={() => toggle(task)}
              disabled={isLoading}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: task.done ? colors.success : `${colors.background}35`,
                borderWidth: 2,
                borderColor: task.done ? colors.success : `${colors.primary}55`,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: colors.primary,
                shadowOpacity: task.done ? 0.3 : 0.12,
                shadowRadius: 6,
                elevation: task.done ? 5 : 0,
                marginTop: 2,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={task.done ? colors.background : colors.primary} />
              ) : (
                <Ionicons
                  name={task.done ? 'checkmark' : 'ellipse-outline'}
                  size={18}
                  color={task.done ? colors.background : `${colors.primary}AA`}
                />
              )}
            </Pressable>
            <Pressable style={{ flex: 1 }} onPress={() => setEditingTask(task)}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: task.description ? 6 : 0 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: '600',
                    textDecorationLine: task.done ? 'line-through' : 'none',
                    opacity: task.done ? 0.6 : 1,
                    flex: 1,
                    lineHeight: 20,
                  }}
                  numberOfLines={2}
                >
                  {task.title}
                </Text>
              </View>
              {task.description ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    lineHeight: 16,
                    marginBottom: deadlineLabel ? 8 : 0,
                  }}
                  numberOfLines={2}
                >
                  {task.description}
                </Text>
              ) : null}
              {deadlineLabel && (
                <View style={{ alignItems: 'flex-end', marginTop: task.description ? 0 : 4 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: `${getDeadlineColor(task.deadline_at)}22`,
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: `${getDeadlineColor(task.deadline_at)}44`,
                    }}
                  >
                    <Ionicons name="calendar" size={12} color={getDeadlineColor(task.deadline_at)} />
                    <Text style={{ color: getDeadlineColor(task.deadline_at), fontSize: 11, fontWeight: '700' }}>
                      {deadlineLabel}
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => remove(task)}
              disabled={isLoading}
              style={{
                padding: 6,
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
        </GlassCard>
      </SwipeableRow>
    );
  };

  const tasksToShow = activeTab === 'active' ? activeTasks : completedTasks;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
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
          Capture quests, stack your coins, and level up!
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

import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../src/features/auth/useAuth";
import { useTheme } from "../../components/ThemeProvider";
import { GlassCard } from "../../components/GlassCard";
import { TopBar } from "../../components/TopBar";
import { useUserStats } from "../../hooks/useUserStats";
import { Task } from "../../types/supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleError, showSuccess, handleSupabaseError } from "../../utils/errorHandler";
import { useLoading } from "../../hooks/useLoading";
import { validateTaskTitle, sanitizeText } from "../../utils/validation";
import { REWARDS, STORAGE_KEYS, VALIDATION } from "../../src/constants/app";
import { useAppData } from "../../store/appData";
import { Ionicons } from "@expo/vector-icons";
import { SwipeableRow } from "../../components/SwipeableRow";

export default function Tasks() {
  const { colors } = useTheme();
  const { userStats, addCoins } = useUserStats();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [title, setTitle] = useState("");
  const [inputError, setInputError] = useState("");
  const { loading, withLoading } = useLoading(true);
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});

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

  async function add() {
    // Clear previous error
    setInputError("");

    // Validate input
    const validation = validateTaskTitle(title);
    if (!validation.isValid) {
      setInputError(validation.error || '');
      return;
    }

    const sanitizedTitle = sanitizeText(title);

    setOperationLoading(prev => ({ ...prev, add: true }));
    try {
      const userId = session?.user?.id ?? await getUserId();
      // Create task - this already does optimistic update
      await createTask(userId, sanitizedTitle);
      
      // Clear input immediately
      setTitle("");
      showSuccess('Quest added!', 'Complete it during a sprint to earn coins');
      
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
      handleError(error, 'Add task');
    } finally {
      setOperationLoading(prev => ({ ...prev, add: false }));
    }
  }

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

  const renderTask = ({ item: task }: { item: Task }) => {
    const isLoading = operationLoading[task.id];

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
        <GlassCard style={{ marginVertical: 4, opacity: isLoading ? 0.6 : 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={() => toggle(task)}
              disabled={isLoading}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: task.done ? colors.success : colors.cardBackground,
                borderWidth: 2,
                borderColor: task.done ? colors.success : colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : task.done ? (
                <Text style={{ color: colors.background, fontSize: 14, fontWeight: 'bold' }}>✓</Text>
              ) : null}
            </Pressable>
            <Text style={{
              flex: 1,
              color: colors.text,
              textDecorationLine: task.done ? "line-through" : "none",
              opacity: task.done ? 0.6 : 1,
            }}>
              {task.title}
            </Text>
            <Pressable
              onPress={() => remove(task)}
              disabled={isLoading}
              style={{
                padding: 8,
                borderRadius: 8,
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
    <View style={{ flex: 1, backgroundColor: '#1E293B' }}>
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
        <View style={[styles.tabContainer, { backgroundColor: colors.cardBackground + '80', borderColor: colors.primary + '40' }]}>
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
        <Text style={{ color: colors.textSecondary, marginBottom: 12, fontSize: 16 }}>
          Capture quests, stack your streak, and trade victories for loot.
        </Text>
        <GlassCard style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <TextInput
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (inputError) setInputError("");
              }}
              placeholder="What needs your attention?"
              placeholderTextColor={colors.textSecondary}
              maxLength={VALIDATION.TASK_TITLE_MAX}
              style={{
                flex: 1,
                padding: 10,
                backgroundColor: colors.cardBackground,
                borderWidth: 1,
                borderColor: inputError ? '#EF4444' : colors.primary,
                borderRadius: 8,
                color: colors.text,
                fontSize: 14,
              }}
              onSubmitEditing={add}
              returnKeyType="done"
            />
            <Pressable
              onPress={add}
              disabled={operationLoading.add || !title.trim()}
              style={{
                backgroundColor: operationLoading.add || !title.trim() ? colors.cardBackground : colors.primary,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 8,
                opacity: operationLoading.add || !title.trim() ? 0.5 : 1,
              }}
            >
              {operationLoading.add ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={{ color: !title.trim() ? colors.textSecondary : colors.background, fontWeight: '600', fontSize: 14 }}>
                  Add
                </Text>
              )}
            </Pressable>
          </View>
          {inputError ? (
            <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
              {inputError}
            </Text>
          ) : null}
        </GlassCard>
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
          />
        )}
      </View>
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
});



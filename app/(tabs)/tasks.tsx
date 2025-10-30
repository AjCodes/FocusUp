import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, Alert } from "react-native";
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

export default function Tasks() {
  const { colors } = useTheme();
  const { userStats, addCoins } = useUserStats();
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [inputError, setInputError] = useState("");
  const { loading, withLoading } = useLoading(true);
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});

  const getUserId = async (): Promise<string> => {
    let userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
    }
    return userId;
  };

  async function load() {
    await withLoading(async () => {
      try {
        const userId = await getUserId();

        // Try loading from local storage first
        const localTasks = await AsyncStorage.getItem(`tasks-${userId}`);
        if (localTasks) {
          const parsed = JSON.parse(localTasks);
          const normalized = parsed.map((t: any) => ({ ...t, done: t.done ?? false })) as Task[];
          setTasks(normalized);
        }

        // If not authenticated or no Supabase, use local storage only
        if (!supabase || !session?.user?.id) {
          return;
        }

        // Fetch from Supabase
        const { data, error } = await supabase
          .from("tasks")
          .select("id, title, created_at, user_id, notes, done")
          .eq('user_id', session.user.id)
          .order("created_at", { ascending: false });

        if (error) {
          handleSupabaseError(error, 'Load tasks');
          return;
        }

        if (data) {
          // Normalize data with done field
          const normalized = data.map((t: any) => ({ ...t, done: t.done ?? false })) as Task[];
          setTasks(normalized);
          // Cache to local storage
          await AsyncStorage.setItem(`tasks-${userId}`, JSON.stringify(normalized));
        }
      } catch (error) {
        handleError(error, 'Load tasks');
      }
    });
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
      const userId = await getUserId();
      let newTask: Task | null = null;

      // Try Supabase if authenticated
      if (supabase && session?.user?.id) {
        const { data, error } = await supabase
          .from("tasks")
          .insert({ title: sanitizedTitle, user_id: session.user.id, notes: null, done: false })
          .select("id, title, created_at, user_id, notes, done")
          .single();

        if (error) {
          handleSupabaseError(error, 'Add task');
          // Fall back to local storage
        } else if (data) {
          newTask = { ...data, done: false } as Task;
        }
      }

      // Create local task if Supabase failed or not available
      if (!newTask) {
        newTask = {
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: sanitizedTitle,
          done: false,
          created_at: new Date().toISOString(),
          user_id: userId,
        };
      }

      // Update state and cache
      const updated = [newTask, ...tasks];
      setTasks(updated);
      await AsyncStorage.setItem(`tasks-${userId}`, JSON.stringify(updated));

      // Clear input
      setTitle("");
      showSuccess('Quest added!', 'Complete it during a sprint to earn coins');
    } catch (error) {
      handleError(error, 'Add task');
    } finally {
      setOperationLoading(prev => ({ ...prev, add: false }));
    }
  }

  async function toggle(task: Task) {
    setOperationLoading(prev => ({ ...prev, [task.id]: true }));
    try {
      const userId = await getUserId();
      const newDoneState = !task.done;

      // Update local state immediately (optimistic update)
      const updatedTasks = tasks.map(t =>
        t.id === task.id ? { ...t, done: newDoneState } : t
      );
      setTasks(updatedTasks);

      // Cache locally
      await AsyncStorage.setItem(`tasks-${userId}`, JSON.stringify(updatedTasks));

      // Try updating Supabase if authenticated
      if (supabase && session?.user?.id) {
        const { error } = await supabase
          .from("tasks")
          .update({ done: newDoneState })
          .eq("id", task.id);

        if (error) {
          handleSupabaseError(error, 'Update task');
          // Revert on error
          setTasks(tasks);
          await AsyncStorage.setItem(`tasks-${userId}`, JSON.stringify(tasks));
          return;
        }
      }

      // Show completion message
      if (newDoneState) {
        showSuccess('Quest completed!', 'Finish your sprint to earn coins');
      }
    } catch (error) {
      handleError(error, 'Toggle task');
      // Revert on error
      setTasks(tasks);
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
              const userId = await getUserId();

              // Update local state immediately (optimistic delete)
              const updatedTasks = tasks.filter(t => t.id !== task.id);
              setTasks(updatedTasks);
              await AsyncStorage.setItem(`tasks-${userId}`, JSON.stringify(updatedTasks));

              // Try deleting from Supabase if authenticated
              if (supabase && session?.user?.id) {
                const { error } = await supabase
                  .from("tasks")
                  .delete()
                  .eq("id", task.id);

                if (error) {
                  handleSupabaseError(error, 'Delete task');
                  // Revert on error
                  setTasks(tasks);
                  await AsyncStorage.setItem(`tasks-${userId}`, JSON.stringify(tasks));
                  return;
                }
              }

              showSuccess('Quest deleted');
            } catch (error) {
              handleError(error, 'Delete task');
              // Revert on error
              setTasks(tasks);
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
      <GlassCard key={task.id} style={{ marginVertical: 4, opacity: isLoading ? 0.6 : 1 }}>
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
          {task.done && (
            <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>
              +{REWARDS.TASK_COMPLETE} coins
            </Text>
          )}
          <Pressable
            onPress={() => remove(task)}
            disabled={isLoading}
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
            Quest Log
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            {tasks.filter(t => !t.done).length} tasks remaining
          </Text>
        </View>
        <Text style={{ color: colors.textSecondary, marginBottom: 20, fontSize: 16 }}>
          Capture quests, stack your streak, and trade victories for loot.
        </Text>
        <GlassCard style={{ marginBottom: 20 }}>
          <View style={{ marginBottom: 16 }}>
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
                padding: 12,
                backgroundColor: colors.cardBackground,
                borderWidth: 1,
                borderColor: inputError ? '#EF4444' : colors.primary,
                borderRadius: 8,
                color: colors.text,
              }}
              onSubmitEditing={add}
              returnKeyType="done"
            />
            {inputError ? (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                {inputError}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Pressable
              onPress={add}
              disabled={operationLoading.add || !title.trim()}
              style={{
                backgroundColor: operationLoading.add || !title.trim() ? colors.cardBackground : colors.primary,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                opacity: operationLoading.add || !title.trim() ? 0.5 : 1,
              }}
            >
              {operationLoading.add ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={{ color: !title.trim() ? colors.textSecondary : colors.background, fontWeight: '600' }}>
                  Add quest
                </Text>
              )}
            </Pressable>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {tasks.filter(t => !t.done).length} tasks remaining
            </Text>
          </View>
          <View style={{
            position: 'absolute',
            top: 16,
            right: 16,
            backgroundColor: colors.warning,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
          }}>
            <Text style={{ color: colors.background, fontSize: 12, fontWeight: '600' }}>
              +{REWARDS.TASK_ADD} coins
            </Text>
          </View>
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
        ) : tasks.length === 0 ? (
          <GlassCard>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 16 }}>
              No tasks yet
            </Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              Everything you capture here will be ready for your next focus.
            </Text>
          </GlassCard>
        ) : (
          <FlatList
            data={tasks}
            renderItem={renderTask}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}



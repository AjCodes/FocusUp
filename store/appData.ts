import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { Task, Habit, FocusSession, FocusSessionTask, FocusSessionHabit, RewardEvent } from '../types/supabase';
import { RewardEngine } from '../src/features/rewards/RewardEngine';
import { DailyTracker } from '../src/features/rewards/DailyTracker';
import type { AttributeKey } from '../src/features/rewards/types';

const rewardEngine = new RewardEngine();
const dailyTracker = new DailyTracker();

interface AppDataState {
  // Data
  tasks: Task[];
  habits: Habit[];
  activeSession: FocusSession | null;
  sessionTasks: FocusSessionTask[];
  sessionHabits: FocusSessionHabit[];
  loading: boolean;
  error: string | null;

  // Actions
  refreshAll: (userId: string) => Promise<void>;
  startSession: (params: { mode: 'work' | 'break'; duration: number; userId: string }) => Promise<string | null>;
  attachToSession: (params: { sessionId: string; taskIds: string[]; habitIds: string[]; userId: string }) => Promise<void>;
  completeSession: (params: {
    sessionId: string;
    doneTaskIds: string[];
    performedHabitIds: string[];
    userId: string;
    duration: number;
  }) => Promise<{
    coins: number;
    xp: Record<AttributeKey, number>;
    messages: string[];
  }>;
  getSessionTasks: (sessionId: string, userId: string) => Promise<FocusSessionTask[]>;
  getSessionHabits: (sessionId: string, userId: string) => Promise<FocusSessionHabit[]>;
  
  // Task/Habit mutations (for optimistic updates)
  createTask: (userId: string, title: string, description?: string, deadline_at?: string | null) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>, userId: string) => Promise<void>;
  deleteTask: (taskId: string, userId: string) => Promise<void>;
  
  createHabit: (userId: string, title: string, cue: string | null, focusAttribute: AttributeKey) => Promise<Habit>;
  updateHabit: (habitId: string, updates: Partial<Habit>, userId: string) => Promise<void>;
  deleteHabit: (habitId: string, userId: string) => Promise<void>;
  
  logRewardEvent: (userId: string, sessionId: string, type: 'coins' | 'xp', amount: number, attribute?: AttributeKey) => Promise<void>;
}

export const useAppData = create<AppDataState>((set, get) => ({
  tasks: [],
  habits: [],
  activeSession: null,
  sessionTasks: [],
  sessionHabits: [],
  loading: false,
  error: null,

  refreshAll: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(userId);
      
      if (supabase && isUuid) {
        // Authenticated user - fetch from Supabase
        // Fetch tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (tasksError) throw tasksError;

        // Fetch habits
        const { data: habitsData, error: habitsError } = await supabase
          .from('habits')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (habitsError) throw habitsError;

        // Merge with existing state to preserve any optimistic updates
        // Create maps for quick lookup
        const fetchedTasks = (tasksData || []) as Task[];
        const fetchedHabits = (habitsData || []) as Habit[];
        
        const currentTasks = get().tasks;
        const currentHabits = get().habits;
        
        // Create maps of fetched items
        const fetchedTasksMap = new Map(fetchedTasks.map(t => [t.id, t]));
        const fetchedHabitsMap = new Map(fetchedHabits.map(h => [h.id, h]));
        
        // Merge: prefer fetched data (authoritative), but keep any current items that aren't fetched yet
        // (handles race conditions where optimistic updates happen before DB commit)
        const mergedTasks = [
          ...fetchedTasks,
          ...currentTasks.filter(t => 
            t.user_id === userId && !fetchedTasksMap.has(t.id)
          )
        ];
        const mergedHabits = [
          ...fetchedHabits,
          ...currentHabits.filter(h => 
            h.user_id === userId && !fetchedHabitsMap.has(h.id)
          )
        ];

        set({
          tasks: mergedTasks,
          habits: mergedHabits,
          loading: false,
        });
      } else {
        // Guest mode - load from AsyncStorage but don't overwrite optimistic updates
        // Keep current store state if it exists, otherwise load from storage
        const currentTasks = get().tasks.filter(t => t.user_id === userId);
        const currentHabits = get().habits.filter(h => h.user_id === userId);
        
        // Try to load from storage as fallback if store is empty
        if (currentTasks.length === 0 || currentHabits.length === 0) {
          try {
            const storedTasks = await AsyncStorage.getItem(`tasks-${userId}`);
            const storedHabits = await AsyncStorage.getItem(`habits-${userId}`);
            
            const tasksFromStorage = storedTasks ? JSON.parse(storedTasks) : [];
            const habitsFromStorage = storedHabits ? JSON.parse(storedHabits) : [];
            
            // Merge with current state (prefer current/optimistic updates)
            const mergedTasks = currentTasks.length > 0 ? currentTasks : tasksFromStorage;
            const mergedHabits = currentHabits.length > 0 ? currentHabits : habitsFromStorage;
            
            set({
              tasks: mergedTasks,
              habits: mergedHabits,
              loading: false,
            });
          } catch (storageError) {
            // If storage fails, at least keep current state
            set({ loading: false });
          }
        } else {
          // Store already has data, just mark as loaded
          set({ loading: false });
        }
      }
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      set({ error: error.message || 'Failed to refresh data', loading: false });
    }
  },

  startSession: async ({ mode, duration, userId }) => {
    try {
      console.log('🎬 startSession called:', { mode, duration, userId });

      if (!userId) {
        console.log('❌ No userId');
        return null;
      }

      // Check if userId is a valid UUID (authenticated user) or guest
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(userId);

      if (supabase && isUuid) {
        // Authenticated user - use Supabase
        console.log('✅ Authenticated user, using Supabase...');

        const { data, error } = await supabase
          .from('focus_sessions')
          .insert({
            user_id: userId,
            mode,
            duration,
            started_at: new Date().toISOString(),
            coins_earned: 0,
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Supabase insert error:', JSON.stringify(error, null, 2));
          throw error;
        }

        const session = data as FocusSession;
        console.log('✅ Session created in Supabase:', session.id);
        set({ activeSession: session });
        return session.id;
      } else {
        // Guest user - use local storage
        console.log('✅ Guest user, using local storage...');

        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session: FocusSession = {
          id: sessionId,
          user_id: userId,
          mode,
          duration,
          started_at: new Date().toISOString(),
          completed_at: null,
          coins_earned: 0,
        };

        // Save to AsyncStorage
        const storageKey = `session-${userId}-${sessionId}`;
        await AsyncStorage.setItem(storageKey, JSON.stringify(session));

        // Also save to active session list
        const activeSessionKey = `active-session-${userId}`;
        await AsyncStorage.setItem(activeSessionKey, sessionId);

        console.log('✅ Session created in local storage:', sessionId);
        set({ activeSession: session });
        return sessionId;
      }
    } catch (error: any) {
      console.error('❌ Error starting session:', error);
      set({ error: error.message || 'Failed to start session' });
      return null;
    }
  },

  attachToSession: async ({ sessionId, taskIds, habitIds, userId }) => {
    try {
      if (!userId) return;

      console.log('📌 attachToSession called:', { sessionId, taskIds, habitIds, userId });

      const isUuid = /^[0-9a-fA-F-]{36}$/.test(userId);

      if (supabase && isUuid) {
        // Authenticated user - use Supabase
        console.log('✅ Using Supabase...');

        // Upsert tasks
        if (taskIds.length > 0) {
          const taskInserts = taskIds.map(taskId => ({
            session_id: sessionId,
            task_id: taskId,
            user_id: userId,
            completed: false,
          }));

          console.log('📝 Upserting tasks:', taskInserts);

          const { data: upsertedTasks, error: tasksError } = await supabase
            .from('focus_session_tasks')
            .upsert(taskInserts, { onConflict: 'session_id,task_id' })
            .select();

          if (tasksError) throw tasksError;
          console.log('✅ Tasks upserted:', upsertedTasks);
        }

        // Upsert habits
        if (habitIds.length > 0) {
          const habitInserts = habitIds.map(habitId => ({
            session_id: sessionId,
            habit_id: habitId,
            user_id: userId,
            performed: false,
          }));

          console.log('📝 Upserting habits:', habitInserts);

          const { data: upsertedHabits, error: habitsError } = await supabase
            .from('focus_session_habits')
            .upsert(habitInserts, { onConflict: 'session_id,habit_id' })
            .select();

          if (habitsError) throw habitsError;
          console.log('✅ Habits upserted:', upsertedHabits);
        }
      } else {
        // Guest user - use local storage
        console.log('✅ Using local storage...');

        // Load existing session items
        const sessionTasksKey = `session-tasks-${userId}-${sessionId}`;
        const sessionHabitsKey = `session-habits-${userId}-${sessionId}`;

        const existingTasksJson = await AsyncStorage.getItem(sessionTasksKey);
        const existingHabitsJson = await AsyncStorage.getItem(sessionHabitsKey);

        const existingTasks: FocusSessionTask[] = existingTasksJson ? JSON.parse(existingTasksJson) : [];
        const existingHabits: FocusSessionHabit[] = existingHabitsJson ? JSON.parse(existingHabitsJson) : [];

        // Add new tasks (avoiding duplicates)
        if (taskIds.length > 0) {
          const newTasks: FocusSessionTask[] = taskIds
            .filter(taskId => !existingTasks.some(t => t.task_id === taskId))
            .map(taskId => ({
              id: `session_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              session_id: sessionId,
              task_id: taskId,
              user_id: userId,
              completed: false,
              completed_at: null,
              created_at: new Date().toISOString(),
            }));

          const allTasks = [...existingTasks, ...newTasks];
          await AsyncStorage.setItem(sessionTasksKey, JSON.stringify(allTasks));
          console.log('✅ Tasks saved to local storage:', allTasks.length);
        }

        // Add new habits (avoiding duplicates)
        if (habitIds.length > 0) {
          const newHabits: FocusSessionHabit[] = habitIds
            .filter(habitId => !existingHabits.some(h => h.habit_id === habitId))
            .map(habitId => ({
              id: `session_habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              session_id: sessionId,
              habit_id: habitId,
              user_id: userId,
              performed: false,
              performed_at: null,
              created_at: new Date().toISOString(),
            }));

          const allHabits = [...existingHabits, ...newHabits];
          await AsyncStorage.setItem(sessionHabitsKey, JSON.stringify(allHabits));
          console.log('✅ Habits saved to local storage:', allHabits.length);
        }
      }

      // Refresh session tasks/habits
      console.log('🔄 Refreshing session items...');
      const [tasks, habits] = await Promise.all([
        get().getSessionTasks(sessionId, userId),
        get().getSessionHabits(sessionId, userId),
      ]);
      console.log('✅ Session items refreshed:', { tasks: tasks.length, habits: habits.length });
    } catch (error: any) {
      console.error('Error attaching to session:', error);
      set({ error: error.message || 'Failed to attach items to session' });
      throw error;
    }
  },

  getSessionTasks: async (sessionId: string, userId: string) => {
    try {
      if (!userId) {
        set({ sessionTasks: [] });
        return [];
      }

      console.log('📥 getSessionTasks called:', { sessionId, userId });

      const isUuid = /^[0-9a-fA-F-]{36}$/.test(userId);

      if (supabase && isUuid) {
        // Authenticated user - use Supabase
        const { data, error } = await supabase
          .from('focus_session_tasks')
          .select('*')
          .eq('session_id', sessionId)
          .eq('user_id', userId);

        if (error) throw error;

        const tasks = (data || []) as FocusSessionTask[];
        console.log('📦 Session tasks fetched from Supabase:', tasks.length, tasks);
        set({ sessionTasks: tasks });
        return tasks;
      } else {
        // Guest user - use local storage
        const sessionTasksKey = `session-tasks-${userId}-${sessionId}`;
        const tasksJson = await AsyncStorage.getItem(sessionTasksKey);
        const tasks: FocusSessionTask[] = tasksJson ? JSON.parse(tasksJson) : [];

        console.log('📦 Session tasks fetched from local storage:', tasks.length, tasks);
        set({ sessionTasks: tasks });
        return tasks;
      }
    } catch (error: any) {
      console.error('Error fetching session tasks:', error);
      set({ error: error.message || 'Failed to fetch session tasks' });
      return [];
    }
  },

  getSessionHabits: async (sessionId: string, userId: string) => {
    try {
      if (!userId) {
        set({ sessionHabits: [] });
        return [];
      }

      console.log('📥 getSessionHabits called:', { sessionId, userId });

      const isUuid = /^[0-9a-fA-F-]{36}$/.test(userId);

      if (supabase && isUuid) {
        // Authenticated user - use Supabase
        const { data, error } = await supabase
          .from('focus_session_habits')
          .select('*')
          .eq('session_id', sessionId)
          .eq('user_id', userId);

        if (error) throw error;

        const habits = (data || []) as FocusSessionHabit[];
        console.log('📦 Session habits fetched from Supabase:', habits.length, habits);
        set({ sessionHabits: habits });
        return habits;
      } else {
        // Guest user - use local storage
        const sessionHabitsKey = `session-habits-${userId}-${sessionId}`;
        const habitsJson = await AsyncStorage.getItem(sessionHabitsKey);
        const habits: FocusSessionHabit[] = habitsJson ? JSON.parse(habitsJson) : [];

        console.log('📦 Session habits fetched from local storage:', habits.length, habits);
        set({ sessionHabits: habits });
        return habits;
      }
    } catch (error: any) {
      console.error('Error fetching session habits:', error);
      set({ error: error.message || 'Failed to fetch session habits' });
      return [];
    }
  },

  completeSession: async ({ sessionId, doneTaskIds, performedHabitIds, userId, duration }) => {
    try {
      if (!supabase || !userId) return { coins: 0, xp: { PH: 0, CO: 0, EM: 0, SO: 0 }, messages: [] };

      const now = new Date().toISOString();
      let totalCoins = 0;
      const xpGains: Record<AttributeKey, number> = { PH: 0, CO: 0, EM: 0, SO: 0 };
      const messages: string[] = [];

      // 1. Update completed tasks
      if (doneTaskIds.length > 0) {
        const { error: tasksUpdateError } = await supabase
          .from('tasks')
          .update({ done: true, completed_at: now })
          .in('id', doneTaskIds)
          .eq('user_id', userId);

        if (tasksUpdateError) throw tasksUpdateError;

        // Update join table
        const { error: joinTasksError } = await supabase
          .from('focus_session_tasks')
          .update({ completed: true, completed_at: now })
          .eq('session_id', sessionId)
          .in('task_id', doneTaskIds)
          .eq('user_id', userId);

        if (joinTasksError) throw joinTasksError;

        // Calculate task rewards (using medium priority as default for now)
        for (const taskId of doneTaskIds) {
          const taskNumber = (await dailyTracker.getTaskCount(userId)) + 1;
          const result = rewardEngine.calculateTaskCoins('medium', {
            itemNumber: taskNumber,
            duringFocus: true,
            isDuplicate: false,
            isRapidCompletion: false,
            timeOfDay: new Date().getHours(),
            streak: 0, // Will be fetched from user_stats if needed
            allAttributesWorkedToday: false,
          });

          if (result.success) {
            totalCoins += result.amount;
            messages.push(result.message);
            await get().logRewardEvent(userId, sessionId, 'coins', result.amount);
            await dailyTracker.incrementTask(userId);
          }
        }
      }

      // 2. Insert habit completions and calculate XP
      if (performedHabitIds.length > 0) {
        // Get habits to know their attributes
        const habits = get().habits.filter(h => performedHabitIds.includes(h.id));

        for (const habit of habits) {
          // Insert habit_completion
          const { error: completionError } = await supabase
            .from('habit_completions')
            .insert({
              habit_id: habit.id,
              user_id: userId,
              completed_at: now,
            });

          if (completionError) throw completionError;

          // Update join table
          const { error: joinHabitsError } = await supabase
            .from('focus_session_habits')
            .update({ performed: true, performed_at: now })
            .eq('session_id', sessionId)
            .eq('habit_id', habit.id)
            .eq('user_id', userId);

          if (joinHabitsError) throw joinHabitsError;

          // Calculate habit XP
          const habitNumber = (await dailyTracker.getHabitCount(userId)) + 1;
          const allAttributesWorked = await dailyTracker.allAttributesWorkedToday(userId);
          const result = rewardEngine.calculateHabitXP({
            itemNumber: habitNumber,
            duringFocus: true,
            isDuplicate: false,
            isRapidCompletion: false,
            timeOfDay: new Date().getHours(),
            streak: 0, // Could be calculated from habit_completions if needed
            allAttributesWorkedToday: allAttributesWorked,
          });

          if (result.success) {
            const attribute = habit.focus_attribute as AttributeKey;
            xpGains[attribute] += result.amount;
            messages.push(result.message);
            await get().logRewardEvent(userId, sessionId, 'xp', result.amount, attribute);
            await dailyTracker.incrementHabit(userId, attribute);
          }
        }
      }

      // 3. Calculate sprint completion coins
      const sprintCount = await dailyTracker.getSprintCount(userId);
      const sprintResult = rewardEngine.calculateSprintReward({
        itemNumber: sprintCount + 1,
        duringFocus: true,
        isDuplicate: false,
        isRapidCompletion: false,
        timeOfDay: new Date().getHours(),
        streak: 0,
        allAttributesWorkedToday: false,
      });

      if (sprintResult.success) {
        totalCoins += sprintResult.amount;
        messages.push(sprintResult.message);
        await get().logRewardEvent(userId, sessionId, 'coins', sprintResult.amount);
        await dailyTracker.incrementSprint(userId);
      }

      // 4. Update focus_sessions
      const { error: sessionError } = await supabase
        .from('focus_sessions')
        .update({
          completed_at: now,
          coins_earned: totalCoins,
        })
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (sessionError) throw sessionError;

      // 5. Update user_stats
      const { data: currentStats, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;

      const stats = currentStats || {
        user_id: userId,
        total_coins: 0,
        current_streak: 0,
        longest_streak: 0,
        total_focus_time: 0,
        total_sessions: 0,
        attributes: { PH: 0, CO: 0, EM: 0, SO: 0 },
      };

      const updatedCoins = (stats.total_coins || 0) + totalCoins;
      const updatedFocusTime = (stats.total_focus_time || 0) + duration;
      const updatedSessions = (stats.total_sessions || 0) + 1;
      const currentAttributes = stats.attributes || { PH: 0, CO: 0, EM: 0, SO: 0 };
      const updatedAttributes = {
        PH: (currentAttributes.PH || 0) + xpGains.PH,
        CO: (currentAttributes.CO || 0) + xpGains.CO,
        EM: (currentAttributes.EM || 0) + xpGains.EM,
        SO: (currentAttributes.SO || 0) + xpGains.SO,
      };

      // Update or insert user_stats
      const { error: upsertError } = await supabase
        .from('user_stats')
        .upsert({
          user_id: userId,
          total_coins: updatedCoins,
          total_focus_time: updatedFocusTime,
          total_sessions: updatedSessions,
          attributes: updatedAttributes,
          updated_at: now,
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) throw upsertError;

      // 6. Update daily_tracking (if table exists, otherwise skip)
      // Note: This assumes daily_tracking table structure
      try {
        const today = new Date().toISOString().split('T')[0];
        const { error: trackingError } = await supabase
          .from('daily_tracking')
          .upsert({
            user_id: userId,
            date: today,
            focus_sessions: (await dailyTracker.getSprintCount(userId)),
            tasks_completed: (await dailyTracker.getTaskCount(userId)),
            habits_completed: (await dailyTracker.getHabitCount(userId)),
          }, {
            onConflict: 'user_id,date',
          });

        // Ignore if table doesn't exist
        if (trackingError && !trackingError.message.includes('relation') && !trackingError.message.includes('does not exist')) {
          console.warn('Daily tracking update failed:', trackingError);
        }
      } catch (e) {
        // Table might not exist, that's okay
        console.warn('Daily tracking skipped:', e);
      }

      return { coins: totalCoins, xp: xpGains, messages };
    } catch (error: any) {
      console.error('Error completing session:', error);
      set({ error: error.message || 'Failed to complete session' });
      throw error;
    }
  },

  logRewardEvent: async (userId: string, sessionId: string, type: 'coins' | 'xp', amount: number, attribute?: AttributeKey) => {
    try {
      if (!supabase || !userId) return;

      await supabase.from('reward_events').insert({
        user_id: userId,
        session_id: sessionId,
        type,
        amount,
        attribute: attribute || null,
      });
    } catch (error: any) {
      console.error('Error logging reward event:', error);
      // Don't throw - reward events are non-critical
    }
  },

  createTask: async (userId: string, title: string, description?: string, deadline_at?: string | null) => {
    try {
      // Check if userId is a valid UUID (authenticated user) or guest
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(userId);
      
      if (!supabase || !isUuid) {
        // Fallback to local
        const newTask: Task = {
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: title.trim(),
          done: false,
          completed_at: null,
          created_at: new Date().toISOString(),
          user_id: userId,
          description: description || null,
          deadline_at: deadline_at || null,
        };
        set(state => ({ tasks: [newTask, ...state.tasks] }));
        return newTask;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId, // This should match auth.uid()::text per RLS
          title: title.trim(),
          description: description || null,
          deadline_at: deadline_at || null,
          done: false,
        })
        .select()
        .single();

      if (error) throw error;

      const task = data as Task;
      // Optimistic update - add to store immediately
      set(state => {
        // Check if task already exists (avoid duplicates)
        const exists = state.tasks.some(t => t.id === task.id);
        if (exists) {
          return { tasks: state.tasks.map(t => t.id === task.id ? task : t) };
        }
        return { tasks: [task, ...state.tasks] };
      });
      return task;
    } catch (error: any) {
      console.error('Error creating task:', error);
      set({ error: error.message || 'Failed to create task' });
      throw error;
    }
  },

  updateTask: async (taskId: string, updates: Partial<Task>, userId: string) => {
    try {
      const optimisticTask = get().tasks.find(t => t.id === taskId);
      if (!optimisticTask) throw new Error('Task not found');

      // Optimistic update
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, ...updates } : t
        ),
      }));

      // Check if taskId is a UUID (authenticated task) or local ID (guest task)
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(taskId);

      if (supabase && userId && isUuid) {
        const { error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', taskId)
          .eq('user_id', userId);

        if (error) {
          const includesCompletedAt = Object.prototype.hasOwnProperty.call(updates, 'completed_at');
          const missingColumn = error.code === 'PGRST204' && includesCompletedAt;

          if (missingColumn) {
            const { completed_at: _ignored, ...fallbackUpdates } = updates;

            if (Object.keys(fallbackUpdates).length > 0) {
              console.warn(
                "Supabase 'tasks' table missing completed_at column. Retrying update without it."
              );

              const { error: fallbackError } = await supabase
                .from('tasks')
                .update(fallbackUpdates)
                .eq('id', taskId)
                .eq('user_id', userId);

              if (!fallbackError) {
                return;
              }

              console.error('Fallback task update failed:', fallbackError);
            } else {
              // Nothing else to update; treat as handled.
              return;
            }
          }

          // Rollback
          set(state => ({
            tasks: state.tasks.map(t => (t.id === taskId ? optimisticTask : t)),
          }));
          throw error;
        }
      } else if (!isUuid) {
        // Guest mode task - save to AsyncStorage
        try {
          const allTasks = get().tasks;
          await AsyncStorage.setItem(`tasks-${userId}`, JSON.stringify(allTasks));
        } catch (storageError) {
          console.warn('Failed to save task to AsyncStorage:', storageError);
        }
      }
    } catch (error: any) {
      console.error('Error updating task:', error);
      set({ error: error.message || 'Failed to update task' });
      throw error;
    }
  },

  deleteTask: async (taskId: string, userId: string) => {
    try {
      const optimisticTask = get().tasks.find(t => t.id === taskId);
      if (!optimisticTask) throw new Error('Task not found');

      // Optimistic delete
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId),
      }));

      // Check if taskId is a UUID (authenticated task) or local ID (guest task)
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(taskId);

      if (supabase && userId && isUuid) {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)
          .eq('user_id', userId);

        if (error) {
          // Rollback
          if (optimisticTask) {
            set(state => ({ tasks: [optimisticTask, ...state.tasks] }));
          }
          throw error;
        }
      } else if (!isUuid) {
        // Guest mode task - save to AsyncStorage
        try {
          const allTasks = get().tasks;
          await AsyncStorage.setItem(`tasks-${userId}`, JSON.stringify(allTasks));
        } catch (storageError) {
          console.warn('Failed to save tasks to AsyncStorage:', storageError);
        }
      }
    } catch (error: any) {
      console.error('Error deleting task:', error);
      set({ error: error.message || 'Failed to delete task' });
      throw error;
    }
  },

  createHabit: async (userId: string, title: string, cue: string | null, focusAttribute: AttributeKey) => {
    try {
      // Check if userId is a valid UUID (authenticated user) or guest
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(userId);

      if (!supabase || !isUuid) {
        // Fallback to local
        const newHabit: Habit = {
          id: `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: title.trim(),
          cue,
          focus_attribute: focusAttribute,
          created_at: new Date().toISOString(),
          user_id: userId,
        };
        set(state => ({ habits: [newHabit, ...state.habits] }));
        return newHabit;
      }

      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: userId, // This should match auth.uid()::text per RLS
          title: title.trim(),
          cue,
          focus_attribute: focusAttribute,
        })
        .select()
        .single();

      if (error) throw error;

      const habit = data as Habit;
      // Optimistic update - add to store immediately
      set(state => {
        // Check if habit already exists (avoid duplicates)
        const exists = state.habits.some(h => h.id === habit.id);
        if (exists) {
          return { habits: state.habits.map(h => h.id === habit.id ? habit : h) };
        }
        return { habits: [habit, ...state.habits] };
      });
      return habit;
    } catch (error: any) {
      console.error('Error creating habit:', error);
      set({ error: error.message || 'Failed to create habit' });
      throw error;
    }
  },

  updateHabit: async (habitId: string, updates: Partial<Habit>, userId: string) => {
    try {
      const optimisticHabit = get().habits.find(h => h.id === habitId);
      if (!optimisticHabit) throw new Error('Habit not found');

      // Optimistic update
      set(state => ({
        habits: state.habits.map(h =>
          h.id === habitId ? { ...h, ...updates } : h
        ),
      }));

      // Check if habitId is a UUID (authenticated habit) or local ID (guest habit)
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(habitId);

      if (supabase && userId && isUuid) {
        const { error } = await supabase
          .from('habits')
          .update(updates)
          .eq('id', habitId)
          .eq('user_id', userId);

        if (error) {
          // Rollback
          set(state => ({
            habits: state.habits.map(h => (h.id === habitId ? optimisticHabit : h)),
          }));
          throw error;
        }
      } else if (!isUuid) {
        // Guest mode habit - save to AsyncStorage
        try {
          const allHabits = get().habits;
          await AsyncStorage.setItem(`habits-${userId}`, JSON.stringify(allHabits));
        } catch (storageError) {
          console.warn('Failed to save habit to AsyncStorage:', storageError);
        }
      }
    } catch (error: any) {
      console.error('Error updating habit:', error);
      set({ error: error.message || 'Failed to update habit' });
      throw error;
    }
  },

  deleteHabit: async (habitId: string, userId: string) => {
    try {
      const optimisticHabit = get().habits.find(h => h.id === habitId);
      if (!optimisticHabit) throw new Error('Habit not found');

      // Optimistic delete
      set(state => ({
        habits: state.habits.filter(h => h.id !== habitId),
      }));

      if (supabase && userId) {
        const { error } = await supabase
          .from('habits')
          .delete()
          .eq('id', habitId)
          .eq('user_id', userId);

        if (error) {
          // Rollback
          if (optimisticHabit) {
            set(state => ({ habits: [optimisticHabit, ...state.habits] }));
          }
          throw error;
        }
      }
    } catch (error: any) {
      console.error('Error deleting habit:', error);
      set({ error: error.message || 'Failed to delete habit' });
      throw error;
    }
  },
}));


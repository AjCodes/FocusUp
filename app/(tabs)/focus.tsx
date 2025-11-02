import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Dimensions, Animated, Easing, Modal } from "react-native";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { mmss } from "../../utils/time";
import { useTheme } from "../../components/ThemeProvider";
import { GlassCard } from "../../components/GlassCard";
import { TopBar } from "../../components/TopBar";
import { FocusSelectModal } from "../../components/FocusSelectModal";
import { TimerSettingsModal } from "../../components/TimerSettingsModal";
import { Toast } from "../../components/Toast";
import { WellDoneModal } from "../../components/WellDoneModal";
import { useAppData } from "../../store/appData";
import { useUserStats } from "../../hooks/useUserStats";
import { supabase } from "../../lib/supabase";
import { usePomodoroStore } from "../../src/features/pomodoro/store";
import { useAuth } from "../../src/features/auth/useAuth";
import { Task, Habit, FocusSession } from "../../types/supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { REWARDS } from "../../src/constants/app";
import { showSuccess } from "../../utils/errorHandler";

const { width } = Dimensions.get('window');
const TIMER_SIZE = width * 0.7;

const DEFAULT_WORK = 25 * 60;
const DEFAULT_BREAK = 5 * 60;
const USER_ID_KEY = 'focusup-user-id';
const DAILY_SPRINT_KEY = 'focusup-daily-sprint';
type HabitFocusKey = 'PH' | 'CO' | 'EM' | 'SO';

const FOCUS_ATTRIBUTES = {
  CO: { label: 'Cognitive', emoji: '\u{1F9E0}', color: '#3B82F6' },
  PH: { label: 'Physical', emoji: '\u{1F4AA}', color: '#10B981' },
  EM: { label: 'Heart', emoji: '\u{2764}\u{FE0F}', color: '#EF4444' },
  SO: { label: 'Soul', emoji: '\u{1F30C}', color: '#8B5CF6' },
};

const normalizeHabitFocusAttribute = (attr: string): HabitFocusKey => {
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

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function Focus() {
  const { colors, mode, setMode } = useTheme();
  const { userStats, addCoins, addXP, updateStreak, addFocusSession, incrementSprints, profileImageUri } = useUserStats();
  const { session } = useAuth();
  const pomodoro = usePomodoroStore();

  const [seconds, setSeconds] = useState(DEFAULT_WORK);
  const running = pomodoro.running;
  const [showBreakPrompt, setShowBreakPrompt] = useState(false);
  const [quote, setQuote] = useState<string | null>(null);
  const [workDuration, setWorkDuration] = useState(DEFAULT_WORK);
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [sprintCount, setSprintCount] = useState(0);
  const [dailySprintDate, setDailySprintDate] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use appData store
  const tasks = useAppData(state => state.tasks);
  const habits = useAppData(state => state.habits);
  const sessionTasks = useAppData(state => state.sessionTasks);
  const sessionHabits = useAppData(state => state.sessionHabits);
  const refreshAll = useAppData(state => state.refreshAll);
  const startSession = useAppData(state => state.startSession);
  const attachToSession = useAppData(state => state.attachToSession);
  const completeSession = useAppData(state => state.completeSession);
  const getSessionTasks = useAppData(state => state.getSessionTasks);
  const getSessionHabits = useAppData(state => state.getSessionHabits);
  const [recentSessions, setRecentSessions] = useState<FocusSession[]>([]);
  const [forceRefresh, setForceRefresh] = useState(0);

  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
    action?: { label: string; onPress: () => void };
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Store last added items for undo
  const [lastAddedItems, setLastAddedItems] = useState<{
    sessionId: string;
    taskIds: string[];
    habitIds: string[];
  } | null>(null);

  // Well Done modal state
  const [showWellDone, setShowWellDone] = useState(false);
  const [wellDoneRewards, setWellDoneRewards] = useState<{
    coins: number;
    xp: Record<HabitFocusKey, number>;
    messages: string[];
    tasksCompleted: number;
    habitsCompleted: number;
  } | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success',
    action?: { label: string; onPress: () => void }
  ) => {
    setToast({ visible: true, message, type, action });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const getUserId = async (): Promise<string> => {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  };

  // Debug: Log when session items change
  useEffect(() => {
    console.log('🔄 Session items updated:', {
      sessionTasks: sessionTasks.length,
      sessionHabits: sessionHabits.length,
      tasks: tasks.length,
      habits: habits.length,
    });
  }, [sessionTasks, sessionHabits, tasks, habits]);


  const loadRecentSessions = async () => {
    const userId = session?.user?.id ?? await getUserId();

    if (supabase && session?.user?.id) {
      const { data: sessionsData } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('completed_at', { ascending: false })
        .limit(5);
      if (sessionsData) {
        console.log('📊 Loaded recent sessions:', sessionsData.map(s => ({
          time: s.completed_at,
          coins: s.coins_earned,
        })));
        setRecentSessions(sessionsData as FocusSession[]);
      }
    } else {
      // For guest users, load from local storage
      try {
        const stored = await AsyncStorage.getItem(`recent-sessions-${userId}`);
        if (stored) {
          const sessions = JSON.parse(stored);
          setRecentSessions(sessions);
        }
      } catch (error) {
        console.error('Error loading recent sessions:', error);
      }
    }
  };

  useEffect(() => {
    const initData = async () => {
      const userId = session?.user?.id ?? await getUserId();
      await refreshAll(userId);
      loadSettings();
      loadDailySprintCount();
      await loadRecentSessions();
    };
    initData();
  }, [session?.user?.id]);

  // Load session items when currentSessionId changes
  useEffect(() => {
    const loadSessionItems = async () => {
      if (currentSessionId) {
        const userId = session?.user?.id ?? await getUserId();
        console.log('🔄 Loading session items for session:', currentSessionId);
        await Promise.all([
          getSessionTasks(currentSessionId, userId),
          getSessionHabits(currentSessionId, userId),
        ]);
        console.log('✅ Session items loaded:', {
          tasks: sessionTasks.length,
          habits: sessionHabits.length,
        });
      }
    };
    loadSessionItems();
  }, [currentSessionId]);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('focusup-settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setWorkDuration(parsed.work || DEFAULT_WORK);
        setBreakDuration(parsed.break || DEFAULT_BREAK);
        setSeconds(parsed.work || DEFAULT_WORK);
        // Propagate durations to the timer store
        pomodoro.setDurations(parsed.work || DEFAULT_WORK, parsed.break || DEFAULT_BREAK);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadDailySprintCount = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const stored = await AsyncStorage.getItem(DAILY_SPRINT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.date === today) {
          setSprintCount(parsed.count ?? 0);
          setDailySprintDate(today);
          return;
        }
      }
    } catch (error) {
      console.error('Error loading sprint count:', error);
    }
    setSprintCount(0);
    setDailySprintDate(today);
    try {
      await AsyncStorage.setItem(DAILY_SPRINT_KEY, JSON.stringify({ date: today, count: 0 }));
    } catch (error) {
      console.error('Error initializing sprint count:', error);
    }
  };

  useEffect(() => {
    (async () => {
      const { granted } = await Notifications.getPermissionsAsync();
      if (!granted) await Notifications.requestPermissionsAsync();
    })();
  }, []);

  // Set up sprint completion reward callback
  // Use refs to capture latest values without causing re-renders
  const tasksRef = useRef(tasks);
  const habitsRef = useRef(habits);

  useEffect(() => {
    tasksRef.current = tasks;
    habitsRef.current = habits;
  }, [tasks, habits]);

  useEffect(() => {
    const handleSprintComplete = async (sprintData: any) => {
      try {
        let totalCoins = REWARDS.SPRINT_BASE_COINS;
        const rewardMessages: string[] = [`+${REWARDS.SPRINT_BASE_COINS} coins for completing sprint`];

        // Check if linked task was completed
        if (sprintData.linkedTaskId) {
          const task = tasksRef.current.find((t: Task) => t.id === sprintData.linkedTaskId);
          if (task && task.done) {
            totalCoins += REWARDS.TASK_BASE_COINS.medium;
            rewardMessages.push(`+${REWARDS.TASK_BASE_COINS.medium} coins for task: "${task.title}"`);
          }
        }

        // Check if linked habit exists and award XP
        if (sprintData.linkedHabitId) {
          const habit = habitsRef.current.find((h: Habit) => h.id === sprintData.linkedHabitId);
          if (habit) {
            await addXP(habit.focus_attribute, REWARDS.HABIT_BASE_XP);
            rewardMessages.push(`+${REWARDS.HABIT_BASE_XP} XP to ${habit.focus_attribute} for habit: "${habit.title}"`);
          }
        }

        // Award coins
        await addCoins(totalCoins);

        // Increment sprint count
        await incrementSprints(1);

        // Show success message
        showSuccess(
          '🎉 Sprint Complete!',
          rewardMessages.join('\n')
        );

        // Trigger haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Error awarding sprint rewards:', error);
      }
    };

    pomodoro.setOnSprintComplete(handleSprintComplete);

    // Cleanup on unmount
    return () => {
      pomodoro.setOnSprintComplete(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only set once on mount, functions captured in closure

  useEffect(() => {
    setSeconds(pomodoro.secondsLeft);
  }, [pomodoro.secondsLeft]);

  // Sync mode with pomodoro phase (one-way: pomodoro -> component)
  // This ensures UI reflects the actual timer state
  useEffect(() => {
    if (pomodoro.phase !== mode && !running) {
      // Only sync when not running to avoid conflicts during active timers
      setMode(pomodoro.phase);
      setSeconds(pomodoro.phase === 'focus' ? workDuration : breakDuration);
    }
  }, [pomodoro.phase]);

  useEffect(() => {
    if (pomodoro.phase === 'focus' && pomodoro.sprint.workCompletedAt && !pomodoro.running && !sessionCompleted) {
      // Timer has ended - automatically complete the session and show Well Done modal
      (async () => {
        const userId = session?.user?.id ?? await getUserId();
        if (!userId) return;

        console.log('🎯 Focus session completed - starting auto-completion...');

        // Get or create session ID
        let sessionId = pomodoro.sprint.id;
        if (!sessionId) {
          // Create session retroactively
          sessionId = await startSession({
            mode: 'work',
            duration: workDuration,
            userId,
          });
          if (!sessionId) return;
        }

        setCurrentSessionId(sessionId);

        // Load session items
        const [tasksInSession, habitsInSession] = await Promise.all([
          getSessionTasks(sessionId, userId),
          getSessionHabits(sessionId, userId),
        ]);

        // Automatically complete the session with all tasks/habits that were in the session
        const taskIdsInSession = tasksInSession.map(st => st.task_id);
        const habitIdsInSession = habitsInSession.map(sh => sh.habit_id);

        console.log('🎯 Session items loaded:', {
          tasksInSession: tasksInSession.length,
          habitIdsInSession: habitIdsInSession.length,
          taskIds: taskIdsInSession,
          habitIds: habitIdsInSession,
        });

        const isUuid = /^[0-9a-fA-F-]{36}$/.test(userId);

        try {
          let totalCoins = 0;
          const xpGains: Record<HabitFocusKey, number> = { PH: 0, CO: 0, EM: 0, SO: 0 };

          // For authenticated users, use the full completeSession flow
          if (supabase && isUuid) {
            const result = await completeSession({
              sessionId,
              doneTaskIds: taskIdsInSession,
              performedHabitIds: habitIdsInSession,
              userId,
              duration: workDuration,
            });

            totalCoins = result.coins;
            Object.assign(xpGains, result.xp);
          } else {
            // For guest users, calculate rewards manually
            console.log('💰 Calculating rewards for guest user...');
            console.log('📊 Tasks in session:', taskIdsInSession.length);
            console.log('📊 Habits in session:', habitIdsInSession.length);

            // Base sprint reward
            const sprintCoins = 10;
            totalCoins += sprintCoins;
            console.log(`🏃 Sprint reward: ${sprintCoins} coins`);

            // Task rewards (5 coins each)
            const taskCoins = taskIdsInSession.length * 5;
            totalCoins += taskCoins;
            console.log(`✅ Task rewards: ${taskCoins} coins (${taskIdsInSession.length} × 5)`);

            // Habit XP (10 XP each to their respective attribute)
            for (const habitId of habitIdsInSession) {
              const habit = habits.find(h => h.id === habitId);
              if (habit) {
                const attr = habit.focus_attribute as HabitFocusKey;
                xpGains[attr] += 10;
                console.log(`💪 Habit XP: +10 to ${attr} (${habit.title})`);
              }
            }

            console.log(`💰 Total coins: ${totalCoins}`);
            console.log(`⚡ Total XP:`, xpGains);

            // Update local stats for guest users
            await addCoins(totalCoins);
            for (const [attr, xp] of Object.entries(xpGains)) {
              if (xp > 0) {
                await addXP(attr as HabitFocusKey, xp);
              }
            }
          }

          // Add focus session time to user stats
          await addFocusSession(workDuration);

          // Increment sprints
          await incrementSprints(1);

          // Refresh all data to update dashboard
          await refreshAll(userId);

          // For guest users, store the completed session locally
          if (!isUuid) {
            try {
              const stored = await AsyncStorage.getItem(`recent-sessions-${userId}`);
              const sessions = stored ? JSON.parse(stored) : [];
              const newSession: FocusSession = {
                id: sessionId,
                user_id: userId,
                mode: 'work',
                duration: workDuration,
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                coins_earned: totalCoins,
                linked_task_id: null,
                linked_habit_id: null,
              };
              sessions.unshift(newSession);
              // Keep only last 5
              const recent = sessions.slice(0, 5);
              await AsyncStorage.setItem(`recent-sessions-${userId}`, JSON.stringify(recent));
            } catch (error) {
              console.error('Error storing session locally:', error);
            }
          }

          // Reload recent sessions to show the new one
          await loadRecentSessions();

          // Mark session as completed to prevent duplicate triggers
          setSessionCompleted(true);

          console.log('🎉 Showing Well Done modal with rewards:', {
            coins: totalCoins,
            xp: xpGains,
            tasks: taskIdsInSession.length,
            habits: habitIdsInSession.length,
          });

          // Trigger Well Done modal immediately
          handleSessionComplete({
            coins: totalCoins,
            xp: xpGains,
            messages: [],
            tasksCompleted: taskIdsInSession.length,
            habitsCompleted: habitIdsInSession.length,
          });
        } catch (error) {
          console.error('Error auto-completing session:', error);
          // Show error toast if auto-complete fails
          showToast('Failed to complete session', 'error');
        }
      })();
    }
  }, [pomodoro.phase, pomodoro.sprint.workCompletedAt, pomodoro.running]);

  useEffect(() => {
    const durationSeconds = mode === 'focus' ? workDuration : breakDuration;
    if (durationSeconds <= 0) {
      progressAnimation.stopAnimation();
      progressAnimation.setValue(0);
      return;
    }
    const completed = 1 - seconds / durationSeconds;
    const clamped = Math.min(Math.max(completed, 0), 1);
    progressAnimation.stopAnimation();
    Animated.timing(progressAnimation, {
      toValue: clamped,
      duration: 260,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [seconds, mode, workDuration, breakDuration, progressAnimation]);


  const handleStart = async () => {
    const userId = session?.user?.id ?? await getUserId();
    if (!running) {
      // Reset session completion flag when starting a new session
      if (mode === 'focus') {
        setSessionCompleted(false);
      }

      // Ensure durations are set correctly
      pomodoro.setDurations(workDuration, breakDuration);

      // CRITICAL: Ensure pomodoro phase matches the component mode before starting
      if (pomodoro.phase !== mode) {
        pomodoro.setPhase(mode);
      }

      // If in break mode, ensure break duration is used
      if (mode === 'break') {
        setSeconds(breakDuration);
      }

      pomodoro.start(userId);
      // Start session in database after pomodoro starts (it will create its own session)
      // We'll sync it in the useEffect that watches for work completion
    } else {
      pomodoro.pause();
    }
  };

  const handleReset = () => {
    pomodoro.reset();
    setSeconds(mode === 'focus' ? workDuration : breakDuration);
    setCurrentSessionId(null);
    setSessionCompleted(false); // Reset session completion flag
    progressAnimation.stopAnimation();
    progressAnimation.setValue(0);
  };

  const handleSwitchMode = () => {
    if (pomodoro.phase === 'focus' && pomodoro.sprint.workCompletedAt && !pomodoro.running) {
      setShowBreakPrompt(true);
      return;
    }
    const nextMode = mode === 'focus' ? 'break' : 'focus';
    setMode(nextMode);
    // Update timer to the new mode's duration
    const newDuration = nextMode === 'focus' ? workDuration : breakDuration;
    setSeconds(newDuration);
    // Update pomodoro store durations and phase
    pomodoro.setDurations(workDuration, breakDuration);
    // CRITICAL: Update pomodoro phase to match the component mode
    pomodoro.setPhase(nextMode);
    // Reset progress animation
    progressAnimation.stopAnimation();
    progressAnimation.setValue(0);
    // Stop the timer if it's running
    if (pomodoro.running) {
      pomodoro.pause();
    }
  };

  const handleTimerSettingsSave = (work: number, breakTime: number) => {
    setWorkDuration(work);
    setBreakDuration(breakTime);
    pomodoro.setDurations(work, breakTime);
    if (!running) {
      setSeconds(mode === 'focus' ? work : breakTime);
      progressAnimation.stopAnimation();
      progressAnimation.setValue(0);
    }
  };

  const handleUndoAddItems = async () => {
    if (!lastAddedItems) return;

    try {
      const userId = session?.user?.id ?? await getUserId();
      const { sessionId, taskIds, habitIds } = lastAddedItems;

      console.log('🔙 Undoing add items:', { sessionId, taskIds, habitIds });

      // Delete items from session using Supabase or local storage
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(userId);

      if (supabase && isUuid) {
        // Delete from Supabase
        if (taskIds.length > 0) {
          await supabase
            .from('focus_session_tasks')
            .delete()
            .eq('session_id', sessionId)
            .in('task_id', taskIds);
        }

        if (habitIds.length > 0) {
          await supabase
            .from('focus_session_habits')
            .delete()
            .eq('session_id', sessionId)
            .in('habit_id', habitIds);
        }
      } else {
        // Delete from local storage
        const sessionTasksKey = `session-tasks-${userId}-${sessionId}`;
        const sessionHabitsKey = `session-habits-${userId}-${sessionId}`;

        const tasksJson = await AsyncStorage.getItem(sessionTasksKey);
        const habitsJson = await AsyncStorage.getItem(sessionHabitsKey);

        if (tasksJson) {
          const tasks = JSON.parse(tasksJson);
          const filtered = tasks.filter((t: any) => !taskIds.includes(t.task_id));
          await AsyncStorage.setItem(sessionTasksKey, JSON.stringify(filtered));
        }

        if (habitsJson) {
          const habits = JSON.parse(habitsJson);
          const filtered = habits.filter((h: any) => !habitIds.includes(h.habit_id));
          await AsyncStorage.setItem(sessionHabitsKey, JSON.stringify(filtered));
        }
      }

      // Refresh session items
      await Promise.all([
        getSessionTasks(sessionId, userId),
        getSessionHabits(sessionId, userId),
      ]);

      setLastAddedItems(null);
      showToast('Items removed from session', 'info');
    } catch (error) {
      console.error('Error undoing add:', error);
      showToast('Failed to undo', 'error');
    }
  };

  const handleSessionComplete = (rewards: {
    coins: number;
    xp: Record<HabitFocusKey, number>;
    messages: string[];
    tasksCompleted: number;
    habitsCompleted: number;
  }) => {
    console.log('🎉 Session completed with rewards:', rewards);
    setWellDoneRewards(rewards);
    setShowWellDone(true);
  };

  const handleRemoveFromSession = async (itemType: 'task' | 'habit', itemId: string) => {
    if (!currentSessionId) return;

    try {
      const userId = session?.user?.id ?? await getUserId();
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(userId);

      if (supabase && isUuid) {
        // Delete from Supabase
        if (itemType === 'task') {
          await supabase
            .from('focus_session_tasks')
            .delete()
            .eq('session_id', currentSessionId)
            .eq('task_id', itemId);
        } else {
          await supabase
            .from('focus_session_habits')
            .delete()
            .eq('session_id', currentSessionId)
            .eq('habit_id', itemId);
        }
      } else {
        // Delete from local storage
        const key = itemType === 'task'
          ? `session-tasks-${userId}-${currentSessionId}`
          : `session-habits-${userId}-${currentSessionId}`;

        const json = await AsyncStorage.getItem(key);
        if (json) {
          const items = JSON.parse(json);
          const filtered = items.filter((item: any) => {
            const id = itemType === 'task' ? item.task_id : item.habit_id;
            return id !== itemId;
          });
          await AsyncStorage.setItem(key, JSON.stringify(filtered));
        }
      }

      // Refresh session items
      await Promise.all([
        getSessionTasks(currentSessionId, userId),
        getSessionHabits(currentSessionId, userId),
      ]);

      showToast(`${itemType === 'task' ? 'Task' : 'Habit'} removed from session`, 'info');
    } catch (error) {
      console.error('Error removing item:', error);
      showToast('Failed to remove item', 'error');
    }
  };

  const handleSelectConfirm = async (taskIds: string[], habitIds: string[]) => {
    try {
      console.log('📝 handleSelectConfirm called with:', { taskIds, habitIds });

      const userId = session?.user?.id ?? await getUserId();
      console.log('👤 User ID:', userId);
      console.log('👤 User ID type:', typeof userId);
      console.log('👤 Session object:', session);
      console.log('👤 Is authenticated:', !!session?.user?.id);

      let activeSessionId = currentSessionId;
      console.log('🎯 Current session ID:', activeSessionId);

      if (!activeSessionId) {
        console.log('🆕 Creating new session...');
        const sessionId = await startSession({
          mode: 'work',
          duration: workDuration,
          userId,
        });

        if (!sessionId) {
          console.error('❌ Failed to create session - startSession returned null');
          return;
        }

        console.log('✅ Session created:', sessionId);
        setCurrentSessionId(sessionId);
        activeSessionId = sessionId;
      }

      console.log('📎 Attaching items to session:', activeSessionId);

      // Attach items to session
      await attachToSession({
        sessionId: activeSessionId,
        taskIds,
        habitIds,
        userId,
      });

      console.log('✅ Items attached, refreshing all data...');

      // Refresh ALL data including tasks, habits, and session items
      // This ensures that newly created items are available for rendering
      await refreshAll(userId);

      // Then refresh session tasks/habits
      const [sessionTasksResult, sessionHabitsResult] = await Promise.all([
        getSessionTasks(activeSessionId, userId),
        getSessionHabits(activeSessionId, userId),
      ]);

      console.log('✅ All data refreshed:', {
        sessionTasks: sessionTasksResult.length,
        sessionHabits: sessionHabitsResult.length,
        tasksInStore: tasks.length,
        habitsInStore: habits.length,
      });

      // Log what we actually have in session
      console.log('📊 Session tasks:', sessionTasksResult.map(st => ({
        id: st.id,
        task_id: st.task_id,
        session_id: st.session_id,
      })));

      console.log('📊 Session habits:', sessionHabitsResult.map(sh => ({
        id: sh.id,
        habit_id: sh.habit_id,
        session_id: sh.session_id,
      })));

      // Verify that the tasks/habits exist in the store
      console.log('🔍 Checking if session items exist in store...');
      for (const st of sessionTasksResult) {
        const task = tasks.find(t => t.id === st.task_id);
        if (task) {
          console.log(`✅ Task found: ${task.title} (${task.id})`);
        } else {
          console.log(`❌ Task NOT found in store: ${st.task_id}`);
        }
      }
      for (const sh of sessionHabitsResult) {
        const habit = habits.find(h => h.id === sh.habit_id);
        if (habit) {
          console.log(`✅ Habit found: ${habit.title} (${habit.id})`);
        } else {
          console.log(`❌ Habit NOT found in store: ${sh.habit_id}`);
        }
      }

      // Force a small delay to ensure state updates propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Force re-render
      setForceRefresh(prev => prev + 1);

      // Store last added items for undo
      setLastAddedItems({
        sessionId: activeSessionId,
        taskIds,
        habitIds,
      });

      // Show success toast with undo button
      const itemCount = taskIds.length + habitIds.length;
      showToast(
        `${itemCount} item${itemCount > 1 ? 's' : ''} added to session`,
        'success',
        {
          label: 'UNDO',
          onPress: handleUndoAddItems,
        }
      );

      console.log('✅ handleSelectConfirm completed');
    } catch (error) {
      console.error('❌ Error in handleSelectConfirm:', error);
      showToast('Failed to add items to session', 'error');
    }
  };

  const strokeWidth = 12;
  const radius = (TIMER_SIZE - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = TIMER_SIZE / 2;
  const progressStroke = mode === 'focus' ? '#3B82F6' : '#F97316';
  const trackStroke = mode === 'focus'
    ? 'rgba(59, 130, 246, 0.22)'
    : 'rgba(249, 115, 22, 0.25)';
  const animatedStrokeDashoffset = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background,
    }}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
        action={toast.action}
      />
      <WellDoneModal
        visible={showWellDone}
        tasksCompleted={wellDoneRewards?.tasksCompleted || 0}
        habitsCompleted={wellDoneRewards?.habitsCompleted || 0}
        coinsEarned={wellDoneRewards?.coins || 0}
        xpGained={wellDoneRewards?.xp || { PH: 0, CO: 0, EM: 0, SO: 0 }}
        currentStreak={userStats.current_streak}
        onEnterBreak={() => {
          setShowWellDone(false);
          // Ensure break duration and phase are set
          pomodoro.setDurations(workDuration, breakDuration);
          pomodoro.setPhase('break');
          pomodoro.startBreak();
          setMode('break');
          setSeconds(breakDuration);
          setCurrentSessionId(null);
        }}
        onClose={() => {
          setShowWellDone(false);
          setCurrentSessionId(null);
        }}
      />
      <TopBar
        showStats={true}
        showTitle={false}
        streak={userStats.current_streak}
        coins={userStats.total_coins}
        sprint={String(sprintCount)}
        profileImageUri={profileImageUri}
      />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ padding: 16 }}>
          <View style={{ alignItems: 'center', marginBottom: 20, position: 'relative' }}>
            <Pressable
              onPress={() => setShowTimerSettings(true)}
              style={{
                position: 'absolute',
                top: 0,
                right: 20,
                zIndex: 10,
                backgroundColor: colors.cardBackground,
                borderRadius: 20,
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.primary,
              }}
            >
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </Pressable>
            <View style={{ 
              width: TIMER_SIZE, 
              height: TIMER_SIZE, 
              position: 'relative',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Svg
                width={TIMER_SIZE}
                height={TIMER_SIZE}
                style={{ position: 'absolute' }}
              >
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={trackStroke}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <AnimatedCircle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={progressStroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={animatedStrokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  rotation="-90"
                  origin={`${center}, ${center}`}
                />
              </Svg>
              <Pressable
                onPress={handleStart}
                android_ripple={{ color: 'rgba(16, 185, 129, 0.25)', borderless: false, radius: 34 }}
                style={({ pressed }) => ({
                  position: 'absolute',
                  left: -20,
                  backgroundColor: colors.success,
                  borderRadius: 30,
                  width: 60,
                  height: 60,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: colors.success,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 8,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Ionicons name={running ? 'pause' : 'play'} size={26} color='#FFFFFF' />
              </Pressable>
              <Pressable
                onPress={handleReset}
                style={{
                  position: 'absolute',
                  right: -20,
                  backgroundColor: colors.accent,
                  borderRadius: 30,
                  width: 60,
                  height: 60,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 12,
                  borderWidth: 2,
                  borderColor: colors.primary,
                }}
              >
                <Text style={{ fontSize: 24 }}>↻</Text>
              </Pressable>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ 
                  fontSize: 48, 
                  fontWeight: 'bold', 
                  color: colors.text,
                  textAlign: 'center',
                  marginBottom: 4,
                }}>
                  {mmss(seconds)}
                </Text>
                <Text style={{ 
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: '600',
                  textAlign: 'center',
                }}>
                  {mode === 'focus' ? 'Focus Time' : 'Break Time'}
                </Text>
                <Text style={{ 
                  color: colors.textSecondary,
                  fontSize: 11,
                  textAlign: 'center',
                  marginTop: 2,
                }}>
                  {mode === 'focus' ? 'Deep work in progress.' : 'Take a moment to recharge.'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={handleSwitchMode}
            style={{
              backgroundColor: colors.cardBackground,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 20,
              marginTop: 16,
              borderWidth: 1,
              borderColor: colors.primary,
            }}
            >
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
                Switch to {mode === 'focus' ? 'Break' : 'Focus'} Mode
              </Text>
            </Pressable>
          </View>
          <GlassCard style={{ marginTop: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: '600',
                }}>
                  Current Focus Session
                </Text>
              </View>
              <Pressable
                onPress={() => setShowSelectModal(true)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: colors.primary,
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                  borderWidth: 1,
                  borderColor: colors.primary + '55',
                }}
                accessibilityRole="button"
                accessibilityLabel="Add tasks or habits to session"
              >
                <Ionicons name="add" size={20} color={colors.background} />
              </Pressable>
            </View>
            {/* DEBUG INFO - Remove after fixing */}
            <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 8 }}>
              Debug: {sessionTasks.length} tasks, {sessionHabits.length} habits in session
            </Text>

            {sessionTasks.length === 0 && sessionHabits.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                No items selected. Use the + button to line up your focus goals.
              </Text>
            ) : (
              <>
                {sessionTasks.map((st) => {
                  const task = tasks.find(t => t.id === st.task_id);
                  if (!task) {
                    console.log('⚠️ Task not found for session task:', {
                      sessionTaskId: st.id,
                      taskId: st.task_id,
                      availableTasks: tasks.map(t => t.id),
                    });
                    return (
                      <Text key={st.id} style={{ color: 'red', fontSize: 12 }}>
                        ⚠️ Task {st.task_id.substring(0, 8)}... not found
                      </Text>
                    );
                  }
                  return (
                    <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <View style={{
                        backgroundColor: colors.primary + '30',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        borderWidth: 1,
                        borderColor: colors.primary + '60',
                      }}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                          Task
                        </Text>
                      </View>
                      <Text style={{ color: colors.text, flex: 1 }}>{task.title}</Text>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          handleRemoveFromSession('task', task.id);
                        }}
                        style={({ pressed }) => ({
                          padding: 4,
                          opacity: pressed ? 0.5 : 1,
                        })}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  );
                })}
                {sessionHabits.map((sh) => {
                  const habit = habits.find(h => h.id === sh.habit_id);
                  if (!habit) {
                    console.log('⚠️ Habit not found for session habit:', {
                      sessionHabitId: sh.id,
                      habitId: sh.habit_id,
                      availableHabits: habits.map(h => h.id),
                    });
                    return (
                      <Text key={sh.id} style={{ color: 'orange', fontSize: 12 }}>
                        ⚠️ Habit {sh.habit_id.substring(0, 8)}... not found
                      </Text>
                    );
                  }
                  const attrColor = FOCUS_ATTRIBUTES[habit.focus_attribute]?.color || colors.primary;
                  const attrEmoji = FOCUS_ATTRIBUTES[habit.focus_attribute]?.emoji || '🎯';
                  return (
                    <View key={sh.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <View style={{
                        backgroundColor: attrColor + '30',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        borderWidth: 1,
                        borderColor: attrColor + '60',
                      }}>
                        <Text style={{ fontSize: 14 }}>{attrEmoji}</Text>
                        <Text style={{ color: attrColor, fontSize: 12, fontWeight: '600' }}>
                          {habit.focus_attribute}
                        </Text>
                      </View>
                      <Text style={{ color: colors.text, flex: 1 }}>{habit.title}</Text>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          handleRemoveFromSession('habit', habit.id);
                        }}
                        style={({ pressed }) => ({
                          padding: 4,
                          opacity: pressed ? 0.5 : 1,
                        })}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  );
                })}
              </>
            )}
            {sessionTasks.length === 0 && sessionHabits.length === 0 && (
              <Text style={{
                color: colors.textSecondary,
                fontSize: 12,
                marginTop: 8,
              }}>
                Select tasks or habits to channel your XP gains.
              </Text>
            )}
          </GlassCard>
          {recentSessions.length > 0 && (
            <GlassCard>
              <Text style={{ 
                color: colors.text, 
                fontSize: 16, 
                fontWeight: '600',
                marginBottom: 12,
              }}>
                Recent runs
              </Text>
              {recentSessions.map((session, index) => (
                <View key={session.id} style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderBottomWidth: index < recentSessions.length - 1 ? 1 : 0,
                  borderBottomColor: `${colors.primary}20`,
                }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                    {new Date(session.completed_at || session.started_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })} {session.mode === 'work' ? 'Focus' : 'Break'} {Math.round(session.duration / 60)} min
                  </Text>
                  <Text style={{ color: colors.success, fontSize: 12 }}>
                    +{session.coins_earned || 0} coins
                  </Text>
                </View>
              ))}
            </GlassCard>
          )}
        </View>
      </ScrollView>
      <Modal visible={showBreakPrompt} transparent animationType="fade" onRequestClose={() => setShowBreakPrompt(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.primary, borderRadius: 16, padding: 20, width: '100%' }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Break time</Text>
            {quote ? (
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 16 }}>{quote}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable onPress={() => setShowBreakPrompt(false)} style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
                <Text style={{ color: colors.textSecondary }}>Later</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowBreakPrompt(false);
                  pomodoro.setDurations(workDuration, breakDuration);
                  // Ensure phase is set before starting
                  pomodoro.setPhase('break');
                  pomodoro.startBreak();
                  setMode('break');
                  setSeconds(breakDuration);
                }}
                style={{ backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 }}
              >
                <Text style={{ color: colors.background, fontWeight: '700' }}>Start {Math.round(breakDuration / 60)} min break</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <FocusSelectModal
        visible={showSelectModal}
        onClose={() => {
          console.log('🚪 Modal closed');
          setShowSelectModal(false);
        }}
        onConfirm={async (taskIds, habitIds) => {
          console.log('✅ Modal confirmed, processing...');
          await handleSelectConfirm(taskIds, habitIds);
          console.log('✅ Processing complete, closing modal...');
          setShowSelectModal(false);
        }}
      />
      <TimerSettingsModal
        visible={showTimerSettings}
        onClose={() => setShowTimerSettings(false)}
        onSave={handleTimerSettingsSave}
      />
    </View>
  );
}

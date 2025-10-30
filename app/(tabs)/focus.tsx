import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Dimensions, Animated, Easing, Modal } from "react-native";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { mmss } from "../../utils/time";
import { useTheme } from "../../components/ThemeProvider";
import { GlassCard } from "../../components/GlassCard";
import { TopBar } from "../../components/TopBar";
import { AddTaskModal } from "../../components/AddTaskModal";
import { AddHabitModal } from "../../components/AddHabitModal";
import { TimerSettingsModal } from "../../components/TimerSettingsModal";
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
  const [linkedTask, setLinkedTask] = useState<Task | null>(null);
  const [linkedHabit, setLinkedHabit] = useState<Habit | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [sprintCount, setSprintCount] = useState(0);
  const [dailySprintDate, setDailySprintDate] = useState('');
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [recentSessions, setRecentSessions] = useState<FocusSession[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getUserId = async (): Promise<string> => {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  };

  const loadData = async () => {
    try {
      const userId = await getUserId();
      const loadLocalData = async () => {
        try {
          const localTasks = await AsyncStorage.getItem(`tasks-${userId}`);
          if (localTasks) {
            setTasks(JSON.parse(localTasks));
          }
          const localHabits = await AsyncStorage.getItem(`habits-${userId}`);
          if (localHabits) {
            const parsed: Habit[] = JSON.parse(localHabits).map((habit: Habit) => ({
              ...habit,
              focus_attribute: normalizeHabitFocusAttribute(habit.focus_attribute as string) as Habit['focus_attribute'],
            }));
            setHabits(parsed);
          }
        } catch (storageError) {
          console.error('Error loading cached tasks/habits:', storageError);
        }
      };
      await loadLocalData();
      const isLoggedIn = !!session?.user?.id;
      if (!supabase || !isLoggedIn) return;
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (!tasksError && tasksData) {
        const remoteTasks = tasksData as Task[];
        setTasks(remoteTasks);
        await AsyncStorage.setItem(`tasks-${userId}`, JSON.stringify(remoteTasks));
      } else if (tasksError) {
        console.warn('Supabase tasks fetch failed, using cached values:', tasksError.message);
      }
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (!habitsError && habitsData) {
        const normalizedHabits = (habitsData as Habit[]).map(habit => ({
          ...habit,
          focus_attribute: normalizeHabitFocusAttribute(habit.focus_attribute as string) as Habit['focus_attribute'],
        }));
        setHabits(normalizedHabits);
        await AsyncStorage.setItem(`habits-${userId}`, JSON.stringify(normalizedHabits));
      } else if (habitsError) {
        console.warn('Supabase habits fetch failed, using cached values:', habitsError.message);
      }
      const { data: sessionsData, error: sessionError } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('completed_at', { ascending: false })
        .limit(5);
      if (!sessionError && sessionsData) {
        setRecentSessions(sessionsData as FocusSession[]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    loadData();
    loadSettings();
    loadDailySprintCount();
  }, []);

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
        let totalCoins = REWARDS.SPRINT_BASE;
        const rewardMessages: string[] = [`+${REWARDS.SPRINT_BASE} coins for completing sprint`];

        // Check if linked task was completed
        if (sprintData.linkedTaskId) {
          const task = tasksRef.current.find((t: Task) => t.id === sprintData.linkedTaskId);
          if (task && task.done) {
            totalCoins += REWARDS.TASK_COMPLETE;
            rewardMessages.push(`+${REWARDS.TASK_COMPLETE} coins for task: "${task.title}"`);
          }
        }

        // Check if linked habit exists and award XP
        if (sprintData.linkedHabitId) {
          const habit = habitsRef.current.find((h: Habit) => h.id === sprintData.linkedHabitId);
          if (habit) {
            await addXP(habit.focus_attribute, REWARDS.HABIT_XP);
            rewardMessages.push(`+${REWARDS.HABIT_XP} XP to ${habit.focus_attribute} for habit: "${habit.title}"`);
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

  useEffect(() => {
    if (pomodoro.phase === 'focus' && pomodoro.sprint.workCompletedAt && !pomodoro.running) {
      (async () => {
        try {
          const res = await fetch('https://zenquotes.io/api/random');
          const data = await res.json();
          const text = Array.isArray(data) && data[0]?.q ? `${data[0].q} — ${data[0].a ?? 'Unknown'}` : null;
          setQuote(text || null);
        } catch {
          const fallback = [
            'Small steps every day lead to big results.',
            'Focus is the art of knowing what to ignore.',
            'Rest is part of the process. Take this break well.',
          ];
          setQuote(fallback[Math.floor(Math.random() * fallback.length)]);
        }
        setShowBreakPrompt(true);
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

  const handleSessionCompleteLegacy = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const isWorkSession = mode === 'focus';
    const xpToAward = isWorkSession ? 25 : 5;
    if (isWorkSession) {
      updateStreak(userStats.current_streak + 1);
      addFocusSession(workDuration);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const baseCount = dailySprintDate === today ? sprintCount : 0;
      const newCount = baseCount + 1;
      setSprintCount(newCount);
      setDailySprintDate(today);
      try {
        await AsyncStorage.setItem(DAILY_SPRINT_KEY, JSON.stringify({ date: today, count: newCount }));
      } catch (error) {
        console.error('Error saving sprint count:', error);
      }
      await incrementSprints();
    }
    try {
      const userId = await getUserId();
      if (supabase) {
        await supabase.from('focus_sessions').insert({
          user_id: userId,
          duration: isWorkSession ? workDuration : breakDuration,
          mode: isWorkSession ? 'work' : 'break',
          linked_task_id: linkedTask?.id || null,
          linked_habit_id: linkedHabit?.id || null,
          coins_earned: coinsToAward,
          completed_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }
    Notifications.scheduleNotificationAsync({
      content: { 
        title: isWorkSession ? "Work session complete!" : "Break time!",
        body: `You earned ${coinsToAward} coins and ${xpToAward} XP!`,
      },
      trigger: null,
    });
    progressAnimation.stopAnimation();
    progressAnimation.setValue(0);
    const nextMode = isWorkSession ? 'break' : 'focus';
    setMode(nextMode);
    setSeconds(nextMode === 'focus' ? workDuration : breakDuration);
    setRunning(false);
    setSessionStarted(false);
    setLinkedTask(null);
    setLinkedHabit(null);
    loadData();
  };

  const handleStart = async () => {
    const userId = session?.user?.id ?? await getUserId();
    if (!running) {
      pomodoro.start(userId);
    } else {
      pomodoro.pause();
    }
  };

  const handleReset = () => {
    pomodoro.reset();
    setSeconds(mode === 'focus' ? workDuration : breakDuration);
    setLinkedTask(null);
    setLinkedHabit(null);
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

  const handleAddTask = async (title: string, notes?: string) => {
    try {
      const userId = await getUserId();
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;
      let newTask: Task | null = null;
      if (supabase && session?.user?.id) {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            title: trimmedTitle,
            // Persist only fields that exist in DB schema
            user_id: session.user.id,
            notes: null,
          })
          .select()
          .single();
        if (!error && data) {
          newTask = data as Task;
        } else if (error) {
          console.warn('Supabase add task failed, using local storage fallback:', error.message);
        }
      }
      if (!newTask) {
        newTask = {
          id: `task_${Date.now()}`,
          title: trimmedTitle,
          done: false,
          created_at: new Date().toISOString(),
          user_id: userId,
        };
      }
      setTasks(prev => {
        const updated = [newTask!, ...prev];
        AsyncStorage.setItem(`tasks-${userId}`, JSON.stringify(updated)).catch(err =>
          console.error('Error caching tasks locally:', err)
        );
        return updated;
      });
      setLinkedTask(newTask);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleAddHabit = async (title: string, cue?: string, focusAttribute?: string) => {
    try {
      const userId = await getUserId();
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;
      const selectedAttribute = normalizeHabitFocusAttribute(focusAttribute || 'CO');
      const trimmedCue = cue?.trim() || null;
      let habitRecord: Habit | null = null;
      if (supabase) {
        const { data, error } = await supabase
          .from('habits')
          .insert({
            title: trimmedTitle,
            cue: trimmedCue,
            focus_attribute: selectedAttribute,
            user_id: userId,
          })
          .select()
          .single();
        if (!error && data) {
          habitRecord = data as Habit;
        } else if (error) {
          console.warn('Supabase add habit failed, using local storage fallback:', error.message);
        }
      }
      if (!habitRecord) {
        habitRecord = {
          id: `habit_${Date.now()}`,
          title: trimmedTitle,
          cue: trimmedCue,
          focus_attribute: selectedAttribute,
          created_at: new Date().toISOString(),
          user_id: userId,
        };
      }
      const normalizedHabit: Habit = {
        ...habitRecord,
        focus_attribute: normalizeHabitFocusAttribute(habitRecord.focus_attribute as string) as Habit['focus_attribute'],
      };
      setHabits(prev => {
        const updated = [normalizedHabit, ...prev];
        AsyncStorage.setItem(`habits-${userId}`, JSON.stringify(updated)).catch(err =>
          console.error('Error caching habits locally:', err)
        );
        return updated;
      });
      setLinkedHabit(normalizedHabit);
    } catch (error) {
      console.error('Error adding habit:', error);
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
                marginTop: 20,
                borderWidth: 1,
                borderColor: colors.primary,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
                Switch to {mode === 'focus' ? 'Break' : 'Focus'} Mode
              </Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <Pressable
              onPress={() => setShowAddTask(true)}
              style={{
                flex: 1,
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.background, fontWeight: '600' }}>Add Task</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowAddHabit(true)}
              style={{
                flex: 1,
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.background, fontWeight: '600' }}>Add Habit</Text>
            </Pressable>
          </View>
          <GlassCard style={{ marginBottom: 20 }}>
            <Text style={{ 
              color: colors.text, 
              fontSize: 16, 
              fontWeight: '600',
              marginBottom: 12,
            }}>
              Current Focus Session
            </Text>
            {linkedTask ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}>
                  <Text style={{ color: colors.background, fontSize: 12, fontWeight: '600' }}>
                    📋 Task
                  </Text>
                </View>
                <Text style={{ color: colors.text, flex: 1 }}>{linkedTask.title}</Text>
                <Pressable onPress={() => setLinkedTask(null)}>
                  <Text style={{ color: colors.textSecondary }}>✕</Text>
                </Pressable>
              </View>
            ) : linkedHabit ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  backgroundColor: FOCUS_ATTRIBUTES[linkedHabit.focus_attribute]?.color || colors.primary,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}>
                  <Text style={{ color: colors.background, fontSize: 12, fontWeight: '600' }}>
                    {FOCUS_ATTRIBUTES[linkedHabit.focus_attribute]?.emoji} {linkedHabit.focus_attribute}
                  </Text>
                </View>
                <Text style={{ color: colors.text, flex: 1 }}>{linkedHabit.title}</Text>
                <Pressable onPress={() => setLinkedHabit(null)}>
                  <Text style={{ color: colors.textSecondary }}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                No specific targets
              </Text>
            )}
            <Text style={{ 
              color: colors.textSecondary, 
              fontSize: 12, 
              marginTop: 8,
            }}>
              Select a task or habit to channel your XP gains.
            </Text>
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
                    +{session.coins_earned} coins
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
                onPress={() => { setShowBreakPrompt(false); pomodoro.startBreak(); setMode('break'); }}
                style={{ backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 }}
              >
                <Text style={{ color: colors.background, fontWeight: '700' }}>Start 5 min break</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <AddTaskModal
        visible={showAddTask}
        onClose={() => setShowAddTask(false)}
        onAdd={handleAddTask}
        onSelect={(task) => {
          setLinkedTask(task);
          setShowAddTask(false);
        }}
        existingTasks={tasks}
      />
      <AddHabitModal
        visible={showAddHabit}
        onClose={() => setShowAddHabit(false)}
        onAdd={handleAddHabit}
        onSelect={(habit) => {
          setLinkedHabit(habit);
          setShowAddHabit(false);
        }}
        existingHabits={habits}
      />
      <TimerSettingsModal
        visible={showTimerSettings}
        onClose={() => setShowTimerSettings(false)}
        onSave={handleTimerSettingsSave}
      />
    </View>
  );
}



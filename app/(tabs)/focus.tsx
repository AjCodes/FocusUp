import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Dimensions, Animated, Easing, Modal } from "react-native";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { mmss } from "../../utils/time";
import { useTheme } from "../../components/ThemeProvider";
import { GlassCard } from "../../components/GlassCard";
import { TopBar } from "../../components/TopBar";
import { FocusSelectModal } from "../../components/FocusSelectModal";
import { EndSessionModal } from "../../components/EndSessionModal";
import { TimerSettingsModal } from "../../components/TimerSettingsModal";
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
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
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
  const getSessionTasks = useAppData(state => state.getSessionTasks);
  const getSessionHabits = useAppData(state => state.getSessionHabits);
  const [recentSessions, setRecentSessions] = useState<FocusSession[]>([]);

  const getUserId = async (): Promise<string> => {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  };


  useEffect(() => {
    const initData = async () => {
      const userId = session?.user?.id ?? await getUserId();
      await refreshAll(userId);
      loadSettings();
      loadDailySprintCount();
      // Load recent sessions
      if (supabase && session?.user?.id) {
        const { data: sessionsData } = await supabase
          .from('focus_sessions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('completed_at', { ascending: false })
          .limit(5);
        if (sessionsData) {
          setRecentSessions(sessionsData as FocusSession[]);
        }
      }
    };
    initData();
  }, [session?.user?.id]);

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
    if (pomodoro.phase === 'focus' && pomodoro.sprint.workCompletedAt && !pomodoro.running) {
      // Get or create session ID
      const userId = session?.user?.id ?? '';
      if (!userId) return;
      
      // If pomodoro created a session, use it; otherwise create one
      let sessionId = pomodoro.sprint.id;
      if (!sessionId) {
        // Create session retroactively
        (async () => {
          const newSessionId = await startSession({
            mode: 'work',
            duration: workDuration,
            userId,
          });
          if (newSessionId) {
            setCurrentSessionId(newSessionId);
            getSessionTasks(newSessionId, userId);
            getSessionHabits(newSessionId, userId);
            setShowEndSessionModal(true);
          }
        })();
        return;
      }
      
      setCurrentSessionId(sessionId);
      getSessionTasks(sessionId, userId);
      getSessionHabits(sessionId, userId);
      setShowEndSessionModal(true);
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

  const handleSelectConfirm = async (taskIds: string[], habitIds: string[]) => {
    if (!currentSessionId) {
      // Create session first if not exists
      const userId = session?.user?.id ?? await getUserId();
      const sessionId = await startSession({
        mode: 'work',
        duration: workDuration,
        userId,
      });
      if (!sessionId) return;
      setCurrentSessionId(sessionId);
      await attachToSession({
        sessionId,
        taskIds,
        habitIds,
        userId,
      });
    } else {
      const userId = session?.user?.id ?? await getUserId();
      await attachToSession({
        sessionId: currentSessionId,
        taskIds,
        habitIds,
        userId,
      });
    }
    // Refresh session tasks/habits
    if (currentSessionId) {
      const userId = session?.user?.id ?? await getUserId();
      await getSessionTasks(currentSessionId, userId);
      await getSessionHabits(currentSessionId, userId);
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
              <Text style={{ 
                color: colors.text, 
                fontSize: 16, 
                fontWeight: '600',
              }}>
                Current Focus Session
              </Text>
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
            {sessionTasks.length === 0 && sessionHabits.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                No items selected. Use the + button to line up your focus goals.
              </Text>
            ) : (
              <>
                {sessionTasks.map((st) => {
                  const task = tasks.find(t => t.id === st.task_id);
                  if (!task) return null;
                  return (
                    <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
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
                      <Text style={{ color: colors.text, flex: 1 }}>{task.title}</Text>
                    </View>
                  );
                })}
                {sessionHabits.map((sh) => {
                  const habit = habits.find(h => h.id === sh.habit_id);
                  if (!habit) return null;
                  return (
                    <View key={sh.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <View style={{
                        backgroundColor: FOCUS_ATTRIBUTES[habit.focus_attribute]?.color || colors.primary,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}>
                        <Text style={{ color: colors.background, fontSize: 12, fontWeight: '600' }}>
                          {FOCUS_ATTRIBUTES[habit.focus_attribute]?.emoji} {habit.focus_attribute}
                        </Text>
                      </View>
                      <Text style={{ color: colors.text, flex: 1 }}>{habit.title}</Text>
                    </View>
                  );
                })}
              </>
            )}
            <Text style={{ 
              color: colors.textSecondary, 
              fontSize: 12, 
              marginTop: 8,
            }}>
              Select tasks or habits to channel your XP gains.
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
        onClose={() => setShowSelectModal(false)}
        onConfirm={handleSelectConfirm}
      />
      <EndSessionModal
        visible={showEndSessionModal}
        sessionId={currentSessionId}
        userId={session?.user?.id ?? ''}
        duration={workDuration}
        onClose={() => setShowEndSessionModal(false)}
        onEnterBreak={() => {
          setShowEndSessionModal(false);
          // Ensure break duration and phase are set
          pomodoro.setDurations(workDuration, breakDuration);
          pomodoro.setPhase('break');
          pomodoro.startBreak();
          setMode('break');
          setSeconds(breakDuration);
          setCurrentSessionId(null);
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

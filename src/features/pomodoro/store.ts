import { create } from 'zustand';
import { AppState } from 'react-native';
import { Phase, WORK_SECONDS, BREAK_SECONDS, nextPhase, computeSecondsLeft } from './logic';
import { supabase } from '../../../lib/supabase';

type Sprint = {
  id: string | null;
  userId: string | null;
  linkedTaskId: string | null;
  linkedHabitId: string | null;
  workStartedAt: string | null;
  workCompletedAt: string | null;
  breakStartedAt: string | null;
  breakCompletedAt: string | null;
  workDurationSec: number | null;
  breakDurationSec: number | null;
};

type SprintCompleteData = {
  linkedTaskId: string | null;
  linkedHabitId: string | null;
  workDurationSec: number;
  breakDurationSec: number;
};

type PomodoroState = {
  phase: Phase;
  running: boolean;
  targetTimestamp: number | null;
  secondsLeft: number;
  workSeconds: number;
  breakSeconds: number;
  sprint: Sprint;
  onSprintComplete: ((data: SprintCompleteData) => void) | null;
  setOnSprintComplete: (callback: ((data: SprintCompleteData) => void) | null) => void;
  setLinkTask: (taskId: string | null) => void;
  setLinkHabit: (habitId: string | null) => void;
  setDurations: (workSeconds: number, breakSeconds: number) => void;
  start: (userId: string) => Promise<void>;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  startBreak: () => Promise<void>;
};

let intervalHandle: any = null;

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  phase: 'focus',
  running: false,
  targetTimestamp: null,
  secondsLeft: WORK_SECONDS,
  workSeconds: WORK_SECONDS,
  breakSeconds: BREAK_SECONDS,
  onSprintComplete: null,
  sprint: {
    id: null,
    userId: null,
    linkedTaskId: null,
    linkedHabitId: null,
    workStartedAt: null,
    workCompletedAt: null,
    breakStartedAt: null,
    breakCompletedAt: null,
    workDurationSec: null,
    breakDurationSec: null,
  },
  setOnSprintComplete: (callback) => set({ onSprintComplete: callback }),
  setDurations: (workSeconds, breakSeconds) => {
    const st = get();
    const next: Partial<PomodoroState> = { workSeconds, breakSeconds } as any;
    // If not running, also reset secondsLeft to the appropriate duration for current phase
    if (!st.running) {
      next.secondsLeft = st.phase === 'focus' ? workSeconds : breakSeconds;
    }
    set(next as any);
  },
  setLinkTask: (taskId) => set((s) => ({ sprint: { ...s.sprint, linkedTaskId: taskId, linkedHabitId: null } })),
  setLinkHabit: (habitId) => set((s) => ({ sprint: { ...s.sprint, linkedHabitId: habitId, linkedTaskId: null } })),
  async start(userId: string) {
    const state = get();
    const now = Date.now();
    const duration = state.workSeconds ?? WORK_SECONDS;
    const target = now + duration * 1000;
    // create sprint row if none
    let sprintId = state.sprint.id;
    const isUuid = typeof userId === 'string' && /^[0-9a-fA-F-]{36}$/.test(userId);
    if (!sprintId && supabase && isUuid) {
      const { data, error } = await supabase.from('focus_sprints').insert({
        user_id: userId,
        linked_task_id: state.sprint.linkedTaskId,
        linked_habit_id: state.sprint.linkedHabitId,
        work_started_at: new Date(now).toISOString(),
      }).select('id').single();
      if (!error && data) sprintId = data.id as string;
    }
    set({
      phase: 'focus',
      running: true,
      targetTimestamp: target,
      secondsLeft: duration,
      sprint: { ...get().sprint, id: sprintId ?? null, userId, workStartedAt: new Date(now).toISOString() },
    });

    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = setInterval(() => get().tick(), 1000);
  },
  pause() {
    if (intervalHandle) clearInterval(intervalHandle);
    set({ running: false });
  },
  reset() {
    if (intervalHandle) clearInterval(intervalHandle);
    const st = get();
    const ws = st.workSeconds ?? WORK_SECONDS;
    set({ running: false, phase: 'focus', targetTimestamp: null, secondsLeft: ws, sprint: { id: null, userId: null, linkedTaskId: null, linkedHabitId: null, workStartedAt: null, workCompletedAt: null, breakStartedAt: null, breakCompletedAt: null, workDurationSec: null, breakDurationSec: null } });
  },
  tick() {
    const { targetTimestamp, phase, sprint, workSeconds, breakSeconds } = get();
    if (!targetTimestamp) return;
    const left = computeSecondsLeft(targetTimestamp);
    set({ secondsLeft: left });
    if (left <= 0) {
      if (phase === 'focus') {
        // Mark work complete
        const completedAt = new Date().toISOString();
        set({ sprint: { ...sprint, workCompletedAt: completedAt, workDurationSec: workSeconds ?? WORK_SECONDS } });
        set({ running: false });
      } else {
        // Break finished
        const completedAt = new Date().toISOString();
        set({ sprint: { ...sprint, breakCompletedAt: completedAt, breakDurationSec: breakSeconds ?? BREAK_SECONDS } });
        set({ running: false });
      }
    }
  },
  async startBreak() {
    const state = get();
    const now = Date.now();
    const duration = state.breakSeconds ?? BREAK_SECONDS;
    const target = now + duration * 1000;
    // persist work complete, then set break start
    if (supabase && state.sprint.id) {
      await supabase.from('focus_sprints').update({
        work_completed_at: state.sprint.workCompletedAt,
        work_duration_sec: state.sprint.workDurationSec,
        break_started_at: new Date(now).toISOString(),
      }).eq('id', state.sprint.id);
    }
    set({
      phase: 'break',
      running: true,
      targetTimestamp: target,
      secondsLeft: duration,
      sprint: { ...state.sprint, breakStartedAt: new Date(now).toISOString() },
    });
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = setInterval(() => get().tick(), 1000);
    // When break completes, persist completion and trigger rewards
    const finalize = async () => {
      const s = get().sprint;
      const callback = get().onSprintComplete;

      // Persist to database
      if (supabase && s.id) {
        await supabase.from('focus_sprints').update({
          break_completed_at: s.breakCompletedAt,
          break_duration_sec: s.breakDurationSec,
        }).eq('id', s.id);
      }

      // Trigger sprint completion rewards
      if (callback && s.workDurationSec && s.breakDurationSec) {
        callback({
          linkedTaskId: s.linkedTaskId,
          linkedHabitId: s.linkedHabitId,
          workDurationSec: s.workDurationSec,
          breakDurationSec: s.breakDurationSec,
        });
      }
    };
    // Poll until breakCompletedAt is set by tick
    const breakWatcher = setInterval(async () => {
      const s = get().sprint;
      if (s.breakCompletedAt) {
        clearInterval(breakWatcher);
        if (intervalHandle) { clearInterval(intervalHandle); }
        await finalize();
      }
    }, 500);
  },
}));

// Keep ticking sensibly on app state changes
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    const st = usePomodoroStore.getState();
    if (st.running && st.targetTimestamp) {
      usePomodoroStore.setState({ secondsLeft: computeSecondsLeft(st.targetTimestamp) });
    }
  }
});



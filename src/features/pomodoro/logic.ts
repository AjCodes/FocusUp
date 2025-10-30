export type Phase = 'focus' | 'break';

export const WORK_SECONDS = 25 * 60;
export const BREAK_SECONDS = 5 * 60;

export function nextPhase(phase: Phase): Phase {
  return phase === 'focus' ? 'break' : 'focus';
}

export function computeSecondsLeft(targetTimestamp: number): number {
  const now = Date.now();
  return Math.max(0, Math.ceil((targetTimestamp - now) / 1000));
}

export function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}



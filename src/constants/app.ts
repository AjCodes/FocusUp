/**
 * Application-wide constants for FocusUp
 */

// Pomodoro Timer Settings
export const POMODORO = {
  DEFAULT_WORK_SECONDS: 25 * 60, // 25 minutes
  DEFAULT_BREAK_SECONDS: 5 * 60, // 5 minutes
  MIN_WORK_SECONDS: 1 * 60, // 1 minute
  MAX_WORK_SECONDS: 60 * 60, // 60 minutes
  MIN_BREAK_SECONDS: 1 * 60, // 1 minute
  MAX_BREAK_SECONDS: 30 * 60, // 30 minutes
} as const;

// Reward System - All rewards tied to sprint completion
export const REWARDS = {
  SPRINT_BASE: 5,          // Base reward for completing any sprint (25 min work + 5 min break)
  TASK_COMPLETE: 10,       // Bonus for completing a task during sprint
  HABIT_XP: 10,            // XP awarded to habit's attribute on sprint completion
} as const;

// Character Attributes
export const ATTRIBUTES = {
  CO: { label: 'Cognitive', emoji: '🧠', color: '#3B82F6' },
  PH: { label: 'Physical', emoji: '💪', color: '#10B981' },
  EM: { label: 'Heart', emoji: '❤️', color: '#EF4444' },
  SO: { label: 'Soul', emoji: '🌌', color: '#8B5CF6' },
} as const;

export type AttributeKey = keyof typeof ATTRIBUTES;

// XP System
export const XP = {
  PER_LEVEL: 10,
  MAX_LEVEL: 100,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  USER_ID: 'focusup-user-id',
  DAILY_SPRINT: 'focusup-daily-sprint',
  WORK_DURATION: 'focusup-work-duration',
  BREAK_DURATION: 'focusup-break-duration',
  THEME_MODE: 'focusup-theme-mode',
} as const;

// Validation Limits
export const VALIDATION = {
  TASK_TITLE_MIN: 1,
  TASK_TITLE_MAX: 200,
  TASK_NOTES_MAX: 1000,
  HABIT_TITLE_MIN: 1,
  HABIT_TITLE_MAX: 200,
  HABIT_CUE_MAX: 500,
} as const;

// API Settings
export const API = {
  QUOTE_API_URL: 'https://zenquotes.io/api/random',
  REQUEST_TIMEOUT: 10000, // 10 seconds
} as const;

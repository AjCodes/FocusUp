/**
 * Reward system constants
 */

export const REWARDS = {
  // Base rewards
  HABIT_BASE_XP: 10,
  TASK_BASE_COINS: {
    low: 3,
    medium: 6,
    high: 10
  },
  SPRINT_BASE_COINS: 5,

  // Multipliers
  FOCUS_MULTIPLIER: 2.0,        // During focus session
  NON_FOCUS_MULTIPLIER: 0.5,    // Outside focus session
  DUPLICATE_PENALTY: 0.5,        // For duplicate tasks
  RAPID_COMPLETION_PENALTY: 0.5, // For spam behavior

  // Time-of-day bonuses for sprints
  TIME_BONUSES: {
    MORNING: 1.2,    // 6am-12pm: +20%
    AFTERNOON: 1.1,  // 2pm-6pm: +10%
    EVENING: 1.0,    // 7pm-11pm: Normal
    LATE_NIGHT: 0.8  // 11pm-6am: -20% (discourage burnout)
  },

  // Streak multipliers (by week count)
  STREAK_MULTIPLIERS: [1.0, 1.1, 1.2, 1.3, 1.5], // Weeks 1-5+

  // Variety bonus
  VARIETY_BONUS: 1.25, // +25% if all 4 attributes worked today

  // Verification
  VERIFICATION_TIMES: [8, 15, 20], // Minutes into sprint
  VERIFICATION_TIMEOUT: 60,         // Seconds to respond

  // Minimum requirements
  MINIMUM_FOCUS_TIME: 15 * 60, // 15 minutes in seconds

  // Character level costs (coins required to level up)
  LEVEL_UP_COSTS: {
    10: 100,
    20: 500,
    30: 2000,
    40: 5000,
    50: 15000,
    60: 40000,
    70: 80000,
    80: 150000,
    90: 300000,
    99: 1000000
  }
} as const;

export type AttributeKey = 'PH' | 'CO' | 'EM' | 'SO';
export type TaskPriority = 'low' | 'medium' | 'high';

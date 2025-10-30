/**
 * TypeScript types for reward system
 */

export type AttributeKey = 'PH' | 'CO' | 'EM' | 'SO';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Attributes {
  PH: number;  // Physical
  CO: number;  // Cognitive
  EM: number;  // Emotional (Heart)
  SO: number;  // Spiritual (Soul)
}

export interface RewardContext {
  itemNumber: number;        // 1st habit/task/sprint today
  duringFocus: boolean;      // Completed during focus session?
  isDuplicate: boolean;      // Similar to recent item?
  isRapidCompletion: boolean; // Completed too quickly?
  timeOfDay: number;         // Hour (0-23)
  streak: number;            // Current streak
  allAttributesWorkedToday: boolean; // Variety bonus?
}

export interface RewardResult {
  success: boolean;
  amount: number;            // XP or coins earned
  baseAmount: number;        // Before multipliers
  multipliers: Record<string, number>; // All multipliers applied
  message: string;
}

export interface DailyStats {
  date: string;
  habitsCompleted: number;
  tasksCompleted: number;
  sprintsCompleted: number;
  attributesWorked: Set<AttributeKey>;
}

export interface LevelRequirement {
  minAttributeAvg?: number;
  minSingleAttribute?: number;
  minTwoAttributes?: number;
  minThreeAttributes?: number;
  allAttributesMin?: number;
  allAttributes?: number;
  coins: number;
}

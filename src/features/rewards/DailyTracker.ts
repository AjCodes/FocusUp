/**
 * Tracks daily counts for diminishing returns calculation
 * Resets at midnight local time
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AttributeKey, DailyStats } from './types';

export class DailyTracker {
  private storageKey = 'focusup-daily-stats';

  /**
   * Get today's stats (creates new if different day)
   */
  async getDailyStats(userId: string): Promise<DailyStats> {
    const today = new Date().toDateString();
    const stored = await AsyncStorage.getItem(`${this.storageKey}-${userId}`);

    if (stored) {
      const parsed = JSON.parse(stored);

      // Check if same day
      if (parsed.date === today) {
        return {
          ...parsed,
          attributesWorked: new Set(parsed.attributesWorked || [])
        };
      }
    }

    // New day, reset stats
    return {
      date: today,
      habitsCompleted: 0,
      tasksCompleted: 0,
      sprintsCompleted: 0,
      attributesWorked: new Set<AttributeKey>()
    };
  }

  /**
   * Save stats to AsyncStorage
   */
  async saveDailyStats(userId: string, stats: DailyStats): Promise<void> {
    const toSave = {
      ...stats,
      attributesWorked: Array.from(stats.attributesWorked)
    };

    await AsyncStorage.setItem(
      `${this.storageKey}-${userId}`,
      JSON.stringify(toSave)
    );
  }

  /**
   * Get current habit count for today
   */
  async getHabitCount(userId: string): Promise<number> {
    const stats = await this.getDailyStats(userId);
    return stats.habitsCompleted;
  }

  /**
   * Get current task count for today
   */
  async getTaskCount(userId: string): Promise<number> {
    const stats = await this.getDailyStats(userId);
    return stats.tasksCompleted;
  }

  /**
   * Get current sprint count for today
   */
  async getSprintCount(userId: string): Promise<number> {
    const stats = await this.getDailyStats(userId);
    return stats.sprintsCompleted;
  }

  /**
   * Increment habit count and track attribute
   */
  async incrementHabit(userId: string, attribute: AttributeKey): Promise<void> {
    const stats = await this.getDailyStats(userId);
    stats.habitsCompleted++;
    stats.attributesWorked.add(attribute);
    await this.saveDailyStats(userId, stats);
  }

  /**
   * Increment task count
   */
  async incrementTask(userId: string): Promise<void> {
    const stats = await this.getDailyStats(userId);
    stats.tasksCompleted++;
    await this.saveDailyStats(userId, stats);
  }

  /**
   * Increment sprint count
   */
  async incrementSprint(userId: string): Promise<void> {
    const stats = await this.getDailyStats(userId);
    stats.sprintsCompleted++;
    await this.saveDailyStats(userId, stats);
  }

  /**
   * Check if all 4 attributes were worked on today
   */
  async allAttributesWorkedToday(userId: string): Promise<boolean> {
    const stats = await this.getDailyStats(userId);
    return stats.attributesWorked.size === 4;
  }

  /**
   * Get reward multiplier for current sprint
   * (Diminishing returns based on sprint count)
   */
  async getSprintRewardMultiplier(userId: string): Promise<number> {
    const stats = await this.getDailyStats(userId);
    const count = stats.sprintsCompleted + 1; // +1 because this is BEFORE increment

    // Diminishing returns, minimum 25%
    return Math.max(0.25, 1.0 - (count - 1) * 0.1);
  }
}

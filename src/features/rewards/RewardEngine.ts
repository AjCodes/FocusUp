/**
 * Core reward calculation engine
 * Implements RuneScape-inspired exponential XP curve and diminishing returns
 */

import { REWARDS } from './constants';
import type { AttributeKey, Attributes, RewardContext, RewardResult, TaskPriority } from './types';

export class RewardEngine {
  /**
   * RuneScape XP formula for attributes (max level 50)
   * Formula: XP = floor((level-1 + 300 * 2^((level-1)/7)) / 4)
   */
  calculateAttributeXPRequired(level: number): number {
    if (level <= 1) return 0;

    let totalXP = 0;
    for (let i = 1; i < level; i++) {
      totalXP += Math.floor(i + 300 * Math.pow(2, i / 7));
    }
    return Math.floor(totalXP / 4);
  }

  /**
   * Convert XP to level (inverse of above)
   */
  xpToLevel(xp: number): number {
    if (xp <= 0) return 1;

    for (let level = 1; level <= 50; level++) {
      if (xp < this.calculateAttributeXPRequired(level)) {
        return level - 1;
      }
    }
    return 50; // Max level
  }

  /**
   * Calculate character level from total XP across all attributes + coins
   * Uses same RuneScape formula but for character levels (max 99)
   */
  calculateCharacterLevel(attributes: Attributes, coins: number): number {
    const totalXP = Object.values(attributes).reduce((sum, xp) => sum + xp, 0);
    const coinBonus = Math.floor(coins / 100); // 100 coins = +100 effective XP
    const effectiveXP = totalXP + coinBonus;

    return this.xpToLevel(effectiveXP);
  }

  /**
   * Calculate habit XP with diminishing returns
   * Formula: baseXP × (1/√habitNumber) × focusMultiplier × streakMultiplier × varietyBonus
   */
  calculateHabitXP(context: RewardContext): RewardResult {
    const { itemNumber, duringFocus, streak, allAttributesWorkedToday } = context;

    const baseXP = REWARDS.HABIT_BASE_XP;
    const multipliers: Record<string, number> = {};

    // Diminishing returns: 1/√n (never reaches zero)
    const countMultiplier = 1 / Math.sqrt(itemNumber);
    multipliers.diminishing = countMultiplier;

    // Focus multiplier
    const focusMultiplier = duringFocus
      ? REWARDS.FOCUS_MULTIPLIER
      : REWARDS.NON_FOCUS_MULTIPLIER;
    multipliers.focus = focusMultiplier;

    // Streak bonus (max +50%)
    const streakMultiplier = Math.min(1.5, 1.0 + streak / 20);
    multipliers.streak = streakMultiplier;

    // Variety bonus (+25% if worked all attributes today)
    const varietyMultiplier = allAttributesWorkedToday ? REWARDS.VARIETY_BONUS : 1.0;
    multipliers.variety = varietyMultiplier;

    // Calculate final XP
    const finalXP = Math.floor(
      baseXP * countMultiplier * focusMultiplier * streakMultiplier * varietyMultiplier
    );

    return {
      success: true,
      amount: finalXP,
      baseAmount: baseXP,
      multipliers,
      message: `+${finalXP} XP earned! (${itemNumber}${this.getOrdinalSuffix(itemNumber)} habit today)`
    };
  }

  /**
   * Calculate task coins with diminishing returns
   * Formula: baseCoins × max(0.2, 0.9^(n-1)) × focusMultiplier × duplicatePenalty × rapidPenalty
   */
  calculateTaskCoins(
    priority: TaskPriority,
    context: RewardContext
  ): RewardResult {
    const { itemNumber, duringFocus, isDuplicate, isRapidCompletion } = context;

    const baseCoins = REWARDS.TASK_BASE_COINS[priority];
    const multipliers: Record<string, number> = {};

    // Exponential decay, minimum 20%
    const countMultiplier = Math.max(0.2, Math.pow(0.9, itemNumber - 1));
    multipliers.diminishing = countMultiplier;

    // Focus multiplier
    const focusMultiplier = duringFocus
      ? REWARDS.FOCUS_MULTIPLIER
      : REWARDS.NON_FOCUS_MULTIPLIER;
    multipliers.focus = focusMultiplier;

    // Duplicate penalty
    if (isDuplicate) {
      multipliers.duplicate = REWARDS.DUPLICATE_PENALTY;
    }

    // Rapid completion penalty
    if (isRapidCompletion) {
      multipliers.rapid = REWARDS.RAPID_COMPLETION_PENALTY;
    }

    // Calculate final coins
    const totalMultiplier = Object.values(multipliers).reduce((a, b) => a * b, 1);
    const finalCoins = Math.floor(baseCoins * totalMultiplier);

    let message = `+${finalCoins} coins earned! (${itemNumber}${this.getOrdinalSuffix(itemNumber)} task today)`;
    if (isDuplicate) message += ' [Duplicate detected]';
    if (isRapidCompletion) message += ' [Slow down!]';

    return {
      success: true,
      amount: finalCoins,
      baseAmount: baseCoins,
      multipliers,
      message
    };
  }

  /**
   * Calculate sprint reward with time-of-day and count multipliers
   */
  calculateSprintReward(context: RewardContext): RewardResult {
    const { itemNumber, timeOfDay } = context;

    const baseCoins = REWARDS.SPRINT_BASE_COINS;
    const multipliers: Record<string, number> = {};

    // Time of day multiplier
    let timeMultiplier = REWARDS.TIME_BONUSES.EVENING; // Default
    if (timeOfDay >= 6 && timeOfDay < 12) {
      timeMultiplier = REWARDS.TIME_BONUSES.MORNING;
    } else if (timeOfDay >= 14 && timeOfDay < 18) {
      timeMultiplier = REWARDS.TIME_BONUSES.AFTERNOON;
    } else if (timeOfDay >= 23 || timeOfDay < 5) {
      timeMultiplier = REWARDS.TIME_BONUSES.LATE_NIGHT;
    }
    multipliers.timeOfDay = timeMultiplier;

    // Sprint count multiplier (diminishing, minimum 25%)
    const countMultiplier = Math.max(0.25, 1.0 - (itemNumber - 1) * 0.1);
    multipliers.diminishing = countMultiplier;

    // Calculate final coins
    const finalCoins = Math.floor(baseCoins * timeMultiplier * countMultiplier);

    return {
      success: true,
      amount: finalCoins,
      baseAmount: baseCoins,
      multipliers,
      message: `+${finalCoins} coins for sprint #${itemNumber}!`
    };
  }

  /**
   * Check if user can level up character
   */
  canLevelUp(
    currentLevel: number,
    attributes: Attributes,
    coins: number
  ): { canLevel: boolean; reason?: string; cost?: number } {
    // Level requirements (attribute gates)
    const requirements: Record<number, any> = {
      10: { minAttributeAvg: 5, coins: 100 },
      20: { minAttributeAvg: 10, minSingleAttribute: 8, coins: 500 },
      30: { minAttributeAvg: 15, minTwoAttributes: 12, coins: 2000 },
      40: { minAttributeAvg: 20, minThreeAttributes: 18, coins: 5000 },
      50: { minAttributeAvg: 25, allAttributesMin: 22, coins: 15000 },
      60: { minAttributeAvg: 30, allAttributesMin: 25, coins: 40000 },
      70: { minAttributeAvg: 35, allAttributesMin: 30, coins: 80000 },
      80: { minAttributeAvg: 40, allAttributesMin: 35, coins: 150000 },
      90: { minAttributeAvg: 45, allAttributesMin: 40, coins: 300000 },
      99: { allAttributes: 50, coins: 1000000 }
    };

    const nextLevel = currentLevel + 1;
    const req = requirements[nextLevel];

    if (!req) {
      return { canLevel: false, reason: 'Max level (99) reached!' };
    }

    if (coins < req.coins) {
      return {
        canLevel: false,
        reason: `Need ${req.coins} coins (you have ${coins})`
      };
    }

    // Check attribute requirements
    const attrLevels = Object.values(attributes).map(xp => this.xpToLevel(xp));
    const avgLevel = attrLevels.reduce((a, b) => a + b, 0) / 4;

    if (req.minAttributeAvg && avgLevel < req.minAttributeAvg) {
      return {
        canLevel: false,
        reason: `Need average attribute level ${req.minAttributeAvg} (current: ${avgLevel.toFixed(1)})`
      };
    }

    if (req.minSingleAttribute) {
      const maxAttr = Math.max(...attrLevels);
      if (maxAttr < req.minSingleAttribute) {
        return {
          canLevel: false,
          reason: `Need at least one attribute at level ${req.minSingleAttribute}`
        };
      }
    }

    if (req.minTwoAttributes) {
      const qualifyingAttrs = attrLevels.filter(lvl => lvl >= req.minTwoAttributes).length;
      if (qualifyingAttrs < 2) {
        return {
          canLevel: false,
          reason: `Need at least two attributes at level ${req.minTwoAttributes}`
        };
      }
    }

    if (req.allAttributesMin) {
      const minAttr = Math.min(...attrLevels);
      if (minAttr < req.allAttributesMin) {
        return {
          canLevel: false,
          reason: `All attributes must be at least level ${req.allAttributesMin}`
        };
      }
    }

    if (req.allAttributes) {
      const allMaxed = attrLevels.every(lvl => lvl >= req.allAttributes);
      if (!allMaxed) {
        return {
          canLevel: false,
          reason: `All attributes must be level ${req.allAttributes}`
        };
      }
    }

    return { canLevel: true, cost: req.coins };
  }

  /**
   * Helper: Get ordinal suffix (1st, 2nd, 3rd, etc.)
   */
  private getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }
}

/**
 * Anti-cheat detection system
 * Detects duplicate tasks, rapid completion, and other suspicious behavior
 */

interface Task {
  id: string;
  title: string;
  created_at: string;
}

interface Completion {
  timestamp: number;
}

export class AntiCheat {
  /**
   * Calculate Levenshtein distance (string similarity)
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Check if task is duplicate of recent tasks
   */
  detectDuplicateTask(newTask: Task, recentTasks: Task[]): boolean {
    // Only check tasks from last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = recentTasks.filter(t =>
      new Date(t.created_at).getTime() > oneDayAgo
    );

    // Normalize titles (lowercase, trim)
    const newTitle = newTask.title.toLowerCase().trim();

    // Check for similar titles
    for (const task of recent) {
      const existingTitle = task.title.toLowerCase().trim();

      // Exact match
      if (newTitle === existingTitle) {
        return true;
      }

      // Very similar (Levenshtein distance < 3)
      const distance = this.levenshteinDistance(newTitle, existingTitle);
      if (distance < 3 && newTitle.length > 5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect rapid completion (bot-like behavior)
   */
  detectRapidCompletion(completions: Completion[]): boolean {
    if (completions.length < 5) return false;

    // Check last 5 completions
    const last5 = completions.slice(-5);
    const timeSpan = last5[4].timestamp - last5[0].timestamp;

    // 5 completions in under 60 seconds = suspicious
    return timeSpan < 60 * 1000;
  }

  /**
   * Check if task title is generic/spam
   */
  isGenericTask(title: string): boolean {
    const generic = [
      'a', 'test', '123', 'task', 'work', 'stuff',
      'todo', 'thing', 'asdf', 'qwerty'
    ];

    const normalized = title.toLowerCase().trim();
    return generic.includes(normalized) || normalized.length < 3;
  }

  /**
   * Calculate spam score (0 = legit, 1 = definite spam)
   */
  calculateSpamScore(
    isDuplicate: boolean,
    isRapid: boolean,
    isGeneric: boolean,
    completionCount: number
  ): number {
    let score = 0;

    if (isDuplicate) score += 0.3;
    if (isRapid) score += 0.3;
    if (isGeneric) score += 0.2;
    if (completionCount > 20) score += 0.2; // Many completions today

    return Math.min(1.0, score);
  }
}

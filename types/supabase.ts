// Supabase database types for FocusUp

export interface Habit {
  id: string;
  title: string;
  cue: string | null;
  focus_attribute: 'CO' | 'PH' | 'EM' | 'SO'; // Cognitive, Physical, Heart, Soul
  created_at: string;
  user_id: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  completed_at: string;
  user_id: string;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  completed_at: string | null;
  created_at: string;
  user_id: string;
  notes?: string | null;
}

export interface FocusSession {
  id: string;
  started_at: string;
  completed_at: string | null;
  duration: number; // in seconds
  mode: 'work' | 'break';
  linked_task_id: string | null; // Deprecated - use focus_session_tasks instead
  linked_habit_id: string | null; // Deprecated - use focus_session_habits instead
  coins_earned: number;
  user_id: string;
}

export interface FocusSessionTask {
  id: string;
  session_id: string;
  task_id: string;
  completed: boolean;
  completed_at: string | null;
  user_id: string;
  created_at: string;
}

export interface FocusSessionHabit {
  id: string;
  session_id: string;
  habit_id: string;
  performed: boolean;
  performed_at: string | null;
  user_id: string;
  created_at: string;
}

export interface RewardEvent {
  id: string;
  user_id: string;
  session_id: string | null;
  type: 'coins' | 'xp';
  amount: number;
  attribute?: 'PH' | 'CO' | 'EM' | 'SO' | null;
  created_at: string;
}

export interface UserStats {
  id: string;
  user_id: string;
  total_coins: number;
  current_streak: number;
  longest_streak: number;
  total_focus_time: number; // in seconds
  total_sessions: number;
  total_sprints: number;
  updated_at: string;
}

// Database schema documentation:
/*
-- Habits table
CREATE TABLE habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  cue TEXT,
  focus_attribute TEXT NOT NULL CHECK (focus_attribute IN ('CO', 'PH', 'EM', 'SO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL
);

-- Habit completions table
CREATE TABLE habit_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL,
  UNIQUE(habit_id, user_id, DATE(completed_at))
);

-- Focus sessions table
CREATE TABLE focus_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL CHECK (mode IN ('work', 'break')),
  linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  linked_habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  coins_earned INTEGER DEFAULT 0,
  user_id UUID NOT NULL
);

-- User stats table
CREATE TABLE user_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  total_coins INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_focus_time INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_sprints INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update existing tasks table to include user_id
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id ON habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
*/


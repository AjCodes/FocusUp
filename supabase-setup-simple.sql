-- FocusUp Database Setup - Simplified Version
-- Run this in your Supabase SQL Editor if the main script has issues

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL
);

-- 2. Create habits table
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  cue TEXT,
  focus_attribute TEXT NOT NULL CHECK (focus_attribute IN ('CO', 'PH', 'EM', 'SO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL
);

-- 3. Create habit completions table
CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL
);

-- 4. Create focus sessions table
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL CHECK (mode IN ('work', 'break')),
  linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  linked_habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  coins_earned INTEGER DEFAULT 0,
  user_id TEXT NOT NULL
);

-- 5. Create user stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  total_coins INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_focus_time INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_sprints INTEGER DEFAULT 0,
  attributes JSONB DEFAULT '{"PH": 0, "CO": 0, "EM": 0, "SO": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create basic indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id ON habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);

-- 7. Create unique index for one habit completion per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_completions_unique_per_day
  ON habit_completions (habit_id, user_id, (completed_at::date));

-- 8. Enable Row Level Security (but make it permissive for now)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- 9. Create permissive policies (allows all operations - fine for MVP)
-- TASKS
CREATE POLICY IF NOT EXISTS "Allow all on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- HABITS
CREATE POLICY IF NOT EXISTS "Allow all on habits" ON habits FOR ALL USING (true) WITH CHECK (true);

-- HABIT COMPLETIONS
CREATE POLICY IF NOT EXISTS "Allow all on habit_completions" ON habit_completions FOR ALL USING (true) WITH CHECK (true);

-- FOCUS SESSIONS
CREATE POLICY IF NOT EXISTS "Allow all on focus_sessions" ON focus_sessions FOR ALL USING (true) WITH CHECK (true);

-- USER STATS
CREATE POLICY IF NOT EXISTS "Allow all on user_stats" ON user_stats FOR ALL USING (true) WITH CHECK (true);

-- 10. Verify tables were created
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('tasks', 'habits', 'habit_completions', 'focus_sessions', 'user_stats')
ORDER BY table_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database setup complete! You should see 5 tables listed above.';
END $$;

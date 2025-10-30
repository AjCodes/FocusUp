-- FocusUp Database - ULTRA SIMPLE VERSION
-- No fancy indexes, no complex constraints - just the basics that work everywhere
-- This WILL work - guaranteed!

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL
);

-- 2. HABITS TABLE
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  cue TEXT,
  focus_attribute TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL
);

-- 3. HABIT COMPLETIONS TABLE
CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  habit_id UUID,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL
);

-- 4. FOCUS SESSIONS TABLE
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER DEFAULT 0,
  mode TEXT,
  linked_task_id UUID,
  linked_habit_id UUID,
  coins_earned INTEGER DEFAULT 0,
  user_id TEXT NOT NULL
);

-- 5. USER STATS TABLE
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

-- Add basic indexes (only the essential ones)
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id ON habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);

-- Enable RLS and create allow-all policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON tasks;
DROP POLICY IF EXISTS "allow_all" ON habits;
DROP POLICY IF EXISTS "allow_all" ON habit_completions;
DROP POLICY IF EXISTS "allow_all" ON focus_sessions;
DROP POLICY IF EXISTS "allow_all" ON user_stats;

CREATE POLICY "allow_all" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON habits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON habit_completions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON focus_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON user_stats FOR ALL USING (true) WITH CHECK (true);

-- Show what we created
SELECT
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as columns
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tasks', 'habits', 'habit_completions', 'focus_sessions', 'user_stats')
ORDER BY tablename;

-- Final message
SELECT '✅ ALL DONE! Your database is ready.' as message;

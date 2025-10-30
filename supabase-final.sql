-- FocusUp Database Setup - FINAL VERSION
-- This script works no matter what state your database is in
-- Just run this ONCE and you're done!

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create ALL tables (IF NOT EXISTS means it's safe to run multiple times)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  cue TEXT,
  focus_attribute TEXT NOT NULL CHECK (focus_attribute IN ('CO', 'PH', 'EM', 'SO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL
);

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

CREATE TABLE IF NOT EXISTS user_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  total_coins INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_focus_time INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. NOW add any missing columns to existing tables (safe to run multiple times)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT FALSE;

ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_sprints INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{"PH": 0, "CO": 0, "EM": 0, "SO": 0}'::jsonb;

-- 4. Create all indexes (IF NOT EXISTS means no errors if they exist)
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id ON habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- 5. Create unique index for habit completions (one per day)
-- Drop first in case it exists with old syntax
DROP INDEX IF EXISTS idx_habit_completions_unique_per_day;

-- Note: We'll enforce "one completion per day" in the app logic instead of a database constraint
-- This avoids PostgreSQL IMMUTABLE function requirements
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(completed_at);

-- 6. Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- 7. Create simple "allow all" policies (perfect for MVP/development)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all operations on habits" ON habits;
DROP POLICY IF EXISTS "Allow all operations on habit_completions" ON habit_completions;
DROP POLICY IF EXISTS "Allow all operations on focus_sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Allow all operations on user_stats" ON user_stats;

-- Create new policies
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on habits" ON habits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on habit_completions" ON habit_completions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on focus_sessions" ON focus_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on user_stats" ON user_stats FOR ALL USING (true) WITH CHECK (true);

-- 8. VERIFICATION - Show all your tables and columns
SELECT
  t.table_name,
  COUNT(c.column_name) as total_columns,
  string_agg(c.column_name, ', ' ORDER BY c.ordinal_position) as columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c
  ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE t.table_schema = 'public'
  AND t.table_name IN ('tasks', 'habits', 'habit_completions', 'focus_sessions', 'user_stats')
GROUP BY t.table_name
ORDER BY t.table_name;

-- Success!
SELECT '✅ DATABASE SETUP COMPLETE! Check the table above - you should see 5 tables.' as status;

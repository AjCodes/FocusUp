-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE DEFINITIONS
-- =====================================================

-- Tasks table - User's quests/to-dos
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  done BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_id TEXT NOT NULL
);

-- Habits table - User's daily rituals
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  cue TEXT,
  focus_attribute TEXT NOT NULL CHECK (focus_attribute IN ('CO', 'PH', 'EM', 'SO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_id TEXT NOT NULL
);

-- Habit completions table - Tracks daily habit completion
CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_id TEXT NOT NULL
);

-- Focus sessions table - Pomodoro session history
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER DEFAULT 0 NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('work', 'break')),
  linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  linked_habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  coins_earned INTEGER DEFAULT 0 NOT NULL,
  user_id TEXT NOT NULL
);

-- User stats table - Aggregate user progress data
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  total_coins INTEGER DEFAULT 0 NOT NULL,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  total_focus_time INTEGER DEFAULT 0 NOT NULL,
  total_sessions INTEGER DEFAULT 0 NOT NULL,
  total_sprints INTEGER DEFAULT 0 NOT NULL,
  attributes JSONB DEFAULT '{"PH": 0, "CO": 0, "EM": 0, "SO": 0}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =====================================================
-- ADD MISSING COLUMNS (if tables existed before)
-- =====================================================

DO $$
BEGIN
  -- Add columns to tasks if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='tasks' AND column_name='notes') THEN
    ALTER TABLE tasks ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='tasks' AND column_name='done') THEN
    ALTER TABLE tasks ADD COLUMN done BOOLEAN DEFAULT FALSE NOT NULL;
  END IF;

  -- Add columns to user_stats if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_stats' AND column_name='total_sprints') THEN
    ALTER TABLE user_stats ADD COLUMN total_sprints INTEGER DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_stats' AND column_name='attributes') THEN
    ALTER TABLE user_stats ADD COLUMN attributes JSONB DEFAULT '{"PH": 0, "CO": 0, "EM": 0, "SO": 0}'::jsonb NOT NULL;
  END IF;
END $$;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Habits indexes
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_focus_attribute ON habits(focus_attribute);

-- Habit completions indexes
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id ON habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_completed_at ON habit_completions(completed_at DESC);

-- Focus sessions indexes
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_mode ON focus_sessions(mode);

-- User stats indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- =====================================================
-- UNIQUE CONSTRAINT FOR HABIT COMPLETIONS
-- One completion per habit per day per user
-- =====================================================

-- Create an immutable function to extract date (required for unique indexes)
CREATE OR REPLACE FUNCTION date_only(timestamp with time zone)
RETURNS date AS $$
  SELECT $1::date;
$$ LANGUAGE SQL IMMUTABLE;

-- Drop old index if exists
DROP INDEX IF EXISTS idx_habit_completions_unique_per_day;

-- Create unique index using the immutable function
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_completions_one_per_day
  ON habit_completions (habit_id, user_id, date_only(completed_at));

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - Permissive for MVP (tighten for production)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "tasks_all_operations" ON tasks;
DROP POLICY IF EXISTS "habits_all_operations" ON habits;
DROP POLICY IF EXISTS "habit_completions_all_operations" ON habit_completions;
DROP POLICY IF EXISTS "focus_sessions_all_operations" ON focus_sessions;
DROP POLICY IF EXISTS "user_stats_all_operations" ON user_stats;

-- Create permissive policies (allows all operations for MVP)
-- NOTE: For production with auth, replace 'true' with auth.uid()::text = user_id
CREATE POLICY "tasks_all_operations"
  ON tasks FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "habits_all_operations"
  ON habits FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "habit_completions_all_operations"
  ON habit_completions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "focus_sessions_all_operations"
  ON focus_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "user_stats_all_operations"
  ON user_stats FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_user_stats_updated_at ON user_stats;

-- Create trigger for user_stats
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show all tables with column counts
SELECT
  t.table_name,
  COUNT(c.column_name) as columns,
  pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)::regclass)) as size
FROM information_schema.tables t
LEFT JOIN information_schema.columns c
  ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE t.table_schema = 'public'
  AND t.table_name IN ('tasks', 'habits', 'habit_completions', 'focus_sessions', 'user_stats')
GROUP BY t.table_name
ORDER BY t.table_name;

-- Show all indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('tasks', 'habits', 'habit_completions', 'focus_sessions', 'user_stats')
ORDER BY tablename, indexname;

-- Show all foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('tasks', 'habits', 'habit_completions', 'focus_sessions', 'user_stats')
ORDER BY tc.table_name;

-- Final success message
SELECT
  '✅ DATABASE SETUP COMPLETE!' as status,
  'All tables, indexes, constraints, and policies created successfully.' as message;

-- Success!
SELECT '✅ DATABASE SETUP COMPLETE! Check the table above - you should see 5 tables.' as status;

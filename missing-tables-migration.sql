-- =====================================================
-- MISSING JUNCTION TABLES FOR FOCUS SESSIONS
-- =====================================================
-- These tables link tasks and habits to focus sessions
-- allowing multiple tasks/habits per session

-- Focus session tasks junction table
CREATE TABLE IF NOT EXISTS focus_session_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  -- Prevent duplicate task-session pairs
  UNIQUE(session_id, task_id)
);

-- Focus session habits junction table
CREATE TABLE IF NOT EXISTS focus_session_habits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  performed BOOLEAN DEFAULT FALSE NOT NULL,
  performed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  -- Prevent duplicate habit-session pairs
  UNIQUE(session_id, habit_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Focus session tasks indexes
CREATE INDEX IF NOT EXISTS idx_focus_session_tasks_session ON focus_session_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_focus_session_tasks_task ON focus_session_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_focus_session_tasks_user ON focus_session_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_session_tasks_completed ON focus_session_tasks(completed);

-- Focus session habits indexes
CREATE INDEX IF NOT EXISTS idx_focus_session_habits_session ON focus_session_habits(session_id);
CREATE INDEX IF NOT EXISTS idx_focus_session_habits_habit ON focus_session_habits(habit_id);
CREATE INDEX IF NOT EXISTS idx_focus_session_habits_user ON focus_session_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_session_habits_performed ON focus_session_habits(performed);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE focus_session_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_session_habits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "focus_session_tasks_all_operations" ON focus_session_tasks;
DROP POLICY IF EXISTS "focus_session_habits_all_operations" ON focus_session_habits;

-- Create permissive policies (allows all operations for authenticated users)
-- NOTE: For production, you may want to restrict to auth.uid()::text = user_id
CREATE POLICY "focus_session_tasks_all_operations"
  ON focus_session_tasks FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "focus_session_habits_all_operations"
  ON focus_session_habits FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that tables were created
SELECT
  'focus_session_tasks' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'focus_session_tasks'
UNION ALL
SELECT
  'focus_session_habits' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'focus_session_habits';

-- Show table structures
SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN ('focus_session_tasks', 'focus_session_habits')
ORDER BY c.table_name, c.ordinal_position;

-- Success message
SELECT
  '✅ MIGRATION COMPLETED SUCCESSFULLY!' as status,
  'Tables created: focus_session_tasks, focus_session_habits' as result,
  'You can now add tasks and habits to focus sessions' as note;

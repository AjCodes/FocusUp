# Quick Fix: "Could not find table 'focus_session_tasks'" Error

## Error You're Seeing

```
ERROR ❌ Error in handleSelectConfirm: {"code": "PGRST205", ...
"message": "Could not find the table 'public.focus_session_tasks' in the schema cache"}
```

## Quick Fix (3 Steps)

### 1️⃣ Open Supabase SQL Editor
- Go to: https://app.supabase.com
- Select your FocusUp project
- Click **SQL Editor** → **New Query**

### 2️⃣ Run This SQL
Copy and paste the entire content of `missing-tables-migration.sql` into the SQL Editor and click **Run**.

Or copy this quick version:

```sql
-- Create junction tables
CREATE TABLE IF NOT EXISTS focus_session_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(session_id, task_id)
);

CREATE TABLE IF NOT EXISTS focus_session_habits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  performed BOOLEAN DEFAULT FALSE NOT NULL,
  performed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(session_id, habit_id)
);

-- Enable RLS
ALTER TABLE focus_session_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_session_habits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "focus_session_tasks_all_operations"
  ON focus_session_tasks FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "focus_session_habits_all_operations"
  ON focus_session_habits FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_focus_session_tasks_session ON focus_session_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_focus_session_tasks_task ON focus_session_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_focus_session_tasks_user ON focus_session_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_session_habits_session ON focus_session_habits(session_id);
CREATE INDEX IF NOT EXISTS idx_focus_session_habits_habit ON focus_session_habits(habit_id);
CREATE INDEX IF NOT EXISTS idx_focus_session_habits_user ON focus_session_habits(user_id);
```

### 3️⃣ Test It
- Open FocusUp app
- Go to Focus page
- Click **+ button** on "Current Focus Session"
- Select tasks/habits
- Click **Confirm**
- ✅ **Items should appear!**

---

## What This Does

Creates two tables that were missing from your database:

1. **`focus_session_tasks`** - Links tasks to focus sessions
2. **`focus_session_habits`** - Links habits to focus sessions

These tables allow you to add multiple tasks and habits to each focus session, which is how the "Current Focus Session" card works.

---

## Need More Details?

See `DATABASE_MIGRATION_GUIDE.md` for complete documentation.

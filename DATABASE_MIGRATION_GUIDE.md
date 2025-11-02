# Database Migration Guide - Add Focus Session Junction Tables

## Problem

When trying to add tasks or habits to a focus session, you get this error:
```
ERROR ❌ Error in handleSelectConfirm: {"code": "PGRST205", ...
"message": "Could not find the table 'public.focus_session_tasks' in the schema cache"}
```

This means the junction tables that link tasks/habits to sessions don't exist in your database yet.

---

## Solution: Run the Migration SQL

### Step 1: Open Supabase SQL Editor

1. Go to your **Supabase Dashboard**: https://app.supabase.com
2. Select your **FocusUp project** (uctqlgunnpxiqjfplimt)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy the Migration Script

Open the file `missing-tables-migration.sql` in this directory and **copy all its contents**.

### Step 3: Run the Migration

1. **Paste** the SQL into the Supabase SQL Editor
2. Click **Run** (or press Ctrl/Cmd + Enter)
3. Wait for execution to complete (~2-5 seconds)

### Step 4: Verify Success

You should see output like this:
```
✅ MIGRATION COMPLETED SUCCESSFULLY!
Tables created: focus_session_tasks, focus_session_habits
You can now add tasks and habits to focus sessions
```

---

## What This Migration Does

### Creates Two New Tables

#### 1. `focus_session_tasks`
Links tasks to focus sessions (many-to-many relationship)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | References focus_sessions |
| task_id | UUID | References tasks |
| user_id | TEXT | User who created the link |
| completed | BOOLEAN | Whether task was completed in session |
| completed_at | TIMESTAMP | When it was completed |
| created_at | TIMESTAMP | When link was created |

**Unique constraint:** `(session_id, task_id)` - prevents duplicates

#### 2. `focus_session_habits`
Links habits to focus sessions (many-to-many relationship)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | References focus_sessions |
| habit_id | UUID | References habits |
| user_id | TEXT | User who created the link |
| performed | BOOLEAN | Whether habit was performed in session |
| performed_at | TIMESTAMP | When it was performed |
| created_at | TIMESTAMP | When link was created |

**Unique constraint:** `(session_id, habit_id)` - prevents duplicates

### Creates Indexes

For optimal performance when querying:
- By session_id
- By task_id/habit_id
- By user_id
- By completion status

### Enables Row Level Security (RLS)

Sets up security policies to allow all operations (MVP mode).

**Note:** For production, you should restrict access to:
```sql
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id)
```

---

## After Running the Migration

### Test the Functionality

1. **Open the FocusUp app**
2. **Go to the Focus page**
3. **Click the + button** on "Current Focus Session" card
4. **Select some tasks/habits**
5. **Click "Confirm"**
6. **✅ Items should now appear** in the session card!

### Check the Console

You should see logs like:
```
📝 handleSelectConfirm called with: { taskIds: [...], habitIds: [...] }
👤 User ID: ...
🎯 Current session ID: ...
📎 Attaching items to session: ...
✅ Items attached, refreshing all data...
✅ All data refreshed: { sessionTasks: 2, sessionHabits: 1 }
✅ handleSelectConfirm completed
🔄 Session items updated: { sessionTasks: 2, sessionHabits: 1, ... }
```

---

## Troubleshooting

### Error: "relation already exists"

**This is OK!** It means the tables already exist. The migration script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times.

### Error: "permission denied for schema public"

**Solution:** Make sure you're logged into the correct Supabase project and have admin permissions.

### Tables created but items still don't appear

**Check:**
1. Are you logged in with a valid user account (not guest mode)?
2. Check browser console for other errors
3. Verify RLS policies are set to allow all operations (permissive)

### How to verify tables exist

Run this query in Supabase SQL Editor:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('focus_session_tasks', 'focus_session_habits');
```

Expected output:
```
focus_session_tasks
focus_session_habits
```

---

## Why These Tables Are Needed

### Old Design (Single Task/Habit per Session)
The original `focus_sessions` table had:
- `linked_task_id` (only ONE task)
- `linked_habit_id` (only ONE habit)

This limited each session to a single task and single habit.

### New Design (Multiple Tasks/Habits per Session)
With junction tables, you can:
- Add **multiple tasks** to one session
- Add **multiple habits** to one session
- Track completion status for each item
- See which items were worked on during the session

This is how the "Current Focus Session" card works - it shows all the tasks and habits you're working on in this focus session.

---

## Database Schema Overview

```
┌─────────────────┐
│  focus_sessions │
└────────┬────────┘
         │
         ├──────────────┬──────────────┐
         │              │              │
         ▼              ▼              ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│ focus_session_tasks     │   │ focus_session_habits    │
│ - session_id (FK)       │   │ - session_id (FK)       │
│ - task_id (FK) ────────>│   │ - habit_id (FK) ───────>│
│ - completed             │   │ - performed             │
└─────────────────────────┘   └─────────────────────────┘
         │                             │
         ▼                             ▼
   ┌────────┐                   ┌─────────┐
   │ tasks  │                   │ habits  │
   └────────┘                   └─────────┘
```

---

## Next Steps

After running this migration:

1. ✅ **Test adding tasks/habits to sessions**
2. ✅ **Verify they appear in the UI**
3. ✅ **Complete a focus session** and check rewards
4. 🔄 **Monitor for any other database errors**

If you encounter other missing tables or columns, check the main `sql script.txt` file and run any missing parts.

---

## Support

If you still have issues after running this migration:

1. Check the **Supabase logs** (Logs → Database)
2. Check the **browser console** for detailed errors
3. Verify **all tables exist** using the verification query above
4. Make sure **RLS policies** are permissive (check in Supabase → Authentication → Policies)

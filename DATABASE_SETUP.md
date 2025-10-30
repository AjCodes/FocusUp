# Database Setup Guide

This guide will help you set up your Supabase database properly for FocusUp.

## Quick Start (5 minutes)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub
4. Click "New Project"
5. Fill in:
   - **Name**: FocusUp (or your choice)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you
6. Click "Create new project"
7. Wait 2-3 minutes for database to initialize

### Step 2: Run Database Migration

1. In your Supabase project dashboard, click **SQL Editor** (left sidebar)
2. Open the `supabase-setup.sql` file in your project folder
3. **Copy the entire contents** (Ctrl+A, Ctrl+C)
4. Paste into the SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)

You should see: `Success. No rows returned`

### Step 3: Verify Tables

Run this query in the SQL Editor:

\`\`\`sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tasks', 'habits', 'habit_completions', 'focus_sessions', 'user_stats')
ORDER BY table_name;
\`\`\`

**Expected Result**: You should see exactly 5 tables listed:
- `focus_sessions`
- `habit_completions`
- `habits`
- `tasks`
- `user_stats`

### Step 4: Get API Credentials

1. Go to **Settings** (gear icon in left sidebar)
2. Click **API**
3. Find the **Project URL** section:
   - Copy your **URL** (looks like `https://xxxxx.supabase.co`)
4. Find the **Project API keys** section:
   - Copy your **anon public** key (long string starting with `eyJ...`)

### Step 5: Update .env File

1. Open `.env` in your project root
2. Replace with your credentials (NO QUOTES):

\`\`\`env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

3. Save the file
4. **IMPORTANT**: Add `.env` to `.gitignore`:

\`\`\`bash
echo ".env" >> .gitignore
\`\`\`

### Step 6: Test Connection

1. Start your app: `npm start`
2. Open the app in Expo Go or simulator
3. Navigate to **Tasks** screen
4. Add a task: "Test database"
5. Go back to Supabase dashboard → **Table Editor** → **tasks**
6. You should see your task!

✅ If you see the task → **Success!**
❌ If you don't see it → Check **Troubleshooting** below

---

## Troubleshooting

### Problem: "Supabase is not configured"

**Symptoms**:
- Message at bottom of Tasks screen
- Tasks only saved locally

**Solutions**:

1. **Check .env file exists**:
   \`\`\`bash
   ls -la .env
   # Should show the file
   \`\`\`

2. **Verify .env format** (NO quotes, NO spaces around =):
   \`\`\`env
   # ✅ CORRECT
   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co

   # ❌ WRONG
   EXPO_PUBLIC_SUPABASE_URL = "https://xxx.supabase.co"
   \`\`\`

3. **Restart development server**:
   \`\`\`bash
   # Stop server (Ctrl+C)
   # Clear cache and restart
   expo start -c
   \`\`\`

### Problem: Database operations fail with error

**Symptoms**:
- Red toast notification appears
- Error message in console
- Changes don't sync to Supabase

**Solution 1: Check Row Level Security (RLS)**

The most common issue! To test if RLS is the problem:

1. Go to Supabase Dashboard → **Authentication** → **Policies**
2. Find the `tasks` table
3. Click the toggle to temporarily **Disable RLS**
4. Try adding a task again

If it works now, the issue is RLS policies. To fix properly:

\`\`\`sql
-- Run this in SQL Editor to see current policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('tasks', 'habits', 'habit_completions', 'focus_sessions', 'user_stats');
\`\`\`

The `supabase-setup.sql` file already includes permissive policies. If you're still having issues, you can make them even more permissive:

\`\`\`sql
-- Emergency: Allow all operations (NOT for production!)
DROP POLICY IF EXISTS "Allow all operations" ON tasks;
CREATE POLICY "Allow all operations" ON tasks
  FOR ALL USING (true) WITH CHECK (true);
\`\`\`

**Solution 2: Check Supabase Project Status**

1. Go to your Supabase dashboard
2. Check if project status shows "Paused" or "Inactive"
3. If paused, click "Resume project"

**Solution 3: Verify API URL**

Common mistakes:

\`\`\`env
# ❌ Missing https://
EXPO_PUBLIC_SUPABASE_URL=xyz.supabase.co

# ❌ Extra path
EXPO_PUBLIC_SUPABASE_URL=https://xyz.supabase.co/rest/v1

# ✅ CORRECT
EXPO_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
\`\`\`

### Problem: "column 'done' does not exist"

**Cause**: The `done` column wasn't created in your tasks table

**Solution**: Run this in SQL Editor:

\`\`\`sql
-- Add missing done column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT FALSE;

-- Verify it worked
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tasks';
\`\`\`

### Problem: Tasks duplicate or disappear

**Cause**: Mixing local storage and Supabase IDs

**Solution**: Clear local storage and refresh:

1. In your app, go to Settings (if you have it)
2. Or manually clear AsyncStorage in the code temporarily:

\`\`\`typescript
// Add this temporarily to your Tasks screen useEffect
import AsyncStorage from '@react-native-async-storage/async-storage';

useEffect(() => {
  // Clear all cached tasks
  AsyncStorage.clear().then(() => {
    console.log('Cleared local storage');
    load(); // Reload from Supabase
  });
}, []);
\`\`\`

3. Remove after running once

### Problem: "JWT expired" or authentication errors

**Cause**: Your anon key expired or was rotated

**Solution**:

1. Go to Supabase Dashboard → **Settings** → **API**
2. In the "Project API keys" section, click **Reset keys**
3. Copy the new **anon public** key
4. Update your `.env` file
5. Restart Expo: `expo start -c`

---

## Advanced Configuration

### Enable Google OAuth

1. **Create Google OAuth credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create project
   - Enable Google+ API
   - Create OAuth 2.0 Client IDs for iOS and Android

2. **Configure Supabase**:
   - Supabase Dashboard → **Authentication** → **Providers**
   - Enable **Google**
   - Add your Client IDs

3. **Test**:
   - Logout from your app
   - Click "Sign in with Google"
   - Should redirect and authenticate

### Production RLS Policies

For production, restrict access to authenticated users only:

\`\`\`sql
-- Example: Restrict tasks to authenticated users
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid()::text = user_id);
\`\`\`

**Important**: Currently the app uses custom `user_id` strings (not auth.uid()). You'll need to update the app code to use Supabase auth UIDs if you want the above policies.

### Database Backups

Supabase automatically backs up your database daily. To manually backup:

1. Dashboard → **Database** → **Backups**
2. Click **Create backup**
3. Download the dump file

### Monitoring

View database activity:

1. Dashboard → **Logs** → **Postgres Logs**
2. Filter by table or operation
3. Check for errors or slow queries

---

## Verification Checklist

Before considering your database "ready for production":

- [ ] All 5 tables created successfully
- [ ] Can add tasks via the app
- [ ] Tasks appear in Supabase Table Editor
- [ ] Can toggle tasks as done
- [ ] Can delete tasks
- [ ] Can add habits
- [ ] Habits persist after app restart
- [ ] Toast notifications appear on errors
- [ ] Loading spinners appear during operations
- [ ] App works offline (local storage fallback)
- [ ] RLS policies configured (or intentionally permissive)
- [ ] `.env` file is in `.gitignore`
- [ ] Supabase credentials are NOT committed to Git

---

## Need More Help?

1. **Check Supabase Logs**:
   - Dashboard → Logs → Postgres Logs
   - Look for errors related to your tables

2. **Check App Console**:
   - Open Expo DevTools
   - Look for error messages or warnings

3. **Test Direct SQL**:
   - Run INSERT directly in SQL Editor to isolate app vs database issues:
   \`\`\`sql
   INSERT INTO tasks (title, user_id, done)
   VALUES ('Test from SQL', 'test-user', false);

   SELECT * FROM tasks WHERE title = 'Test from SQL';
   \`\`\`

4. **Check Network**:
   - Ensure your device/simulator has internet
   - Try accessing Supabase URL in browser
   - Should show: `{"msg":"The server is running"}`

---

**Still having issues?** Open an issue on GitHub with:
- Error messages (from console and toast)
- Supabase logs (if any)
- Steps to reproduce

# 🎯 FocusUp - Gamified Pomodoro App

A mobile productivity app I built for my final project. It's basically a Pomodoro timer mixed with RPG game mechanics - you earn XP and level up by completing tasks and staying focused. Made with React Native.

---

## ✨ What it does

The app helps you stay focused using the Pomodoro technique (25-min work sessions) but makes it fun by adding game elements:

- ⏱️ **Timer** - Standard Pomodoro timer with work/break cycles
- ✅ **Tasks** - A to-do list where each task is like a "quest"
- 🎯 **Habits** - Daily habits you can track (like going to the gym or studying)
- 📈 **Leveling System** - You gain XP and level up in 4 categories: Physical, Cognitive, Heart, and Soul
- 💰 **Coins & Streaks** - Earn rewards for completing sessions and maintain daily streaks
- 📱 **Works Offline** - Saves everything locally so you can use it without internet

The interface uses a dark theme with a glass effect that I thought looked pretty cool.

---

## 🛠️ Tech Stack

Here's what I used to build it:

- ⚛️ React Native with Expo (version 54)
- 📘 TypeScript for type safety
- 🗄️ Supabase as the backend (free tier)
- 🔄 Zustand for state management
- 💾 AsyncStorage for offline functionality
- 🧭 Expo Router for navigation

---

## 🚀 Setup Instructions

If you want to run this project locally:

### 1️⃣ Install dependencies

```bash
npm install
```

### 2️⃣ Database Setup

I'm using Supabase for the backend. You'll need to:

1. Create a free account at [supabase.com](https://supabase.com)
2. Make a new project (takes about 2 minutes to set up)
3. Go to the SQL Editor in your dashboard
4. Copy everything from `supabase-setup.sql` and run it
5. This creates all the tables: tasks, habits, habit_completions, focus_sessions, and user_stats

To verify it worked, run this query:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

You should see all 5 tables.

### 3️⃣ Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your-project-url-here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from your Supabase project settings under API.

**⚠️ Important:** Don't commit the `.env` file! Add it to `.gitignore`.

### 4️⃣ Run the app

```bash
npm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web browser

---

## 📁 Project Structure

```
app/                    # All the screens
  (auth)/              # Login screen
  (tabs)/              # Main app tabs
    focus.tsx          # Pomodoro timer
    tasks.tsx          # Task list
    habits.tsx         # Habit tracker
    profile.tsx        # User stats/character

components/            # Reusable components
  AddTaskModal.tsx
  AddHabitModal.tsx
  GlassCard.tsx
  TopBar.tsx

src/
  features/           # Feature-specific code
  constants/          # App constants
  types/              # TypeScript types

lib/
  supabase.ts        # Database connection

utils/               # Helper functions
```

---

## 🎨 Features I Implemented

### ❌ Error Handling
I added toast notifications so users get friendly error messages instead of the app just crashing. Also made it so if the database fails, everything saves locally instead.

### ✔️ Validation
Added input validation for forms - character limits, required fields, etc. The UI shows red borders when something's wrong.

### ⏳ Loading States
Added loading spinners and disabled buttons during operations so users know when something's processing.

### 🗃️ Database
Set up proper database schema with:
- Row Level Security policies
- Foreign key relationships
- Indexes for better performance
- Auto-updating timestamps

---

## 🐛 Common Problems I Ran Into

**Problem:** "Supabase is not configured"
- **Fix:** Make sure the `.env` file exists and restart the dev server with `expo start -c` to clear cache

**Problem:** Can't add tasks/habits
- **Fix:** Check if Row Level Security is blocking you. In Supabase, you can temporarily disable it for testing:
  ```sql
  ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
  ```

**Problem:** Data not syncing between devices
- **Fix:** This only works if you're signed in with Google. Guest mode only saves locally.

---

## 💡 Things I Learned

This was my first time building a full mobile app. Some challenges:

- 🧭 Learning how Expo Router works (very different from React Router)
- 🔐 Getting Supabase authentication working properly
- 📶 Making the app work offline with local storage fallbacks
- 🎮 Implementing the leveling system and XP calculations
- 🐞 Debugging React Native issues (way harder than web development!)

---

## 🔮 Future Improvements

If I had more time, I'd add:

- 🔔 Push notifications when break time is over
- 📊 Weekly/monthly statistics and charts
- 👥 Social features (friend leaderboards)
- 🎨 More customization options for the timer
- ❤️ Apple Health / Google Fit integration
- ✨ Better animations

---

## 🚢 Running in Production

I haven't deployed it yet, but the plan is to use EAS Build:

```bash
eas build --platform android
```

---

## 📊 Database Tables

Quick overview of the schema:

- **tasks** - User's to-do items
- **habits** - Repeating daily habits
- **habit_completions** - Tracks which habits were done each day
- **focus_sessions** - History of all Pomodoro sessions
- **user_stats** - User's level, coins, streaks, total focus time

Full schema is in `supabase-setup.sql`.

---

## 📚 Resources I Used

- [Expo Docs](https://docs.expo.dev/) - for everything React Native
- [Supabase Docs](https://supabase.com/docs) - for backend setup
- [Atomic Habits book](https://jamesclear.com/atomic-habits) - for the habit tracking concepts
- Stack Overflow - for debugging (obviously)

---

## 📝 Notes

This was built for my [course name/semester/year] project. The code isn't perfect and there are definitely some rough edges, but I learned a ton building it.

Some things are commented out or have TODOs - those were features I started but didn't finish in time.

---

<div align="center">

**Made with ☕ by [Your Name]**

*[Semester/Year]*

</div>

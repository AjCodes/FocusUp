# 🎯 FocusUp - Level Up Your Focus

FocusUp is my personal take on productivity. I wanted to stop treating focus like a chore and turn it into a game — so I built a Pomodoro app where every task, habit, and work session earns you XP, levels, and coins. It’s a mix between Atomic Habits and RuneScape — built for people who want to grind in real life.

---

## ✨ Why I Built It

This project started as my ICT semester project, but it quickly became something bigger. I was motivated to create an application that i would use daily to work on my tasks and habits
So I asked myself: What if daily habits/tasks felt like leveling up a character instead of checking off a list?

That idea turned into FocusUp — a gamified Pomodoro system that tracks your habits, rewards consistency, and visualizes your growth.

## ⚙️ Core Features

- ⏱️ **Pomodoro Timer** - Standard Pomodoro timer with work/break cycles
- ✅ **Tasks** - A to-do list where each task is like a "quest"
- 🎯 **Habits** - Daily habits you can track and accumulates streaks
- 📈 **Leveling System** - You gain XP in one of the 4 categories: Physical, Cognitive, Heart, and Soul
- 💰 **Coins & Streaks** - Earn rewards for completing sessions and maintain daily streaks
- 📱 **Works Offline** - Saves everything locally so you can use it without internet
- 🎨 Dark Glass UI — Minimal, clean, slightly futuristic vibe

---

## 🧠 Reward System

No limits. No arbitrary caps. Just smart scaling.

- The more you do, the smaller the XP returns — but never zero.

- Working during focus sessions gives 2× rewards

- Outside sessions = 0.5×

- Anti-spam logic prevents easy farming

- Levels follow an exponential XP curve — 1 to 99, RuneScape style

Every level means something. You earn it.

## 🛠️ Tech Stack

Here's what I used to build it:

- ⚛️ React Native with Expo (version 54)
- 📘 TypeScript for type safety
- 🗄️ Supabase as the backend 
- 🔄 Zustand for state management
- 💾 AsyncStorage for offline functionality
- 🧭 Expo Router for navigation

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

## 🚀 Setup Instructions

If you want to run this project locally:

1️⃣ Install dependencies

npm install


2️⃣ Add your Supabase keys

Create a .env file in the root:

EXPO_PUBLIC_SUPABASE_URL=your-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key


3️⃣ Run the app

npm start


Then press:

a → Android

i → iOS

w → Web

🧰 Database

The Supabase schema includes:

tasks, habits, habit_completions, focus_sessions, user_stats

Reward-tracking tables (daily_tracking, reward_events, etc.)

RLS policies, foreign keys, and timestamps

Full schema: supabase-setup.sql


---

## 🎮 Reward System (v2 - No Limits!)

**Core Principle:** Never limit productivity. Use smart scaling instead.

**How it works:**
- ✅ Complete as many habits/tasks/sprints as you want
- ✅ First items give full rewards (most efficient)
- ✅ Later items give diminished but meaningful rewards (never zero)
- ✅ Work during focus sessions: 2× multiplier
- ✅ Work outside focus: 0.5× multiplier
- ✅ System detects and penalizes spam/duplicates

**Progression:**
- Exponential XP curve (RuneScape-inspired)
- Character levels 1-99 with attribute gates
- Takes years to max out, not weeks
- Every reward feels earned

See `src/features/rewards/` for implementation details.

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

## 📚 Resources I Used

- [Expo Docs](https://docs.expo.dev/) - for everything React Native
- [Supabase Docs](https://supabase.com/docs) - for backend setup
- [Atomic Habits book](https://jamesclear.com/atomic-habits) - for the habit tracking concepts
- Stack Overflow - for debugging (obviously)

---

## 📝 Notes

This was built for my ICT project. The code isn't perfect and there are definitely some rough edges, but I learned a ton building it.

Some things are commented out or have TODOs - those were features I started but didn't finish in time.

---

<div align="center">

**by [ AJ ]**

*[Year 1 /Semester 2]*

</div>

# FocusUp - Gamified Pomodoro Productivity App

A React Native mobile application that combines the Pomodoro Technique with RPG-style gamification. Build habits, complete tasks, level up your character, and stay focused!

## Features

- ⏱️ **Pomodoro Timer** - Customizable work/break sessions with circular progress indicator
- ✅ **Task Management** - Quest log for tracking your to-dos
- 🎯 **Habit Tracking** - Daily rituals with streak tracking
- 🎮 **Character Progression** - Level up attributes (Physical, Cognitive, Heart, Soul)
- 💰 **Coin Rewards** - Earn coins for completing tasks and sessions
- 🔥 **Streak System** - Maintain your daily focus streak
- 🔐 **Authentication** - Google OAuth + Guest mode
- 📱 **Offline-First** - Works without internet connection
- 🎨 **Dark Theme** - Beautiful glassmorphism design

## Tech Stack

- **Framework**: React Native + Expo 54
- **Language**: TypeScript (strict mode)
- **State Management**: Zustand + React Context
- **Backend**: Supabase (PostgreSQL + Auth)
- **Storage**: AsyncStorage (offline support)
- **Navigation**: Expo Router (file-based)
- **Notifications**: Expo Notifications
- **UI**: Custom components with glassmorphism

## Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Supabase account (free tier works)

## Installation

### 1. Clone and Install Dependencies

\`\`\`bash
cd focusup-mobile-main
npm install
\`\`\`

### 2. Set Up Supabase Database

#### Option A: Using Supabase Dashboard

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to initialize (~2 minutes)
3. Go to the SQL Editor (left sidebar)
4. Copy the entire contents of `supabase-setup.sql`
5. Paste into the SQL Editor and click "Run"
6. Verify tables were created:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name IN ('tasks', 'habits', 'habit_completions', 'focus_sessions', 'user_stats');
   ```
   You should see all 5 tables listed.

#### Option B: Using Supabase CLI (Advanced)

\`\`\`bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migration
supabase db push
\`\`\`

### 3. Configure Environment Variables

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon public** key
3. **IMPORTANT**: If you previously committed `.env` to Git:
   - Go to **Settings** → **API** → **Project API keys** → **Reset keys**
   - Generate new keys for security
4. Update your `.env` file:

\`\`\`env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
\`\`\`

5. **Add `.env` to `.gitignore`** (if not already):
\`\`\`bash
echo ".env" >> .gitignore
\`\`\`

### 4. Update Supabase Row Level Security (Optional)

For production, you should enable proper RLS policies based on authenticated user IDs. The setup script includes basic policies, but you may want to customize them.

\`\`\`sql
-- Example: Restrict tasks to authenticated users only
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid()::text = user_id);

-- Repeat for INSERT, UPDATE, DELETE policies
\`\`\`

### 5. Set Up Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Create OAuth 2.0 credentials:
   - Application type: **iOS** and **Android**
   - For iOS: Add bundle identifier `com.yourname.focusup`
   - For Android: Add package name `com.yourname.focusup` and SHA-1 fingerprint
5. In Supabase Dashboard → **Authentication** → **Providers** → Enable **Google**
6. Add your Google Client IDs

## Running the App

### Development

\`\`\`bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web browser
npm run web
\`\`\`

### Testing Database Connection

After starting the app:

1. Navigate to the **Tasks** screen
2. Try adding a task
3. Check your Supabase dashboard → **Table Editor** → `tasks`
4. You should see the task appear in the database

If you see an error:
- Check the Toast notification message for details
- Open the console logs for more information
- Verify your `.env` file has the correct credentials
- Ensure the database tables were created successfully

## Project Structure

\`\`\`
focusup-mobile-main/
├── app/                      # Expo Router screens
│   ├── (auth)/              # Authentication screens
│   │   └── login.tsx
│   ├── (tabs)/              # Main tab navigation
│   │   ├── focus.tsx        # Pomodoro timer
│   │   ├── tasks.tsx        # Task management
│   │   ├── habits.tsx       # Habit tracking
│   │   └── profile.tsx      # Character dashboard
│   ├── _layout.tsx          # Root layout
│   └── index.tsx            # Entry point
├── components/              # Reusable UI components
│   ├── AddTaskModal.tsx     # ✅ Now with validation
│   ├── AddHabitModal.tsx    # ✅ Now with validation
│   ├── GlassCard.tsx
│   ├── TopBar.tsx
│   └── ErrorBoundary.tsx
├── src/
│   ├── constants/           # ✅ NEW: App constants
│   │   └── app.ts
│   ├── features/            # Feature modules
│   │   ├── auth/
│   │   ├── pomodoro/
│   │   ├── tasks/
│   │   └── habits/
│   └── types/
│       └── supabase.ts      # Database types
├── hooks/                   # Custom React hooks
│   ├── useUserStats.ts
│   └── useLoading.ts        # ✅ NEW: Loading state hook
├── utils/                   # Utility functions
│   ├── time.ts
│   ├── validation.ts        # ✅ NEW: Input validation
│   └── errorHandler.ts      # ✅ NEW: Error handling
├── lib/
│   └── supabase.ts          # Supabase client
├── assets/                  # Images and icons
├── .env                     # Environment variables (DO NOT COMMIT)
├── supabase-setup.sql       # ✅ NEW: Database migration
├── package.json
├── tsconfig.json
└── README.md
\`\`\`

## Recent Improvements ✨

### Error Handling
- ✅ Toast notifications for user-friendly error messages
- ✅ Network error detection and handling
- ✅ Graceful fallback to local storage on Supabase errors
- ✅ Optimistic UI updates with error rollback

### Loading States
- ✅ Global loading hook (`useLoading`)
- ✅ Per-operation loading indicators
- ✅ Disabled buttons during operations
- ✅ Skeleton loading states

### Input Validation
- ✅ Real-time validation feedback
- ✅ Character limits (tasks: 200, notes: 1000, habits: 200)
- ✅ Required field validation
- ✅ Input sanitization (trim, normalize whitespace)
- ✅ Visual error indicators (red borders)

### Database
- ✅ Complete SQL setup script
- ✅ Row Level Security (RLS) policies
- ✅ Proper indexes for performance
- ✅ Foreign key constraints
- ✅ Auto-updating timestamps

## Common Issues & Solutions

### Issue: "Supabase is not configured"

**Cause**: Environment variables not loaded or incorrect

**Solution**:
1. Ensure `.env` file exists in project root
2. Restart Expo dev server (`npm start`)
3. Clear Metro bundler cache: `expo start -c`

### Issue: Database operations fail silently

**Cause**: Row Level Security (RLS) blocking operations

**Solution**:
1. Check Supabase logs: Dashboard → **Logs** → **Postgres Logs**
2. Temporarily disable RLS for testing:
   \`\`\`sql
   ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
   \`\`\`
3. Or adjust RLS policies in `supabase-setup.sql`

### Issue: Tasks not syncing between devices

**Cause**: Using local user IDs instead of authenticated user IDs

**Solution**:
- Sign in with Google OAuth to sync across devices
- Guest mode only syncs locally via AsyncStorage

### Issue: "Cannot read property 'from' of null"

**Cause**: Supabase client initialization failed

**Solution**:
1. Check `.env` file has correct values (no quotes needed)
2. Verify Supabase project is active
3. Check console for Supabase client initialization warnings

## Development Workflow

### Adding a New Feature

1. Create feature components in `src/features/<feature-name>/`
2. Add types to `types/supabase.ts` if database changes needed
3. Update database schema in `supabase-setup.sql`
4. Run SQL migration in Supabase dashboard
5. Add constants to `src/constants/app.ts`
6. Implement with error handling and validation
7. Test offline and online scenarios

### Code Style Guidelines

- Use TypeScript strict mode (no `any` types)
- Validate all user inputs
- Handle errors with user-friendly messages
- Add loading states for async operations
- Use constants instead of magic numbers
- Implement optimistic UI updates
- Cache data locally for offline support

## Building for Production

### iOS (requires Mac)

\`\`\`bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo account
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios
\`\`\`

### Android

\`\`\`bash
# Build APK
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production
\`\`\`

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public API key | `eyJhbGci...` |

**Note**: Variables prefixed with `EXPO_PUBLIC_` are embedded in the app bundle and are accessible on the client side. Never put sensitive secrets here!

## Database Schema

### Tables

- **tasks** - User tasks/quests
  - `id`, `title`, `notes`, `done`, `user_id`, `created_at`

- **habits** - User habits/rituals
  - `id`, `title`, `cue`, `focus_attribute`, `user_id`, `created_at`

- **habit_completions** - Daily habit tracking
  - `id`, `habit_id`, `user_id`, `completed_at`
  - Unique constraint: one completion per habit per day

- **focus_sessions** - Pomodoro session history
  - `id`, `started_at`, `completed_at`, `duration`, `mode`, `linked_task_id`, `linked_habit_id`, `coins_earned`, `user_id`

- **user_stats** - User progress and stats
  - `id`, `user_id`, `total_coins`, `current_streak`, `longest_streak`, `total_focus_time`, `total_sessions`, `total_sprints`, `attributes`, `updated_at`

See `supabase-setup.sql` for complete schema with indexes and RLS policies.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper error handling
4. Add validation for user inputs
5. Test offline and online scenarios
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the **Common Issues** section above
- Review Supabase logs for database errors
- Check console logs for client-side errors
- Open an issue on GitHub with error details

## Acknowledgments

- Pomodoro Technique by Francesco Cirillo
- Atomic Habits by James Clear (habit formation concepts)
- Expo team for the amazing React Native framework
- Supabase team for the backend platform

---

**Happy Focusing! 🎯**

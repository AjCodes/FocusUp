# Reward System Fix - Complete Summary

## ✅ What Was Fixed

### 1. **isUuid Error - FIXED** ✅
**Problem**: `Property 'isUuid' doesn't exist` error
**Cause**: Function was defined inside `loadStats()` but used in other functions
**Fix**: Moved `isUuid` to module scope in `hooks/useUserStats.ts:12`

---

### 2. **Incorrect Reward Logic - FIXED** ✅

#### OLD (WRONG) Behavior:
- Adding a task → +15 coins immediately ❌
- Completing a task → +10 coins immediately ❌
- Adding a habit → +5 coins immediately ❌
- Checking off a habit → +5 coins immediately ❌

#### NEW (CORRECT) Behavior:
- Adding task/habit → NO rewards, just success message ✅
- Completing task/habit → NO rewards, message says "Finish your sprint" ✅
- **Completing a SPRINT → ALL REWARDS** ✅

---

## 🎯 New Reward System

### What is a Sprint?
**Sprint = 25 min work + 5 min break = Full Pomodoro cycle**

### When Rewards are Given:
**ONLY after the break completes (full 30-minute cycle done)**

### Reward Breakdown:

| Action | Reward | Notes |
|--------|--------|-------|
| **Complete any sprint** | +5 coins | Base reward - always given |
| **Task linked & marked done** | +10 coins | Bonus for task completion |
| **Habit linked** | +10 XP to attribute | XP goes to habit's focus attribute (PH/CO/EM/SO) |

### Example Scenarios:

**Scenario 1: Sprint with Task**
```
1. Create task "Write report"
2. Start 25-min work session, link the task
3. During work, mark task as done
4. Complete 25-min work → break prompt appears
5. Take 5-min break
6. Break completes → REWARDS TRIGGER:
   ✅ +5 coins (base)
   ✅ +10 coins (task completed)
   📊 Total: +15 coins
```

**Scenario 2: Sprint with Habit**
```
1. Create habit "Morning Exercise" (attribute: PH - Physical)
2. Start 25-min work session, link the habit
3. Complete 25-min work → break prompt
4. Take 5-min break
5. Break completes → REWARDS TRIGGER:
   ✅ +5 coins (base)
   ✅ +10 XP to PH attribute
   📊 Total: +5 coins, +10 PH XP
```

**Scenario 3: Sprint with Both**
```
1. Link both task AND habit
2. Mark task done during work
3. Complete full sprint → REWARDS:
   ✅ +5 coins (base)
   ✅ +10 coins (task)
   ✅ +10 XP to habit's attribute
   📊 Total: +15 coins, +10 XP
```

**Scenario 4: Just Focus (No Links)**
```
1. Start sprint without linking anything
2. Complete full 30 minutes
3. REWARDS:
   ✅ +5 coins (base only)
```

---

## 📝 Files Modified

### 1. `hooks/useUserStats.ts`
- ✅ Moved `isUuid` to module scope (line 12)
- ✅ Added `addXP()` function for attribute XP (lines 214-244)
- ✅ Exported `addXP` in return statement (line 254)

### 2. `src/constants/app.ts`
- ✅ Updated REWARDS constants (lines 15-20):
  ```typescript
  REWARDS = {
    SPRINT_BASE: 5,          // Base sprint reward
    TASK_COMPLETE: 10,       // Task bonus
    HABIT_XP: 10,            // Habit XP amount
  }
  ```

### 3. `app/(tabs)/tasks.tsx`
- ✅ Removed `addCoins(REWARDS.TASK_ADD)` from add function (line 130)
- ✅ Changed message to: "Complete it during a sprint to earn coins"
- ✅ Removed `addCoins(REWARDS.TASK_COMPLETE)` from toggle function (line 172)
- ✅ Changed message to: "Finish your sprint to earn coins"

### 4. `app/(tabs)/habits.tsx`
- ✅ Removed `addCoins(5)` from addHabit function (line 167)
- ✅ Removed `addCoins(5)` from toggleHabitCompletion (lines 208, 228)

### 5. `app/(tabs)/focus.tsx`
- ✅ Added imports: REWARDS, showSuccess (lines 20-21)
- ✅ Added `addXP` to useUserStats hook (line 57)
- ✅ Removed `addCoins()` from handleAddTask (line 383)
- ✅ Removed `addCoins()` from handleAddHabit (line 436)
- ✅ Added sprint completion callback with full reward logic (lines 207-255)

### 6. `src/features/pomodoro/store.ts`
- ✅ Added `SprintCompleteData` type (lines 19-24)
- ✅ Added `onSprintComplete` callback to state (line 34)
- ✅ Added `setOnSprintComplete` method (line 35, 68)
- ✅ Trigger callback when break completes (lines 172-180)

---

## 🧪 How to Test

### Test 1: Base Sprint Reward
1. Start app
2. Go to Focus tab
3. Click Play (don't link anything)
4. Wait for 25-min timer (or use shorter duration in settings)
5. When work completes, click "Take a Break"
6. Wait for 5-min break
7. **Expected**: Toast shows "+5 coins for completing sprint"
8. **Check**: Coins in TopBar increased by 5

### Test 2: Task Completion Reward
1. Go to Tasks tab
2. Add task "Test Task"
3. **Expected**: Toast says "Complete it during a sprint to earn coins" (NO coins yet)
4. Go to Focus tab
5. Link the task (click task icon, select "Test Task")
6. Start sprint
7. During work, go back to Tasks and mark "Test Task" as done
8. **Expected**: Toast says "Finish your sprint to earn coins" (still NO coins)
9. Complete work phase, take break
10. Complete break phase
11. **Expected**: Toast shows:
    - "+5 coins for completing sprint"
    - "+10 coins for task: 'Test Task'"
12. **Check**: Coins increased by 15 total

### Test 3: Habit XP Reward
1. Go to Habits tab
2. Add habit "Morning Yoga", set attribute to PH (Physical)
3. **Expected**: No coins awarded for adding
4. Go to Focus tab
5. Link the habit
6. Complete full sprint (25 min work + 5 min break)
7. **Expected**: Toast shows:
    - "+5 coins for completing sprint"
    - "+10 XP to PH for habit: 'Morning Yoga'"
8. **Check**:
   - Coins increased by 5
   - Go to Profile → PH attribute increased by 10

### Test 4: Both Task + Habit
1. Create task and habit
2. Mark task done
3. Link both to sprint
4. Complete full sprint
5. **Expected**: Toast shows all three rewards:
   - "+5 coins for completing sprint"
   - "+10 coins for task: '...'"
   - "+10 XP to [attribute] for habit: '...'"
6. **Check**: Coins +15, XP +10

### Test 5: Incomplete Sprint (No Rewards)
1. Start sprint
2. Complete work phase
3. **Skip break** (click reset or close app)
4. **Expected**: NO rewards given (sprint not complete)

---

## 🐛 Known Issues & Notes

### Database Table Name
- Code references `focus_sprints` table (store.ts:78)
- SQL schema has `focus_sessions` table
- **Impact**: Sprint data may not persist to Supabase
- **Fix**: Either rename table in SQL or update code reference

### Task "done" State
- Task must be marked done BEFORE break completes
- If marked done after sprint ends, next sprint won't count it
- This is intended behavior (rewards are per sprint)

### Attributes in Database
- `attributes` JSONB column added to `user_stats` table
- Make sure you run the updated SQL migration (supabase-production.sql)

---

## 📊 Testing Checklist

- [ ] Error is gone (no more "Property 'isUuid' doesn't exist")
- [ ] Adding task shows "Complete it during sprint" message
- [ ] Completing task shows "Finish your sprint" message
- [ ] Adding habit gives no coins
- [ ] Checking habit gives no coins
- [ ] Sprint without links gives +5 coins
- [ ] Sprint with done task gives +15 coins
- [ ] Sprint with habit gives +5 coins and +10 XP to correct attribute
- [ ] Sprint with both gives +15 coins and +10 XP
- [ ] Incomplete sprint (skip break) gives no rewards
- [ ] Toast messages show correct breakdown
- [ ] Haptic feedback on sprint completion
- [ ] Profile attributes update correctly

---

## 🚀 Next Steps (Optional Improvements)

1. **Add sprint history view** - Show past sprints with rewards earned
2. **Daily sprint goals** - Set target sprints per day
3. **Streak bonus** - Extra coins for consecutive days
4. **Level-up celebrations** - Visual feedback when attribute levels up
5. **Sprint stats** - Average sprint completion rate
6. **Reward multipliers** - Longer work sessions = more rewards

---

## 🎉 Summary

**Before**: Coins awarded immediately when adding/completing tasks/habits
**After**: Coins and XP ONLY awarded after completing full 30-minute sprint

**The reward system now properly incentivizes focused work sessions!** 🎯

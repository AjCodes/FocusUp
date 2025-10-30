import { useEffect, useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Session = Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session'];

const USER_ID_KEY = 'focusup-user-id';

/**
 * Helper function to migrate guest data to authenticated account
 */
const migrateGuestDataToAuth = async (guestId: string, authId: string) => {
  if (!supabase) return;

  console.log(`🔄 Migrating data from guest ${guestId} to auth ${authId}`);

  try {
    // 1. Migrate user_stats
    const { data: guestStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', guestId)
      .single();

    if (guestStats) {
      await supabase
        .from('user_stats')
        .upsert({
          user_id: authId,
          total_coins: guestStats.total_coins,
          current_streak: guestStats.current_streak,
          longest_streak: guestStats.longest_streak,
          total_focus_time: guestStats.total_focus_time,
          total_sessions: guestStats.total_sessions,
          total_sprints: guestStats.total_sprints,
          attributes: guestStats.attributes,
        });
    }

    // 2. Migrate tasks
    await supabase
      .from('tasks')
      .update({ user_id: authId })
      .eq('user_id', guestId);

    // 3. Migrate habits
    await supabase
      .from('habits')
      .update({ user_id: authId })
      .eq('user_id', guestId);

    // 4. Migrate habit_completions
    await supabase
      .from('habit_completions')
      .update({ user_id: authId })
      .eq('user_id', guestId);

    // 5. Migrate focus_sessions
    await supabase
      .from('focus_sessions')
      .update({ user_id: authId })
      .eq('user_id', guestId);

    // 6. Clear old guest ID
    await AsyncStorage.removeItem(USER_ID_KEY);

    console.log('✅ Migration complete');
  } catch (error) {
    console.error('❌ Error migrating guest data:', error);
  }
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guest, setGuest] = useState(false);

  const GUEST_KEY = 'focusup-guest-mode';

  useEffect(() => {
    if (!supabase) {
      // Load guest state even if supabase is not initialized
      (async () => {
        try {
          const flag = await AsyncStorage.getItem(GUEST_KEY);
          setGuest(flag === '1');
        } catch {}
        setIsLoading(false);
      })();
      return;
    }
    let unsub: (() => void) | undefined;
    (async () => {
      // Load guest flag in parallel
      try {
        const flag = await AsyncStorage.getItem(GUEST_KEY);
        setGuest(flag === '1');
      } catch {}
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setIsLoading(false);
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, sess) => {
        setSession(sess);

        // If user just signed in, check if we need to migrate guest data
        if (event === 'SIGNED_IN' && sess?.user?.id) {
          const oldGuestId = await AsyncStorage.getItem(USER_ID_KEY);

          // Only migrate if the old ID is a guest ID
          if (oldGuestId && oldGuestId.startsWith('guest_')) {
            await migrateGuestDataToAuth(oldGuestId, sess.user.id);
          }
        }
      });
      unsub = () => listener.subscription.unsubscribe();
    })();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    WebBrowser.maybeCompleteAuthSession();
    const redirectTo = AuthSession.makeRedirectUri({ scheme: 'focusup' });
    return await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    try {
      await AsyncStorage.removeItem(GUEST_KEY);
    } catch {}
    setGuest(false);
  }, []);

  const continueAsGuest = useCallback(async () => {
    try {
      await AsyncStorage.setItem(GUEST_KEY, '1');
    } catch {}
    setGuest(true);
    return { error: null } as const;
  }, []);

  const isAuthenticated = !!session || guest;

  return { session, isLoading, signInWithGoogle, signOut, continueAsGuest, isAuthenticated, guest };
}



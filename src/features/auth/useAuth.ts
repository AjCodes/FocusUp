import { useEffect, useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { supabase } from '../../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Complete auth session before component mounts - required for OAuth to work properly
WebBrowser.maybeCompleteAuthSession();

/**
 * Helper function to extract OAuth tokens from callback URL
 */
const extractTokensFromUrl = (url: string): { access_token?: string; refresh_token?: string } => {
  try {
    // OAuth tokens can be in the hash fragment or query params
    const hashMatch = url.match(/#(.+)/);
    const queryMatch = url.match(/\?(.+)/);

    const params = new URLSearchParams(hashMatch?.[1] || queryMatch?.[1] || '');

    return {
      access_token: params.get('access_token') || undefined,
      refresh_token: params.get('refresh_token') || undefined,
    };
  } catch (error) {
    console.error('❌ Error extracting tokens from URL:', error);
    return {};
  }
};

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

  // Handle OAuth callback from deep link
  const handleDeepLink = useCallback(async (url: string) => {
    if (!supabase) return;

    console.log('🔗 Deep link received:', url);

    // Check if this is an OAuth callback URL
    if (url.includes('access_token') || url.includes('refresh_token')) {
      console.log('🔐 Processing OAuth callback...');

      const { access_token, refresh_token } = extractTokensFromUrl(url);

      if (access_token && refresh_token) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            console.error('❌ Error setting session from deep link:', error);
          } else {
            console.log('✅ Session established from deep link:', data.user?.email);
          }
        } catch (err) {
          console.error('❌ Exception setting session:', err);
        }
      } else {
        console.error('❌ No tokens found in callback URL');
      }
    }
  }, []);

  // Initialize auth and set up deep link listeners
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
    let linkingSubscription: ReturnType<typeof Linking.addEventListener> | undefined;

    (async () => {
      // Load guest flag in parallel
      try {
        const flag = await AsyncStorage.getItem(GUEST_KEY);
        setGuest(flag === '1');
      } catch {}

      // Check if app was opened via a deep link
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('📱 App opened with URL:', initialUrl);
        await handleDeepLink(initialUrl);
      }

      // Listen for deep link events while app is running
      linkingSubscription = Linking.addEventListener('url', (event) => {
        handleDeepLink(event.url);
      });

      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setIsLoading(false);

      const { data: listener } = supabase.auth.onAuthStateChange(async (event, sess) => {
        console.log('🔔 Auth state changed:', event);
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
      if (linkingSubscription) linkingSubscription.remove();
    };
  }, [handleDeepLink]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: new Error('Supabase not initialized') };

    try {
      // Production: Use native deep linking
      const redirectTo = 'focusup://';

      console.log('🔗 Redirect URI:', redirectTo);
      console.log('📱 Platform:', require('react-native').Platform.OS);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true, // Important for Expo/React Native
        },
      });

      if (error) {
        console.error('❌ OAuth initiation error:', error);
        return { error };
      }

      if (!data?.url) {
        console.error('❌ No OAuth URL returned');
        return { error: new Error('No OAuth URL returned') };
      }

      console.log('✅ Google OAuth initiated, opening browser...');
      console.log('🔗 OAuth URL:', data.url);

      // Open the browser with the OAuth URL
      // The deep link handler will process the callback when the user is redirected back
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      console.log('📱 Browser result type:', result.type);

      // Handle user cancellation
      if (result.type === 'cancel') {
        console.log('⚠️ User cancelled OAuth');
        return { error: new Error('User cancelled sign in') };
      }

      // For success or dismiss, the deep link handler will process the tokens
      // We just need to return success here - the actual session will be set by handleDeepLink
      if (result.type === 'success' || result.type === 'dismiss') {
        console.log('✅ OAuth browser flow completed, waiting for deep link callback...');

        // Give the deep link handler a moment to process the callback
        // The auth state change listener will update the session
        return { data: null, error: null };
      }

      // Any other result type is unexpected
      console.log('⚠️ Unexpected OAuth result type:', result.type);
      return { error: new Error('OAuth flow returned unexpected result') };
    } catch (err: any) {
      console.error('❌ Google sign in exception:', err);
      return { error: err };
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) return { error };

    return { data, error: null };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };

    return await supabase.auth.signInWithPassword({ email, password });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };

    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'focusup://reset-password',
    });
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

  return {
    session,
    isLoading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    continueAsGuest,
    isAuthenticated,
    guest
  };
}



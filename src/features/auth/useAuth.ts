import { useEffect, useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Session = Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session'];

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
      const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
        setSession(sess);
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



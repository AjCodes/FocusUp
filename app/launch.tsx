import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ENTRY_DURATION = 700;
const BURST_DURATION = 500;
const FADE_OUT_DELAY = 1800;
const FADE_OUT_DURATION = 260;
const MAX_PRELOAD_WAIT = 3000;
const ANIMATION_FLAG = 'focusup-launch-animation-played';

export default function Launch() {
  const router = useRouter();
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const [readyForAnimation, setReadyForAnimation] = useState(false);
  const [logoSource, setLogoSource] = useState(require('../assets/logo.png'));

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.6);
  const overlayOpacity = useSharedValue(0);
  const highlightOpacity = useSharedValue(0);

  const recordLaunchComplete = () => {
    AsyncStorage.setItem(ANIMATION_FLAG, 'true').catch(() => {});
  };

  useEffect(() => {
    let isMounted = true;
    let authCheckAttempts = 0;
    const MAX_AUTH_CHECK_ATTEMPTS = 5;
    const AUTH_CHECK_DELAY = 300;

    const checkAuthSession = async (): Promise<boolean> => {
      try {
        const { data } = await supabase.auth.getSession();
        return !!data?.session;
      } catch (error) {
        console.error('Auth session check error:', error);
        return false;
      }
    };

    const waitForAuth = async (): Promise<boolean> => {
      // Check if there's already a session
      let hasSession = await checkAuthSession();

      if (hasSession) {
        console.log('✅ Session found immediately');
        return true;
      }

      // If no session, retry a few times to handle OAuth callback race condition
      while (authCheckAttempts < MAX_AUTH_CHECK_ATTEMPTS && !hasSession && isMounted) {
        console.log(`⏳ Waiting for auth session (attempt ${authCheckAttempts + 1}/${MAX_AUTH_CHECK_ATTEMPTS})...`);
        await new Promise(resolve => setTimeout(resolve, AUTH_CHECK_DELAY));
        hasSession = await checkAuthSession();
        authCheckAttempts++;
      }

      if (hasSession) {
        console.log('✅ Session established after retries');
      } else {
        console.log('❌ No session found after retries');
      }

      return hasSession;
    };

    const prepare = async () => {
      try {
        const hasPlayed = await AsyncStorage.getItem(ANIMATION_FLAG);
        if (!isMounted) {
          return;
        }
        setShouldAnimate(!hasPlayed);

        const logoAsset = Asset.fromModule(require('../assets/logo.png'));
        await Promise.race([
          logoAsset.downloadAsync(),
          new Promise(resolve => setTimeout(resolve, MAX_PRELOAD_WAIT)),
        ]);
        if (isMounted) {
          setLogoSource({ uri: logoAsset.localUri ?? logoAsset.uri });
        }

        // Wait for authentication with retry logic
        const hasAuthSession = await waitForAuth();

        if (!isMounted) {
          return;
        }

        const destination = hasAuthSession ? '/(tabs)/focus' : '/(auth)/login';
        console.log('🎯 Routing to:', destination);
        setTargetRoute(destination);

        if (hasPlayed) {
          recordLaunchComplete();
          setAnimationComplete(true);
        } else {
          setReadyForAnimation(true);
        }
      } catch (error) {
        console.error('Launch preparation error', error);
        setTargetRoute('/(auth)/login');
        setAnimationComplete(true);
      }
    };

    prepare();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!shouldAnimate && targetRoute) {
      recordLaunchComplete();
      setAnimationComplete(true);
    }
  }, [shouldAnimate, targetRoute]);

  useEffect(() => {
    if (!shouldAnimate || !readyForAnimation) {
      return;
    }

    logoOpacity.value = withTiming(1, {
      duration: ENTRY_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    logoScale.value = withTiming(
      1,
      {
        duration: ENTRY_DURATION,
        easing: Easing.out(Easing.cubic),
      },
      () => {
        logoScale.value = withSequence(
          withTiming(1.1, {
            duration: BURST_DURATION / 2,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(1.02, {
            duration: BURST_DURATION / 2,
            easing: Easing.inOut(Easing.quad),
          }),
        );
      },
    );

    highlightOpacity.value = withDelay(
      260,
      withSequence(
        withTiming(0.6, { duration: 380, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }),
      ),
    );

    overlayOpacity.value = withDelay(
      FADE_OUT_DELAY,
      withTiming(
        1,
        { duration: FADE_OUT_DURATION, easing: Easing.inOut(Easing.quad) },
        finished => {
          if (finished) {
            runOnJS(recordLaunchComplete)();
            runOnJS(setAnimationComplete)(true);
          }
        },
      ),
    );
  }, [shouldAnimate, readyForAnimation]);

  useEffect(() => {
    if (animationComplete && targetRoute) {
      router.replace(targetRoute);
    }
  }, [animationComplete, targetRoute, router]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: shouldAnimate ? logoOpacity.value : 1,
    transform: [{ scale: shouldAnimate ? logoScale.value : 1 }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: highlightOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#05030C', '#0E1424']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <Animated.View style={[styles.highlight, highlightStyle]} />

      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      <Animated.View style={[styles.overlay, overlayStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#02030B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  highlight: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
    borderRadius: SCREEN_WIDTH * 0.45,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    
  },
});

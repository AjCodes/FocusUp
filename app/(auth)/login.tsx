import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../../src/features/auth/useAuth';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, continueAsGuest, isAuthenticated, signOut, guest } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSignOutPrompt, setShowSignOutPrompt] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Check if user is already authenticated
    if (isAuthenticated) {
      // Show a prompt to sign out or continue
      setShowSignOutPrompt(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Fade-in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting sign in with email:', email);
      const { error: signInError, data } = await signInWithEmail(email, password);

      if (signInError) {
        console.error('❌ Sign in error:', signInError);

        // Provide more helpful error messages
        let userMessage = signInError.message;

        if (signInError.message.includes('Invalid login credentials') ||
            signInError.message.includes('Invalid email or password')) {
          userMessage = 'Incorrect email or password. Check your credentials or create an account.';
        } else if (signInError.message.includes('Email not confirmed')) {
          userMessage = 'Please check your email and confirm your account before signing in.';
        } else if (signInError.message.includes('User not found')) {
          userMessage = 'No account found with this email. Would you like to create one?';
        } else if (signInError.message.includes('Too many requests')) {
          userMessage = 'Too many login attempts. Please try again in a few minutes.';
        }

        setError(userMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        console.log('✅ Sign in successful:', data?.user?.email);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/focus');
      }
    } catch (err: any) {
      console.error('❌ Sign in exception:', err);
      setError(err.message || 'Sign in failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('🔐 Attempting Google OAuth sign in...');
      const { error: googleError, data } = await signInWithGoogle();

      if (googleError) {
        console.error('❌ Google OAuth error:', googleError);

        let userMessage = googleError.message;

        if (googleError.message.includes('not configured') ||
            googleError.message.includes('Provider not found')) {
          userMessage = 'Google sign-in is not properly configured. Please contact support.';
        } else if (googleError.message.includes('cancelled') ||
                   googleError.message.includes('user_cancelled') ||
                   googleError.message.includes('User cancelled')) {
          userMessage = 'Sign in was cancelled. Please try again if you want to continue.';
        } else if (googleError.message.includes('redirect')) {
          userMessage = 'OAuth redirect issue. Please ensure the app is properly configured.';
        }

        setError(userMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (data?.user) {
        // Session was successfully established
        console.log('✅ Google sign in successful:', data.user.email);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/focus');
      } else {
        console.log('✅ Google OAuth completed');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      console.error('❌ Google sign in exception:', err);
      setError(err.message || 'Google sign in failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    setLoading(true);
    try {
      await continueAsGuest();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/focus');
    } catch (err: any) {
      setError(err.message || 'Failed to continue as guest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0A0F1C', '#1E293B', '#0A0F1C']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Already Authenticated Prompt */}
          {showSignOutPrompt && (
            <View style={styles.alreadyAuthContainer}>
              <View style={styles.alreadyAuthCard}>
                <Ionicons name="information-circle" size={32} color="#60A5FA" />
                <Text style={styles.alreadyAuthTitle}>
                  {guest ? "You're in Guest Mode" : "Already Signed In"}
                </Text>
                <Text style={styles.alreadyAuthText}>
                  {guest
                    ? "You're currently using the app as a guest. Sign out to use a different account."
                    : "You're already signed in. Sign out to use a different account."}
                </Text>

                <View style={styles.alreadyAuthButtons}>
                  <Pressable
                    onPress={() => router.replace('/(tabs)/focus')}
                    style={({ pressed }) => [
                      styles.continueButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.continueButtonText}>Continue to App</Text>
                  </Pressable>

                  <Pressable
                    onPress={async () => {
                      await signOut();
                      setShowSignOutPrompt(false);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                    style={({ pressed }) => [
                      styles.signOutButtonSmall,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.signOutButtonTextSmall}>Sign Out</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                display: showSignOutPrompt ? 'none' : 'flex',
              },
            ]}
          >
            {/* Logo/Icon */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="timer-outline" size={48} color="#3B82F6" />
              </View>
              <Text style={styles.logoText}>FocusUp</Text>
              <Text style={styles.tagline}>Craft your day, shape your life</Text>
            </View>

            {/* Email/Password Form */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#CBD5E1" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#CBD5E1" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Password"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#CBD5E1"
                  />
                </Pressable>
              </View>

              {/* Forgot Password */}
              <Pressable
                onPress={() => router.push('/(auth)/forgot-password' as any)}
                style={styles.forgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </Pressable>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Sign In Button */}
              <Pressable
                onPress={handleEmailSignIn}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </Pressable>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login */}
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={loading}
              style={({ pressed }) => [
                styles.googleButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons name="logo-google" size={20} color="#1F2937" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </Pressable>

            {/* Create Account */}
            <Pressable
              onPress={() => router.push('/(auth)/register' as any)}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </Pressable>

            {/* Guest Access */}
            <Pressable
              onPress={handleGuestContinue}
              disabled={loading}
              style={styles.guestButton}
            >
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
              <Text style={styles.guestSubtext}>Limited features, data not synced</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    paddingVertical: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#60A5FA',
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 14,
    marginHorizontal: 16,
  },
  googleButton: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  guestButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    marginBottom: 4,
  },
  guestSubtext: {
    color: '#64748B',
    fontSize: 12,
  },
  alreadyAuthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alreadyAuthCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    maxWidth: 400,
    width: '100%',
  },
  alreadyAuthTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  alreadyAuthText: {
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  alreadyAuthButtons: {
    width: '100%',
    gap: 12,
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutButtonSmall: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  signOutButtonTextSmall: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});



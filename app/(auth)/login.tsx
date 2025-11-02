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
  Image,
  Alert,
  Easing,
} from 'react-native';
import { useAuth } from '../../src/features/auth/useAuth';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthStatusModal } from '../../components/AuthStatusModal';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, continueAsGuest, isAuthenticated, signOut, guest, session } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSignOutPrompt, setShowSignOutPrompt] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(30)).current;

  // Track OAuth flow state
  const oauthFlowActive = useRef(false);
  const initialAuthCheck = useRef(true);

  useEffect(() => {
    if (isAuthenticated) {
      if (initialAuthCheck.current) {
        setShowSignOutPrompt(true);
      }
      else if (oauthFlowActive.current) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLoading(false);
        oauthFlowActive.current = false;

        const email = session?.user?.email || 'your account';
        setUserEmail(email);
        setSuccessMessage(`You're now logged in as ${email}`);
        setShowSuccessModal(true);

        setTimeout(() => {
          setShowSuccessModal(false);
          router.replace('/(tabs)/focus');
        }, 1800);
      } else {
        // Handle case where user is authenticated but not from active OAuth flow
        // This can happen if they land on login page after OAuth callback completes
        console.log('🔄 User authenticated via external flow, redirecting...');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const email = session?.user?.email || 'your account';
        setUserEmail(email);
        setSuccessMessage(`You're now logged in as ${email}`);
        setShowSuccessModal(true);

        setTimeout(() => {
          setShowSuccessModal(false);
          router.replace('/(tabs)/focus');
        }, 1800);
      }
    }

    initialAuthCheck.current = false;
  }, [isAuthenticated, session]);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(formSlide, {
          toValue: 0,
          friction: 9,
          tension: 50,
          delay: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter both email and password');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signInWithEmail(email, password);

      if (result.error) {
        const signInError = result.error;

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

        Alert.alert('Sign In Failed', userMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const userEmailValue = result.data?.user?.email || email;
        setUserEmail(userEmailValue);
        setSuccessMessage(`You're now logged in as ${userEmailValue}`);
        setShowSuccessModal(true);

        setTimeout(() => {
          setShowSuccessModal(false);
          setLoading(false);
          router.replace('/(tabs)/focus');
        }, 1800);
      }
    } catch (err: any) {
      Alert.alert('Sign In Error', err.message || 'Sign in failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    oauthFlowActive.current = true;

    try {
      const { error: googleError } = await signInWithGoogle();

      if (googleError) {
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

        Alert.alert('Google Sign In Failed', userMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
        oauthFlowActive.current = false;
      }
    } catch (err: any) {
      Alert.alert('Google Sign In Error', err.message || 'Google sign in failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoading(false);
      oauthFlowActive.current = false;
    }
  };

  const handleGuestContinue = async () => {
    setLoading(true);
    try {
      await continueAsGuest();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setSuccessMessage("You're continuing as a guest");
      setShowSuccessModal(true);

      setTimeout(() => {
        setShowSuccessModal(false);
        setLoading(false);
        router.replace('/(tabs)/focus');
      }, 1500);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to continue as guest');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AuthStatusModal
        visible={showSuccessModal}
        type="success"
        title="Welcome Back!"
        message={successMessage}
        autoClose={true}
        autoCloseDuration={1800}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
            <Animated.View style={{ opacity: fadeAnim }}>
              <LinearGradient
                colors={['#14B8A6', '#06B6D4', '#0EA5E9']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Animated.View
                  style={[
                    styles.logoContainer,
                    {
                      opacity: logoOpacity,
                      transform: [{ scale: logoScale }],
                    }
                  ]}
                >
                  <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                  <Text style={styles.logoText}>FocusUp</Text>
                  <Text style={styles.tagline}>Craft your day, shape your life</Text>
                </Animated.View>
              </LinearGradient>
            </Animated.View>

            <Animated.View
              style={[
                styles.formCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: formSlide }],
                }
              ]}
            >
              <Text style={styles.welcomeTitle}>Welcome</Text>
              <Text style={styles.welcomeSubtitle}>Sign in to continue your focus journey</Text>

              <View style={styles.formContainer}>
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

              <Pressable
                onPress={() => router.push('/(auth)/forgot-password' as any)}
                style={styles.forgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </Pressable>

              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <LinearGradient
                colors={['#14B8A6', '#06B6D4', '#0EA5E9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Pressable
                  onPress={handleEmailSignIn}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.primaryButtonInner,
                    pressed && styles.primaryButtonPressed,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign in</Text>
                  )}
                </Pressable>
              </LinearGradient>
            </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                onPress={handleGoogleSignIn}
                disabled={loading}
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && styles.googleButtonPressed,
                ]}
              >
                <Ionicons name="logo-google" size={22} color="#DB4437" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </Pressable>

              <View style={styles.signupPrompt}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <Pressable onPress={() => router.push('/(auth)/register' as any)}>
                  <Text style={styles.signupLink}>Get Started</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleGuestContinue}
                disabled={loading}
                style={styles.guestButton}
              >
                <Text style={styles.guestButtonText}>Continue as Guest</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    fontWeight: '400',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: -20,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '400',
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 10,
    color: '#9CA3AF',
  },
  input: {
    flex: 1,
    color: '#1F2937',
    fontSize: 15,
    paddingVertical: 12,
  },
  eyeIcon: {
    padding: 6,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#14B8A6',
    fontSize: 14,
    fontWeight: '700',
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
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonInner: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonPressed: {
    backgroundColor: '#F9FAFB',
    transform: [{ scale: 0.98 }],
    borderColor: '#14B8A6',
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  signupText: {
    color: '#6B7280',
    fontSize: 14,
  },
  signupLink: {
    color: '#14B8A6',
    fontSize: 14,
    fontWeight: '700',
  },
  guestButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  guestButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
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
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});

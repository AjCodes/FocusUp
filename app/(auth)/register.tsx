import React, { useState, useRef, useEffect } from 'react';
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

export default function Register() {
  const { signUpWithEmail } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '', color: '#64748B' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength === 1) return { strength: 25, label: 'Weak', color: '#EF4444' };
    if (strength === 2) return { strength: 50, label: 'Fair', color: '#F97316' };
    if (strength === 3) return { strength: 75, label: 'Good', color: '#F59E0B' };
    if (strength === 4) return { strength: 100, label: 'Strong', color: '#10B981' };

    return { strength: 0, label: '', color: '#64748B' };
  };

  const passwordStrength = getPasswordStrength();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleRegister = async () => {
    // Validation
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!termsAccepted) {
      setError('Please accept the terms and conditions');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: signUpError } = await signUpWithEmail(email, password, username);

      if (signUpError) {
        setError(signUpError.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigate to main app - onboarding will show on first launch
        router.replace('/(tabs)/focus');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
              </Pressable>
              <Text style={styles.headerText}>Create Account</Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Username */}
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#CBD5E1" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#64748B"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              {/* Email */}
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

              {/* Password */}
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

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBar}>
                    <View
                      style={[
                        styles.strengthFill,
                        {
                          width: `${passwordStrength.strength}%`,
                          backgroundColor: passwordStrength.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.label}
                  </Text>
                </View>
              )}

              {/* Password Requirements */}
              {password.length > 0 && (
                <View style={styles.requirementsContainer}>
                  <RequirementItem met={password.length >= 8} text="At least 8 characters" />
                  <RequirementItem met={/[A-Z]/.test(password)} text="One uppercase letter" />
                  <RequirementItem met={/[0-9]/.test(password)} text="One number" />
                  <RequirementItem met={/[^A-Za-z0-9]/.test(password)} text="One special character" />
                </View>
              )}

              {/* Confirm Password */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#CBD5E1" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Confirm Password"
                  placeholderTextColor="#64748B"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#CBD5E1"
                  />
                </Pressable>
              </View>

              {/* Terms & Conditions */}
              <Pressable
                onPress={() => setTermsAccepted(!termsAccepted)}
                style={styles.checkboxContainer}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.checkboxText}>
                  I agree to the{' '}
                  <Text style={styles.link}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.link}>Privacy Policy</Text>
                </Text>
              </Pressable>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Create Account Button */}
              <Pressable
                onPress={handleRegister}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
              </Pressable>

              {/* Sign In Link */}
              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <Pressable onPress={() => router.back()}>
                  <Text style={styles.signInLink}>Sign In</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// Helper Component
const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
  <View style={styles.requirementItem}>
    <Ionicons
      name={met ? 'checkmark-circle' : 'ellipse-outline'}
      size={16}
      color={met ? '#10B981' : '#64748B'}
    />
    <Text style={[styles.requirementText, met && styles.requirementMet]}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    marginRight: 16,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
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
  strengthContainer: {
    marginBottom: 16,
  },
  strengthBar: {
    height: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirementsContainer: {
    marginBottom: 16,
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#64748B',
  },
  requirementMet: {
    color: '#10B981',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#64748B',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkboxText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 14,
  },
  link: {
    color: '#60A5FA',
    textDecorationLine: 'underline',
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
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  signInLink: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '600',
  },
});

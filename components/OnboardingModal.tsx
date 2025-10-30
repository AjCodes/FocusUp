import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ visible, onComplete }) => {
  const [step, setStep] = useState(0);
  const [storageMode, setStorageMode] = useState<'cloud' | 'local' | null>(null);

  const handleStorageSelect = async (mode: 'cloud' | 'local') => {
    setStorageMode(mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleContinue = async () => {
    if (step === 0) {
      setStep(1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (step === 1 && storageMode) {
      // Save preference
      await AsyncStorage.setItem('storage-mode', storageMode);
      await AsyncStorage.setItem('onboarding-complete', 'true');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    }
  };

  const handleSkip = async () => {
    // Set default to local
    await AsyncStorage.setItem('storage-mode', 'local');
    await AsyncStorage.setItem('onboarding-complete', 'true');
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
    >
      <LinearGradient
        colors={['#0A0F1C', '#1E293B', '#0A0F1C']}
        style={styles.container}
      >
        {/* Step 1: Welcome */}
        {step === 0 && (
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="rocket-outline" size={64} color="#3B82F6" />
              </View>
            </View>

            <Text style={styles.title}>Welcome to FocusUp!</Text>

            <Text style={styles.description}>
              Level up your focus and productivity with gamified Pomodoro sessions.
              Complete tasks, build habits, and watch your character grow.
            </Text>

            <View style={styles.featuresContainer}>
              <FeatureItem
                icon="timer-outline"
                title="Focus Sessions"
                description="25-minute deep work sprints"
              />
              <FeatureItem
                icon="trophy-outline"
                title="Earn Rewards"
                description="Gain XP and coins for every session"
              />
              <FeatureItem
                icon="trending-up-outline"
                title="Level Up"
                description="Track progress across 4 attributes"
              />
            </View>

            <Pressable
              onPress={handleContinue}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          </View>
        )}

        {/* Step 2: Storage Preference */}
        {step === 1 && (
          <View style={styles.content}>
            <Text style={styles.title}>Choose Your Storage</Text>

            <Text style={styles.description}>
              How would you like to store your data?
            </Text>

            <View style={styles.optionsContainer}>
              {/* Cloud Storage Option */}
              <Pressable
                onPress={() => handleStorageSelect('cloud')}
                style={({ pressed }) => [
                  styles.storageOption,
                  storageMode === 'cloud' && styles.storageOptionSelected,
                  pressed && styles.buttonPressed,
                ]}
              >
                <View style={styles.optionHeader}>
                  <View style={[
                    styles.optionIcon,
                    storageMode === 'cloud' && styles.optionIconSelected
                  ]}>
                    <Ionicons
                      name="cloud-outline"
                      size={32}
                      color={storageMode === 'cloud' ? '#3B82F6' : '#CBD5E1'}
                    />
                  </View>
                  <View style={styles.optionTitleContainer}>
                    <Text style={styles.optionTitle}>Cloud Storage</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>RECOMMENDED</Text>
                    </View>
                  </View>
                  <View style={styles.checkbox}>
                    {storageMode === 'cloud' && (
                      <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                    )}
                  </View>
                </View>

                <View style={styles.optionFeatures}>
                  <FeatureBullet text="Data syncs across devices" />
                  <FeatureBullet text="Automatic backups" />
                  <FeatureBullet text="Accessible anywhere" />
                  <FeatureBullet text="Requires account" />
                </View>
              </Pressable>

              {/* Local Storage Option */}
              <Pressable
                onPress={() => handleStorageSelect('local')}
                style={({ pressed }) => [
                  styles.storageOption,
                  storageMode === 'local' && styles.storageOptionSelected,
                  pressed && styles.buttonPressed,
                ]}
              >
                <View style={styles.optionHeader}>
                  <View style={[
                    styles.optionIcon,
                    storageMode === 'local' && styles.optionIconSelected
                  ]}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={32}
                      color={storageMode === 'local' ? '#3B82F6' : '#CBD5E1'}
                    />
                  </View>
                  <View style={styles.optionTitleContainer}>
                    <Text style={styles.optionTitle}>Local Only</Text>
                  </View>
                  <View style={styles.checkbox}>
                    {storageMode === 'local' && (
                      <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                    )}
                  </View>
                </View>

                <View style={styles.optionFeatures}>
                  <FeatureBullet text="Data stays on this device" />
                  <FeatureBullet text="Works offline" />
                  <FeatureBullet text="Manual backups available" />
                  <FeatureBullet text="No account required" />
                </View>
              </Pressable>
            </View>

            <Text style={styles.footerNote}>
              You can change this later in Settings
            </Text>

            <Pressable
              onPress={handleContinue}
              disabled={!storageMode}
              style={({ pressed }) => [
                styles.primaryButton,
                !storageMode && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>

            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </Pressable>
          </View>
        )}
      </LinearGradient>
    </Modal>
  );
};

// Helper Components
const FeatureItem = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>
      <Ionicons name={icon as any} size={24} color="#60A5FA" />
    </View>
    <View style={styles.featureText}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const FeatureBullet = ({ text }: { text: string }) => (
  <View style={styles.featureBullet}>
    <Ionicons name="checkmark" size={16} color="#10B981" />
    <Text style={styles.featureBulletText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: 40,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#94A3B8',
  },
  optionsContainer: {
    marginVertical: 24,
    gap: 16,
  },
  storageOption: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  storageOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(203, 213, 225, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionIconSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  optionTitleContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  checkbox: {
    width: 24,
    height: 24,
  },
  optionFeatures: {
    gap: 8,
  },
  featureBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureBulletText: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  footerNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  skipButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});

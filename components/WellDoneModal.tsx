import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Pressable, Animated, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeProvider';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface WellDoneModalProps {
  visible: boolean;
  tasksCompleted: number;
  habitsCompleted: number;
  coinsEarned: number;
  xpGained: { PH: number; CO: number; EM: number; SO: number };
  currentStreak: number;
  onEnterBreak: () => void;
  onClose: () => void;
}

const FOCUS_ATTRIBUTES = {
  PH: { label: 'Physical', emoji: '💪', color: '#10B981' },
  CO: { label: 'Cognitive', emoji: '🧠', color: '#3B82F6' },
  EM: { label: 'Heart', emoji: '❤️', color: '#EF4444' },
  SO: { label: 'Soul', emoji: '🌌', color: '#8B5CF6' },
};

export const WellDoneModal: React.FC<WellDoneModalProps> = ({
  visible,
  tasksCompleted,
  habitsCompleted,
  coinsEarned,
  xpGained,
  currentStreak,
  onEnterBreak,
  onClose,
}) => {
  const { colors } = useTheme();

  // Debug logging
  useEffect(() => {
    if (visible) {
      console.log('🎉 WellDoneModal displayed with:', {
        tasksCompleted,
        habitsCompleted,
        coinsEarned,
        xpGained,
        currentStreak,
      });
    }
  }, [visible]);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Individual item animations
  const tasksFade = useRef(new Animated.Value(0)).current;
  const habitsFade = useRef(new Animated.Value(0)).current;
  const coinsFade = useRef(new Animated.Value(0)).current;
  const xpFade = useRef(new Animated.Value(0)).current;
  const streakFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset animations
      scaleAnim.setValue(0.8);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      glowAnim.setValue(0);
      tasksFade.setValue(0);
      habitsFade.setValue(0);
      coinsFade.setValue(0);
      xpFade.setValue(0);
      streakFade.setValue(0);

      // Start animations sequence
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow animation (continuous)
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();

      // Stagger item animations
      setTimeout(() => {
        Animated.timing(tasksFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 200);

      setTimeout(() => {
        Animated.timing(habitsFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 350);

      setTimeout(() => {
        Animated.timing(coinsFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 500);

      setTimeout(() => {
        Animated.timing(xpFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 650);

      setTimeout(() => {
        Animated.timing(streakFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 800);
    }
  }, [visible]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const totalXP = Object.values(xpGained).reduce((sum, val) => sum + val, 0);
  const hasXP = totalXP > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.primary + '40',
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.glow,
              {
                backgroundColor: colors.primary,
                opacity: glowOpacity,
              },
            ]}
          />

          {/* Title */}
          <View style={styles.titleContainer}>
            <Ionicons name="trophy" size={48} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>
              SESSION COMPLETE!
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Well done! Here's what you earned
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsContainer}>
            {/* Tasks Completed */}
            {tasksCompleted > 0 && (
              <Animated.View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.background + '80', opacity: tasksFade },
                ]}
              >
                <View style={[styles.statIconContainer, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {tasksCompleted}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {tasksCompleted === 1 ? 'Quest' : 'Quests'}
                </Text>
              </Animated.View>
            )}

            {/* Habits Completed */}
            {habitsCompleted > 0 && (
              <Animated.View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.background + '80', opacity: habitsFade },
                ]}
              >
                <View style={[styles.statIconContainer, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="flash" size={24} color="#10B981" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {habitsCompleted}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {habitsCompleted === 1 ? 'Ritual' : 'Rituals'}
                </Text>
              </Animated.View>
            )}

            {/* Coins Earned */}
            <Animated.View
              style={[
                styles.statItem,
                { backgroundColor: colors.background + '80', opacity: coinsFade },
              ]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: '#FACC1520' }]}>
                <Ionicons name="ellipse" size={24} color="#FACC15" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {coinsEarned}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Coins
              </Text>
            </Animated.View>

            {/* XP Gained */}
            {hasXP && (
              <Animated.View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.background + '80', opacity: xpFade },
                ]}
              >
                <View style={styles.xpContainer}>
                  {(Object.keys(xpGained) as Array<keyof typeof xpGained>).map((key) => {
                    const value = xpGained[key];
                    if (value === 0) return null;
                    const attr = FOCUS_ATTRIBUTES[key];
                    return (
                      <View key={key} style={styles.xpItem}>
                        <Text style={{ fontSize: 14 }}>{attr.emoji}</Text>
                        <Text style={[styles.xpValue, { color: attr.color }]}>
                          +{value}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  XP Gained
                </Text>
              </Animated.View>
            )}

            {/* Streak */}
            <Animated.View
              style={[
                styles.statItem,
                { backgroundColor: colors.background + '80', opacity: streakFade },
              ]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="flame" size={24} color="#EF4444" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {currentStreak}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Day Streak
              </Text>
            </Animated.View>
          </View>

          {/* Action Button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onEnterBreak();
            }}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="cafe" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Enter Break Mode</Text>
          </Pressable>

          {/* Close Button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              {
                opacity: pressed ? 0.5 : 1,
              },
            ]}
          >
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>
              Skip Break
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    height: 150,
    borderRadius: 999,
    blur: 60,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'center',
  },
  statItem: {
    width: (width - 100) / 2,
    maxWidth: 160,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  xpContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 8,
  },
  xpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

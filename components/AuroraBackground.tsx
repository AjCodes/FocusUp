import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './ThemeProvider';

interface AuroraBackgroundProps {
  children: React.ReactNode;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ children }) => {
  const { colors, currentTheme } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Only animate for Aurora Flow theme
    if (currentTheme === 'auroraFlow' && colors.gradient) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [currentTheme, colors.gradient]);

  // Only render gradient for Aurora Flow theme
  if (currentTheme === 'auroraFlow' && colors.gradient) {
    const opacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.15, 0.25],
    });

    return (
      <View style={styles.container}>
        {/* Base background */}
        <View style={[styles.background, { backgroundColor: colors.background }]} />

        {/* Animated gradient overlay */}
        <Animated.View style={[styles.gradientContainer, { opacity }]}>
          <LinearGradient
            colors={colors.gradient as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          />
        </Animated.View>

        {/* Content */}
        <View style={styles.content}>
          {children}
        </View>
      </View>
    );
  }

  // For other themes, just render with solid background
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

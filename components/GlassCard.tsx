import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './ThemeProvider';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
}

const BORDER_RADIUS = 22;

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  style, 
  padding = 16, 
  margin = 8 
}) => {
  const { colors } = useTheme();

  const wrapperStyle: ViewStyle = {
    margin,
    borderRadius: BORDER_RADIUS,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 36,
    elevation: 16,
  };

  return (
    <View style={[styles.shadowWrapper, wrapperStyle, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={[
          `${colors.background}55`,
          `${colors.cardBackground}`,
          `${colors.primary}25`,
        ]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: BORDER_RADIUS }]}
      />
      <View
        style={[
          styles.surface,
          {
            borderRadius: BORDER_RADIUS,
            padding,
            backgroundColor: `${colors.cardBackground}`,
            borderColor: `${colors.primary}33`,
          },
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: BORDER_RADIUS }]}
        />
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowWrapper: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  surface: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
  },
});

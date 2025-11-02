import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
}

const BORDER_RADIUS = 16;

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  padding = 16,
  margin = 8
}) => {
  const { colors, currentTheme } = useTheme();

  // Determine appropriate shadow and elevation based on theme
  const shadowConfig = currentTheme === 'solarDawn'
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      }
    : {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
      };

  const cardStyle: ViewStyle = {
    margin,
    borderRadius: BORDER_RADIUS,
    padding,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: currentTheme === 'solarDawn'
      ? 'rgba(0, 0, 0, 0.08)'
      : `${colors.primary}25`,
    ...shadowConfig,
  };

  return (
    <View style={[styles.card, cardStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
  },
});

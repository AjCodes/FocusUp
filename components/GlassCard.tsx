import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  style, 
  padding = 16, 
  margin = 8 
}) => {
  const { colors } = useTheme();

  const glassStyle: ViewStyle = {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding,
    margin,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}20`, // 20% opacity
  };

  return (
    <View style={[glassStyle, style]}>
      {children}
    </View>
  );
};

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated } from 'react-native';

type ThemeMode = 'focus' | 'break';
type ThemeName = 'darkGlass' | 'auroraFlow' | 'solarDawn' | 'midnightNeon' | 'zenGarden';

export interface ThemeColors {
  primary: string;
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  accent: string;
  success: string;
  warning: string;
  borderRadius?: number;
  gradient?: string[];
}

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => Promise<void>;
  autoMode: boolean;
  setAutoMode: (enabled: boolean) => Promise<void>;
  fadeAnim: Animated.Value;
}

// Dark Glass Theme (Original Focus)
const darkGlassFocus: ThemeColors = {
  primary: '#3B82F6',
  background: '#0A0F1C',
  cardBackground: '#1B2738',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  accent: '#60A5FA',
  success: '#10B981',
  warning: '#EF4444',
  borderRadius: 16,
};

const darkGlassBreak: ThemeColors = {
  primary: '#F97316',
  background: '#1A1612',
  cardBackground: '#423E3A',
  text: '#FEF3C7',
  textSecondary: '#D97706',
  accent: '#FB923C',
  success: '#10B981',
  warning: '#EF4444',
  borderRadius: 16,
};

// Aurora Flow Theme (Gradient Focus)
const auroraFlowFocus: ThemeColors = {
  primary: '#3B82F6',
  background: '#0B0F19',
  cardBackground: '#151C23',
  text: '#E6E9F0',
  textSecondary: '#94A3B8',
  accent: '#60A5FA',
  success: '#10B981',
  warning: '#EF4444',
  borderRadius: 16,
  gradient: undefined,
};

const auroraFlowBreak: ThemeColors = {
  primary: '#F97316',
  background: '#1A1612',
  cardBackground: '#3F3731',
  text: '#FEF3C7',
  textSecondary: '#D97706',
  accent: '#FB923C',
  success: '#10B981',
  warning: '#EF4444',
  borderRadius: 16,
  gradient: undefined,
};

// Solar Dawn Theme (Light)
const solarDawnFocus: ThemeColors = {
  primary: '#2563EB',
  background: '#F5F3EE',
  cardBackground: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  accent: '#FBBF24',
  success: '#10B981',
  warning: '#EF4444',
  borderRadius: 16,
};

const solarDawnBreak: ThemeColors = {
  primary: '#EA580C',
  background: '#FEF3C7',
  cardBackground: '#FFFFFF',
  text: '#78350F',
  textSecondary: '#92400E',
  accent: '#F59E0B',
  success: '#10B981',
  warning: '#EF4444',
  borderRadius: 16,
};

// Midnight Neon Theme (High contrast dark)
const midnightNeonFocus: ThemeColors = {
  primary: '#8B5CF6',
  background: '#050817',
  cardBackground: '#0E1833',
  text: '#F3F4FF',
  textSecondary: '#9CA3C7',
  accent: '#22D3EE',
  success: '#10B981',
  warning: '#F472B6',
  borderRadius: 18,
};

const midnightNeonBreak: ThemeColors = {
  primary: '#F472B6',
  background: '#1A0E2B',
  cardBackground: '#241237',
  text: '#FDF4FF',
  textSecondary: '#D6BBFB',
  accent: '#FDE68A',
  success: '#22D3EE',
  warning: '#FB7185',
  borderRadius: 18,
};

// Zen Garden Theme (Muted naturals)
const zenGardenFocus: ThemeColors = {
  primary: '#2F855A',
  background: '#F7F9F5',
  cardBackground: '#FFFFFF',
  text: '#1F2933',
  textSecondary: '#6C7A74',
  accent: '#7BC89F',
  success: '#3CB371',
  warning: '#E67E22',
  borderRadius: 18,
};

const zenGardenBreak: ThemeColors = {
  primary: '#38A169',
  background: '#EEF5F0',
  cardBackground: '#FFFFFF',
  text: '#29423B',
  textSecondary: '#5B7069',
  accent: '#A7D7C5',
  success: '#2B6CB0',
  warning: '#D97706',
  borderRadius: 18,
};

const themes = {
  darkGlass: { focus: darkGlassFocus, break: darkGlassBreak },
  auroraFlow: { focus: auroraFlowFocus, break: auroraFlowBreak },
  solarDawn: { focus: solarDawnFocus, break: solarDawnBreak },
  midnightNeon: { focus: midnightNeonFocus, break: midnightNeonBreak },
  zenGarden: { focus: zenGardenFocus, break: zenGardenBreak },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('focus');
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('darkGlass');
  const [autoMode, setAutoModeState] = useState<boolean>(true);
  const [fadeAnim] = useState(new Animated.Value(1));

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem('theme-mode', newMode);
  };

  const setTheme = async (theme: ThemeName) => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0.7,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentTheme(theme);
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });

    await AsyncStorage.setItem('theme-name', theme);
  };

  const setAutoMode = async (enabled: boolean) => {
    setAutoModeState(enabled);
    await AsyncStorage.setItem('theme-auto-mode', enabled.toString());
  };

  useEffect(() => {
    const loadTheme = async () => {
      const savedMode = await AsyncStorage.getItem('theme-mode');
      if (savedMode && (savedMode === 'focus' || savedMode === 'break')) {
        setModeState(savedMode);
      }

      const savedTheme = await AsyncStorage.getItem('theme-name');
      if (savedTheme && (savedTheme === 'darkGlass' || savedTheme === 'auroraFlow' || savedTheme === 'solarDawn')) {
        setCurrentTheme(savedTheme as ThemeName);
      }

      const savedAutoMode = await AsyncStorage.getItem('theme-auto-mode');
      if (savedAutoMode !== null) {
        setAutoModeState(savedAutoMode === 'true');
      }
    };
    loadTheme();
  }, []);

  const colors = useMemo(() => {
    return themes[currentTheme][mode];
  }, [currentTheme, mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, colors, currentTheme, setTheme, autoMode, setAutoMode, fadeAnim }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

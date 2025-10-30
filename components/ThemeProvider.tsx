import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'focus' | 'break';

interface ThemeColors {
  primary: string;
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  accent: string;
  success: string;
  warning: string;
}

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
}

const focusColors: ThemeColors = {
  primary: '#3B82F6', // soft blue
  background: '#0A0F1C', // darker slate for immersion
  cardBackground: 'rgba(30, 41, 59, 0.8)', // semi-transparent dark
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  accent: '#60A5FA',
  success: '#10B981',
  warning: '#EF4444', // Red for pause state
};

const breakColors: ThemeColors = {
  primary: '#F97316', // soft orange
  background: '#1A1612', // darker brown for immersion
  cardBackground: 'rgba(68, 64, 60, 0.8)', // semi-transparent brown
  text: '#FEF3C7',
  textSecondary: '#D97706',
  accent: '#FB923C', // Orange gradient for reset button in break mode
  success: '#10B981',
  warning: '#EF4444', // Red for pause state
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('focus');

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem('theme-mode', newMode);
  };

  useEffect(() => {
    const loadTheme = async () => {
      const savedMode = await AsyncStorage.getItem('theme-mode');
      if (savedMode && (savedMode === 'focus' || savedMode === 'break')) {
        setModeState(savedMode);
      }
    };
    loadTheme();
  }, []);

  const colors = mode === 'focus' ? focusColors : breakColors;

  return (
    <ThemeContext.Provider value={{ mode, setMode, colors }}>
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

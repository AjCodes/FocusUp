import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeProvider';
import { GlassCard } from './GlassCard';
import * as Haptics from 'expo-haptics';

type ThemeName = 'darkGlass' | 'auroraFlow' | 'solarDawn' | 'midnightNeon' | 'zenGarden';

interface ThemeOption {
  name: ThemeName;
  label: string;
  description: string;
  preview: {
    type: 'solid' | 'gradient';
    colors: string[];
  };
}

const themeOptions: ThemeOption[] = [
  {
    name: 'darkGlass',
    label: 'Dark Glass',
    description: 'Deep blue glass with soft gradients',
    preview: {
      type: 'solid',
      colors: ['#0A0F1C', '#1E293B'],
    },
  },
  {
    name: 'auroraFlow',
    label: 'Aurora Flow',
    description: 'Vibrant gradient with shimmer effects',
    preview: {
      type: 'gradient',
      colors: ['#4f46e5', '#06b6d4', '#a855f7'],
    },
  },
  {
    name: 'solarDawn',
    label: 'Solar Dawn',
    description: 'Warm light theme for daytime focus',
    preview: {
      type: 'solid',
      colors: ['#F5F3EE', '#FFFFFF'],
    },
  },
  {
    name: 'midnightNeon',
    label: 'Midnight Neon',
    description: 'Moody midnight blues with neon accents',
    preview: {
      type: 'solid',
      colors: ['#050817', '#1B2540'],
    },
  },
  {
    name: 'zenGarden',
    label: 'Zen Garden',
    description: 'Calming neutrals inspired by nature',
    preview: {
      type: 'solid',
      colors: ['#F7F9F5', '#E3EEE7'],
    },
  },
];

interface ThemeSelectorProps {
  visible?: boolean;
  onClose?: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ visible = true, onClose }) => {
  const { colors, currentTheme, setTheme, autoMode, setAutoMode } = useTheme();

  const handleThemeSelect = async (themeName: ThemeName) => {
    await setTheme(themeName);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleAutoModeToggle = async () => {
    await setAutoMode(!autoMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Auto Mode Toggle */}
      <GlassCard style={styles.autoModeCard}>
        <View style={[styles.autoModeHeader, { paddingHorizontal: 4 }]}>
          <View style={[
            styles.autoModeIcon,
            { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '33' }
          ]}>
            <Ionicons name="sync" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.autoModeTitle, { color: colors.text }]}>
              Auto Mode
            </Text>
            <Text style={[styles.autoModeDescription, { color: colors.textSecondary }]}>
              Automatically switch between Focus and Break themes
            </Text>
          </View>
          <Pressable
            onPress={handleAutoModeToggle}
            style={[
              styles.autoModeToggle,
              {
                backgroundColor: autoMode ? colors.primary : colors.cardBackground,
                borderColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name={autoMode ? 'checkmark' : 'close'}
              size={18}
              color={autoMode ? '#fff' : colors.textSecondary}
            />
          </Pressable>
        </View>
      </GlassCard>

      {/* Theme Options */}
      <View style={styles.themesContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          SELECT THEME
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.themesScrollContent}
        >
          {themeOptions.map((theme) => {
            const isSelected = currentTheme === theme.name;
            return (
              <Pressable
                key={theme.name}
                onPress={() => handleThemeSelect(theme.name)}
                style={({ pressed }) => [
                  styles.themeCard,
                  {
                    borderColor: isSelected ? colors.primary : colors.primary + '33',
                    borderWidth: isSelected ? 2 : 1,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    backgroundColor: theme.name === 'zenGarden'
                      ? '#FFFFFF'
                      : theme.name === 'solarDawn'
                        ? '#F8F7F2'
                        : 'rgba(23, 30, 45, 0.45)',
                  },
                ]}
              >
                {/* Theme Preview */}
                <View style={styles.previewContainer}>
                  {theme.preview.type === 'gradient' ? (
                    <LinearGradient
                      colors={theme.preview.colors as [string, string, ...string[]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.preview}
                    >
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark-circle" size={24} color="#fff" />
                        </View>
                      )}
                    </LinearGradient>
                  ) : (
                    <LinearGradient
                      colors={theme.preview.colors as [string, string, ...string[]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.preview}
                    >
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                        </View>
                      )}
                    </LinearGradient>
                  )}
                </View>

                {/* Theme Info */}
                <View style={styles.themeInfo}>
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: isSelected ? colors.primary : colors.text },
                    ]}
                  >
                    {theme.label}
                  </Text>
                  <Text
                    style={[styles.themeDescription, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {theme.description}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  autoModeCard: {
    padding: 16,
  },
  autoModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  autoModeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  autoModeDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  autoModeToggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themesContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  themesScrollContent: {
    gap: 12,
    paddingHorizontal: 4,
  },
  themeCard: {
    width: 160,
    borderRadius: 16,
    backgroundColor: 'rgba(23, 30, 45, 0.45)',
    overflow: 'hidden',
  },
  previewContainer: {
    width: '100%',
    height: 100,
  },
  preview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeInfo: {
    padding: 12,
    gap: 4,
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  themeDescription: {
    fontSize: 11,
    lineHeight: 14,
  },
});

import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Switch,
  Alert,
  StyleSheet,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeProvider';
import { useAuth } from '../../src/features/auth/useAuth';
import { useDataBackup } from '../../hooks/useDataBackup';
import { useUserStats } from '../../hooks/useUserStats';
import { GlassCard } from '../../components/GlassCard';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function Settings() {
  const { colors } = useTheme();
  const { session, signOut, guest } = useAuth();
  const { backupToCloud, exportData, setStorageMode, getStorageMode, clearLocalCache } = useDataBackup();
  const { getUserId } = useUserStats();
  const router = useRouter();

  const [storageMode, setStorageModeState] = useState<'cloud' | 'local'>('local');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [focusReminders, setFocusReminders] = useState(true);
  const [habitReminders, setHabitReminders] = useState(true);
  const [breakReminders, setBreakReminders] = useState(false);
  const [autoStartBreak, setAutoStartBreak] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const mode = await getStorageMode();
      setStorageModeState(mode);

      // Load other settings from AsyncStorage
      const notifications = await AsyncStorage.getItem('notifications-enabled');
      if (notifications !== null) setNotificationsEnabled(notifications === 'true');

      const focus = await AsyncStorage.getItem('focus-reminders');
      if (focus !== null) setFocusReminders(focus === 'true');

      const habit = await AsyncStorage.getItem('habit-reminders');
      if (habit !== null) setHabitReminders(habit === 'true');

      const breakR = await AsyncStorage.getItem('break-reminders');
      if (breakR !== null) setBreakReminders(breakR === 'true');

      const autoBreak = await AsyncStorage.getItem('auto-start-break');
      if (autoBreak !== null) setAutoStartBreak(autoBreak === 'true');

      const sound = await AsyncStorage.getItem('sound-effects');
      if (sound !== null) setSoundEffects(sound === 'true');

      const haptic = await AsyncStorage.getItem('haptic-feedback');
      if (haptic !== null) setHapticFeedback(haptic === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleBackupNow = async () => {
    Alert.alert(
      'Backup Data',
      'This will upload your local data to the cloud. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Backup',
          onPress: async () => {
            setLoading(true);
            const userId = await getUserId();
            const result = await backupToCloud(userId);
            setLoading(false);

            Alert.alert(
              result.success ? 'Success' : 'Error',
              result.message
            );

            if (result.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    setLoading(true);
    const userId = await getUserId();
    const result = await exportData(userId);
    setLoading(false);

    Alert.alert(
      result.success ? 'Success' : 'Error',
      result.message
    );

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleStorageModeChange = async (newMode: 'cloud' | 'local') => {
    Alert.alert(
      `Switch to ${newMode === 'cloud' ? 'Cloud' : 'Local'} Storage?`,
      newMode === 'cloud'
        ? 'Your data will be backed up and synced across devices.'
        : 'Data will only be stored on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            setLoading(true);
            const userId = await getUserId();
            const result = await setStorageMode(newMode, userId);
            setStorageModeState(newMode);
            setLoading(false);

            Alert.alert('Success', result.message);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Local Cache?',
      'This will remove all locally cached data. Your cloud data will remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const userId = await getUserId();
            const result = await clearLocalCache(userId);
            Alert.alert(
              result.success ? 'Success' : 'Error',
              result.message
            );
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const saveSetting = async (key: string, value: boolean) => {
    await AsyncStorage.setItem(key, value.toString());
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <LinearGradient
      colors={['#0A0F1C', '#1E293B', '#0A0F1C']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => router.push('/(tabs)/focus')}
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              borderRadius: 20,
              width: 44,
              height: 44,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.primary + '40',
            }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerText, { color: colors.text }]}>Settings</Text>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >

      {/* Data & Storage Section */}
      <SettingsSection title="Data & Storage" icon="cloud-outline">
        <SettingsItem
          label="Storage Mode"
          value={storageMode === 'cloud' ? 'Cloud' : 'Local'}
          onPress={() => {
            Alert.alert(
              'Storage Mode',
              'Choose where to store your data',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Cloud', onPress: () => handleStorageModeChange('cloud') },
                { text: 'Local', onPress: () => handleStorageModeChange('local') },
              ]
            );
          }}
        />
        {storageMode === 'cloud' && (
          <SettingsItem
            label="Backup Data Now"
            onPress={handleBackupNow}
            loading={loading}
          />
        )}
        <SettingsItem
          label="Export Data (JSON)"
          onPress={handleExportData}
          loading={loading}
        />
        <SettingsItem
          label="Clear Local Cache"
          onPress={handleClearCache}
        />
      </SettingsSection>

      {/* Notifications Section */}
      <SettingsSection title="Notifications" icon="notifications-outline">
        <SettingsToggle
          label="Enable Notifications"
          value={notificationsEnabled}
          onValueChange={(value) => {
            setNotificationsEnabled(value);
            saveSetting('notifications-enabled', value);
          }}
        />
        <SettingsToggle
          label="Focus Reminders"
          value={focusReminders}
          onValueChange={(value) => {
            setFocusReminders(value);
            saveSetting('focus-reminders', value);
          }}
          disabled={!notificationsEnabled}
        />
        <SettingsToggle
          label="Habit Reminders"
          value={habitReminders}
          onValueChange={(value) => {
            setHabitReminders(value);
            saveSetting('habit-reminders', value);
          }}
          disabled={!notificationsEnabled}
        />
        <SettingsToggle
          label="Break Reminders"
          value={breakReminders}
          onValueChange={(value) => {
            setBreakReminders(value);
            saveSetting('break-reminders', value);
          }}
          disabled={!notificationsEnabled}
        />
      </SettingsSection>

      {/* Appearance Section */}
      <SettingsSection title="Appearance" icon="color-palette-outline">
        <SettingsItem
          label="Theme"
          value="Auto (Focus/Break)"
          onPress={() => {
            Alert.alert('Coming Soon', 'Theme customization will be available soon.');
          }}
        />
      </SettingsSection>

      {/* App Preferences Section */}
      <SettingsSection title="App Preferences" icon="settings-outline">
        <SettingsItem
          label="Work Duration"
          value="25 min"
          onPress={() => {
            Alert.alert('Coming Soon', 'Timer customization will be available soon.');
          }}
        />
        <SettingsItem
          label="Break Duration"
          value="5 min"
          onPress={() => {
            Alert.alert('Coming Soon', 'Timer customization will be available soon.');
          }}
        />
        <SettingsToggle
          label="Auto-start Breaks"
          value={autoStartBreak}
          onValueChange={(value) => {
            setAutoStartBreak(value);
            saveSetting('auto-start-break', value);
          }}
        />
        <SettingsToggle
          label="Sound Effects"
          value={soundEffects}
          onValueChange={(value) => {
            setSoundEffects(value);
            saveSetting('sound-effects', value);
          }}
        />
        <SettingsToggle
          label="Haptic Feedback"
          value={hapticFeedback}
          onValueChange={(value) => {
            setHapticFeedback(value);
            saveSetting('haptic-feedback', value);
            if (value) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }}
        />
      </SettingsSection>

      {/* Privacy & Data Section */}
      <SettingsSection title="Privacy & Data" icon="shield-checkmark-outline">
        <SettingsItem
          label="Terms of Service"
          onPress={() => {
            Linking.openURL('https://github.com/AjCodes/FocusUp');
          }}
        />
        <SettingsItem
          label="Privacy Policy"
          onPress={() => {
            Linking.openURL('https://github.com/AjCodes/FocusUp');
          }}
        />
      </SettingsSection>

      {/* About Section */}
      <SettingsSection title="About" icon="information-circle-outline">
        <SettingsItem label="App Version" value="1.0.0" />
        <SettingsItem
          label="GitHub Repository"
          onPress={() => {
            Linking.openURL('https://github.com/AjCodes/FocusUp');
          }}
        />
        <SettingsItem
          label="Share App"
          onPress={() => {
            Alert.alert('Coming Soon', 'Share functionality will be available soon.');
          }}
        />
      </SettingsSection>

      {/* Sign Out Button */}
      {(session || guest) && (
        <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutButton,
              {
                backgroundColor: colors.warning,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              }
            ]}
          >
            <Ionicons name="log-out-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      )}

      <View style={{ height: 120 }} />
      </ScrollView>
    </LinearGradient>
  );
}

// Helper Components
const SettingsSection = ({ title, icon, children }: any) => {
  const { colors } = useTheme();

  const getIconColor = (iconName: string) => {
    if (iconName.includes('person')) return '#3B82F6';
    if (iconName.includes('cloud')) return '#8B5CF6';
    if (iconName.includes('notifications')) return '#F59E0B';
    if (iconName.includes('color')) return '#EC4899';
    if (iconName.includes('settings')) return '#10B981';
    if (iconName.includes('shield')) return '#EF4444';
    return colors.primary;
  };

  const iconColor = getIconColor(icon);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: iconColor + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 8,
        }}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: '#F1F5F9' }]}>
          {title}
        </Text>
      </View>
      <GlassCard style={styles.sectionCard}>
        {children}
      </GlassCard>
    </View>
  );
};

const SettingsItem = ({ label, value, onPress, danger, loading }: any) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || loading}
      style={({ pressed }) => [
        styles.settingsItem,
        pressed && styles.settingsItemPressed,
      ]}
    >
      <Text style={[styles.settingsLabel, {
        color: danger ? colors.warning : colors.text,
        fontSize: 15,
        fontWeight: '500'
      }]}>
        {label}
      </Text>
      <View style={styles.settingsRight}>
        {value && (
          <Text style={[styles.settingsValue, {
            color: colors.textSecondary,
            fontSize: 14,
            fontWeight: '400'
          }]}>
            {value}
          </Text>
        )}
        {onPress && !loading && (
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        )}
        {loading && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>
    </Pressable>
  );
};

const SettingsToggle = ({ label, value, onValueChange, disabled }: any) => {
  const { colors } = useTheme();

  return (
    <View style={styles.settingsItem}>
      <Text style={[styles.settingsLabel, {
        color: colors.text,
        opacity: disabled ? 0.5 : 1,
        fontSize: 15,
        fontWeight: '500'
      }]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: 'rgba(71, 85, 105, 0.6)', true: colors.primary }}
        thumbColor={value ? '#F8FAFC' : '#CBD5E1'}
        ios_backgroundColor="rgba(71, 85, 105, 0.6)"
        style={{ transform: [{ scale: 0.9 }] }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
    minHeight: 56,
  },
  settingsItemPressed: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  settingsLabel: {
    flex: 1,
  },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsValue: {
    maxWidth: 150,
  },
  signOutButton: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeProvider';
import { useRouter } from 'expo-router';

interface TopBarProps {
  showStats?: boolean;
  showTitle?: boolean;
  title?: string;
  subtitle?: string;
  streak?: number;
  coins?: number;
  sprint?: string;
  onProfilePress?: () => void;
  profileImageUri?: string | null;
}

const SPRINT_COLOR = '#A855F7';

const StatItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
}> = ({ icon, label, value }) => {
  const { colors } = useTheme();

  return (
    <View style={{ alignItems: 'center', minWidth: 70 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
        {icon}
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
          {label}
        </Text>
      </View>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
};

export const TopBar: React.FC<TopBarProps> = ({
  showStats = false,
  showTitle = false,
  title = 'Focus Time',
  subtitle = 'Deep work in progress.',
  streak = 0,
  coins = 0,
  sprint = '0 of 4',
  onProfilePress,
  profileImageUri,
}) => {
  const { colors } = useTheme();
  const router = useRouter();

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      router.push('/profile');
    }
  };

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: colors.background,
      }}
    >
      {showTitle && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>
            {title}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
            {subtitle}
          </Text>
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {showStats && (
          <View
            style={{
              flex: 1,
              backgroundColor: colors.cardBackground,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: `${colors.primary}40`,
              marginRight: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <StatItem
                icon={<Ionicons name="ellipse" size={18} color="#FACC15" />}
                label="Coins"
                value={coins}
              />
              <StatItem
                icon={<Ionicons name="flame" size={18} color={colors.warning} />}
                label="Streak"
                value={streak}
              />
              <StatItem
                icon={<Ionicons name="walk-outline" size={18} color={SPRINT_COLOR} />}
                label="Sprints"
                value={sprint}
              />
            </View>
          </View>
        )}

        <Pressable
          onPress={handleProfilePress}
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 26,
            width: 52,
            height: 52,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.primary,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 5,
            elevation: 5,
          }}
        >
          {profileImageUri ? (
            <Image
              source={{ uri: profileImageUri }}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 26,
                resizeMode: 'cover',
              }}
            />
          ) : (
            <Ionicons name="person-circle-outline" size={30} color={colors.accent} />
          )}
        </Pressable>
      </View>
    </View>
  );
};

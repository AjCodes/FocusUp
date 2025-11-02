import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeProvider';
import { GlassCard } from '../../components/GlassCard';
import { useUserStats } from '../../hooks/useUserStats';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const ATTRIBUTES_KEY = 'focusup-attributes';
const SPRINT_ICON_COLOR = '#A855F7';

const FOCUS_ATTRIBUTES = {
  PH: { label: 'Physical', emoji: '\u{1F4AA}', color: '#10B981', description: "Your body's energy and health" },
  CO: { label: 'Cognitive', emoji: '\u{1F9E0}', color: '#3B82F6', description: "Your mind's focus and clarity" },
  EM: { label: 'Heart', emoji: '\u{2764}\u{FE0F}', color: '#EF4444', description: 'Your emotions and relationships' },
  SO: { label: 'Soul', emoji: '\u{1F30C}', color: '#8B5CF6', description: 'Your sense of meaning and purpose' },
};

interface AttributeData { level: number; xp: number; }
interface CharacterData { attributes: Record<string, AttributeData>; characterLevel: number; totalXP: number; }

export default function Profile() {
  const { colors } = useTheme();
  const { userStats, profileImageUri, setProfileImageUri } = useUserStats();
  const router = useRouter();
  const [characterData, setCharacterData] = useState<CharacterData>({ attributes: {}, characterLevel: 1, totalXP: 0 });

  const loadCharacterData = async () => {
    try {
      const data = await AsyncStorage.getItem(ATTRIBUTES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setCharacterData(parsed);
      } else {
        const defaultAttributes: Record<string, AttributeData> = {};
        Object.keys(FOCUS_ATTRIBUTES).forEach(key => { defaultAttributes[key] = { level: 0, xp: 0 }; });
        setCharacterData({ attributes: defaultAttributes, characterLevel: 1, totalXP: 0 });
      }
    } catch (error) {
      console.error('Error loading character data:', error);
    }
  };

  const handleChangeProfileImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow photo library access to update your profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.length) {
        const uri = result.assets[0].uri;
        await setProfileImageUri(uri);
      }
    } catch (error) {
      console.error('Error selecting profile image:', error);
      Alert.alert('Something went wrong', 'We could not update your photo. Please try again.');
    }
  };

  useEffect(() => { loadCharacterData(); }, []);

  const getAttributeLevel = (attributeKey: string): number => characterData.attributes[attributeKey]?.level || 0;
  const getAttributeXP = (attributeKey: string): number => characterData.attributes[attributeKey]?.xp || 0;
  const getXPForNextLevel = (currentLevel: number): number => (currentLevel + 1) * 10;
  const getCharacterLevel = (): number => {
    const allAttributesAtLevel10 = Object.values(characterData.attributes).every(attr => attr.level >= 10);
    if (allAttributesAtLevel10) {
      const minLevel = Math.min(...Object.values(characterData.attributes).map(attr => attr.level));
      return Math.min(Math.floor(minLevel / 10), 10);
    }
    return 0;
  };
  const getCharacterProgress = (): number => {
    const attributesAtLevel10 = Object.values(characterData.attributes).filter(attr => attr.level >= 10).length;
    return attributesAtLevel10 / 4;
  };
  const isReadyForLevelUp = (): boolean => Object.values(characterData.attributes).every(attr => attr.level >= 10);
  const { width } = Dimensions.get('window');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: colors.background,
      }}>
        <Pressable
          onPress={() => router.push('/(tabs)/focus')}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 20,
            width: 44,
            height: 44,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.background} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>
          Character Dashboard
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/settings' as any)}
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderRadius: 20,
            width: 44,
            height: 44,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16 }}>
          <GlassCard style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ marginRight: 16, position: 'relative' }}>
                <Pressable onPress={handleChangeProfileImage}>
                  <View style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: colors.cardBackground,
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: colors.primary,
                  }}>
                    {profileImageUri ? (
                      <Image source={{ uri: profileImageUri }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Ionicons name="person" size={28} color={colors.primary} />
                    )}
                    {isReadyForLevelUp() && (
                      <View style={{
                        position: 'absolute',
                        top: -4,
                        left: -4,
                        backgroundColor: '#EF4444',
                        borderRadius: 9,
                        width: 18,
                        height: 18,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>!</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
                <Pressable
                  onPress={handleChangeProfileImage}
                  style={{
                    position: 'absolute',
                    bottom: -6,
                    right: -6,
                    backgroundColor: colors.primary,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 3,
                    borderColor: colors.background,
                  }}
                >
                  <Ionicons name="camera" size={16} color={colors.background} />
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>
                  Level {getCharacterLevel()}
                </Text>
                <View style={{ backgroundColor: colors.cardBackground, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                  <View style={{ backgroundColor: colors.primary, height: '100%', width: `${getCharacterProgress() * 100}%`, borderRadius: 3 }} />
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  {Math.floor(getCharacterProgress() * 4)}/4 attributes to Level {getCharacterLevel() + 1}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center', minWidth: 72 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name="flame" size={16} color={colors.warning} />
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Streak</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{userStats.current_streak}</Text>
              </View>
              <View style={{ alignItems: 'center', minWidth: 72 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name="ellipse" size={16} color="#FACC15" />
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Coins</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{userStats.total_coins}</Text>
              </View>
              <View style={{ alignItems: 'center', minWidth: 72 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name="time-outline" size={16} color={colors.accent} />
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Focus</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{Math.round(userStats.total_focus_time / 60)}m</Text>
              </View>
              <View style={{ alignItems: 'center', minWidth: 72 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name="walk-outline" size={16} color={SPRINT_ICON_COLOR} />
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Sprints</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{userStats.total_sprints ?? 0}</Text>
              </View>
            </View>
          </GlassCard>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
            Character Attributes
          </Text>
          <View style={{ marginBottom: 100 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              {Object.entries(FOCUS_ATTRIBUTES).slice(0, 2).map(([key, attribute]) => (
                <GlassCard key={key} style={{ width: (width - 48) / 2, padding: 12 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: attribute.color, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 18 }}>{attribute.emoji}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' }}>
                      {attribute.label}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 9, textAlign: 'center', marginBottom: 6, lineHeight: 11, height: 22 }}>
                      {attribute.description}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>
                      Level {getAttributeLevel(key)}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: colors.cardBackground, height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                    <View style={{ backgroundColor: attribute.color, height: '100%', width: `${(getAttributeXP(key) % 10) * 10}%`, borderRadius: 2 }} />
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 9, textAlign: 'center' }}>
                    {getAttributeXP(key) % 10}/10 XP
                  </Text>
                </GlassCard>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {Object.entries(FOCUS_ATTRIBUTES).slice(2, 4).map(([key, attribute]) => (
                <GlassCard key={key} style={{ width: (width - 48) / 2, padding: 12 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: attribute.color, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 18 }}>{attribute.emoji}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' }}>
                      {attribute.label}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 9, textAlign: 'center', marginBottom: 6, lineHeight: 11, height: 22 }}>
                      {attribute.description}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>
                      Level {getAttributeLevel(key)}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: colors.cardBackground, height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                    <View style={{ backgroundColor: attribute.color, height: '100%', width: `${(getAttributeXP(key) % 10) * 10}%`, borderRadius: 2 }} />
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 9, textAlign: 'center' }}>
                    {getAttributeXP(key) % 10}/10 XP
                  </Text>
                </GlassCard>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}



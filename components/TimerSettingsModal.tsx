import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, TextInput } from 'react-native';
import { useTheme } from './ThemeProvider';
import { GlassCard } from './GlassCard';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TimerSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (work: number, breakTime: number) => void;
}

const SETTINGS_KEY = 'focusup-settings';

export const TimerSettingsModal: React.FC<TimerSettingsModalProps> = ({ visible, onClose, onSave }) => {
  const { colors } = useTheme();
  const [workMinutes, setWorkMinutes] = useState('25');
  const [breakMinutes, setBreakMinutes] = useState('5');

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (settings) {
        const parsed = JSON.parse(settings);
        setWorkMinutes(String(parsed.work / 60));
        setBreakMinutes(String(parsed.break / 60));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      const work = Number(workMinutes) * 60;
      const breakTime = Number(breakMinutes) * 60;
      
      const settings = { work, break: breakTime };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      
      onSave(work, breakTime);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <GlassCard style={{ width: '100%', maxWidth: 350 }}>
          <Text style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 20,
            textAlign: 'center',
          }}>
            ⚙️ Timer Settings
          </Text>

          <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 14 }}>
            Work Duration (minutes)
          </Text>
          <TextInput
            value={workMinutes}
            onChangeText={setWorkMinutes}
            keyboardType="number-pad"
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: colors.primary,
              borderRadius: 8,
              padding: 12,
              color: colors.text,
              marginBottom: 16,
              fontSize: 16,
            }}
          />

          <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 14 }}>
            Break Duration (minutes)
          </Text>
          <TextInput
            value={breakMinutes}
            onChangeText={setBreakMinutes}
            keyboardType="number-pad"
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: colors.primary,
              borderRadius: 8,
              padding: 12,
              color: colors.text,
              marginBottom: 20,
              fontSize: 16,
            }}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                backgroundColor: colors.cardBackground,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.primary,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={{
                flex: 1,
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.background, fontWeight: '600' }}>Save</Text>
            </Pressable>
          </View>

          <Text style={{
            color: colors.textSecondary,
            fontSize: 12,
            textAlign: 'center',
            marginTop: 12,
          }}>
            Changes apply immediately after reset
          </Text>
        </GlassCard>
      </View>
    </Modal>
  );
};

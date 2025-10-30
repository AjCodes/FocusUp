import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal } from 'react-native';
import { useTheme } from './ThemeProvider';
import { GlassCard } from './GlassCard';
import { validateHabitTitle, validateHabitCue, sanitizeText } from '../utils/validation';
import { VALIDATION } from '../src/constants/app';

type FocusAttributeKey = 'PH' | 'CO' | 'EM' | 'SO';

const FOCUS_ATTRIBUTES: { key: FocusAttributeKey; label: string; emoji: string }[] = [
  { key: 'PH', label: 'Physical', emoji: '\u{1F4AA}' },
  { key: 'CO', label: 'Cognitive', emoji: '\u{1F9E0}' },
  { key: 'EM', label: 'Heart', emoji: '\u{2764}\u{FE0F}' },
  { key: 'SO', label: 'Soul', emoji: '\u{1F30C}' },
];

interface AddHabitModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, cue?: string, focusAttribute?: string) => void;
}

export const AddHabitModal: React.FC<AddHabitModalProps> = ({ visible, onClose, onAdd }) => {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [cue, setCue] = useState('');
  const [focusAttribute, setFocusAttribute] = useState<FocusAttributeKey>('CO');
  const [errors, setErrors] = useState({ title: '', cue: '' });

  const handleAdd = () => {
    // Clear previous errors
    setErrors({ title: '', cue: '' });

    // Validate title
    const titleValidation = validateHabitTitle(title);
    if (!titleValidation.isValid) {
      setErrors(prev => ({ ...prev, title: titleValidation.error || '' }));
      return;
    }

    // Validate cue (optional field)
    const cueValidation = validateHabitCue(cue);
    if (!cueValidation.isValid) {
      setErrors(prev => ({ ...prev, cue: cueValidation.error || '' }));
      return;
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizeText(title);
    const sanitizedCue = cue.trim() ? sanitizeText(cue) : undefined;

    // Call parent handler
    onAdd(sanitizedTitle, sanitizedCue, focusAttribute);

    // Reset form
    setTitle('');
    setCue('');
    setFocusAttribute('CO');
    setErrors({ title: '', cue: '' });
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setCue('');
    setFocusAttribute('CO');
    setErrors({ title: '', cue: '' });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <GlassCard style={{ width: '100%', maxWidth: 400 }}>
          <Text style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 20,
            textAlign: 'center',
          }}>
            Track a new ritual
          </Text>

          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
            Habit name
          </Text>
          <TextInput
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
            }}
            placeholder="What habit do you want to build?"
            placeholderTextColor={colors.textSecondary}
            maxLength={VALIDATION.HABIT_TITLE_MAX}
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: errors.title ? '#EF4444' : colors.primary,
              borderRadius: 8,
              padding: 12,
              color: colors.text,
              marginBottom: errors.title ? 4 : 16,
            }}
          />
          {errors.title ? (
            <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>
              {errors.title}
            </Text>
          ) : null}

          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
            When, where, or why? (optional cue)
          </Text>
          <TextInput
            value={cue}
            onChangeText={(text) => {
              setCue(text);
              if (errors.cue) setErrors(prev => ({ ...prev, cue: '' }));
            }}
            placeholder="e.g., After morning coffee, Before bed"
            placeholderTextColor={colors.textSecondary}
            maxLength={VALIDATION.HABIT_CUE_MAX}
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: errors.cue ? '#EF4444' : colors.primary,
              borderRadius: 8,
              padding: 12,
              color: colors.text,
              marginBottom: errors.cue ? 4 : 16,
            }}
          />
          {errors.cue ? (
            <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>
              {errors.cue}
            </Text>
          ) : null}

          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
            Attribute focus
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {FOCUS_ATTRIBUTES.map(attr => (
              <Pressable
                key={attr.key}
                onPress={() => setFocusAttribute(attr.key)}
                style={{
                  backgroundColor: focusAttribute === attr.key ? colors.primary : colors.cardBackground,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.primary,
                }}
              >
                <Text style={{
                  color: focusAttribute === attr.key ? colors.background : colors.text,
                  fontSize: 12,
                  fontWeight: '600',
                }}>
                  {attr.emoji} {attr.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={handleClose}
              style={{
                flex: 1,
                backgroundColor: colors.cardBackground,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleAdd}
              disabled={!title.trim()}
              style={{
                flex: 1,
                backgroundColor: !title.trim() ? colors.cardBackground : colors.primary,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                opacity: !title.trim() ? 0.5 : 1,
              }}
            >
              <Text style={{
                color: !title.trim() ? colors.textSecondary : colors.background,
                fontWeight: '600'
              }}>
                Add habit
              </Text>
            </Pressable>
          </View>

          <Text style={{
            color: colors.textSecondary,
            fontSize: 12,
            textAlign: 'center',
            marginTop: 12,
          }}>
            Progress resets each morning - keep your streak alive.
          </Text>
        </GlassCard>
      </View>
    </Modal>
  );
};

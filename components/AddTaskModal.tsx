import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal } from 'react-native';
import { useTheme } from './ThemeProvider';
import { GlassCard } from './GlassCard';
import { validateTaskTitle, validateNotes, sanitizeText } from '../utils/validation';
import { REWARDS, VALIDATION } from '../src/constants/app';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, notes?: string) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ visible, onClose, onAdd }) => {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({ title: '', notes: '' });

  const handleAdd = () => {
    // Clear previous errors
    setErrors({ title: '', notes: '' });

    // Validate title
    const titleValidation = validateTaskTitle(title);
    if (!titleValidation.isValid) {
      setErrors(prev => ({ ...prev, title: titleValidation.error || '' }));
      return;
    }

    // Validate notes (optional field)
    const notesValidation = validateNotes(notes);
    if (!notesValidation.isValid) {
      setErrors(prev => ({ ...prev, notes: notesValidation.error || '' }));
      return;
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizeText(title);
    const sanitizedNotes = notes.trim() ? sanitizeText(notes) : undefined;

    // Call parent handler
    onAdd(sanitizedTitle, sanitizedNotes);

    // Reset form
    setTitle('');
    setNotes('');
    setErrors({ title: '', notes: '' });
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setNotes('');
    setErrors({ title: '', notes: '' });
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
            Add a new quest
          </Text>

          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
            What needs your attention?
          </Text>
          <TextInput
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              // Clear error when user starts typing
              if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
            }}
            placeholder="Enter task title..."
            placeholderTextColor={colors.textSecondary}
            maxLength={VALIDATION.TASK_TITLE_MAX}
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
            Add notes, steps, or context (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={(text) => {
              setNotes(text);
              // Clear error when user starts typing
              if (errors.notes) setErrors(prev => ({ ...prev, notes: '' }));
            }}
            placeholder="Add any additional details..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            maxLength={VALIDATION.TASK_NOTES_MAX}
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: errors.notes ? '#EF4444' : colors.primary,
              borderRadius: 8,
              padding: 12,
              color: colors.text,
              marginBottom: errors.notes ? 4 : 20,
              textAlignVertical: 'top',
            }}
          />
          {errors.notes ? (
            <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 16 }}>
              {errors.notes}
            </Text>
          ) : null}

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
                Add quest
              </Text>
            </Pressable>
          </View>

          <View style={{
            position: 'absolute',
            top: 16,
            right: 16,
            backgroundColor: colors.warning,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
          }}>
            <Text style={{ color: colors.background, fontSize: 12, fontWeight: '600' }}>
              +{REWARDS.TASK_ADD} coins
            </Text>
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
};

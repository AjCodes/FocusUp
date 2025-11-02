import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View, Text, TextInput, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeProvider';
import { GlassCard } from './GlassCard';
import { sanitizeText, validateDescription, validateTaskTitle } from '../utils/validation';

export interface TaskDraft {
  title: string;
  description?: string;
  deadline_at?: string | null;
}

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: TaskDraft) => void;
  initialValues?: Partial<TaskDraft>;
  editMode?: boolean;
}

const initialState: TaskDraft = {
  title: '',
  description: '',
  deadline_at: null,
};

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialValues,
  editMode = false,
}) => {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<TaskDraft>(initialState);
  const [errors, setErrors] = useState<{ title?: string; description?: string; deadline_at?: string }>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (visible) {
      const deadlineDate = initialValues?.deadline_at ? new Date(initialValues.deadline_at) : null;
      setDraft({
        title: initialValues?.title ?? '',
        description: initialValues?.description ?? '',
        deadline_at: initialValues?.deadline_at ?? null,
      });
      setSelectedDate(deadlineDate);
      setErrors({});
    }
  }, [visible, initialValues]);

  const resetAndClose = () => {
    setDraft(initialState);
    setSelectedDate(null);
    setShowDatePicker(false);
    setErrors({});
    onClose();
  };

  const handleChange = (key: keyof TaskDraft, value: string) => {
    setDraft(prev => ({
      ...prev,
      [key]: value,
    }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      setDraft(prev => ({
        ...prev,
        deadline_at: date.toISOString(),
      }));
      setErrors(prev => ({ ...prev, deadline_at: undefined }));
    }
  };

  const clearDeadline = () => {
    setSelectedDate(null);
    setDraft(prev => ({ ...prev, deadline_at: null }));
  };

  const formatDeadlineDisplay = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateStr = date.toDateString();
    if (dateStr === today.toDateString()) return 'Today';
    if (dateStr === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const handleSubmit = () => {
    const nextErrors: typeof errors = {};

    const titleValidation = validateTaskTitle(draft.title);
    if (!titleValidation.isValid) {
      nextErrors.title = titleValidation.error;
    }

    const descriptionValidation = validateDescription(draft.description ?? '');
    if (!descriptionValidation.isValid) {
      nextErrors.description = descriptionValidation.error;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      title: sanitizeText(draft.title),
      description: draft.description?.trim() ? sanitizeText(draft.description) : undefined,
      deadline_at: draft.deadline_at,
    });
    resetAndClose();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={resetAndClose}
    >
      <Pressable style={styles.backdrop} onPress={resetAndClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <GlassCard style={styles.card} padding={24}>
              <Text style={[styles.heading, { color: colors.text }]}>
                {editMode ? 'Edit Quest' : 'Capture a new quest'}
              </Text>
              <Text style={{ color: colors.textSecondary, marginBottom: 18 }}>
                {editMode ? 'Update your quest details below.' : 'Keep it short and vivid. Add a deadline if it keeps you accountable.'}
              </Text>

              <FieldLabel color={colors.text}>What needs your attention?</FieldLabel>
              <TextInput
                value={draft.title}
                onChangeText={value => handleChange('title', value)}
                placeholder="e.g. Submit assignment"
                placeholderTextColor={colors.textSecondary}
                maxLength={200}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.cardBackground,
                    borderColor: errors.title ? '#EF4444' : colors.primary + '66',
                  },
                ]}
              />
              {errors.title ? <ErrorText message={errors.title} /> : null}

              <FieldLabel color={colors.textSecondary}>Task description</FieldLabel>
              <TextInput
                value={draft.description ?? ''}
                onChangeText={value => handleChange('description', value)}
                placeholder="Add quick steps, context, or a reminder..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                style={[
                  styles.input,
                  styles.multiline,
                  {
                    color: colors.text,
                    backgroundColor: colors.cardBackground,
                    borderColor: errors.description ? '#EF4444' : colors.primary + '66',
                  },
                ]}
              />
              {errors.description ? <ErrorText message={errors.description} /> : null}

              <FieldLabel color={colors.textSecondary}>Deadline (optional)</FieldLabel>
              {selectedDate ? (
                <View style={styles.deadlineSelected}>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={[
                      styles.deadlineButton,
                      { backgroundColor: colors.cardBackground, borderColor: colors.primary + '66' }
                    ]}
                  >
                    <Ionicons name="calendar" size={18} color={colors.primary} />
                    <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>
                      {formatDeadlineDisplay(selectedDate)}
                    </Text>
                  </Pressable>
                  <Pressable onPress={clearDeadline} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={[
                    styles.deadlineButton,
                    { backgroundColor: colors.cardBackground, borderColor: colors.primary + '33' }
                  ]}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, flex: 1 }}>
                    Set a deadline
                  </Text>
                </Pressable>
              )}
              {errors.deadline_at ? <ErrorText message={errors.deadline_at} /> : null}

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  themeVariant="dark"
                />
              )}

              <View style={styles.actions}>
                <Pressable
                  onPress={resetAndClose}
                  style={[
                    styles.secondaryAction,
                    { borderColor: colors.primary + '55', backgroundColor: colors.cardBackground },
                  ]}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>Close</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  style={[
                    styles.primaryAction,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={{ color: colors.background, fontWeight: '700' }}>
                    {editMode ? 'Update quest' : 'Save quest'}
                  </Text>
                </Pressable>
              </View>
            </GlassCard>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const FieldLabel: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <Text style={{ color, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>{children}</Text>
);

const ErrorText: React.FC<{ message?: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>
      {message}
    </Text>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,10,25,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: 400,
    maxWidth: '100%',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  deadlineSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  deadlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flex: 1,
  },
  clearButton: {
    padding: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  secondaryAction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryAction: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
});

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { GlassCard } from './GlassCard';
import { validateHabitTitle, validateHabitCue, sanitizeText } from '../utils/validation';
import { VALIDATION } from '../src/constants/app';
import { Ionicons } from '@expo/vector-icons';

type FocusAttributeKey = 'PH' | 'CO' | 'EM' | 'SO';

const FOCUS_ATTRIBUTES: { key: FocusAttributeKey; label: string; emoji: string }[] = [
  { key: 'PH', label: 'Physical', emoji: '\u{1F4AA}' },
  { key: 'CO', label: 'Cognitive', emoji: '\u{1F9E0}' },
  { key: 'EM', label: 'Heart', emoji: '\u{2764}\u{FE0F}' },
  { key: 'SO', label: 'Soul', emoji: '\u{1F30C}' },
];

interface Habit {
  id: string;
  title: string;
  cue?: string;
  done?: boolean;
  focusAttribute?: string;
}

interface AddHabitModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, cue?: string, focusAttribute?: string) => void;
  onSelect?: (habit: Habit) => void;
  existingHabits?: Habit[];
}

export const AddHabitModal: React.FC<AddHabitModalProps> = ({
  visible,
  onClose,
  onAdd,
  onSelect,
  existingHabits = []
}) => {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [cue, setCue] = useState('');
  const [focusAttribute, setFocusAttribute] = useState<FocusAttributeKey>('CO');
  const [errors, setErrors] = useState({ title: '', cue: '' });
  const [activeTab, setActiveTab] = useState<'select' | 'create'>('select');

  // Filter out completed habits and show only incomplete ones
  const incompleteHabits = existingHabits.filter(habit => !habit.done);

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
    setActiveTab('select');
    onClose();
  };

  const handleSelectHabit = (habit: Habit) => {
    if (onSelect) {
      onSelect(habit);
    }
    handleClose();
  };

  const getAttributeColor = (key?: string) => {
    switch (key) {
      case 'PH': return '#10B981';
      case 'CO': return '#3B82F6';
      case 'EM': return '#EF4444';
      case 'SO': return '#8B5CF6';
      default: return colors.textSecondary;
    }
  };

  const getAttributeEmoji = (key?: string) => {
    const attr = FOCUS_ATTRIBUTES.find(a => a.key === key);
    return attr?.emoji || '🔹';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
        onPress={handleClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <GlassCard style={{ width: 400, maxWidth: '100%' }}>
          <Text style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 16,
            textAlign: 'center',
          }}>
            Link a Ritual
          </Text>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <Pressable
              onPress={() => setActiveTab('select')}
              style={[
                styles.tab,
                activeTab === 'select' && { backgroundColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === 'select' ? colors.background : colors.textSecondary }
              ]}>
                Select Existing
              </Text>
              {incompleteHabits.length > 0 && (
                <View style={[styles.badge, { backgroundColor: activeTab === 'select' ? colors.background : colors.primary }]}>
                  <Text style={[styles.badgeText, { color: activeTab === 'select' ? colors.primary : colors.background }]}>
                    {incompleteHabits.length}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('create')}
              style={[
                styles.tab,
                activeTab === 'create' && { backgroundColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === 'create' ? colors.background : colors.textSecondary }
              ]}>
                Create New
              </Text>
            </Pressable>
          </View>

          {/* Select Existing Tab */}
          {activeTab === 'select' && (
            <View>
              {incompleteHabits.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="fitness-outline" size={48} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                    No habits available
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                    Create a new habit or add some from the Habits tab
                  </Text>
                  <Pressable
                    onPress={() => setActiveTab('create')}
                    style={{ marginTop: 16, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: 8 }}
                  >
                    <Text style={{ color: colors.background, fontWeight: '600' }}>Create New Habit</Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  <ScrollView style={styles.habitList} showsVerticalScrollIndicator={false}>
                    {incompleteHabits.map((habit) => (
                      <Pressable
                        key={habit.id}
                        onPress={() => handleSelectHabit(habit)}
                        style={({ pressed }) => [
                          styles.habitItem,
                          {
                            backgroundColor: pressed ? colors.primary + '20' : colors.cardBackground,
                            borderColor: colors.primary + '40',
                          }
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <View style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: getAttributeColor(habit.focusAttribute),
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginRight: 8
                            }}>
                              <Text style={{ fontSize: 12 }}>{getAttributeEmoji(habit.focusAttribute)}</Text>
                            </View>
                            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 }}>
                              {habit.title}
                            </Text>
                          </View>
                          {habit.cue && (
                            <Text
                              style={{ color: colors.textSecondary, fontSize: 12 }}
                              numberOfLines={1}
                            >
                              {habit.cue}
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Pressable
                onPress={handleClose}
                style={{
                  backgroundColor: colors.cardBackground,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginTop: 16,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
            </View>
          )}

          {/* Create New Tab */}
          {activeTab === 'create' && (
            <View>

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

            </View>
          )}
        </GlassCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  habitList: {
    maxHeight: 300,
    marginBottom: 8,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
});

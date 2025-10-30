import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { GlassCard } from './GlassCard';
import { validateTaskTitle, validateNotes, sanitizeText } from '../utils/validation';
import { REWARDS, VALIDATION } from '../src/constants/app';
import { Ionicons } from '@expo/vector-icons';

interface Task {
  id: string;
  title: string;
  notes?: string;
  done?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, notes?: string) => void;
  onSelect?: (task: Task) => void;
  existingTasks?: Task[];
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  visible,
  onClose,
  onAdd,
  onSelect,
  existingTasks = []
}) => {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({ title: '', notes: '' });
  const [activeTab, setActiveTab] = useState<'select' | 'create'>('select');

  // Filter out completed tasks and show only incomplete ones
  const incompleteTasks = existingTasks.filter(task => !task.done);

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
    setActiveTab('select');
    onClose();
  };

  const handleSelectTask = (task: Task) => {
    if (onSelect) {
      onSelect(task);
    }
    handleClose();
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return colors.textSecondary;
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'high': return 'arrow-up-circle';
      case 'medium': return 'remove-circle';
      case 'low': return 'arrow-down-circle';
      default: return 'ellipse-outline';
    }
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
            Link a Quest
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
              {incompleteTasks.length > 0 && (
                <View style={[styles.badge, { backgroundColor: activeTab === 'select' ? colors.background : colors.primary }]}>
                  <Text style={[styles.badgeText, { color: activeTab === 'select' ? colors.primary : colors.background }]}>
                    {incompleteTasks.length}
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
              {incompleteTasks.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="clipboard-outline" size={48} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                    No tasks available
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                    Create a new task or add some from the Tasks tab
                  </Text>
                  <Pressable
                    onPress={() => setActiveTab('create')}
                    style={{ marginTop: 16, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: 8 }}
                  >
                    <Text style={{ color: colors.background, fontWeight: '600' }}>Create New Task</Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
                  {incompleteTasks.map((task) => (
                    <Pressable
                      key={task.id}
                      onPress={() => handleSelectTask(task)}
                      style={({ pressed }) => [
                        styles.taskItem,
                        {
                          backgroundColor: pressed ? colors.primary + '20' : colors.cardBackground,
                          borderColor: colors.primary + '40',
                        }
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons
                            name={getPriorityIcon(task.priority) as any}
                            size={16}
                            color={getPriorityColor(task.priority)}
                            style={{ marginRight: 8 }}
                          />
                          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 }}>
                            {task.title}
                          </Text>
                        </View>
                        {task.notes && (
                          <Text
                            style={{ color: colors.textSecondary, fontSize: 12 }}
                            numberOfLines={1}
                          >
                            {task.notes}
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
  taskList: {
    maxHeight: 300,
    marginBottom: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
});

/**
 * Data backup and export functionality
 * Handles cloud backup, local export/import, and storage mode management
 */

import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export const useDataBackup = () => {
  /**
   * Backup data from local to cloud (Supabase)
   */
  const backupToCloud = async (userId: string) => {
    try {
      if (!supabase) {
        return { success: false, message: 'Cloud storage not available' };
      }

      // 1. Get all local data
      const localTasks = await AsyncStorage.getItem(`tasks-${userId}`);
      const localHabits = await AsyncStorage.getItem(`habits-${userId}`);
      const localStats = await AsyncStorage.getItem(`user-stats-${userId}`);

      // 2. Upload to Supabase
      // Parse and insert tasks
      if (localTasks) {
        const tasks = JSON.parse(localTasks);
        if (tasks.length > 0) {
          await supabase.from('tasks').upsert(
            tasks.map((t: any) => ({ ...t, user_id: userId })),
            { onConflict: 'id' }
          );
        }
      }

      // Parse and insert habits
      if (localHabits) {
        const habits = JSON.parse(localHabits);
        if (habits.length > 0) {
          await supabase.from('habits').upsert(
            habits.map((h: any) => ({ ...h, user_id: userId })),
            { onConflict: 'id' }
          );
        }
      }

      // Update user stats
      if (localStats) {
        const stats = JSON.parse(localStats);
        await supabase.from('user_stats').upsert({ ...stats, user_id: userId });
      }

      return { success: true, message: 'Backup complete! ✅' };
    } catch (error) {
      console.error('Backup error:', error);
      return { success: false, message: 'Backup failed. Please try again.' };
    }
  };

  /**
   * Export data as JSON file
   */
  const exportData = async (userId: string) => {
    try {
      // Gather all user data
      const tasks = await AsyncStorage.getItem(`tasks-${userId}`);
      const habits = await AsyncStorage.getItem(`habits-${userId}`);
      const stats = await AsyncStorage.getItem(`user-stats-${userId}`);
      const dailyStats = await AsyncStorage.getItem(`focusup-daily-stats-${userId}`);

      const allData = {
        exportDate: new Date().toISOString(),
        userId,
        tasks: tasks ? JSON.parse(tasks) : [],
        habits: habits ? JSON.parse(habits) : [],
        stats: stats ? JSON.parse(stats) : {},
        dailyStats: dailyStats ? JSON.parse(dailyStats) : {},
      };

      // Create file
      const fileName = `focusup_backup_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(allData, null, 2));

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export FocusUp Data',
        });
      }

      return { success: true, message: 'Data exported successfully! 📤', fileUri };
    } catch (error) {
      console.error('Export error:', error);
      return { success: false, message: 'Export failed. Please try again.' };
    }
  };

  /**
   * Import data from JSON file
   */
  const importData = async (fileUri: string) => {
    try {
      const content = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(content);

      // Restore to AsyncStorage
      if (data.tasks) {
        await AsyncStorage.setItem(`tasks-${data.userId}`, JSON.stringify(data.tasks));
      }
      if (data.habits) {
        await AsyncStorage.setItem(`habits-${data.userId}`, JSON.stringify(data.habits));
      }
      if (data.stats) {
        await AsyncStorage.setItem(`user-stats-${data.userId}`, JSON.stringify(data.stats));
      }
      if (data.dailyStats) {
        await AsyncStorage.setItem(`focusup-daily-stats-${data.userId}`, JSON.stringify(data.dailyStats));
      }

      return { success: true, message: 'Data imported successfully! 📥' };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, message: 'Import failed. Please check the file format.' };
    }
  };

  /**
   * Switch storage mode
   */
  const setStorageMode = async (mode: 'cloud' | 'local', userId: string) => {
    try {
      await AsyncStorage.setItem('storage-mode', mode);

      if (mode === 'cloud' && supabase) {
        // Backup current data to cloud
        await backupToCloud(userId);
      }

      return { success: true, message: `Switched to ${mode} storage` };
    } catch (error) {
      console.error('Storage mode error:', error);
      return { success: false, message: 'Failed to change storage mode' };
    }
  };

  /**
   * Get current storage mode
   */
  const getStorageMode = async (): Promise<'cloud' | 'local'> => {
    try {
      const mode = await AsyncStorage.getItem('storage-mode');
      return (mode as 'cloud' | 'local') || 'local';
    } catch {
      return 'local';
    }
  };

  /**
   * Clear local cache
   */
  const clearLocalCache = async (userId: string) => {
    try {
      // Clear user-specific data
      await AsyncStorage.removeItem(`tasks-${userId}`);
      await AsyncStorage.removeItem(`habits-${userId}`);
      await AsyncStorage.removeItem(`user-stats-${userId}`);
      await AsyncStorage.removeItem(`focusup-daily-stats-${userId}`);

      return { success: true, message: 'Local cache cleared successfully! 🗑️' };
    } catch (error) {
      console.error('Clear cache error:', error);
      return { success: false, message: 'Failed to clear cache' };
    }
  };

  return {
    backupToCloud,
    exportData,
    importData,
    setStorageMode,
    getStorageMode,
    clearLocalCache,
  };
};

import Toast from 'react-native-toast-message';
import { PostgrestError } from '@supabase/supabase-js';

export interface AppError {
  message: string;
  code?: string;
  details?: string;
}

/**
 * Handles Supabase/Postgrest errors and shows user-friendly messages
 */
export const handleSupabaseError = (error: any, context: string = 'Operation'): AppError => {
  console.error(`[${context}]`, error);

  let userMessage = `${context} failed. Please try again.`;
  let details = '';

  if (error?.message) {
    // Postgrest error
    if (error.code === 'PGRST116') {
      userMessage = 'No data found';
    } else if (error.code?.startsWith('23')) {
      // PostgreSQL constraint violations (23xxx codes)
      userMessage = 'This operation violates a database constraint';
      details = error.message;
    } else if (error.message.includes('JWT')) {
      userMessage = 'Authentication error. Please sign in again';
    } else if (error.message.includes('network')) {
      userMessage = 'Network error. Please check your connection';
    } else {
      details = error.message;
    }
  }

  Toast.show({
    type: 'error',
    text1: userMessage,
    text2: details,
    visibilityTime: 4000,
    position: 'top',
  });

  return {
    message: userMessage,
    code: error?.code,
    details: details || error?.message,
  };
};

/**
 * Shows a success message to the user
 */
export const showSuccess = (message: string, subtitle?: string) => {
  Toast.show({
    type: 'success',
    text1: message,
    text2: subtitle,
    visibilityTime: 3000,
    position: 'top',
  });
};

/**
 * Shows an info message to the user
 */
export const showInfo = (message: string, subtitle?: string) => {
  Toast.show({
    type: 'info',
    text1: message,
    text2: subtitle,
    visibilityTime: 3000,
    position: 'top',
  });
};

/**
 * Shows a warning message to the user
 */
export const showWarning = (message: string, subtitle?: string) => {
  Toast.show({
    type: 'error', // Using error type for warnings to get attention
    text1: message,
    text2: subtitle,
    visibilityTime: 3000,
    position: 'top',
  });
};

/**
 * Generic error handler for try-catch blocks
 */
export const handleError = (error: any, context: string = 'Operation'): AppError => {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    const msg = 'Network error. Please check your internet connection';
    Toast.show({
      type: 'error',
      text1: msg,
      visibilityTime: 4000,
      position: 'top',
    });
    return { message: msg };
  }

  // Supabase errors
  if (error?.code || error?.message) {
    return handleSupabaseError(error, context);
  }

  // Unknown errors
  console.error(`[${context}] Unknown error:`, error);
  const msg = `${context} failed unexpectedly`;
  Toast.show({
    type: 'error',
    text1: msg,
    text2: 'Please try again',
    visibilityTime: 4000,
    position: 'top',
  });

  return { message: msg };
};

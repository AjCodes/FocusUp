/**
 * Input validation utilities for FocusUp
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates text input (tasks, habits, etc.)
 */
export const validateText = (
  value: string,
  fieldName: string = 'This field',
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
  } = {}
): ValidationResult => {
  const {
    required = true,
    minLength = 1,
    maxLength = 500,
    pattern,
    patternMessage,
  } = options;

  // Trim the value
  const trimmed = value.trim();

  // Check if required
  if (required && !trimmed) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  // Check minimum length
  if (trimmed && trimmed.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} character${minLength > 1 ? 's' : ''}`,
    };
  }

  // Check maximum length
  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must be less than ${maxLength} characters`,
    };
  }

  // Check pattern
  if (pattern && trimmed && !pattern.test(trimmed)) {
    return {
      isValid: false,
      error: patternMessage || `${fieldName} format is invalid`,
    };
  }

  return { isValid: true };
};

/**
 * Validates task title
 */
export const validateTaskTitle = (title: string): ValidationResult => {
  return validateText(title, 'Task title', {
    required: true,
    minLength: 1,
    maxLength: 200,
  });
};

/**
 * Validates habit title
 */
export const validateHabitTitle = (title: string): ValidationResult => {
  return validateText(title, 'Habit title', {
    required: true,
    minLength: 1,
    maxLength: 200,
  });
};

/**
 * Validates habit cue (optional field)
 */
export const validateHabitCue = (cue: string): ValidationResult => {
  if (!cue || !cue.trim()) {
    return { isValid: true }; // Cue is optional
  }

  return validateText(cue, 'Habit cue', {
    required: false,
    minLength: 1,
    maxLength: 500,
  });
};

/**
 * Validates notes field
 */
export const validateNotes = (notes: string): ValidationResult => {
  if (!notes || !notes.trim()) {
    return { isValid: true }; // Notes are optional
  }

  return validateText(notes, 'Notes', {
    required: false,
    minLength: 1,
    maxLength: 1000,
  });
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return validateText(email, 'Email', {
    required: true,
    minLength: 3,
    maxLength: 254,
    pattern: emailRegex,
    patternMessage: 'Please enter a valid email address',
  });
};

/**
 * Validates timer duration (in seconds)
 */
export const validateTimerDuration = (
  seconds: number,
  fieldName: string = 'Duration'
): ValidationResult => {
  const MIN_SECONDS = 60; // 1 minute
  const MAX_SECONDS = 3600; // 60 minutes

  if (isNaN(seconds)) {
    return {
      isValid: false,
      error: `${fieldName} must be a number`,
    };
  }

  if (seconds < MIN_SECONDS) {
    return {
      isValid: false,
      error: `${fieldName} must be at least 1 minute`,
    };
  }

  if (seconds > MAX_SECONDS) {
    return {
      isValid: false,
      error: `${fieldName} must be less than 60 minutes`,
    };
  }

  return { isValid: true };
};

/**
 * Validates that a value is one of the allowed options
 */
export const validateEnum = <T extends string>(
  value: T,
  allowedValues: T[],
  fieldName: string = 'Value'
): ValidationResult => {
  if (!allowedValues.includes(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
    };
  }

  return { isValid: true };
};

/**
 * Sanitizes text input by trimming and removing excessive whitespace
 */
export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[\n\r]+/g, '\n'); // Normalize line breaks
};

/**
 * Validates multiple fields at once
 */
export const validateFields = (
  validators: Array<() => ValidationResult>
): ValidationResult => {
  for (const validator of validators) {
    const result = validator();
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true };
};

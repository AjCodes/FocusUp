import { useState, useCallback } from 'react';

interface UseLoadingReturn {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  withLoading: <T>(promise: Promise<T>) => Promise<T>;
}

/**
 * Hook to manage loading states for async operations
 *
 * Usage:
 * const { loading, withLoading } = useLoading();
 *
 * const handleSubmit = async () => {
 *   await withLoading(apiCall());
 * };
 */
export const useLoading = (initialState: boolean = false): UseLoadingReturn => {
  const [loading, setLoading] = useState(initialState);

  const withLoading = useCallback(async <T,>(promise: Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      const result = await promise;
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    setLoading,
    withLoading,
  };
};

/**
 * Hook to manage multiple loading states
 *
 * Usage:
 * const { loading, startLoading, stopLoading } = useMultiLoading();
 *
 * const load1 = async () => {
 *   startLoading('tasks');
 *   await fetchTasks();
 *   stopLoading('tasks');
 * };
 */
export const useMultiLoading = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const startLoading = useCallback((key: string) => {
    setLoadingStates(prev => ({ ...prev, [key]: true }));
  }, []);

  const stopLoading = useCallback((key: string) => {
    setLoadingStates(prev => ({ ...prev, [key]: false }));
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(loading => loading);
  }, [loadingStates]);

  return {
    loading: loadingStates,
    startLoading,
    stopLoading,
    isLoading,
    isAnyLoading,
  };
};

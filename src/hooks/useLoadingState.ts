import { useState, useCallback, useRef, useEffect } from 'react';

interface LoadingState {
  isLoading: boolean;
  progress: number;
  message?: string;
  error?: Error | null;
}

interface UseLoadingStateOptions {
  initialMessage?: string;
  showProgress?: boolean;
  minLoadingTime?: number;
  maxLoadingTime?: number;
}

export function useLoadingState(options: UseLoadingStateOptions = {}) {
  const {
    initialMessage = '',
    showProgress = false,
    minLoadingTime = 0,
    maxLoadingTime = 30000, // 30 seconds timeout
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    message: initialMessage,
    error: null,
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();

  const startLoading = useCallback((message?: string) => {
    setState({
      isLoading: true,
      progress: 0,
      message: message || initialMessage,
      error: null,
    });
    startTimeRef.current = Date.now();

    // Set a timeout for max loading time
    if (maxLoadingTime > 0) {
      timeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: new Error('Operation timed out'),
        }));
      }, maxLoadingTime);
    }
  }, [initialMessage, maxLoadingTime]);

  const updateProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress: Math.min(Math.max(progress, 0), 100),
      message: message || prev.message,
    }));
  }, []);

  const stopLoading = useCallback(async (error?: Error | null) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Ensure minimum loading time for better UX
    if (minLoadingTime > 0 && startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = minLoadingTime - elapsed;
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      progress: error ? prev.progress : 100,
      error,
    }));
  }, [minLoadingTime]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState({
      isLoading: false,
      progress: 0,
      message: initialMessage,
      error: null,
    });
  }, [initialMessage]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startLoading,
    updateProgress,
    stopLoading,
    reset,
  };
}

// Hook for async operations with loading states
export function useAsyncOperation<T = any>(
  operation: (...args: any[]) => Promise<T>,
  options: UseLoadingStateOptions = {}
) {
  const loading = useLoadingState(options);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (...args: any[]) => {
    loading.startLoading();
    try {
      const result = await operation(...args);
      setData(result);
      await loading.stopLoading();
      return result;
    } catch (error) {
      await loading.stopLoading(error as Error);
      throw error;
    }
  }, [operation, loading]);

  return {
    execute,
    data,
    ...loading,
  };
}

// Hook for file upload with progress tracking
export function useFileUpload(
  uploadFunction: (file: File, onProgress?: (progress: number) => void) => Promise<any>
) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const result = await uploadFunction(file, (progress) => {
        setUploadProgress(progress);
      });
      setUploadProgress(100);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [uploadFunction]);

  const reset = useCallback(() => {
    setUploadProgress(0);
    setIsUploading(false);
    setError(null);
  }, []);

  return {
    upload,
    uploadProgress,
    isUploading,
    error,
    reset,
  };
}

// Hook for multi-step loading operations
export function useMultiStepLoading(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [stepMessages, setStepMessages] = useState<string[]>([]);

  const progress = (currentStep / totalSteps) * 100;

  const startStep = useCallback((stepIndex: number, message: string) => {
    setCurrentStep(stepIndex);
    setStepMessages(prev => {
      const messages = [...prev];
      messages[stepIndex] = message;
      return messages;
    });
    setIsLoading(true);
  }, []);

  const completeStep = useCallback((stepIndex: number) => {
    setCurrentStep(prev => Math.max(prev, stepIndex + 1));
  }, []);

  const complete = useCallback(() => {
    setCurrentStep(totalSteps);
    setIsLoading(false);
  }, [totalSteps]);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setIsLoading(false);
    setStepMessages([]);
  }, []);

  return {
    currentStep,
    totalSteps,
    progress,
    isLoading,
    stepMessages,
    startStep,
    completeStep,
    complete,
    reset,
  };
}

// Hook for debounced loading states (useful for search/autocomplete)
export function useDebouncedLoading(delay: number = 300) {
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const startLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsLoading(true);
    }, delay);
  }, [delay]);

  const stopLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
  };
}
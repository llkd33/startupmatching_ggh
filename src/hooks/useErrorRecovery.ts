'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from '@/components/ui/toast-custom'
import { AppError, ErrorCategory, retryWithBackoff } from '@/lib/error-handler'

interface ErrorRecoveryOptions {
  maxRetries?: number
  retryDelay?: number
  onError?: (error: Error) => void
  onRecovery?: () => void
  autoRetry?: boolean
  retryCondition?: (error: Error, attempt: number) => boolean
}

interface ErrorRecoveryState {
  error: Error | null
  isRetrying: boolean
  retryCount: number
  canRetry: boolean
  lastRetryTime: number | null
}

export function useErrorRecovery(options: ErrorRecoveryOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRecovery,
    autoRetry = false,
    retryCondition = (error) => {
      if (error instanceof AppError) {
        return error.retry
      }
      return error.message.includes('network') || error.message.includes('fetch')
    }
  } = options

  const [state, setState] = useState<ErrorRecoveryState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    canRetry: false,
    lastRetryTime: null
  })

  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const lastOperationRef = useRef<(() => Promise<any>) | null>(null)

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  const handleError = useCallback((error: Error, operation?: () => Promise<any>) => {
    const canRetryError = retryCondition(error, 0) && state.retryCount < maxRetries
    
    setState(prev => ({
      ...prev,
      error,
      canRetry: canRetryError,
      lastRetryTime: null
    }))

    // Store the operation for potential retry
    if (operation) {
      lastOperationRef.current = operation
    }

    // Call error callback
    onError?.(error)

    // Auto-retry if enabled and conditions are met
    if (autoRetry && canRetryError) {
      retryTimeoutRef.current = setTimeout(() => {
        retry()
      }, retryDelay)
    }

    // Log error
    console.error('Error caught by recovery hook:', error)
  }, [state.retryCount, maxRetries, retryCondition, onError, autoRetry, retryDelay])

  const retry = useCallback(async () => {
    if (!state.canRetry || state.isRetrying || !lastOperationRef.current) {
      return false
    }

    setState(prev => ({
      ...prev,
      isRetrying: true,
      lastRetryTime: Date.now()
    }))

    try {
      await retryWithBackoff(lastOperationRef.current, {
        maxAttempts: 1, // We handle the retry logic here
        initialDelay: retryDelay,
        shouldRetry: () => false // Don't let retryWithBackoff handle retries
      })

      // Success - clear error state
      setState(prev => ({
        ...prev,
        error: null,
        isRetrying: false,
        retryCount: 0,
        canRetry: false,
        lastRetryTime: null
      }))

      onRecovery?.()
      toast.success('Operation completed successfully')
      return true

    } catch (retryError) {
      const newRetryCount = state.retryCount + 1
      const canRetryAgain = retryCondition(retryError as Error, newRetryCount) && newRetryCount < maxRetries

      setState(prev => ({
        ...prev,
        error: retryError as Error,
        isRetrying: false,
        retryCount: newRetryCount,
        canRetry: canRetryAgain,
        lastRetryTime: Date.now()
      }))

      if (newRetryCount >= maxRetries) {
        toast.error('Maximum retry attempts reached. Please try again later.')
      } else if (canRetryAgain && autoRetry) {
        // Schedule next auto-retry with exponential backoff
        const nextDelay = retryDelay * Math.pow(2, newRetryCount)
        retryTimeoutRef.current = setTimeout(() => {
          retry()
        }, nextDelay)
      }

      return false
    }
  }, [state.canRetry, state.isRetrying, state.retryCount, maxRetries, retryDelay, retryCondition, onRecovery, autoRetry])

  const reset = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }

    setState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      canRetry: false,
      lastRetryTime: null
    })

    lastOperationRef.current = null
  }, [])

  const executeWithRecovery = useCallback(async <T>(
    operation: () => Promise<T>,
    customOptions?: Partial<ErrorRecoveryOptions>
  ): Promise<T | null> => {
    const effectiveOptions = { ...options, ...customOptions }
    
    try {
      const result = await operation()
      
      // Clear any previous error state on success
      if (state.error) {
        reset()
      }
      
      return result
    } catch (error) {
      handleError(error as Error, operation)
      
      // If auto-retry is enabled, wait for the retry to complete
      if (effectiveOptions.autoRetry && retryCondition(error as Error, 0)) {
        // Return null for now, the retry will happen automatically
        return null
      }
      
      throw error
    }
  }, [options, state.error, reset, handleError, retryCondition])

  return {
    // State
    error: state.error,
    isRetrying: state.isRetrying,
    retryCount: state.retryCount,
    canRetry: state.canRetry,
    lastRetryTime: state.lastRetryTime,
    
    // Actions
    handleError,
    retry,
    reset,
    executeWithRecovery,
    
    // Computed values
    hasError: state.error !== null,
    isRecoverable: state.canRetry,
    nextRetryIn: state.lastRetryTime && autoRetry && state.canRetry 
      ? Math.max(0, (retryDelay * Math.pow(2, state.retryCount)) - (Date.now() - state.lastRetryTime))
      : null
  }
}

// Hook for component-level error boundaries
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null)

  const resetError = useCallback(() => {
    setError(null)
  }, [])

  const captureError = useCallback((error: Error) => {
    setError(error)
  }, [])

  // Throw error to trigger error boundary
  if (error) {
    throw error
  }

  return {
    captureError,
    resetError
  }
}

// Hook for global error handling
export function useGlobalErrorHandler() {
  const recovery = useErrorRecovery({
    maxRetries: 3,
    autoRetry: false,
    onError: (error) => {
      // Log to error reporting service
      console.error('Global error:', error)
      
      // Show appropriate toast based on error type
      if (error instanceof AppError) {
        switch (error.category) {
          case ErrorCategory.NETWORK:
            toast.error('Connection problem. Please check your internet and try again.')
            break
          case ErrorCategory.DATABASE:
            toast.error('Database error. Our team has been notified.')
            break
          case ErrorCategory.AUTHENTICATION:
            toast.error('Authentication required. Please sign in.')
            break
          default:
            toast.error(error.message)
        }
      } else {
        toast.error('An unexpected error occurred.')
      }
    },
    onRecovery: () => {
      toast.success('Error resolved successfully!')
    }
  })

  // Set up global error listeners
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      recovery.handleError(new Error(event.reason))
      event.preventDefault()
    }

    const handleError = (event: ErrorEvent) => {
      recovery.handleError(new Error(event.message))
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [recovery])

  return recovery
}
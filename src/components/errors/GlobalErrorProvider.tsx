'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { toast } from '@/components/ui/toast-custom'
import { AppError, ErrorCategory, setupGlobalErrorHandlers } from '@/lib/error-handler'
import { useErrorRecovery } from '@/hooks/useErrorRecovery'

interface GlobalErrorContextType {
  reportError: (error: Error, context?: Record<string, any>) => void
  clearErrors: () => void
  errors: Error[]
  isRecovering: boolean
  canRetry: boolean
  retry: () => Promise<boolean>
}

const GlobalErrorContext = createContext<GlobalErrorContextType | null>(null)

export function useGlobalError() {
  const context = useContext(GlobalErrorContext)
  if (!context) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider')
  }
  return context
}

interface GlobalErrorProviderProps {
  children: React.ReactNode
  enableGlobalHandlers?: boolean
  maxErrors?: number
}

export function GlobalErrorProvider({ 
  children, 
  enableGlobalHandlers = true,
  maxErrors = 10
}: GlobalErrorProviderProps) {
  const [errors, setErrors] = useState<Error[]>([])
  
  const recovery = useErrorRecovery({
    maxRetries: 3,
    autoRetry: false,
    onError: (error) => {
      // Add to error list
      setErrors(prev => {
        const newErrors = [error, ...prev].slice(0, maxErrors)
        return newErrors
      })

      // Show appropriate toast based on error type
      if (error instanceof AppError) {
        switch (error.category) {
          case ErrorCategory.NETWORK:
            toast.error('Connection problem detected', 'Please check your internet connection')
            break
          case ErrorCategory.DATABASE:
            toast.error('Database error occurred', 'Our team has been notified')
            break
          case ErrorCategory.AUTHENTICATION:
            toast.error('Authentication required', 'Please sign in to continue')
            break
          case ErrorCategory.AUTHORIZATION:
            toast.error('Access denied', 'You don\'t have permission for this action')
            break
          default:
            toast.error(error.message)
        }
      } else {
        toast.error('An unexpected error occurred', 'Please try again or contact support')
      }
    },
    onRecovery: () => {
      toast.success('Error resolved successfully!')
    }
  })

  const reportError = (error: Error, context?: Record<string, any>) => {
    // Enhance error with context
    if (context && error instanceof AppError) {
      error.details = { ...error.details, ...context }
    }

    recovery.handleError(error)

    // Log to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to Sentry or other error reporting service
      console.error('Global error reported:', {
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }
  }

  const clearErrors = () => {
    setErrors([])
    recovery.reset()
  }

  // Set up global error handlers
  useEffect(() => {
    if (!enableGlobalHandlers) return

    // Set up global error handlers from error-handler.ts
    setupGlobalErrorHandlers()

    // Additional unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason))
      
      reportError(error, { type: 'unhandled-promise-rejection' })
      event.preventDefault()
    }

    // Additional global error handler
    const handleGlobalError = (event: ErrorEvent) => {
      const error = new Error(event.message)
      error.stack = `${event.filename}:${event.lineno}:${event.colno}`
      
      reportError(error, { 
        type: 'global-error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    }

    // Network status change handler
    const handleOnline = () => {
      toast.success('Connection restored!')
      // Retry any pending network operations
      if (recovery.canRetry && recovery.error instanceof AppError && 
          recovery.error.category === ErrorCategory.NETWORK) {
        recovery.retry()
      }
    }

    const handleOffline = () => {
      toast.warning('Connection lost', 'Some features may not work until connection is restored')
    }

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [enableGlobalHandlers, recovery, reportError])

  // Listen for custom error retry events
  useEffect(() => {
    const handleErrorRetry = (event: CustomEvent) => {
      const { error, context } = event.detail
      if (error instanceof AppError && error.retry) {
        recovery.retry()
      }
    }

    window.addEventListener('error-retry', handleErrorRetry as EventListener)
    
    return () => {
      window.removeEventListener('error-retry', handleErrorRetry as EventListener)
    }
  }, [recovery])

  const contextValue: GlobalErrorContextType = {
    reportError,
    clearErrors,
    errors,
    isRecovering: recovery.isRetrying,
    canRetry: recovery.canRetry,
    retry: recovery.retry
  }

  return (
    <GlobalErrorContext.Provider value={contextValue}>
      {children}
    </GlobalErrorContext.Provider>
  )
}

// Hook for reporting errors from components
export function useErrorReporting() {
  const { reportError } = useGlobalError()
  
  return {
    reportError,
    reportNetworkError: (error: Error, context?: Record<string, any>) => {
      reportError(new AppError(error.message, 'NETWORK_ERROR', 0, error, {
        category: ErrorCategory.NETWORK,
        retry: true
      }), context)
    },
    reportDatabaseError: (error: Error, context?: Record<string, any>) => {
      reportError(new AppError(error.message, 'DATABASE_ERROR', 500, error, {
        category: ErrorCategory.DATABASE,
        retry: true
      }), context)
    },
    reportValidationError: (message: string, context?: Record<string, any>) => {
      reportError(new AppError(message, 'VALIDATION_ERROR', 400, context, {
        category: ErrorCategory.VALIDATION,
        retry: false
      }), context)
    }
  }
}
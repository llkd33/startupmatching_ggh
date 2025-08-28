'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { toast } from '@/components/ui/toast-custom'
import { AppError, ErrorCategory } from '@/lib/error-handler'

interface ToastState {
  id: string | number
  type: 'success' | 'error' | 'warning' | 'info' | 'loading'
  message: string
  timestamp: number
  dismissed: boolean
}

interface ToastManagerOptions {
  maxToasts?: number
  deduplicate?: boolean
  deduplicationTime?: number
  persistentTypes?: Array<'success' | 'error' | 'warning' | 'info' | 'loading'>
}

export function useToastManager(options: ToastManagerOptions = {}) {
  const {
    maxToasts = 5,
    deduplicate = true,
    deduplicationTime = 3000,
    persistentTypes = ['error']
  } = options

  const [toasts, setToasts] = useState<ToastState[]>([])
  const toastRefs = useRef<Map<string | number, ToastState>>(new Map())
  const deduplicationCache = useRef<Map<string, number>>(new Map())

  // Clean up old toasts
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now()
      setToasts(prev => prev.filter(toast => 
        !toast.dismissed && (now - toast.timestamp < 30000) // Keep for 30 seconds
      ))
      
      // Clean up deduplication cache
      deduplicationCache.current.forEach((timestamp, key) => {
        if (now - timestamp > deduplicationTime) {
          deduplicationCache.current.delete(key)
        }
      })
    }, 5000)

    return () => clearInterval(cleanup)
  }, [deduplicationTime])

  const shouldDeduplicate = useCallback((message: string, type: string): boolean => {
    if (!deduplicate) return false

    const key = `${type}:${message}`
    const lastShown = deduplicationCache.current.get(key)
    const now = Date.now()

    if (lastShown && (now - lastShown) < deduplicationTime) {
      return true
    }

    deduplicationCache.current.set(key, now)
    return false
  }, [deduplicate, deduplicationTime])

  const addToast = useCallback((
    type: 'success' | 'error' | 'warning' | 'info' | 'loading',
    message: string,
    options?: any
  ) => {
    // Check for deduplication
    if (shouldDeduplicate(message, type)) {
      return null
    }

    // Limit number of toasts
    if (toasts.length >= maxToasts) {
      // Remove oldest non-persistent toast
      const oldestRemovable = toasts.find(t => !persistentTypes.includes(t.type))
      if (oldestRemovable) {
        toast.dismiss(oldestRemovable.id)
        setToasts(prev => prev.filter(t => t.id !== oldestRemovable.id))
      }
    }

    const id = options?.id || `toast-${Date.now()}-${Math.random()}`
    const toastState: ToastState = {
      id,
      type,
      message,
      timestamp: Date.now(),
      dismissed: false
    }

    setToasts(prev => [...prev, toastState])
    toastRefs.current.set(id, toastState)

    // Show the actual toast
    const toastId = toast[type](message, options)
    
    return toastId
  }, [toasts.length, maxToasts, persistentTypes, shouldDeduplicate])

  const showSuccess = useCallback((message: string, options?: any) => {
    return addToast('success', message, options)
  }, [addToast])

  const showError = useCallback((message: string, options?: any) => {
    return addToast('error', message, options)
  }, [addToast])

  const showWarning = useCallback((message: string, options?: any) => {
    return addToast('warning', message, options)
  }, [addToast])

  const showInfo = useCallback((message: string, options?: any) => {
    return addToast('info', message, options)
  }, [addToast])

  const showLoading = useCallback((message: string, options?: any) => {
    return addToast('loading', message, options)
  }, [addToast])

  // Smart error toast that chooses appropriate type based on error
  const showErrorSmart = useCallback((error: Error | AppError, options?: any) => {
    if (error instanceof AppError) {
      switch (error.category) {
        case ErrorCategory.NETWORK:
          return toast.networkError(error.message, options)
        case ErrorCategory.AUTHENTICATION:
          return toast.authError(error.message, options)
        case ErrorCategory.DATABASE:
          return toast.databaseError(error.message, options)
        case ErrorCategory.VALIDATION:
          return toast.validationError(error.message, options)
        default:
          return showError(error.message, options)
      }
    } else {
      return showError(error.message, options)
    }
  }, [showError])

  const dismissToast = useCallback((id: string | number) => {
    setToasts(prev => prev.map(t => 
      t.id === id ? { ...t, dismissed: true } : t
    ))
    toastRefs.current.delete(id)
    toast.dismiss(id)
  }, [])

  const dismissAll = useCallback(() => {
    setToasts(prev => prev.map(t => ({ ...t, dismissed: true })))
    toastRefs.current.clear()
    toast.dismissAll()
  }, [])

  const updateToast = useCallback((id: string | number, message: string, options?: any) => {
    const existingToast = toastRefs.current.get(id)
    if (existingToast) {
      setToasts(prev => prev.map(t => 
        t.id === id ? { ...t, message, timestamp: Date.now() } : t
      ))
      
      // Dismiss old toast and show new one
      toast.dismiss(id)
      return toast[existingToast.type](message, { ...options, id })
    }
    return null
  }, [])

  // Promise-based toast for async operations
  const showPromise = useCallback(<T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    },
    options?: any
  ) => {
    return toast.promise(promise, messages, options)
  }, [])

  // Batch operations
  const showBatch = useCallback((
    toastConfigs: Array<{
      type: 'success' | 'error' | 'warning' | 'info'
      message: string
      options?: any
      delay?: number
    }>
  ) => {
    const ids: Array<string | number> = []
    
    toastConfigs.forEach((config, index) => {
      const delay = config.delay || index * 200 // Stagger by 200ms
      
      setTimeout(() => {
        const id = addToast(config.type, config.message, config.options)
        if (id) ids.push(id)
      }, delay)
    })
    
    return ids
  }, [addToast])

  return {
    // State
    toasts: toasts.filter(t => !t.dismissed),
    activeToastCount: toasts.filter(t => !t.dismissed).length,
    
    // Basic toast methods
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    
    // Smart methods
    showErrorSmart,
    showPromise,
    showBatch,
    
    // Management methods
    dismissToast,
    dismissAll,
    updateToast,
    
    // Utility methods
    hasActiveToasts: toasts.some(t => !t.dismissed),
    hasErrorToasts: toasts.some(t => !t.dismissed && t.type === 'error'),
    getToastById: (id: string | number) => toasts.find(t => t.id === id),
    
    // Direct access to toast API
    toast
  }
}

// Hook for error-specific toast management
export function useErrorToast() {
  const toastManager = useToastManager({
    maxToasts: 3,
    persistentTypes: ['error'],
    deduplicationTime: 5000
  })

  const showNetworkError = useCallback((message?: string, options?: any) => {
    return toastManager.toast.networkError(message, {
      important: true,
      ...options
    })
  }, [toastManager])

  const showAuthError = useCallback((message?: string, options?: any) => {
    return toastManager.toast.authError(message, {
      important: true,
      ...options
    })
  }, [toastManager])

  const showDatabaseError = useCallback((message?: string, options?: any) => {
    return toastManager.toast.databaseError(message, {
      important: true,
      ...options
    })
  }, [toastManager])

  const showValidationError = useCallback((message?: string, options?: any) => {
    return toastManager.toast.validationError(message, options)
  }, [toastManager])

  const showCriticalError = useCallback((message: string, options?: any) => {
    return toastManager.showError(message, {
      important: true,
      duration: 10000,
      dismissible: false,
      action: {
        label: 'Reload Page',
        onClick: () => window.location.reload()
      },
      ...options
    })
  }, [toastManager])

  return {
    showNetworkError,
    showAuthError,
    showDatabaseError,
    showValidationError,
    showCriticalError,
    showErrorSmart: toastManager.showErrorSmart,
    dismissAll: toastManager.dismissAll,
    hasErrorToasts: toastManager.hasErrorToasts
  }
}

// Hook for success/feedback toast management
export function useFeedbackToast() {
  const toastManager = useToastManager({
    maxToasts: 4,
    deduplicationTime: 2000
  })

  const showSaved = useCallback((itemName?: string) => {
    const message = itemName ? `${itemName} saved successfully` : 'Saved successfully'
    return toastManager.showSuccess(message, { duration: 3000 })
  }, [toastManager])

  const showDeleted = useCallback((itemName?: string) => {
    const message = itemName ? `${itemName} deleted successfully` : 'Deleted successfully'
    return toastManager.showSuccess(message, { duration: 3000 })
  }, [toastManager])

  const showUpdated = useCallback((itemName?: string) => {
    const message = itemName ? `${itemName} updated successfully` : 'Updated successfully'
    return toastManager.showSuccess(message, { duration: 3000 })
  }, [toastManager])

  const showCopied = useCallback((itemName?: string) => {
    const message = itemName ? `${itemName} copied to clipboard` : 'Copied to clipboard'
    return toastManager.showSuccess(message, { duration: 2000 })
  }, [toastManager])

  const showUploaded = useCallback((fileName?: string) => {
    const message = fileName ? `${fileName} uploaded successfully` : 'File uploaded successfully'
    return toastManager.showSuccess(message, { duration: 4000 })
  }, [toastManager])

  return {
    showSaved,
    showDeleted,
    showUpdated,
    showCopied,
    showUploaded,
    showSuccess: toastManager.showSuccess,
    showInfo: toastManager.showInfo,
    showPromise: toastManager.showPromise
  }
}
import { toast, ERROR_MESSAGES } from '@/components/ui/toast-custom'
import { supabase } from '@/lib/supabase'
import { PostgrestError } from '@supabase/supabase-js'

// Enhanced error logging interface
export interface ErrorLogEntry {
  id: string
  timestamp: Date
  userId?: string
  sessionId?: string
  errorType: ErrorCategory
  errorCode?: string
  message: string
  stack?: string
  userAgent: string
  url: string
  resolved: boolean
  context?: Record<string, any>
}

// Network detection utilities
export interface NetworkStatus {
  online: boolean
  effectiveType?: string
  downlink?: number
  rtt?: number
}

// Enhanced retry configuration
export interface EnhancedRetryConfig extends RetryConfig {
  retryCondition?: (error: any, attempt: number) => boolean
  onRetry?: (error: any, attempt: number) => void
  onMaxRetriesReached?: (error: any) => void
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for better classification
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown'
}

// Enhanced error types
export class AppError extends Error {
  public readonly category: ErrorCategory
  public readonly severity: ErrorSeverity
  public readonly timestamp: Date
  public readonly retry: boolean
  public readonly actionRequired?: string

  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: any,
    options?: {
      category?: ErrorCategory
      severity?: ErrorSeverity
      retry?: boolean
      actionRequired?: string
    }
  ) {
    super(message)
    this.name = 'AppError'
    this.category = options?.category || ErrorCategory.UNKNOWN
    this.severity = options?.severity || ErrorSeverity.MEDIUM
    this.timestamp = new Date()
    this.retry = options?.retry || false
    this.actionRequired = options?.actionRequired
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details, {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      retry: false
    })
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = ERROR_MESSAGES.UNAUTHORIZED) {
    super(message, 'AUTHENTICATION_ERROR', 401, undefined, {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      retry: false,
      actionRequired: 'Sign in'
    })
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = ERROR_MESSAGES.FORBIDDEN) {
    super(message, 'AUTHORIZATION_ERROR', 403, undefined, {
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      retry: false
    })
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = ERROR_MESSAGES.NOT_FOUND) {
    super(message, 'NOT_FOUND', 404, undefined, {
      category: ErrorCategory.CLIENT,
      severity: ErrorSeverity.LOW,
      retry: false
    })
    this.name = 'NotFoundError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string = ERROR_MESSAGES.NETWORK) {
    super(message, 'NETWORK_ERROR', 0, undefined, {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      retry: true
    })
    this.name = 'NetworkError'
  }
}

// Enhanced network error detection
export function isNetworkError(error: any): boolean {
  if (!error) return false
  
  const networkErrorPatterns = [
    'NetworkError',
    'Failed to fetch',
    'Network request failed',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED',
    'ERR_CONNECTION',
    'ERR_NAME_NOT_RESOLVED',
    'ERR_TIMED_OUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNABORTED'
  ]
  
  const errorString = error.toString().toLowerCase()
  const messageString = (error.message || '').toLowerCase()
  
  return networkErrorPatterns.some(pattern => 
    errorString.includes(pattern.toLowerCase()) || 
    messageString.includes(pattern.toLowerCase())
  ) || error.code === 'NETWORK_ERROR' || !navigator.onLine
}

// Network status detection
export function getNetworkStatus(): NetworkStatus {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  
  return {
    online: navigator.onLine,
    effectiveType: connection?.effectiveType,
    downlink: connection?.downlink,
    rtt: connection?.rtt
  }
}

// Enhanced error classification
export function classifyError(error: any): { category: ErrorCategory; severity: ErrorSeverity; retry: boolean } {
  if (error instanceof AppError) {
    return {
      category: error.category,
      severity: error.severity,
      retry: error.retry
    }
  }

  // Network errors
  if (isNetworkError(error) || !navigator.onLine) {
    return {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      retry: true
    }
  }

  // HTTP status codes
  if (error?.response?.status) {
    const status = error.response.status
    if (status >= 500) {
      return {
        category: ErrorCategory.SERVER,
        severity: ErrorSeverity.HIGH,
        retry: true
      }
    } else if (status === 401) {
      return {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        retry: false
      }
    } else if (status === 403) {
      return {
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.MEDIUM,
        retry: false
      }
    } else if (status >= 400) {
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retry: false
      }
    }
  }

  // Supabase specific errors
  if (error?.code) {
    const code = error.code
    if (code.startsWith('PGRST') || code.startsWith('42')) {
      return {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        retry: code === '42883' // Missing function can be retried
      }
    }
  }

  return {
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    retry: false
  }
}

// Retry configuration
export interface RetryConfig {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  shouldRetry?: (error: any, attempt: number) => boolean
}

// Enhanced exponential backoff retry mechanism
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: EnhancedRetryConfig = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = (error) => {
      if (error instanceof AppError) {
        return error.retry
      }
      return isNetworkError(error)
    },
    retryCondition,
    onRetry,
    onMaxRetriesReached
  } = config

  let lastError: any
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      const shouldRetryError = retryCondition ? retryCondition(error, attempt) : shouldRetry(error, attempt)
      
      if (attempt === maxAttempts || !shouldRetryError) {
        if (attempt === maxAttempts && onMaxRetriesReached) {
          onMaxRetriesReached(error)
        }
        throw error
      }
      
      // Call retry callback
      if (onRetry) {
        onRetry(error, attempt)
      }
      
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      )
      
      // Show retry toast with more context
      const networkStatus = getNetworkStatus()
      const retryMessage = !networkStatus.online 
        ? `Connection lost. Retrying when online... (${attempt + 1}/${maxAttempts})`
        : `Retrying... (${attempt + 1}/${maxAttempts})`
      
      toast.info(retryMessage, {
        duration: delay > 3000 ? delay : 3000
      })
      
      // Wait for network to come back online if offline
      if (!networkStatus.online) {
        await waitForOnline()
      }
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Wait for network to come back online
export function waitForOnline(timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (navigator.onLine) {
      resolve()
      return
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onOnline)
      reject(new NetworkError('Network timeout'))
    }, timeout)

    const onOnline = () => {
      clearTimeout(timeoutId)
      window.removeEventListener('online', onOnline)
      resolve()
    }

    window.addEventListener('online', onOnline)
  })
}

// Error handler utility
export const errorHandler = {
  /**
   * Handle API errors and show appropriate toast messages
   */
  handle: (error: any, showToast: boolean = true): AppError => {
    console.error('Error caught:', error)
    
    let appError: AppError
    let userMessage: string
    let description: string | undefined
    
    // Handle different error types
    if (error instanceof AppError) {
      appError = error
      userMessage = error.message
    } else if (error?.response) {
      // HTTP error from axios or similar
      const status = error.response.status
      const data = error.response.data
      
      switch (status) {
        case 400:
          userMessage = data?.message || ERROR_MESSAGES.VALIDATION
          description = data?.details
          appError = new ValidationError(userMessage, data?.details)
          break
        case 401:
          userMessage = ERROR_MESSAGES.UNAUTHORIZED
          appError = new AuthenticationError()
          // Redirect to login
          setTimeout(() => {
            window.location.href = '/auth/login'
          }, 1500)
          break
        case 403:
          userMessage = ERROR_MESSAGES.FORBIDDEN
          appError = new AuthorizationError()
          break
        case 404:
          userMessage = ERROR_MESSAGES.NOT_FOUND
          appError = new NotFoundError()
          break
        case 500:
        case 502:
        case 503:
          userMessage = ERROR_MESSAGES.SERVER
          appError = new AppError(userMessage, 'SERVER_ERROR', status)
          break
        default:
          userMessage = data?.message || ERROR_MESSAGES.UNKNOWN
          appError = new AppError(userMessage, 'HTTP_ERROR', status)
      }
    } else if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      userMessage = ERROR_MESSAGES.TIMEOUT
      appError = new AppError(userMessage, 'TIMEOUT', 408)
    } else if (error?.message?.includes('Network') || error?.message?.includes('fetch')) {
      userMessage = ERROR_MESSAGES.NETWORK
      appError = new NetworkError()
    } else if (error?.message) {
      userMessage = error.message
      appError = new AppError(userMessage)
    } else {
      userMessage = ERROR_MESSAGES.UNKNOWN
      appError = new AppError(userMessage)
    }
    
    // Show toast if enabled
    if (showToast) {
      toast.error(userMessage, description)
    }
    
    // Log to error service in production
    if (process.env.NODE_ENV === 'production') {
      logError(appError)
    }
    
    return appError
  },
  
  /**
   * Handle Supabase specific errors with enhanced detection
   */
  handleSupabase: (error: PostgrestError | any, showToast: boolean = true, context?: Record<string, any>): AppError => {
    console.error('Supabase error:', error)
    
    let userMessage: string
    let appError: AppError
    const errorCode = error?.code || error?.error_code || 'UNKNOWN'
    const message = error?.message || error?.error_description || 'An error occurred'
    const hint = error?.hint || ''
    const details = error?.details || ''
    
    // Enhanced Supabase error mapping with more specific cases
    if (errorCode === 'PGRST301' || errorCode === '401' || message.includes('JWT') || message.includes('expired')) {
      // JWT expired or authentication issue
      userMessage = ERROR_MESSAGES.UNAUTHORIZED
      appError = new AuthenticationError(userMessage)
      
      // Try to refresh session first
      supabase.auth.refreshSession().catch(() => {
        setTimeout(() => window.location.href = '/auth/login', 1500)
      })
    } else if (errorCode === '403' || errorCode === 'PGRST204' || errorCode === '42501' || message.includes('permission')) {
      // Authorization error
      userMessage = ERROR_MESSAGES.FORBIDDEN
      appError = new AuthorizationError(userMessage)
    } else if (errorCode === '23505' || message.includes('duplicate') || message.includes('unique constraint')) {
      // Duplicate key violation
      const field = extractFieldFromError(details || hint)
      userMessage = field ? `${field} already exists. Please use a different value.` : 'This item already exists. Please use a different value.'
      appError = new ValidationError(userMessage, { field, originalError: error })
    } else if (errorCode === '23503' || message.includes('foreign key')) {
      // Foreign key violation
      userMessage = 'Related data not found. Please check your input and try again.'
      appError = new ValidationError(userMessage, { originalError: error })
    } else if (errorCode === '23514' || message.includes('check constraint')) {
      // Check constraint violation
      const constraint = extractConstraintFromError(details || hint)
      userMessage = constraint ? `Invalid ${constraint}. Please check your input.` : 'Invalid input. Please check your data.'
      appError = new ValidationError(userMessage, { constraint, originalError: error })
    } else if (errorCode === '42883' || message.includes('function') || message.includes('does not exist')) {
      // Missing database function
      userMessage = 'This feature is temporarily unavailable. Our team has been notified.'
      appError = new AppError(userMessage, errorCode, 503, { originalMessage: message, hint, details }, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        retry: true,
        actionRequired: 'Try again later'
      })
    } else if (errorCode === '42P01' || message.includes('relation') && message.includes('does not exist')) {
      // Missing table/relation
      userMessage = 'Database structure issue. Please contact support.'
      appError = new AppError(userMessage, errorCode, 500, { originalMessage: message }, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.CRITICAL,
        retry: false
      })
    } else if (errorCode === '500' || errorCode === 'PGRST000' || errorCode.startsWith('5')) {
      // Server error
      userMessage = ERROR_MESSAGES.SERVER
      appError = new AppError(userMessage, errorCode, 500, { originalMessage: message, hint, details }, {
        category: ErrorCategory.SERVER,
        severity: ErrorSeverity.HIGH,
        retry: true
      })
    } else if (message.includes('network') || message.includes('fetch') || isNetworkError(error)) {
      // Network error
      userMessage = ERROR_MESSAGES.NETWORK
      appError = new NetworkError(userMessage)
    } else if (errorCode === '422' || errorCode.startsWith('4')) {
      // Client error / Validation error
      userMessage = message.includes('validation') ? ERROR_MESSAGES.VALIDATION : message
      appError = new ValidationError(userMessage, { originalError: error, hint, details })
    } else if (errorCode === 'PGRST116') {
      // No rows returned (could be normal)
      userMessage = ERROR_MESSAGES.NOT_FOUND
      appError = new NotFoundError(userMessage)
    } else {
      // Unknown error
      userMessage = message || ERROR_MESSAGES.UNKNOWN
      const classification = classifyError(error)
      appError = new AppError(userMessage, errorCode, undefined, { originalError: error, hint, details }, {
        category: classification.category,
        severity: classification.severity,
        retry: classification.retry
      })
    }
    
    // Show toast with appropriate styling and actions
    if (showToast) {
      const toastOptions: any = {}
      
      // Add retry action for retryable errors
      if (appError.retry) {
        toastOptions.action = {
          label: 'Retry',
          onClick: () => {
            // This will be handled by the calling component
            window.dispatchEvent(new CustomEvent('error-retry', { detail: { error: appError, context } }))
          }
        }
      } else if (appError.actionRequired) {
        toastOptions.action = {
          label: appError.actionRequired,
          onClick: () => {
            if (appError.actionRequired === 'Sign in') {
              window.location.href = '/auth/login'
            } else if (appError.actionRequired === 'Try again later') {
              // Could implement a "notify me" feature
            }
          }
        }
      }
      
      // Choose appropriate toast type
      if (appError.severity === ErrorSeverity.CRITICAL || appError.severity === ErrorSeverity.HIGH) {
        toast.error(userMessage, toastOptions)
      } else if (appError.severity === ErrorSeverity.LOW) {
        toast.warning(userMessage, toastOptions)
      } else {
        toast.error(userMessage, toastOptions)
      }
    }
    
    // Always log errors for debugging
    logError(appError, context)
    
    return appError
  },
  
  /**
   * Handle form validation errors
   */
  handleValidation: (errors: Record<string, any>, showToast: boolean = true): void => {
    const firstError = Object.values(errors)[0] as any
    const message = firstError?.message || ERROR_MESSAGES.VALIDATION
    
    if (showToast) {
      toast.error(message)
    }
  },
  
  /**
   * Handle async operations with loading state
   */
  async handleAsync<T>(
    promise: Promise<T>,
    options?: {
      loadingMessage?: string
      successMessage?: string
      errorMessage?: string
      showToast?: boolean
    }
  ): Promise<T | null> {
    const {
      loadingMessage = '처리중...',
      successMessage = '완료되었습니다',
      errorMessage,
      showToast = true
    } = options || {}
    
    let toastId: string | number | undefined
    
    if (showToast && loadingMessage) {
      toastId = toast.loading(loadingMessage)
    }
    
    try {
      const result = await promise
      
      if (showToast) {
        if (toastId) toast.dismiss(toastId)
        toast.success(successMessage)
      }
      
      return result
    } catch (error) {
      if (showToast && toastId) {
        toast.dismiss(toastId)
      }
      
      const appError = this.handle(error, showToast)
      
      if (errorMessage && showToast) {
        toast.error(errorMessage)
      }
      
      throw appError
    }
  }
}

// Enhanced error logging with context
function logError(error: AppError, context?: Record<string, any>) {
  const errorLog: ErrorLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    userId: getCurrentUserId(),
    sessionId: getSessionId(),
    errorType: error.category,
    errorCode: error.code,
    message: error.message,
    stack: error.stack,
    userAgent: navigator.userAgent,
    url: window.location.href,
    resolved: false,
    context: {
      ...context,
      details: error.details,
      severity: error.severity,
      retry: error.retry,
      networkStatus: getNetworkStatus()
    }
  }

  // Store in local storage for offline scenarios
  try {
    const existingLogs = JSON.parse(localStorage.getItem('error_logs') || '[]')
    existingLogs.push(errorLog)
    
    // Keep only last 50 errors to prevent storage bloat
    if (existingLogs.length > 50) {
      existingLogs.splice(0, existingLogs.length - 50)
    }
    
    localStorage.setItem('error_logs', JSON.stringify(existingLogs))
  } catch (e) {
    console.warn('Failed to store error log locally:', e)
  }

  // TODO: Send to error reporting service
  // Example with Sentry:
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     tags: {
  //       category: error.category,
  //       severity: error.severity,
  //       code: error.code,
  //       status: error.status,
  //     },
  //     extra: errorLog.context,
  //     user: {
  //       id: errorLog.userId,
  //     },
  //   })
  // }
  
  // Console logging with structured data
  const logLevel = error.severity === ErrorSeverity.CRITICAL ? 'error' :
                   error.severity === ErrorSeverity.HIGH ? 'error' :
                   error.severity === ErrorSeverity.MEDIUM ? 'warn' : 'info'
  
  console[logLevel]('[Error Logger]', errorLog)
}

// Helper functions for error logging
function getCurrentUserId(): string | undefined {
  try {
    // Try to get user ID from Supabase auth
    return supabase.auth.getUser().then(({ data }) => data.user?.id).catch(() => undefined)
  } catch {
    return undefined
  }
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem('session_id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem('session_id', sessionId)
  }
  return sessionId
}

// Helper functions for error message extraction
function extractFieldFromError(errorText: string): string | null {
  // Extract field name from constraint violation messages
  const patterns = [
    /Key \(([^)]+)\)=/,
    /column "([^"]+)"/,
    /constraint "([^"]+)"/,
    /duplicate key value violates unique constraint "([^"]+)"/
  ]
  
  for (const pattern of patterns) {
    const match = errorText.match(pattern)
    if (match) {
      return match[1].replace(/_/g, ' ')
    }
  }
  
  return null
}

function extractConstraintFromError(errorText: string): string | null {
  // Extract constraint name and make it user-friendly
  const patterns = [
    /violates check constraint "([^"]+)"/,
    /constraint "([^"]+)"/
  ]
  
  for (const pattern of patterns) {
    const match = errorText.match(pattern)
    if (match) {
      return match[1].replace(/_/g, ' ').replace(/check$/, '').trim()
    }
  }
  
  return null
}

// Global error handler setup
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      const error = new AppError('Unhandled promise rejection', 'UNHANDLED_REJECTION', undefined, event.reason, {
        category: ErrorCategory.CLIENT,
        severity: ErrorSeverity.HIGH
      })
      
      logError(error)
      
      // Show user-friendly error
      toast.error('Something went wrong. Please refresh the page and try again.')
      
      // Prevent default browser behavior
      event.preventDefault()
    })
    
    // Handle global errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error)
      
      const error = new AppError('Global error', 'GLOBAL_ERROR', undefined, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }, {
        category: ErrorCategory.CLIENT,
        severity: ErrorSeverity.CRITICAL
      })
      
      logError(error)
      
      // Show user-friendly error
      toast.error('An unexpected error occurred. Please refresh the page.')
    })
  }
}

// Export convenience functions
export const handleError = errorHandler.handle
export const handleSupabaseError = errorHandler.handleSupabase
export const handleValidationError = errorHandler.handleValidation
export const handleAsync = errorHandler.handleAsync.bind(errorHandler)
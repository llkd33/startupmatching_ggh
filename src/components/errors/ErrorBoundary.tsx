'use client'

import React from 'react'
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'
import { AlertTriangle, RefreshCw, Home, Mail, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toast-custom'
import { ErrorCategory, ErrorSeverity, AppError } from '@/lib/error-handler'
import { 
  SmartErrorFallback, 
  MinimalErrorFallback, 
  NetworkErrorFallback,
  DatabaseErrorFallback,
  AuthErrorFallback 
} from './ErrorFallbacks'
import { useErrorRecovery } from '@/hooks/useErrorRecovery'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
  componentStack?: string
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  React.useEffect(() => {
    // Log to error reporting service (e.g., Sentry)
    console.error('Error boundary caught:', error)
    
    // Send error to backend logging service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with Sentry or other error reporting service
      // Sentry.captureException(error)
    }
  }, [error])

  // Determine error details
  const getErrorDetails = () => {
    if (error instanceof AppError) {
      const titles: Record<ErrorCategory, string> = {
        [ErrorCategory.AUTHENTICATION]: 'Authentication Required',
        [ErrorCategory.AUTHORIZATION]: 'Access Denied',
        [ErrorCategory.VALIDATION]: 'Invalid Input',
        [ErrorCategory.NETWORK]: 'Connection Problem',
        [ErrorCategory.DATABASE]: 'Database Error',
        [ErrorCategory.SERVER]: 'Server Error',
        [ErrorCategory.CLIENT]: 'Application Error',
        [ErrorCategory.UNKNOWN]: 'Something went wrong'
      }
      
      return {
        title: titles[error.category],
        description: error.message,
        showRetry: error.retry,
        actionRequired: error.actionRequired,
        severity: error.severity
      }
    }
    
    return {
      title: 'Something went wrong',
      description: 'An unexpected error occurred. Please try refreshing the page.',
      showRetry: true,
      actionRequired: undefined,
      severity: ErrorSeverity.MEDIUM
    }
  }

  const { title, description, showRetry, actionRequired, severity } = getErrorDetails()

  // Get severity-based styling
  const getSeverityColor = () => {
    const colors: Record<ErrorSeverity, string> = {
      [ErrorSeverity.LOW]: 'text-blue-500',
      [ErrorSeverity.MEDIUM]: 'text-yellow-500',
      [ErrorSeverity.HIGH]: 'text-orange-500',
      [ErrorSeverity.CRITICAL]: 'text-red-500'
    }
    return colors[severity]
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className={`mx-auto mb-4 h-12 w-12 ${getSeverityColor()}`}>
            <AlertCircle className="h-full w-full" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-2">
            {description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                Error Details (Development Mode)
              </summary>
              <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-48">
                {error.message}
                {error.stack && '\n\n' + error.stack}
              </pre>
            </details>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2">
          {showRetry && (
            <Button 
              onClick={resetErrorBoundary}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          
          {actionRequired && (
            <Button 
              onClick={() => {
                if (actionRequired === 'Sign in') {
                  window.location.href = '/auth/login'
                }
              }}
              className="w-full"
              variant="outline"
            >
              {actionRequired}
            </Button>
          )}
          
          <Button 
            onClick={() => window.history.back()}
            className="w-full"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            className="w-full"
            variant="outline"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
          
          <Button 
            onClick={() => {
              const subject = encodeURIComponent('Error Report')
              const body = encodeURIComponent(`Error Time: ${new Date().toLocaleString()}\nError Message: ${error.message}`)
              window.location.href = `mailto:support@startupmatching.com?subject=${subject}&body=${body}`
            }}
            className="w-full"
            variant="ghost"
            size="sm"
          >
            <Mail className="mr-2 h-4 w-4" />
            Report Issue
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: { componentStack: string }) => void
  onReset?: () => void
  resetKeys?: Array<string | number>
  isolate?: boolean
  level?: 'page' | 'section' | 'widget'
  context?: Record<string, any>
  enableRecovery?: boolean
  maxRetries?: number
}

export function ErrorBoundary({ 
  children, 
  fallback,
  onError,
  onReset,
  resetKeys,
  isolate = false,
  level = 'section',
  context,
  enableRecovery = true,
  maxRetries = 3
}: ErrorBoundaryProps) {
  // Choose appropriate fallback based on level if not specified
  const defaultFallback = fallback || (
    level === 'page' ? SmartErrorFallback :
    level === 'widget' ? MinimalErrorFallback :
    SmartErrorFallback
  )
  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => {
        const FallbackComponent = defaultFallback
        return <FallbackComponent {...props} context={context} />
      }}
      onError={(error, errorInfo) => {
        // Enhanced error logging with context
        const errorLog = {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          context,
          level,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.error('ErrorBoundary caught:', errorLog)
        }

        // Send to error reporting service in production
        if (process.env.NODE_ENV === 'production') {
          // TODO: Send to Sentry or other error reporting service
          console.error('Production error:', errorLog)
        }

        // Determine appropriate toast message based on error level
        if (level === 'widget') {
          // Don't show toast for widget-level errors to avoid spam
          return
        }

        let toastMessage = 'An error occurred'
        let toastDescription = 'Please try again or refresh the page'
        
        if (error instanceof AppError) {
          toastMessage = error.message
          if (error.actionRequired) {
            toastDescription = `Action required: ${error.actionRequired}`
          } else if (error.retry) {
            toastDescription = 'This appears to be a temporary issue. Please try again.'
          }
        }
        
        // Show toast notification with appropriate severity
        const severity = error instanceof AppError ? error.severity : ErrorSeverity.MEDIUM
        if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
          toast.error(toastMessage, toastDescription)
        } else {
          toast.warning(toastMessage, toastDescription)
        }
        
        // Call custom error handler if provided
        onError?.(error, errorInfo)
      }}
      onReset={() => {
        // Clear any error state
        onReset?.()
        
        // Show success toast only for page-level recoveries
        if (level === 'page') {
          toast.success('Page recovered successfully')
        }
      }}
      resetKeys={resetKeys}
    >
      {children}
    </ReactErrorBoundary>
  )
}

// Specialized error boundaries for different sections
export function PageErrorBoundary({ 
  children, 
  context 
}: { 
  children: React.ReactNode
  context?: Record<string, any>
}) {
  return (
    <ErrorBoundary
      level="page"
      context={context}
      enableRecovery={true}
      onError={(error, errorInfo) => {
        // Page-level errors are critical
        console.error('Page error:', error, errorInfo)
        
        // Could trigger additional recovery mechanisms here
        // e.g., clear local storage, reset user session, etc.
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

export function SectionErrorBoundary({ 
  children, 
  context,
  fallback
}: { 
  children: React.ReactNode
  context?: Record<string, any>
  fallback?: React.ComponentType<ErrorFallbackProps>
}) {
  return (
    <ErrorBoundary
      level="section"
      context={context}
      fallback={fallback}
      enableRecovery={true}
      maxRetries={2}
    >
      {children}
    </ErrorBoundary>
  )
}

export function WidgetErrorBoundary({ 
  children, 
  context 
}: { 
  children: React.ReactNode
  context?: Record<string, any>
}) {
  return (
    <ErrorBoundary
      level="widget"
      context={context}
      fallback={MinimalErrorFallback}
      isolate={true}
      enableRecovery={true}
      maxRetries={1}
    >
      {children}
    </ErrorBoundary>
  )
}

// Network-specific error boundary
export function NetworkErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={NetworkErrorFallback}
      context={{ type: 'network-operation' }}
      enableRecovery={true}
      maxRetries={3}
    >
      {children}
    </ErrorBoundary>
  )
}

// Database-specific error boundary
export function DatabaseErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={DatabaseErrorFallback}
      context={{ type: 'database-operation' }}
      enableRecovery={true}
      maxRetries={2}
    >
      {children}
    </ErrorBoundary>
  )
}

// Export helper for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}
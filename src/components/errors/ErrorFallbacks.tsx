'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home, Mail, AlertCircle, ArrowLeft, Wifi, Database, Shield, FileX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toast-custom'
import { ErrorCategory, ErrorSeverity, AppError, retryWithBackoff } from '@/lib/error-handler'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
  componentStack?: string
  context?: Record<string, any>
}

// Network Error Fallback
export function NetworkErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const [isRetrying, setIsRetrying] = React.useState(false)
  const [retryCount, setRetryCount] = React.useState(0)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await retryWithBackoff(
        async () => {
          // Check if network is back online
          if (!navigator.onLine) {
            throw new Error('Still offline')
          }
          // Try a simple network request
          await fetch('/api/health', { method: 'HEAD' })
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          onRetry: (error, attempt) => {
            setRetryCount(attempt)
            toast.info(`Checking connection... (${attempt}/3)`)
          }
        }
      )
      
      toast.success('Connection restored!')
      resetErrorBoundary()
    } catch (retryError) {
      toast.error('Still unable to connect. Please check your internet connection.')
    } finally {
      setIsRetrying(false)
      setRetryCount(0)
    }
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-orange-500">
            <Wifi className="h-full w-full" />
          </div>
          <CardTitle>Connection Problem</CardTitle>
          <CardDescription className="mt-2">
            Unable to connect to our servers. Please check your internet connection and try again.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• Check your internet connection</p>
            <p>• Try refreshing the page</p>
            <p>• Contact support if the problem persists</p>
          </div>
          
          {!navigator.onLine && (
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Your device appears to be offline. Please check your internet connection.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={handleRetry}
            className="w-full"
            disabled={isRetrying}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? `Retrying... ${retryCount > 0 ? `(${retryCount}/3)` : ''}` : 'Try Again'}
          </Button>
          
          <Button 
            onClick={() => window.location.reload()}
            className="w-full"
            variant="outline"
          >
            Refresh Page
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// Database Error Fallback
export function DatabaseErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const [isRetrying, setIsRetrying] = React.useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    
    // Wait a bit before retrying database operations
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    toast.info('Retrying database operation...')
    resetErrorBoundary()
    setIsRetrying(false)
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-red-500">
            <Database className="h-full w-full" />
          </div>
          <CardTitle>Database Error</CardTitle>
          <CardDescription className="mt-2">
            We're experiencing temporary database issues. Our team has been notified and is working on a fix.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• This is usually a temporary issue</p>
            <p>• Your data is safe and secure</p>
            <p>• Try again in a few moments</p>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={handleRetry}
            className="w-full"
            disabled={isRetrying}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            className="w-full"
            variant="outline"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// Authentication Error Fallback
export function AuthErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  React.useEffect(() => {
    // Auto-redirect to login after a short delay
    const timer = setTimeout(() => {
      window.location.href = '/auth/login'
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-blue-500">
            <Shield className="h-full w-full" />
          </div>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription className="mt-2">
            Your session has expired or you need to sign in to access this content.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>You'll be redirected to the login page in a few seconds...</p>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={() => window.location.href = '/auth/login'}
            className="w-full"
          >
            Sign In Now
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/'}
            className="w-full"
            variant="outline"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// Minimal Error Fallback for widgets/components
export function MinimalErrorFallback({ error, resetErrorBoundary, context }: ErrorFallbackProps) {
  const isAppError = error instanceof AppError
  const canRetry = isAppError ? error.retry : true

  return (
    <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            {isAppError && error.category === ErrorCategory.NETWORK 
              ? 'Connection Error'
              : isAppError && error.category === ErrorCategory.DATABASE
              ? 'Data Loading Error'
              : 'Something went wrong'}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            {isAppError ? error.message : 'This section couldn\'t load properly.'}
          </p>
          
          {canRetry && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={resetErrorBoundary}
                className="text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900/30"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          )}
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-3">
              <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                Debug Info
              </summary>
              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-xs">
                <p><strong>Error:</strong> {error.message}</p>
                {context && (
                  <p><strong>Context:</strong> {JSON.stringify(context, null, 2)}</p>
                )}
                {error.stack && (
                  <pre className="mt-1 text-xs overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

// Not Found Error Fallback
export function NotFoundErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-gray-500">
            <FileX className="h-full w-full" />
          </div>
          <CardTitle>Content Not Found</CardTitle>
          <CardDescription className="mt-2">
            The content you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        
        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={() => window.history.back()}
            className="w-full"
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
        </CardFooter>
      </Card>
    </div>
  )
}

// Smart Error Fallback that chooses the right fallback based on error type
export function SmartErrorFallback(props: ErrorFallbackProps) {
  const { error } = props

  if (error instanceof AppError) {
    switch (error.category) {
      case ErrorCategory.NETWORK:
        return <NetworkErrorFallback {...props} />
      case ErrorCategory.DATABASE:
        return <DatabaseErrorFallback {...props} />
      case ErrorCategory.AUTHENTICATION:
        return <AuthErrorFallback {...props} />
      case ErrorCategory.CLIENT:
        if (error.code === 'NOT_FOUND') {
          return <NotFoundErrorFallback {...props} />
        }
        break
    }
  }

  // Check for specific error patterns
  if (error.message.includes('fetch') || error.message.includes('network')) {
    return <NetworkErrorFallback {...props} />
  }

  if (error.message.includes('function') || error.message.includes('database')) {
    return <DatabaseErrorFallback {...props} />
  }

  if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
    return <AuthErrorFallback {...props} />
  }

  // Default fallback
  return <MinimalErrorFallback {...props} />
}
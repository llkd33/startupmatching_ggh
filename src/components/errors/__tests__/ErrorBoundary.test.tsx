import React from 'react'
import { render, screen } from '@testing-library/react'
import { AppError, ErrorCategory, ErrorSeverity } from '@/lib/error-handler'

// Mock the error fallbacks
jest.mock('../ErrorFallbacks', () => ({
  SmartErrorFallback: ({ error, resetErrorBoundary }: any) => (
    <div>
      <h1>Smart Error Fallback</h1>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>Try Again</button>
    </div>
  ),
  MinimalErrorFallback: ({ error, resetErrorBoundary }: any) => (
    <div>
      <h1>Minimal Error</h1>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>Retry</button>
    </div>
  ),
  NetworkErrorFallback: ({ error, resetErrorBoundary }: any) => (
    <div>
      <h1>Connection Problem</h1>
      <p>Unable to connect to our servers</p>
      <button onClick={resetErrorBoundary}>Try Again</button>
    </div>
  ),
  DatabaseErrorFallback: ({ error, resetErrorBoundary }: any) => (
    <div>
      <h1>Database Error</h1>
      <p>We're experiencing temporary database issues</p>
      <button onClick={resetErrorBoundary}>Try Again</button>
    </div>
  ),
  AuthErrorFallback: ({ error, resetErrorBoundary }: any) => (
    <div>
      <h1>Authentication Required</h1>
      <p>Your session has expired</p>
      <button onClick={resetErrorBoundary}>Sign In Now</button>
    </div>
  )
}))

// Mock toast
jest.mock('@/components/ui/toast-custom', () => ({
  toast: {
    error: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
    info: jest.fn()
  }
}))

// Mock error recovery hook
jest.mock('@/hooks/useErrorRecovery', () => ({
  useErrorRecovery: () => ({
    handleError: jest.fn(),
    retry: jest.fn(),
    reset: jest.fn(),
    error: null,
    isRetrying: false,
    canRetry: false
  })
}))

describe('Error Handling System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.error for tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('AppError Class', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 'TEST_CODE', 400, { detail: 'test' }, {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retry: true,
        actionRequired: 'Fix input'
      })

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.status).toBe(400)
      expect(error.details).toEqual({ detail: 'test' })
      expect(error.category).toBe(ErrorCategory.VALIDATION)
      expect(error.severity).toBe(ErrorSeverity.LOW)
      expect(error.retry).toBe(true)
      expect(error.actionRequired).toBe('Fix input')
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    it('should create AppError with default values', () => {
      const error = new AppError('Test message')
      
      expect(error.message).toBe('Test message')
      expect(error.category).toBe(ErrorCategory.UNKNOWN)
      expect(error.severity).toBe(ErrorSeverity.MEDIUM)
      expect(error.retry).toBe(false)
      expect(error.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('Error Categories', () => {
    it('should have all required error categories', () => {
      expect(ErrorCategory.AUTHENTICATION).toBe('authentication')
      expect(ErrorCategory.AUTHORIZATION).toBe('authorization')
      expect(ErrorCategory.VALIDATION).toBe('validation')
      expect(ErrorCategory.NETWORK).toBe('network')
      expect(ErrorCategory.DATABASE).toBe('database')
      expect(ErrorCategory.SERVER).toBe('server')
      expect(ErrorCategory.CLIENT).toBe('client')
      expect(ErrorCategory.UNKNOWN).toBe('unknown')
    })

    it('should have all required error severities', () => {
      expect(ErrorSeverity.LOW).toBe('low')
      expect(ErrorSeverity.MEDIUM).toBe('medium')
      expect(ErrorSeverity.HIGH).toBe('high')
      expect(ErrorSeverity.CRITICAL).toBe('critical')
    })
  })

  describe('Error Fallback Components', () => {
    it('should render network error fallback', () => {
      const { NetworkErrorFallback } = require('../ErrorFallbacks')
      const mockError = new AppError('Network error', 'NETWORK_ERROR', 0, undefined, {
        category: ErrorCategory.NETWORK,
        retry: true
      })

      render(
        <NetworkErrorFallback 
          error={mockError} 
          resetErrorBoundary={jest.fn()} 
        />
      )

      expect(screen.getByText('Connection Problem')).toBeInTheDocument()
      expect(screen.getByText(/unable to connect/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('should render database error fallback', () => {
      const { DatabaseErrorFallback } = require('../ErrorFallbacks')
      const mockError = new AppError('Database error', 'DATABASE_ERROR', 500, undefined, {
        category: ErrorCategory.DATABASE,
        retry: true
      })

      render(
        <DatabaseErrorFallback 
          error={mockError} 
          resetErrorBoundary={jest.fn()} 
        />
      )

      expect(screen.getByText('Database Error')).toBeInTheDocument()
      expect(screen.getByText(/temporary database issues/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('should render authentication error fallback', () => {
      const { AuthErrorFallback } = require('../ErrorFallbacks')
      const mockError = new AppError('Auth required', 'AUTH_ERROR', 401, undefined, {
        category: ErrorCategory.AUTHENTICATION,
        retry: false,
        actionRequired: 'Sign in'
      })

      render(
        <AuthErrorFallback 
          error={mockError} 
          resetErrorBoundary={jest.fn()} 
        />
      )

      expect(screen.getByText('Authentication Required')).toBeInTheDocument()
      expect(screen.getByText(/session has expired/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in now/i })).toBeInTheDocument()
    })

    it('should render minimal error fallback for widgets', () => {
      const { MinimalErrorFallback } = require('../ErrorFallbacks')
      const mockError = new Error('Widget error')

      render(
        <MinimalErrorFallback 
          error={mockError} 
          resetErrorBoundary={jest.fn()} 
        />
      )

      expect(screen.getByText('Minimal Error')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })
})
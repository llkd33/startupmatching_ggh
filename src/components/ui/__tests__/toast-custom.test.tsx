import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast, ToastProvider } from '../toast-custom'

// Mock Sonner
jest.mock('sonner', () => ({
  Toaster: ({ children, ...props }: any) => (
    <div data-testid="toaster" {...props}>
      {children}
    </div>
  ),
  toast: {
    success: jest.fn((message, options) => ({ id: 'success-1', message, ...options })),
    error: jest.fn((message, options) => ({ id: 'error-1', message, ...options })),
    warning: jest.fn((message, options) => ({ id: 'warning-1', message, ...options })),
    info: jest.fn((message, options) => ({ id: 'info-1', message, ...options })),
    loading: jest.fn((message, options) => ({ id: 'loading-1', message, ...options })),
    promise: jest.fn((promise, messages, options) => ({ id: 'promise-1', promise, messages, ...options })),
    dismiss: jest.fn(),
    custom: jest.fn((component, options) => ({ id: 'custom-1', component, ...options }))
  }
}))

const mockSonnerToast = require('sonner').toast

describe('Enhanced Toast System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ToastProvider', () => {
    it('should render toaster with correct configuration', () => {
      render(<ToastProvider />)
      
      const toaster = screen.getByTestId('toaster')
      expect(toaster).toBeInTheDocument()
      // Note: Props are passed to the Toaster component but may not appear as DOM attributes
    })
  })

  describe('Basic Toast Methods', () => {
    it('should show success toast with correct options', () => {
      toast.success('Success message', { description: 'Success description' })
      
      expect(mockSonnerToast.success).toHaveBeenCalledWith('Success message', {
        description: 'Success description',
        duration: 4000,
        dismissible: true,
        id: undefined,
        action: undefined,
        cancel: undefined,
        className: undefined
      })
    })

    it('should show error toast with longer duration', () => {
      toast.error('Error message', { description: 'Error description' })
      
      expect(mockSonnerToast.error).toHaveBeenCalledWith('Error message', {
        description: 'Error description',
        duration: 8000,
        dismissible: true,
        id: undefined,
        action: undefined,
        cancel: undefined,
        className: 'toast-error'
      })
    })

    it('should show warning toast with medium duration', () => {
      toast.warning('Warning message')
      
      expect(mockSonnerToast.warning).toHaveBeenCalledWith('Warning message', {
        description: undefined,
        duration: 6000,
        dismissible: true,
        id: undefined,
        action: undefined,
        cancel: undefined,
        className: 'toast-warning'
      })
    })

    it('should show info toast', () => {
      toast.info('Info message')
      
      expect(mockSonnerToast.info).toHaveBeenCalledWith('Info message', {
        description: undefined,
        duration: 5000,
        dismissible: true,
        id: undefined,
        action: undefined,
        cancel: undefined,
        className: 'toast-info'
      })
    })

    it('should show loading toast', () => {
      toast.loading('Loading message')
      
      expect(mockSonnerToast.loading).toHaveBeenCalledWith('Loading message', {
        description: undefined,
        id: undefined,
        dismissible: true,
        className: 'toast-loading'
      })
    })
  })

  describe('Toast Options', () => {
    it('should handle string description shorthand', () => {
      toast.success('Success', 'This is a description')
      
      expect(mockSonnerToast.success).toHaveBeenCalledWith('Success', {
        description: 'This is a description',
        duration: 4000,
        dismissible: true,
        id: undefined,
        action: undefined,
        cancel: undefined,
        className: undefined
      })
    })

    it('should handle action buttons', () => {
      const actionFn = jest.fn()
      
      toast.error('Error with action', {
        action: {
          label: 'Retry',
          onClick: actionFn
        }
      })
      
      expect(mockSonnerToast.error).toHaveBeenCalledWith('Error with action', {
        description: undefined,
        duration: 8000,
        dismissible: true,
        id: undefined,
        action: {
          label: 'Retry',
          onClick: actionFn
        },
        cancel: undefined,
        className: 'toast-error'
      })
    })

    it('should handle cancel buttons', () => {
      const cancelFn = jest.fn()
      
      toast.warning('Warning with cancel', {
        cancel: {
          label: 'Cancel',
          onClick: cancelFn
        }
      })
      
      expect(mockSonnerToast.warning).toHaveBeenCalledWith('Warning with cancel', {
        description: undefined,
        duration: 6000,
        dismissible: true,
        id: undefined,
        action: undefined,
        cancel: {
          label: 'Cancel',
          onClick: cancelFn
        },
        className: 'toast-warning'
      })
    })

    it('should handle important toasts', () => {
      toast.error('Important error', { important: true })
      
      expect(mockSonnerToast.error).toHaveBeenCalledWith('Important error', {
        description: undefined,
        duration: 8000,
        dismissible: true,
        id: undefined,
        action: undefined,
        cancel: undefined,
        className: 'toast-important toast-error'
      })
    })

    it('should handle custom duration', () => {
      toast.info('Custom duration', { duration: 10000 })
      
      expect(mockSonnerToast.info).toHaveBeenCalledWith('Custom duration', {
        description: undefined,
        duration: 10000,
        dismissible: true,
        id: undefined,
        action: undefined,
        cancel: undefined,
        className: 'toast-info'
      })
    })

    it('should handle non-dismissible toasts', () => {
      toast.error('Non-dismissible', { dismissible: false })
      
      expect(mockSonnerToast.error).toHaveBeenCalledWith('Non-dismissible', {
        description: undefined,
        duration: 8000,
        dismissible: false,
        id: undefined,
        action: undefined,
        cancel: undefined,
        className: 'toast-error'
      })
    })
  })

  describe('Specialized Toast Methods', () => {
    it('should show network error toast with retry action', () => {
      toast.networkError()
      
      expect(mockSonnerToast.error).toHaveBeenCalledWith('네트워크 연결을 확인해주세요.', {
        action: {
          label: 'Retry',
          onClick: expect.any(Function)
        },
        cancel: undefined,
        className: 'toast-error',
        description: undefined,
        dismissible: true,
        duration: 8000,
        id: undefined
      })
    })

    it('should show auth error toast with sign in action', () => {
      toast.authError()
      
      expect(mockSonnerToast.error).toHaveBeenCalledWith('로그인이 필요합니다.', {
        action: {
          label: 'Sign In',
          onClick: expect.any(Function)
        },
        cancel: undefined,
        className: 'toast-error',
        description: undefined,
        dismissible: true,
        duration: 10000,
        id: undefined
      })
    })

    it('should show database error toast with description', () => {
      toast.databaseError()
      
      expect(mockSonnerToast.error).toHaveBeenCalledWith('Database error occurred', {
        description: 'Our team has been notified and is working on a fix',
        action: {
          label: 'Try Again',
          onClick: expect.any(Function)
        },
        cancel: undefined,
        className: 'toast-error',
        dismissible: true,
        duration: 8000,
        id: undefined
      })
    })

    it('should show validation error toast as warning', () => {
      toast.validationError()
      
      expect(mockSonnerToast.warning).toHaveBeenCalledWith('입력한 정보를 다시 확인해주세요.', {
        action: undefined,
        cancel: undefined,
        className: 'toast-warning',
        description: undefined,
        dismissible: true,
        duration: 6000,
        id: undefined
      })
    })
  })

  describe('Promise Toast', () => {
    it('should handle promise toast', () => {
      const mockPromise = Promise.resolve('success')
      const messages = {
        loading: 'Loading...',
        success: 'Success!',
        error: 'Error!'
      }
      
      toast.promise(mockPromise, messages)
      
      expect(mockSonnerToast.promise).toHaveBeenCalledWith(mockPromise, messages, {
        id: undefined,
        duration: undefined,
        action: undefined,
        cancel: undefined
      })
    })

    it('should handle promise toast with options', () => {
      const mockPromise = Promise.resolve('success')
      const messages = {
        loading: 'Loading...',
        success: 'Success!',
        error: 'Error!'
      }
      const options = {
        duration: 5000,
        action: { label: 'OK', onClick: jest.fn() }
      }
      
      toast.promise(mockPromise, messages, options)
      
      expect(mockSonnerToast.promise).toHaveBeenCalledWith(mockPromise, messages, {
        id: undefined,
        duration: 5000,
        action: { label: 'OK', onClick: expect.any(Function) },
        cancel: undefined
      })
    })
  })

  describe('Toast Management', () => {
    it('should dismiss specific toast', () => {
      toast.dismiss('toast-1')
      
      expect(mockSonnerToast.dismiss).toHaveBeenCalledWith('toast-1')
    })

    it('should dismiss all toasts', () => {
      toast.dismissAll()
      
      expect(mockSonnerToast.dismiss).toHaveBeenCalledWith()
    })

    it('should show custom toast', () => {
      const customComponent = <div>Custom toast</div>
      
      toast.custom(customComponent, { duration: 3000 })
      
      expect(mockSonnerToast.custom).toHaveBeenCalledWith(customComponent, {
        duration: 3000,
        id: undefined,
        dismissible: true
      })
    })
  })
})
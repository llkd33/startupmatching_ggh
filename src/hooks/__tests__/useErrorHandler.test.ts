import { renderHook, act } from '@testing-library/react'
import { useErrorHandler } from '../useErrorHandler'
import { toast } from '@/components/ui/toast-custom'

// Mock dependencies
jest.mock('@/components/ui/toast-custom', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

describe('useErrorHandler Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('handles errors and shows toast', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    act(() => {
      result.current.handleError(new Error('Test error'))
    })
    
    expect(toast.error).toHaveBeenCalledWith('Test error')
  })

  it('redirects on authentication error', () => {
    const mockPush = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush,
    })
    
    const { result } = renderHook(() => useErrorHandler())
    
    const authError = {
      response: { status: 401 },
    }
    
    act(() => {
      result.current.handleError(authError)
    })
    
    expect(mockPush).toHaveBeenCalledWith('/auth/login')
  })

  it('handles async operations with loading state', async () => {
    const { result } = renderHook(() => useErrorHandler())
    
    const mockAsyncFn = jest.fn().mockResolvedValue('success')
    
    await act(async () => {
      const response = await result.current.handleAsync(mockAsyncFn)
      expect(response).toBe('success')
    })
    
    expect(mockAsyncFn).toHaveBeenCalled()
  })

  it('tracks loading state during async operation', async () => {
    const { result } = renderHook(() => useErrorHandler())
    
    expect(result.current.loading).toBe(false)
    
    const mockAsyncFn = jest.fn(() => 
      new Promise(resolve => setTimeout(() => resolve('done'), 100))
    )
    
    const promise = act(async () => {
      return result.current.handleAsync(mockAsyncFn)
    })
    
    // Should be loading immediately after calling
    expect(result.current.loading).toBe(true)
    
    await promise
    
    // Should not be loading after completion
    expect(result.current.loading).toBe(false)
  })

  it('clears error when clearError is called', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    act(() => {
      result.current.handleError(new Error('Test error'))
    })
    
    expect(result.current.error).toBeTruthy()
    
    act(() => {
      result.current.clearError()
    })
    
    expect(result.current.error).toBeNull()
  })

  it('handles async operation failure', async () => {
    const { result } = renderHook(() => useErrorHandler())
    
    const mockError = new Error('Async failed')
    const mockAsyncFn = jest.fn().mockRejectedValue(mockError)
    
    await act(async () => {
      try {
        await result.current.handleAsync(mockAsyncFn)
      } catch (error) {
        // Expected to throw
      }
    })
    
    expect(result.current.error).toBeTruthy()
    expect(result.current.loading).toBe(false)
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles form validation errors', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    const validationErrors = {
      email: 'Invalid email format',
      password: 'Password too short',
    }
    
    act(() => {
      result.current.handleFormError(validationErrors)
    })
    
    expect(result.current.formErrors).toEqual(validationErrors)
  })

  it('clears form errors', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    const validationErrors = {
      email: 'Invalid email',
    }
    
    act(() => {
      result.current.handleFormError(validationErrors)
    })
    
    expect(result.current.formErrors).toEqual(validationErrors)
    
    act(() => {
      result.current.clearFormErrors()
    })
    
    expect(result.current.formErrors).toBeNull()
  })

  it('provides retry functionality', async () => {
    const { result } = renderHook(() => useErrorHandler())
    
    let attempts = 0
    const mockAsyncFn = jest.fn(() => {
      attempts++
      if (attempts < 2) {
        return Promise.reject(new Error('Failed'))
      }
      return Promise.resolve('success')
    })
    
    // First attempt fails
    await act(async () => {
      try {
        await result.current.handleAsync(mockAsyncFn)
      } catch (error) {
        // Expected to fail
      }
    })
    
    expect(result.current.error).toBeTruthy()
    
    // Retry succeeds
    await act(async () => {
      const response = await result.current.retry()
      expect(response).toBe('success')
    })
    
    expect(result.current.error).toBeNull()
  })
})
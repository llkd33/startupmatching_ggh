import { errorHandler, AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, NetworkError } from '../error-handler'
import { toast } from '@/components/ui/toast-custom'

// Mock toast
jest.mock('@/components/ui/toast-custom', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  ERROR_MESSAGES: {
    NETWORK: '네트워크 연결을 확인해주세요.',
    UNAUTHORIZED: '로그인이 필요합니다.',
    FORBIDDEN: '접근 권한이 없습니다.',
    NOT_FOUND: '요청한 내용을 찾을 수 없습니다.',
    VALIDATION: '입력한 정보를 다시 확인해주세요.',
    SERVER: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    UNKNOWN: '알 수 없는 오류가 발생했습니다.',
    TIMEOUT: '요청 시간이 초과되었습니다.',
  },
}))

describe('Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('errorHandler.handle', () => {
    it('handles AppError correctly', () => {
      const error = new AppError('Test error', 'TEST_ERROR', 400)
      const result = errorHandler.handle(error)
      
      expect(result).toBeInstanceOf(AppError)
      expect(result.message).toBe('Test error')
      expect(result.code).toBe('TEST_ERROR')
      expect(result.status).toBe(400)
      expect(toast.error).toHaveBeenCalledWith('Test error', undefined)
    })

    it('handles ValidationError correctly', () => {
      const error = new ValidationError('Validation failed', { field: 'email' })
      const result = errorHandler.handle(error)
      
      expect(result).toBeInstanceOf(ValidationError)
      expect(result.message).toBe('Validation failed')
      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.status).toBe(400)
      expect(result.details).toEqual({ field: 'email' })
    })

    it('handles AuthenticationError correctly', () => {
      const error = new AuthenticationError()
      const result = errorHandler.handle(error)
      
      expect(result).toBeInstanceOf(AuthenticationError)
      expect(result.code).toBe('AUTHENTICATION_ERROR')
      expect(result.status).toBe(401)
    })

    it('handles HTTP response errors', () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
      }
      
      const result = errorHandler.handle(error)
      
      expect(result).toBeInstanceOf(NotFoundError)
      expect(toast.error).toHaveBeenCalled()
    })

    it('handles network errors', () => {
      const error = new Error('Network error')
      const result = errorHandler.handle(error)
      
      expect(result).toBeInstanceOf(AppError)
      expect(toast.error).toHaveBeenCalled()
    })

    it('handles timeout errors', () => {
      const error = { code: 'ECONNABORTED' }
      const result = errorHandler.handle(error)
      
      expect(result).toBeInstanceOf(AppError)
      expect(result.code).toBe('TIMEOUT')
      expect(result.status).toBe(408)
    })

    it('does not show toast when showToast is false', () => {
      const error = new AppError('Test error')
      errorHandler.handle(error, false)
      
      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  describe('errorHandler.handleSupabase', () => {
    it('handles JWT expired error', () => {
      const error = { code: 'PGRST301' }
      const result = errorHandler.handleSupabase(error)
      
      expect(result).toBeInstanceOf(AuthenticationError)
      expect(toast.error).toHaveBeenCalled()
    })

    it('handles duplicate key violation', () => {
      const error = { code: '23505' }
      const result = errorHandler.handleSupabase(error)
      
      expect(result).toBeInstanceOf(ValidationError)
      expect(result.message).toBe('이미 존재하는 데이터입니다.')
    })

    it('handles foreign key violation', () => {
      const error = { code: '23503' }
      const result = errorHandler.handleSupabase(error)
      
      expect(result).toBeInstanceOf(ValidationError)
      expect(result.message).toBe('참조하는 데이터가 존재하지 않습니다.')
    })

    it('handles insufficient privilege', () => {
      const error = { code: '42501' }
      const result = errorHandler.handleSupabase(error)
      
      expect(result).toBeInstanceOf(AuthorizationError)
    })
  })

  describe('errorHandler.handleValidation', () => {
    it('shows first error message', () => {
      const errors = {
        email: { message: 'Invalid email' },
        password: { message: 'Password too short' },
      }
      
      errorHandler.handleValidation(errors)
      
      expect(toast.error).toHaveBeenCalledWith('Invalid email')
    })

    it('shows default message when no specific message', () => {
      const errors = { field: {} }
      
      errorHandler.handleValidation(errors)
      
      expect(toast.error).toHaveBeenCalledWith('입력한 정보를 다시 확인해주세요.')
    })

    it('does not show toast when showToast is false', () => {
      const errors = { email: { message: 'Invalid' } }
      
      errorHandler.handleValidation(errors, false)
      
      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  describe('errorHandler.handleAsync', () => {
    it('handles successful promise', async () => {
      const mockPromise = Promise.resolve('success')
      
      const result = await errorHandler.handleAsync(mockPromise, {
        loadingMessage: 'Loading...',
        successMessage: 'Success!',
      })
      
      expect(result).toBe('success')
      expect(toast.loading).toHaveBeenCalledWith('Loading...')
      expect(toast.success).toHaveBeenCalledWith('Success!')
    })

    it('handles failed promise', async () => {
      const mockError = new Error('Failed')
      const mockPromise = Promise.reject(mockError)
      
      await expect(
        errorHandler.handleAsync(mockPromise, {
          errorMessage: 'Operation failed',
        })
      ).rejects.toThrow()
      
      expect(toast.error).toHaveBeenCalled()
    })

    it('does not show toast when showToast is false', async () => {
      const mockPromise = Promise.resolve('success')
      
      await errorHandler.handleAsync(mockPromise, {
        showToast: false,
      })
      
      expect(toast.loading).not.toHaveBeenCalled()
      expect(toast.success).not.toHaveBeenCalled()
    })
  })

  describe('Custom Error Classes', () => {
    it('creates ValidationError correctly', () => {
      const error = new ValidationError('Validation failed', { field: 'test' })
      
      expect(error).toBeInstanceOf(AppError)
      expect(error.name).toBe('ValidationError')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.status).toBe(400)
      expect(error.details).toEqual({ field: 'test' })
    })

    it('creates AuthenticationError correctly', () => {
      const error = new AuthenticationError('Custom auth message')
      
      expect(error).toBeInstanceOf(AppError)
      expect(error.name).toBe('AuthenticationError')
      expect(error.code).toBe('AUTHENTICATION_ERROR')
      expect(error.status).toBe(401)
      expect(error.message).toBe('Custom auth message')
    })

    it('creates AuthorizationError correctly', () => {
      const error = new AuthorizationError()
      
      expect(error).toBeInstanceOf(AppError)
      expect(error.name).toBe('AuthorizationError')
      expect(error.code).toBe('AUTHORIZATION_ERROR')
      expect(error.status).toBe(403)
    })

    it('creates NotFoundError correctly', () => {
      const error = new NotFoundError('Resource not found')
      
      expect(error).toBeInstanceOf(AppError)
      expect(error.name).toBe('NotFoundError')
      expect(error.code).toBe('NOT_FOUND')
      expect(error.status).toBe(404)
      expect(error.message).toBe('Resource not found')
    })

    it('creates NetworkError correctly', () => {
      const error = new NetworkError()
      
      expect(error).toBeInstanceOf(AppError)
      expect(error.name).toBe('NetworkError')
      expect(error.code).toBe('NETWORK_ERROR')
      expect(error.status).toBe(0)
    })
  })
})
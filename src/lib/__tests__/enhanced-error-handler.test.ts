import { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  NetworkError,
  ErrorCategory,
  ErrorSeverity,
  isNetworkError,
  classifyError
} from '../error-handler'

// Mock toast
jest.mock('@/components/ui/toast-custom', () => ({
  toast: {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn()
  },
  ERROR_MESSAGES: {
    NETWORK: 'Network error',
    UNAUTHORIZED: 'Unauthorized',
    FORBIDDEN: 'Forbidden',
    NOT_FOUND: 'Not found',
    VALIDATION: 'Validation error',
    SERVER: 'Server error',
    UNKNOWN: 'Unknown error',
    TIMEOUT: 'Timeout error'
  }
}))

describe('Enhanced Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('Failed to fetch')
      const classification = classifyError(networkError)
      
      expect(classification.category).toBe(ErrorCategory.NETWORK)
      expect(classification.severity).toBe(ErrorSeverity.MEDIUM)
      expect(classification.retry).toBe(true)
    })

    it('should classify authentication errors correctly', () => {
      const authError = { response: { status: 401 } }
      const classification = classifyError(authError)
      
      expect(classification.category).toBe(ErrorCategory.AUTHENTICATION)
      expect(classification.severity).toBe(ErrorSeverity.HIGH)
      expect(classification.retry).toBe(false)
    })

    it('should classify server errors correctly', () => {
      const serverError = { response: { status: 500 } }
      const classification = classifyError(serverError)
      
      expect(classification.category).toBe(ErrorCategory.SERVER)
      expect(classification.severity).toBe(ErrorSeverity.HIGH)
      expect(classification.retry).toBe(true)
    })

    it('should classify database function errors correctly', () => {
      const dbError = { code: '42883', message: 'function does not exist' }
      const classification = classifyError(dbError)
      
      expect(classification.category).toBe(ErrorCategory.DATABASE)
      expect(classification.severity).toBe(ErrorSeverity.HIGH)
      expect(classification.retry).toBe(true)
    })
  })

  describe('Network Error Detection', () => {
    it('should detect various network error patterns', () => {
      const networkErrors = [
        new Error('Failed to fetch'),
        new Error('Network request failed'),
        { message: 'ERR_NETWORK', toString: () => 'ERR_NETWORK' },
        { message: 'ERR_INTERNET_DISCONNECTED', toString: () => 'ERR_INTERNET_DISCONNECTED' },
        { code: 'ECONNREFUSED', toString: () => 'ECONNREFUSED' },
        { toString: () => 'NetworkError when attempting to fetch resource' }
      ]

      networkErrors.forEach((error, index) => {
        const result = isNetworkError(error)
        if (!result) {
          console.log(`Error ${index} failed:`, error)
        }
        expect(result).toBe(true)
      })
    })

    it('should not classify non-network errors as network errors', () => {
      const nonNetworkErrors = [
        new Error('Validation failed'),
        { message: 'User not found' },
        { code: '23505' },
        null,
        undefined
      ]

      nonNetworkErrors.forEach(error => {
        expect(isNetworkError(error)).toBe(false)
      })
    })
  })

  describe('AppError Class', () => {
    it('should create AppError with default values', () => {
      const error = new AppError('Test message')
      
      expect(error.message).toBe('Test message')
      expect(error.category).toBe(ErrorCategory.UNKNOWN)
      expect(error.severity).toBe(ErrorSeverity.MEDIUM)
      expect(error.retry).toBe(false)
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    it('should create AppError with custom options', () => {
      const error = new AppError('Test message', 'TEST_CODE', 400, { detail: 'test' }, {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retry: true,
        actionRequired: 'Fix input'
      })
      
      expect(error.code).toBe('TEST_CODE')
      expect(error.status).toBe(400)
      expect(error.details).toEqual({ detail: 'test' })
      expect(error.category).toBe(ErrorCategory.VALIDATION)
      expect(error.severity).toBe(ErrorSeverity.LOW)
      expect(error.retry).toBe(true)
      expect(error.actionRequired).toBe('Fix input')
    })
  })

  describe('Specialized Error Classes', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid input', { field: 'email' })
      
      expect(error).toBeInstanceOf(ValidationError)
      expect(error).toBeInstanceOf(AppError)
      expect(error.category).toBe(ErrorCategory.VALIDATION)
      expect(error.severity).toBe(ErrorSeverity.LOW)
      expect(error.retry).toBe(false)
      expect(error.status).toBe(400)
    })

    it('should create AuthenticationError with correct properties', () => {
      const error = new AuthenticationError()
      
      expect(error).toBeInstanceOf(AuthenticationError)
      expect(error.category).toBe(ErrorCategory.AUTHENTICATION)
      expect(error.severity).toBe(ErrorSeverity.HIGH)
      expect(error.retry).toBe(false)
      expect(error.status).toBe(401)
      expect(error.actionRequired).toBe('Sign in')
    })

    it('should create NetworkError with correct properties', () => {
      const error = new NetworkError()
      
      expect(error).toBeInstanceOf(NetworkError)
      expect(error.category).toBe(ErrorCategory.NETWORK)
      expect(error.severity).toBe(ErrorSeverity.MEDIUM)
      expect(error.retry).toBe(true)
      expect(error.status).toBe(0)
    })
  })
})
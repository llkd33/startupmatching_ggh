import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toast-custom'
import { errorHandler } from '@/lib/error-handler'

export function useErrorHandler() {
  const router = useRouter()
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string> | null>(null)
  const [lastAsyncFn, setLastAsyncFn] = useState<(() => Promise<any>) | null>(null)

  const handleError = useCallback((error: any) => {
    const appError = errorHandler.handle(error)
    setError(appError)
    
    // Handle authentication errors
    if (error?.response?.status === 401) {
      router.push('/auth/login')
    }
    
    return appError
  }, [router])

  const handleAsync = useCallback(async <T,>(
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    setLoading(true)
    setError(null)
    setLastAsyncFn(() => asyncFn)
    
    try {
      const result = await asyncFn()
      setLoading(false)
      return result
    } catch (error) {
      setLoading(false)
      handleError(error)
      throw error
    }
  }, [handleError])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleFormError = useCallback((errors: Record<string, string>) => {
    setFormErrors(errors)
    const firstError = Object.values(errors)[0]
    if (firstError) {
      toast.error(firstError)
    }
  }, [])

  const clearFormErrors = useCallback(() => {
    setFormErrors(null)
  }, [])

  const retry = useCallback(async () => {
    if (lastAsyncFn) {
      return handleAsync(lastAsyncFn)
    }
    return null
  }, [lastAsyncFn, handleAsync])

  return {
    error,
    loading,
    formErrors,
    handleError,
    handleAsync,
    clearError,
    handleFormError,
    clearFormErrors,
    retry,
  }
}
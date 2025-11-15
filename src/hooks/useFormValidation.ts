'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any, allValues?: any) => string | null | Promise<string | null>
  email?: boolean
  url?: boolean
  phone?: boolean
  min?: number
  max?: number
}

interface ValidationRules {
  [field: string]: ValidationRule
}

interface ValidationErrors {
  [field: string]: string
}

interface ValidationOptions {
  mode?: 'onChange' | 'onBlur' | 'onSubmit'
  reValidateMode?: 'onChange' | 'onBlur'
  debounceTime?: number
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  rules: ValidationRules,
  options: ValidationOptions = {}
) {
  const {
    mode = 'onChange',
    reValidateMode = 'onChange',
    debounceTime = 300
  } = options

  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [validating, setValidating] = useState<Record<string, boolean>>({})
  const [isDirty, setIsDirty] = useState(false)
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({})

  const validateField = useCallback(async (field: string, value: any, allValues?: T): Promise<string | null> => {
    const rule = rules[field]
    if (!rule) return null

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return '필수 입력 항목입니다.'
    }

    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && !value.trim())) {
      return null
    }

    // Email validation
    if (rule.email && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return '올바른 이메일 주소를 입력해주세요.'
      }
    }

    // Phone validation
    if (rule.phone && typeof value === 'string') {
      const phoneRegex = /^01[0-9]-?[0-9]{4}-?[0-9]{4}$/
      if (!phoneRegex.test(value)) {
        return '올바른 전화번호 형식으로 입력해주세요.'
      }
    }

    // URL validation
    if (rule.url && typeof value === 'string') {
      try {
        new URL(value)
      } catch {
        return '올바른 URL을 입력해주세요.'
      }
    }

    // Min length validation
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return `최소 ${rule.minLength}자 이상 입력해주세요.`
    }

    // Max length validation
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return `최대 ${rule.maxLength}자까지 입력 가능합니다.`
    }

    // Min validation for numbers
    if (rule.min !== undefined && Number(value) < rule.min) {
      return `${rule.min} 이상의 값을 입력해주세요.`
    }

    // Max validation for numbers
    if (rule.max !== undefined && Number(value) > rule.max) {
      return `${rule.max} 이하의 값을 입력해주세요.`
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return '올바른 형식으로 입력해주세요.'
    }

    // Custom validation (can be async)
    if (rule.custom) {
      const result = await rule.custom(value, allValues || values)
      return result
    }

    return null
  }, [rules, values])

  // Debounced validation
  const debouncedValidate = useCallback((field: string, value: any) => {
    if (debounceTimers.current[field]) {
      clearTimeout(debounceTimers.current[field])
    }

    setValidating(prev => ({ ...prev, [field]: true }))

    debounceTimers.current[field] = setTimeout(async () => {
      const error = await validateField(field, value, values)
      setErrors(prev => ({ ...prev, [field]: error || '' }))
      setValidating(prev => ({ ...prev, [field]: false }))
    }, debounceTime)
  }, [validateField, debounceTime, values])

  const validateAllFields = useCallback(async (): Promise<boolean> => {
    const newErrors: ValidationErrors = {}
    let isValid = true

    for (const field of Object.keys(rules)) {
      const error = await validateField(field, values[field], values)
      if (error) {
        newErrors[field] = error
        isValid = false
      }
    }

    setErrors(newErrors)
    return isValid
  }, [rules, values, validateField])

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
    
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Real-time validation based on mode
    if (mode === 'onChange' || (touched[field as string] && reValidateMode === 'onChange')) {
      debouncedValidate(field as string, value)
    }
  }, [errors, mode, touched, reValidateMode, debouncedValidate])

  const setMultipleValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }))
    setIsDirty(true)
  }, [])

  const handleBlur = useCallback(async (field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    
    if (mode === 'onBlur' || reValidateMode === 'onBlur') {
      const error = await validateField(field as string, values[field], values)
      setErrors(prev => ({ ...prev, [field]: error || '' }))
    }
  }, [values, validateField, mode, reValidateMode])

  const handleChange = useCallback((field: keyof T, value: any) => {
    setValue(field, value)
  }, [setValue])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setValidating({})
    setIsDirty(false)
    // Clear all debounce timers
    Object.values(debounceTimers.current).forEach(clearTimeout)
    debounceTimers.current = {}
  }, [initialValues])

  const getFieldProps = useCallback((field: keyof T) => ({
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      handleChange(field, e.target.value)
    },
    onBlur: () => handleBlur(field),
    error: touched[field as string] ? errors[field as string] : undefined,
    'aria-invalid': touched[field as string] && !!errors[field as string],
    'aria-describedby': errors[field as string] ? `${String(field)}-error` : undefined,
  }), [values, errors, touched, handleChange, handleBlur])

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout)
    }
  }, [])

  const isValid = Object.keys(errors).every(key => !errors[key])
  const hasErrors = Object.keys(errors).some(key => !!errors[key])
  const isValidating = Object.values(validating).some(v => v)

  return {
    values,
    errors,
    touched,
    validating,
    isValid,
    hasErrors,
    isValidating,
    isDirty,
    setValue,
    setValues: setMultipleValues,
    handleChange,
    handleBlur,
    validateAllFields,
    reset,
    getFieldProps,
  }
}

// Common validation patterns
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^01[0-9]-?[0-9]{4}-?[0-9]{4}$/,
  businessNumber: /^[0-9]{3}-?[0-9]{2}-?[0-9]{5}$/,
  url: /^https?:\/\/.+\..+/,
  korean: /^[ㄱ-ㅎ가-힣]+$/,
}

// Common validation rules
export const commonRules = {
  required: { required: true },
  email: { 
    required: true, 
    pattern: validationPatterns.email 
  },
  phone: { 
    pattern: validationPatterns.phone 
  },
  password: { 
    required: true, 
    minLength: 6 
  },
  businessNumber: { 
    pattern: validationPatterns.businessNumber 
  },
  url: { 
    pattern: validationPatterns.url 
  },
}
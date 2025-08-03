'use client'

import { useState, useCallback } from 'react'

interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

interface ValidationRules {
  [field: string]: ValidationRule
}

interface ValidationErrors {
  [field: string]: string
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  rules: ValidationRules
) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = useCallback((field: string, value: any): string | null => {
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

    // Min length validation
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return `최소 ${rule.minLength}자 이상 입력해주세요.`
    }

    // Max length validation
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return `최대 ${rule.maxLength}자까지 입력 가능합니다.`
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return '올바른 형식으로 입력해주세요.'
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value)
    }

    return null
  }, [rules])

  const validateAllFields = useCallback((): boolean => {
    const newErrors: ValidationErrors = {}
    let isValid = true

    Object.keys(rules).forEach(field => {
      const error = validateField(field, values[field])
      if (error) {
        newErrors[field] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }, [rules, values, validateField])

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }, [errors])

  const setValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }))
  }, [])

  const handleBlur = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    
    const error = validateField(field as string, values[field])
    setErrors(prev => ({ ...prev, [field]: error }))
  }, [values, validateField])

  const handleChange = useCallback((field: keyof T, value: any) => {
    setValue(field, value)
  }, [setValue])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  const getFieldProps = useCallback((field: keyof T) => ({
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      handleChange(field, e.target.value)
    },
    onBlur: () => handleBlur(field),
    error: touched[field as string] ? errors[field as string] : undefined,
  }), [values, errors, touched, handleChange, handleBlur])

  const isValid = Object.keys(errors).every(key => !errors[key])
  const hasErrors = Object.keys(errors).some(key => errors[key])

  return {
    values,
    errors,
    touched,
    isValid,
    hasErrors,
    setValue,
    setValues,
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
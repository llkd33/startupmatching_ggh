'use client'

import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Input, InputProps } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface FormFieldProps extends InputProps {
  label: string
  error?: string
  description?: string
  required?: boolean
  success?: boolean
  successMessage?: string
}

/**
 * FormField - Accessible form field with label, input, and error message
 *
 * Features:
 * - Automatic aria-invalid and aria-describedby linking
 * - Visual error indication with red border
 * - Screen reader accessible error messages
 * - Optional description text
 */
export function FormField({
  label,
  error,
  description,
  required,
  success,
  successMessage,
  id,
  className,
  ...inputProps
}: FormFieldProps) {
  // Generate unique IDs for accessibility
  const fieldId = id || React.useId()
  const errorId = `${fieldId}-error`
  const successId = `${fieldId}-success`
  const descriptionId = `${fieldId}-description`

  // Build aria-describedby from available elements
  const describedByIds = [
    error && errorId,
    success && successMessage && successId,
    description && descriptionId,
  ].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={fieldId} className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive" aria-hidden="true">*</span>}
        {required && <span className="sr-only">(필수)</span>}
      </Label>

      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}

      <div className="relative">
        <Input
          id={fieldId}
          error={!!error}
          errorId={errorId}
          aria-describedby={describedByIds}
          aria-required={required}
          className={cn(
            success && !error && "border-green-500 focus-visible:ring-green-500"
          )}
          {...inputProps}
        />
        {/* Success/Error icon indicator */}
        {(error || success) && !inputProps.disabled && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {error ? (
              <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
            ) : success ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
            ) : null}
          </div>
        )}
      </div>

      {/* Error message with animation */}
      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Success message */}
      {success && successMessage && !error && (
        <p
          id={successId}
          className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {successMessage}
        </p>
      )}
    </div>
  )
}

/**
 * FormFieldTextarea - Accessible textarea field with label and error message
 */
interface FormFieldTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  description?: string
  required?: boolean
  showCharCount?: boolean
}

export function FormFieldTextarea({
  label,
  error,
  description,
  required,
  showCharCount,
  id,
  className,
  value,
  maxLength,
  ...textareaProps
}: FormFieldTextareaProps) {
  const fieldId = id || React.useId()
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  const describedByIds = [
    error && errorId,
    description && descriptionId,
  ].filter(Boolean).join(' ') || undefined

  const charCount = typeof value === 'string' ? value.length : 0
  const isNearLimit = maxLength && charCount > maxLength * 0.9

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldId} className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive" aria-hidden="true">*</span>}
          {required && <span className="sr-only">(필수)</span>}
        </Label>
        {showCharCount && maxLength && (
          <span
            className={cn(
              "text-xs",
              isNearLimit ? "text-orange-500 dark:text-orange-400" : "text-muted-foreground",
              charCount > maxLength && "text-destructive"
            )}
            aria-live="polite"
          >
            {charCount}/{maxLength}
          </span>
        )}
      </div>

      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}

      <textarea
        id={fieldId}
        value={value}
        maxLength={maxLength}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive"
        )}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedByIds}
        aria-required={required}
        {...textareaProps}
      />

      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * FormFieldSelect - Accessible select field with label and error message
 */
interface FormFieldSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  description?: string
  required?: boolean
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

export function FormFieldSelect({
  label,
  error,
  description,
  required,
  options,
  placeholder,
  id,
  className,
  ...selectProps
}: FormFieldSelectProps) {
  const fieldId = id || React.useId()
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  const describedByIds = [
    error && errorId,
    description && descriptionId,
  ].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={fieldId} className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive" aria-hidden="true">*</span>}
        {required && <span className="sr-only">(필수)</span>}
      </Label>

      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}

      <div className="relative">
        <select
          id={fieldId}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none min-h-[44px]",
            error && "border-destructive focus-visible:ring-destructive",
            !selectProps.value && placeholder && "text-muted-foreground"
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedByIds}
          aria-required={required}
          {...selectProps}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {/* Dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className={cn("h-4 w-4", error ? "text-destructive" : "text-muted-foreground")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

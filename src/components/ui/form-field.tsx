'use client'

import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Input, InputProps } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface FormFieldProps extends InputProps {
  label: string
  error?: string
  description?: string
  required?: boolean
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
  id,
  className,
  ...inputProps
}: FormFieldProps) {
  // Generate unique IDs for accessibility
  const fieldId = id || React.useId()
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  // Build aria-describedby from available elements
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

      <Input
        id={fieldId}
        error={!!error}
        errorId={errorId}
        aria-describedby={describedByIds}
        aria-required={required}
        {...inputProps}
      />

      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive flex items-center gap-1"
          role="alert"
          aria-live="polite"
        >
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
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
}

export function FormFieldTextarea({
  label,
  error,
  description,
  required,
  id,
  className,
  ...textareaProps
}: FormFieldTextareaProps) {
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

      <textarea
        id={fieldId}
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
          className="text-sm text-destructive flex items-center gap-1"
          role="alert"
          aria-live="polite"
        >
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

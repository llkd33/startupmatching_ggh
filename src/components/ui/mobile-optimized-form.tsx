'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Mobile-optimized form wrapper
interface MobileFormProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  showProgress?: {
    current: number
    total: number
  }
}

export function MobileForm({ 
  children, 
  title, 
  description, 
  className,
  showProgress 
}: MobileFormProps) {
  return (
    <div className={cn("max-w-md mx-auto px-4 py-6", className)}>
      {(title || description || showProgress) && (
        <div className="mb-6">
          {showProgress && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>진행률</span>
                <span>{showProgress.current}/{showProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(showProgress.current / showProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {title && (
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {title}
            </h1>
          )}
          
          {description && (
            <p className="text-gray-600 text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      
      {children}
    </div>
  )
}

// Mobile-optimized form field
interface MobileFormFieldProps {
  label: string
  children: React.ReactNode
  error?: string
  required?: boolean
  description?: string
  className?: string
}

export function MobileFormField({
  label,
  children,
  error,
  required,
  description,
  className
}: MobileFormFieldProps) {
  return (
    <div className={cn("mb-6", className)}>
      <Label className="text-sm font-medium text-gray-700 mb-2 block">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      {description && (
        <p className="text-xs text-gray-500 mb-2">
          {description}
        </p>
      )}
      
      {children}
      
      {error && (
        <p className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  )
}

// Touch-optimized input with proper sizing
interface TouchInputProps extends React.ComponentProps<typeof Input> {
  icon?: React.ReactNode
  suffix?: React.ReactNode
}

export const TouchInput = forwardRef<HTMLInputElement, TouchInputProps>(
  ({ className, icon, suffix, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        <Input
          ref={ref}
          className={cn(
            // Touch-optimized sizing (min 44px height)
            "min-h-[44px] text-base", 
            // Better spacing for mobile
            icon ? "pl-10" : "pl-4",
            suffix ? "pr-10" : "pr-4",
            // Enhanced focus states for mobile
            "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            className
          )}
          {...props}
        />
        
        {suffix && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {suffix}
          </div>
        )}
      </div>
    )
  }
)

TouchInput.displayName = 'TouchInput'

// Touch-optimized textarea
interface TouchTextareaProps extends React.ComponentProps<typeof Textarea> {
  autoExpand?: boolean
}

export const TouchTextarea = forwardRef<HTMLTextAreaElement, TouchTextareaProps>(
  ({ className, autoExpand = false, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        className={cn(
          // Touch-optimized sizing
          "min-h-[120px] text-base resize-none",
          // Better spacing
          "p-4",
          // Enhanced focus states
          "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          // Auto-expand behavior
          autoExpand && "resize-none overflow-hidden",
          className
        )}
        {...props}
        style={{
          ...(autoExpand && {
            height: 'auto',
            minHeight: '120px'
          }),
          ...props.style
        }}
      />
    )
  }
)

TouchTextarea.displayName = 'TouchTextarea'

// Mobile-optimized button group
interface MobileButtonGroupProps {
  children: React.ReactNode
  direction?: 'horizontal' | 'vertical'
  className?: string
}

export function MobileButtonGroup({ 
  children, 
  direction = 'vertical', 
  className 
}: MobileButtonGroupProps) {
  return (
    <div className={cn(
      "flex gap-3",
      direction === 'vertical' ? "flex-col" : "flex-row",
      direction === 'horizontal' && "sm:flex-row flex-col",
      className
    )}>
      {children}
    </div>
  )
}

// Touch-optimized button with proper sizing
interface TouchButtonProps extends React.ComponentProps<typeof Button> {
  fullWidth?: boolean
  loading?: boolean
}

export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ className, fullWidth, loading, children, disabled, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          // Touch-optimized sizing (min 44px height)
          "min-h-[44px] text-base font-medium",
          // Full width option for mobile
          fullWidth && "w-full",
          // Better padding
          "px-6 py-3",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        )}
        {children}
      </Button>
    )
  }
)

TouchButton.displayName = 'TouchButton'

// Mobile-optimized select/option components
interface MobileSelectOption {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
}

interface MobileSelectProps {
  options: MobileSelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  multiple?: boolean
  className?: string
}

export function MobileSelect({
  options,
  value,
  onChange,
  placeholder = "선택하세요",
  multiple = false,
  className
}: MobileSelectProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {options.map((option) => (
        <div
          key={option.value}
          onClick={() => onChange?.(option.value)}
          className={cn(
            // Touch-optimized sizing
            "min-h-[44px] p-4 rounded-lg border cursor-pointer transition-all",
            "flex items-center gap-3",
            // Selected state
            value === option.value ? 
              "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : 
              "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          )}
        >
          {option.icon && (
            <div className="flex-shrink-0 text-gray-400">
              {option.icon}
            </div>
          )}
          
          <div className="flex-1">
            <div className="font-medium text-gray-900">
              {option.label}
            </div>
            {option.description && (
              <div className="text-sm text-gray-500 mt-1">
                {option.description}
              </div>
            )}
          </div>
          
          {value === option.value && (
            <div className="flex-shrink-0 text-blue-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Mobile card layout component
interface MobileCardProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  noPadding?: boolean
}

export function MobileCard({
  children,
  title,
  description,
  className,
  noPadding = false
}: MobileCardProps) {
  return (
    <Card className={cn("mb-4", className)}>
      {(title || description) && (
        <CardHeader className="pb-3">
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      
      <CardContent className={noPadding ? "p-0" : ""}>
        {children}
      </CardContent>
    </Card>
  )
}

// Responsive form layout that adapts to screen size
interface ResponsiveFormLayoutProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

export function ResponsiveFormLayout({
  children,
  maxWidth = 'md'
}: ResponsiveFormLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg', 
    xl: 'max-w-xl'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className={cn("mx-auto", maxWidthClasses[maxWidth])}>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { User, Building2, LucideIcon } from 'lucide-react'

interface RoleOption {
  value: string
  label: string
  description: string
  icon?: LucideIcon
}

interface RoleSelectorProps {
  value: string
  onChange: (value: string) => void
  options?: RoleOption[]
  name?: string
  disabled?: boolean
  error?: string
  className?: string
}

const defaultOptions: RoleOption[] = [
  {
    value: 'expert',
    label: '전문가',
    description: '컨설턴트, 멘토, 강사',
    icon: User
  },
  {
    value: 'organization',
    label: '기관',
    description: '창업지원기관, 기업',
    icon: Building2
  }
]

/**
 * RoleSelector - Accessible role selection with keyboard navigation
 *
 * Features:
 * - Radio group semantics for screen readers
 * - Arrow key navigation
 * - Focus management
 * - Dark mode support
 * - Touch-friendly targets (44px)
 */
export function RoleSelector({
  value,
  onChange,
  options = defaultOptions,
  name = 'role',
  disabled = false,
  error,
  className
}: RoleSelectorProps) {
  const groupRef = React.useRef<HTMLDivElement>(null)

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const optionCount = options.length

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        e.preventDefault()
        const nextIndex = (index + 1) % optionCount
        const nextOption = options[nextIndex]
        onChange(nextOption.value)
        // Focus the next button
        const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
        buttons?.[nextIndex]?.focus()
        break
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        e.preventDefault()
        const prevIndex = (index - 1 + optionCount) % optionCount
        const prevOption = options[prevIndex]
        onChange(prevOption.value)
        // Focus the previous button
        const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
        buttons?.[prevIndex]?.focus()
        break
      }
      case ' ':
      case 'Enter': {
        e.preventDefault()
        onChange(options[index].value)
        break
      }
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label="가입 유형 선택"
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          "grid gap-3",
          options.length === 2 && "grid-cols-2",
          options.length === 3 && "grid-cols-3",
          options.length > 3 && "grid-cols-2 sm:grid-cols-3"
        )}
      >
        {options.map((option, index) => {
          const isSelected = value === option.value
          const Icon = option.icon

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${option.label}: ${option.description}`}
              tabIndex={isSelected ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                "relative rounded-lg border p-4 flex flex-col items-center cursor-pointer transition-all duration-200",
                "min-h-[120px] min-w-[44px]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-primary ring-2 ring-primary bg-primary/5 dark:bg-primary/10"
                  : "border-input hover:border-primary/50 hover:bg-muted/50",
                error && !isSelected && "border-destructive/50"
              )}
            >
              {/* Selection indicator */}
              <div
                className={cn(
                  "absolute top-3 right-3 w-4 h-4 rounded-full border-2 transition-colors",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40"
                )}
              >
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
              </div>

              {/* Icon */}
              {Icon && (
                <div
                  className={cn(
                    "mb-2 p-2 rounded-full",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
              )}

              {/* Label */}
              <span
                className={cn(
                  "text-sm font-medium",
                  isSelected ? "text-primary" : "text-foreground"
                )}
              >
                {option.label}
              </span>

              {/* Description */}
              <span className="text-xs text-muted-foreground mt-1 text-center">
                {option.description}
              </span>

              {/* Hidden input for form submission */}
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
                disabled={disabled}
              />
            </button>
          )
        })}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1.5" role="alert">
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

// Compact variant for smaller spaces
interface CompactRoleSelectorProps extends RoleSelectorProps {
  size?: 'sm' | 'md'
}

export function CompactRoleSelector({
  value,
  onChange,
  options = defaultOptions,
  name = 'role',
  disabled = false,
  size = 'md',
  className
}: CompactRoleSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="가입 유형 선택"
      className={cn("flex rounded-lg border border-input p-1 bg-muted/30", className)}
    >
      {options.map((option) => {
        const isSelected = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 px-4 rounded-md font-medium transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              "disabled:cursor-not-allowed disabled:opacity-50",
              size === 'sm' ? "py-2 text-sm min-h-[36px]" : "py-2.5 text-sm min-h-[44px]",
              isSelected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="sr-only"
              disabled={disabled}
            />
          </button>
        )
      })}
    </div>
  )
}

'use client'

import * as React from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ToastProps {
  id: string
  title?: string
  description?: string
  type?: 'default' | 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: React.ReactNode
}

const toastIcons = {
  default: null,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const toastStyles = {
  default: 'bg-white border-gray-200',
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-yellow-50 border-yellow-200',
  info: 'bg-blue-50 border-blue-200',
}

const iconStyles = {
  default: 'text-gray-600',
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  info: 'text-blue-600',
}

export function Toast({
  title,
  description,
  type = 'default',
  action,
  onClose,
}: ToastProps & { onClose: () => void }) {
  const Icon = toastIcons[type]

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-md rounded-lg border p-4 shadow-lg transition-all',
        'animate-in slide-in-from-top-full',
        toastStyles[type]
      )}
    >
      {Icon && (
        <Icon className={cn('h-5 w-5 shrink-0', iconStyles[type])} />
      )}
      <div className="ml-3 flex-1">
        {title && (
          <p className="text-sm font-semibold text-gray-900">{title}</p>
        )}
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
      <button
        onClick={onClose}
        className="ml-4 inline-flex shrink-0 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="sr-only">닫기</span>
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}
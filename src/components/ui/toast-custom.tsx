'use client'

import { Toaster, toast as sonnerToast } from 'sonner'
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react'

// Enhanced toast configuration with accessibility
export function ToastProvider() {
  return (
    <>
      <Toaster
        richColors
        position="top-right"
        duration={5000}
        closeButton
        expand={true}
        visibleToasts={5}
        toastOptions={{
          style: {
            fontSize: '14px',
            fontFamily: 'inherit',
          },
          className: 'font-sans',
          classNames: {
            toast: 'toast-base',
            title: 'toast-title',
            description: 'toast-description',
            actionButton: 'toast-action',
            cancelButton: 'toast-cancel',
            closeButton: 'toast-close',
            error: 'toast-error',
            success: 'toast-success',
            warning: 'toast-warning',
            info: 'toast-info',
            loading: 'toast-loading'
          },
          // Accessibility attributes
          ariaProps: {
            role: 'alert',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
          }
        }}
        icons={{
          success: <CheckCircle2 className="h-5 w-5" aria-hidden="true" />,
          error: <XCircle className="h-5 w-5" aria-hidden="true" />,
          warning: <AlertCircle className="h-5 w-5" aria-hidden="true" />,
          info: <Info className="h-5 w-5" aria-hidden="true" />,
          loading: <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" aria-hidden="true" />
        }}
      />
      
      {/* Toast styles */}
      <style jsx global>{`
        .toast-base {
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .toast-title {
          font-weight: 600;
          line-height: 1.4;
        }
        
        .toast-description {
          opacity: 0.9;
          font-size: 13px;
          line-height: 1.4;
          margin-top: 2px;
        }
        
        .toast-action {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .toast-action:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }
        
        .toast-action:focus {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }
        
        .toast-cancel {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 500;
          opacity: 0.8;
          transition: all 0.2s ease;
        }
        
        .toast-cancel:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
        }
        
        .toast-close {
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }
        
        .toast-close:hover {
          opacity: 1;
        }
        
        .toast-close:focus {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }
        
        .toast-error {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05));
          border-color: rgba(239, 68, 68, 0.2);
          color: rgb(239, 68, 68);
        }
        
        .toast-success {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.05));
          border-color: rgba(34, 197, 94, 0.2);
          color: rgb(34, 197, 94);
        }
        
        .toast-warning {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05));
          border-color: rgba(245, 158, 11, 0.2);
          color: rgb(245, 158, 11);
        }
        
        .toast-info {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05));
          border-color: rgba(59, 130, 246, 0.2);
          color: rgb(59, 130, 246);
        }
        
        .toast-loading {
          background: linear-gradient(135deg, rgba(107, 114, 128, 0.1), rgba(75, 85, 99, 0.05));
          border-color: rgba(107, 114, 128, 0.2);
          color: rgb(107, 114, 128);
        }
        
        .toast-important {
          animation: toast-bounce 0.5s ease-out;
          border-width: 2px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        @keyframes toast-bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0, 0, 0);
          }
          40%, 43% {
            transform: translate3d(0, -8px, 0);
          }
          70% {
            transform: translate3d(0, -4px, 0);
          }
          90% {
            transform: translate3d(0, -2px, 0);
          }
        }
        
        /* Dark mode adjustments */
        @media (prefers-color-scheme: dark) {
          .toast-base {
            background: rgba(17, 24, 39, 0.95);
            border-color: rgba(75, 85, 99, 0.3);
            color: rgb(243, 244, 246);
          }
          
          .toast-action {
            background: rgba(75, 85, 99, 0.3);
            border-color: rgba(107, 114, 128, 0.4);
            color: rgb(243, 244, 246);
          }
          
          .toast-action:hover {
            background: rgba(75, 85, 99, 0.5);
          }
          
          .toast-cancel {
            border-color: rgba(107, 114, 128, 0.4);
            color: rgb(209, 213, 219);
          }
          
          .toast-cancel:hover {
            background: rgba(75, 85, 99, 0.3);
          }
        }
        
        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .toast-important {
            animation: none;
          }
          
          .toast-action, .toast-cancel, .toast-close {
            transition: none;
          }
        }
        
        /* High contrast mode */
        @media (prefers-contrast: high) {
          .toast-base {
            border-width: 2px;
            border-color: currentColor;
          }
          
          .toast-action, .toast-cancel {
            border-width: 2px;
            border-color: currentColor;
          }
        }
      `}</style>
    </>
  )
}

// Enhanced toast options interface
interface ToastOptions {
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  cancel?: {
    label: string
    onClick?: () => void
  }
  id?: string | number
  important?: boolean
  dismissible?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
}

// Enhanced toast utilities with better error handling and accessibility
export const toast = {
  success: (message: string, options?: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { description: options } : options || {}
    
    return sonnerToast.success(message, {
      description: opts.description,
      duration: opts.duration || 4000,
      id: opts.id,
      dismissible: opts.dismissible !== false,
      action: opts.action ? {
        label: opts.action.label,
        onClick: opts.action.onClick
      } : undefined,
      cancel: opts.cancel ? {
        label: opts.cancel.label,
        onClick: opts.cancel.onClick
      } : undefined,
      className: opts.important ? 'toast-important' : undefined
    })
  },
  
  error: (message: string, options?: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { description: options } : options || {}
    
    return sonnerToast.error(message, {
      description: opts.description,
      duration: opts.duration || 8000, // Errors stay longer
      id: opts.id,
      dismissible: opts.dismissible !== false,
      action: opts.action ? {
        label: opts.action.label,
        onClick: opts.action.onClick
      } : undefined,
      cancel: opts.cancel ? {
        label: opts.cancel.label,
        onClick: opts.cancel.onClick
      } : undefined,
      className: opts.important ? 'toast-important toast-error' : 'toast-error'
    })
  },
  
  warning: (message: string, options?: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { description: options } : options || {}
    
    return sonnerToast.warning(message, {
      description: opts.description,
      duration: opts.duration || 6000,
      id: opts.id,
      dismissible: opts.dismissible !== false,
      action: opts.action ? {
        label: opts.action.label,
        onClick: opts.action.onClick
      } : undefined,
      cancel: opts.cancel ? {
        label: opts.cancel.label,
        onClick: opts.cancel.onClick
      } : undefined,
      className: opts.important ? 'toast-important toast-warning' : 'toast-warning'
    })
  },
  
  info: (message: string, options?: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { description: options } : options || {}
    
    return sonnerToast.info(message, {
      description: opts.description,
      duration: opts.duration || 5000,
      id: opts.id,
      dismissible: opts.dismissible !== false,
      action: opts.action ? {
        label: opts.action.label,
        onClick: opts.action.onClick
      } : undefined,
      cancel: opts.cancel ? {
        label: opts.cancel.label,
        onClick: opts.cancel.onClick
      } : undefined,
      className: opts.important ? 'toast-important toast-info' : 'toast-info'
    })
  },
  
  loading: (message: string, options?: Omit<ToastOptions, 'action' | 'cancel'>) => {
    const opts = options || {}
    
    return sonnerToast.loading(message, {
      description: opts.description,
      id: opts.id,
      dismissible: opts.dismissible !== false,
      className: opts.important ? 'toast-important toast-loading' : 'toast-loading'
    })
  },
  
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    },
    options?: ToastOptions
  ) => {
    const opts = options || {}
    
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error
    }, {
      id: opts.id,
      duration: opts.duration,
      action: opts.action ? {
        label: opts.action.label,
        onClick: opts.action.onClick
      } : undefined,
      cancel: opts.cancel ? {
        label: opts.cancel.label,
        onClick: opts.cancel.onClick
      } : undefined
    })
  },
  
  dismiss: (id?: string | number) => {
    sonnerToast.dismiss(id)
  },

  // Specialized toast methods for common error scenarios
  networkError: (message?: string, options?: ToastOptions) => {
    return toast.error(message || ERROR_MESSAGES.NETWORK, {
      ...options,
      action: {
        label: 'Retry',
        onClick: () => window.location.reload()
      },
      duration: 8000
    })
  },

  authError: (message?: string, options?: ToastOptions) => {
    return toast.error(message || ERROR_MESSAGES.UNAUTHORIZED, {
      ...options,
      action: {
        label: 'Sign In',
        onClick: () => window.location.href = '/auth/login'
      },
      duration: 10000
    })
  },

  databaseError: (message?: string, options?: ToastOptions) => {
    return toast.error(message || 'Database error occurred', {
      ...options,
      description: 'Our team has been notified and is working on a fix',
      action: {
        label: 'Try Again',
        onClick: () => window.location.reload()
      },
      duration: 8000
    })
  },

  validationError: (message?: string, options?: ToastOptions) => {
    return toast.warning(message || ERROR_MESSAGES.VALIDATION, {
      ...options,
      duration: 6000
    })
  },

  // Batch operations
  dismissAll: () => {
    sonnerToast.dismiss()
  },

  // Custom toast with full control
  custom: (component: React.ReactNode, options?: ToastOptions) => {
    return sonnerToast.custom(component, {
      duration: options?.duration || 5000,
      id: options?.id,
      dismissible: options?.dismissible !== false
    })
  }
}

// Common error messages in Korean
export const ERROR_MESSAGES = {
  NETWORK: '네트워크 연결을 확인해주세요.',
  UNAUTHORIZED: '로그인이 필요합니다.',
  FORBIDDEN: '접근 권한이 없습니다.',
  NOT_FOUND: '요청한 내용을 찾을 수 없습니다.',
  VALIDATION: '입력한 정보를 다시 확인해주세요.',
  SERVER: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  UNKNOWN: '알 수 없는 오류가 발생했습니다.',
  TIMEOUT: '요청 시간이 초과되었습니다.',
  FILE_TOO_LARGE: '파일 크기가 너무 큽니다.',
  INVALID_FILE_TYPE: '지원하지 않는 파일 형식입니다.',
}

// Success messages in Korean
export const SUCCESS_MESSAGES = {
  SAVED: '저장되었습니다.',
  UPDATED: '수정되었습니다.',
  DELETED: '삭제되었습니다.',
  SENT: '전송되었습니다.',
  CREATED: '생성되었습니다.',
  COPIED: '복사되었습니다.',
  UPLOADED: '업로드되었습니다.',
  APPROVED: '승인되었습니다.',
  REJECTED: '거절되었습니다.',
  COMPLETED: '완료되었습니다.',
}
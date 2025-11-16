'use client'

import * as React from 'react'
import { Toast, ToastProps } from './toast'

interface ToastContextType {
  toast: (props: Omit<ToastProps, 'id'>) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = React.useCallback((props: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    const toast: ToastProps = { ...props, id }
    
    setToasts((prev) => [...prev, toast])

    // Auto remove after duration
    const duration = props.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const toast = React.useCallback((props: Omit<ToastProps, 'id'>) => {
    addToast(props)
  }, [addToast])

  const success = React.useCallback((description: string, title?: string) => {
    addToast({ 
      title: title || '성공', 
      description, 
      type: 'success' 
    })
  }, [addToast])

  const error = React.useCallback((description: string, title?: string) => {
    addToast({ 
      title: title || '오류', 
      description, 
      type: 'error' 
    })
  }, [addToast])

  const warning = React.useCallback((description: string, title?: string) => {
    addToast({ 
      title: title || '경고', 
      description, 
      type: 'warning' 
    })
  }, [addToast])

  const info = React.useCallback((description: string, title?: string) => {
    addToast({ 
      title: title || '알림', 
      description, 
      type: 'info' 
    })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-auto sm:right-0 sm:top-0 sm:flex-col md:max-w-[420px]">
          {toasts.map((toast) => (
            <div key={toast.id} className="mb-2">
              <Toast {...toast} onClose={() => removeToast(toast.id)} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
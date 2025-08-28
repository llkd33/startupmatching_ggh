'use client'

import { useState } from 'react'
import { AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  type?: 'danger' | 'warning' | 'info'
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = '확인',
  cancelText = '취소',
  loading = false,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Confirmation error:', error)
    } finally {
      setIsConfirming(false)
    }
  }

  const icons = {
    danger: <AlertTriangle className="w-6 h-6 text-red-600" />,
    warning: <AlertCircle className="w-6 h-6 text-yellow-600" />,
    info: <Info className="w-6 h-6 text-blue-600" />,
  }

  const colors = {
    danger: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={!loading && !isConfirming ? onClose : undefined}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className={cn("p-4 border rounded-t-lg", colors[type])}>
            <div className="flex items-center gap-3">
              {icons[type]}
              <h3 className="text-lg font-semibold">{title}</h3>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700">{message}</p>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading || isConfirming}
            >
              {cancelText}
            </Button>
            <Button
              variant={type === 'danger' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={loading || isConfirming}
            >
              {isConfirming ? '처리 중...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// Hook for easier usage
export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'danger' | 'warning' | 'info'
    onConfirm: () => void | Promise<void>
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {},
  })

  const showConfirm = ({
    title,
    message,
    type = 'warning',
    onConfirm,
  }: {
    title: string
    message: string
    type?: 'danger' | 'warning' | 'info'
    onConfirm: () => void | Promise<void>
  }) => {
    setDialogState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
    })
  }

  const hideConfirm = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }))
  }

  return {
    dialogProps: {
      ...dialogState,
      onClose: hideConfirm,
    },
    showConfirm,
    hideConfirm,
  }
}
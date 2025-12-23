'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface InputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  label?: string
  placeholder?: string
  defaultValue?: string
  confirmText?: string
  cancelText?: string
  onConfirm: (value: string) => void | Promise<void>
  onCancel?: () => void
  validate?: (value: string) => string | null
  type?: 'text' | 'email' | 'number' | 'password'
}

export function InputDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  defaultValue = '',
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  validate,
  type = 'text',
}: InputDialogProps) {
  const [value, setValue] = React.useState(defaultValue)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setValue(defaultValue)
      setError(null)
      // Focus input when dialog opens
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, defaultValue])

  const handleConfirm = async () => {
    if (validate) {
      const validationError = validate(value)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    setLoading(true)
    try {
      await onConfirm(value)
      onOpenChange(false)
    } catch (err) {
      console.error('Input dialog confirm error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault()
      handleConfirm()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <div className="py-4">
          {label && (
            <Label htmlFor="input-dialog-input" className="mb-2 block">
              {label}
            </Label>
          )}
          <Input
            id="input-dialog-input"
            ref={inputRef}
            type={type}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={loading}
            className={error ? 'border-red-500' : ''}
          />
          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Hook for easier usage
export function useInputDialog() {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean
    title: string
    description?: string
    label?: string
    placeholder?: string
    defaultValue: string
    confirmText: string
    cancelText: string
    validate?: (value: string) => string | null
    type: 'text' | 'email' | 'number' | 'password'
    onConfirm: (value: string) => void | Promise<void>
  }>({
    open: false,
    title: '',
    description: undefined,
    label: undefined,
    placeholder: undefined,
    defaultValue: '',
    confirmText: '확인',
    cancelText: '취소',
    validate: undefined,
    type: 'text',
    onConfirm: () => {},
  })

  const prompt = React.useCallback(
    (options: {
      title: string
      description?: string
      label?: string
      placeholder?: string
      defaultValue?: string
      confirmText?: string
      cancelText?: string
      validate?: (value: string) => string | null
      type?: 'text' | 'email' | 'number' | 'password'
    }): Promise<string | null> => {
      return new Promise((resolve) => {
        setDialogState({
          open: true,
          title: options.title,
          description: options.description,
          label: options.label,
          placeholder: options.placeholder,
          defaultValue: options.defaultValue || '',
          confirmText: options.confirmText || '확인',
          cancelText: options.cancelText || '취소',
          validate: options.validate,
          type: options.type || 'text',
          onConfirm: (value) => resolve(value),
        })
      })
    },
    []
  )

  const DialogComponent = React.useCallback(
    () => (
      <InputDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        title={dialogState.title}
        description={dialogState.description}
        label={dialogState.label}
        placeholder={dialogState.placeholder}
        defaultValue={dialogState.defaultValue}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        validate={dialogState.validate}
        type={dialogState.type}
        onConfirm={dialogState.onConfirm}
        onCancel={() => setDialogState((prev) => ({ ...prev, open: false }))}
      />
    ),
    [dialogState]
  )

  return { prompt, DialogComponent }
}

'use client'

import { useEffect, useState } from 'react'
import { Cloud, CloudOff, Check, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AutoSaveIndicatorProps {
  isSaving: boolean
  lastSaved: Date | null
  className?: string
}

export function AutoSaveIndicator({ isSaving, lastSaved, className }: AutoSaveIndicatorProps) {
  const [relativeTime, setRelativeTime] = useState<string>('')

  useEffect(() => {
    if (!lastSaved) {
      setRelativeTime('')
      return
    }

    const updateRelativeTime = () => {
      const now = new Date()
      const diff = now.getTime() - lastSaved.getTime()
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)

      if (seconds < 10) {
        setRelativeTime('방금 전')
      } else if (seconds < 60) {
        setRelativeTime(`${seconds}초 전`)
      } else if (minutes < 60) {
        setRelativeTime(`${minutes}분 전`)
      } else {
        setRelativeTime(`${hours}시간 전`)
      }
    }

    updateRelativeTime()
    const interval = setInterval(updateRelativeTime, 10000) // 10초마다 업데이트

    return () => clearInterval(interval)
  }, [lastSaved])

  if (isSaving) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-gray-600', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>저장 중...</span>
      </div>
    )
  }

  if (lastSaved) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-green-600', className)}>
        <Check className="h-4 w-4" />
        <span>자동 저장됨 {relativeTime && `• ${relativeTime}`}</span>
      </div>
    )
  }

  return null
}

interface DraftRestorePromptProps {
  draftTimestamp: string
  onRestore: () => void
  onDiscard: () => void
  className?: string
}

export function DraftRestorePrompt({
  draftTimestamp,
  onRestore,
  onDiscard,
  className
}: DraftRestorePromptProps) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 1000 / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) {
      return '방금 전'
    } else if (diffMins < 60) {
      return `${diffMins}분 전`
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`
    } else if (diffDays < 7) {
      return `${diffDays}일 전`
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  return (
    <div className={cn(
      'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6',
      className
    )}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium text-blue-900 mb-1">
            임시 저장된 데이터가 있습니다
          </h3>
          <p className="text-sm text-blue-800 mb-3">
            {formatDate(draftTimestamp)}에 작성 중이던 내용이 있습니다. 이어서 작성하시겠습니까?
          </p>
          <div className="flex gap-2">
            <button
              onClick={onRestore}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
            >
              복구하기
            </button>
            <button
              onClick={onDiscard}
              className="px-3 py-1.5 border border-blue-300 text-blue-700 text-sm font-medium rounded hover:bg-blue-100 transition-colors"
            >
              새로 작성
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useIsBookmarked, BookmarkType } from '@/hooks/useBookmarks'
import { useToast } from '@/components/ui/toast-provider'

interface BookmarkButtonProps {
  userId: string
  targetId: string
  targetType: BookmarkType
  size?: 'sm' | 'default' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'ghost'
  showLabel?: boolean
  className?: string
  onToggle?: (isBookmarked: boolean) => void
}

export function BookmarkButton({
  userId,
  targetId,
  targetType,
  size = 'icon',
  variant = 'ghost',
  showLabel = false,
  className,
  onToggle
}: BookmarkButtonProps) {
  const { isBookmarked, loading, toggle } = useIsBookmarked(userId, targetId, targetType)
  const [isToggling, setIsToggling] = useState(false)
  const { success, error: showError } = useToast()

  const handleToggle = async () => {
    if (isToggling || loading) return

    setIsToggling(true)
    const result = await toggle()
    setIsToggling(false)

    if (result) {
      const newState = !isBookmarked
      onToggle?.(newState)
      success(newState ? '북마크에 추가되었습니다.' : '북마크가 해제되었습니다.')
    } else {
      showError('북마크 처리에 실패했습니다.')
    }
  }

  const getLabel = () => {
    switch (targetType) {
      case 'campaign':
        return isBookmarked ? '캠페인 저장됨' : '캠페인 저장'
      case 'expert':
        return isBookmarked ? '전문가 저장됨' : '전문가 저장'
      case 'organization':
        return isBookmarked ? '기관 저장됨' : '기관 저장'
      default:
        return isBookmarked ? '저장됨' : '저장'
    }
  }

  const Icon = isBookmarked ? BookmarkCheck : Bookmark

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={loading || isToggling || !userId}
      className={cn(
        'transition-all duration-200 min-h-[44px] min-w-[44px]',
        isBookmarked && 'text-primary',
        className
      )}
      aria-label={getLabel()}
      aria-pressed={isBookmarked}
    >
      <Icon
        className={cn(
          'transition-transform duration-200',
          size === 'icon' ? 'h-5 w-5' : 'h-4 w-4',
          showLabel && 'mr-2',
          isToggling && 'animate-pulse'
        )}
      />
      {showLabel && <span>{getLabel()}</span>}
    </Button>
  )
}

// Compact version for lists
interface CompactBookmarkButtonProps {
  userId: string
  targetId: string
  targetType: BookmarkType
  className?: string
}

export function CompactBookmarkButton({
  userId,
  targetId,
  targetType,
  className
}: CompactBookmarkButtonProps) {
  const { isBookmarked, loading, toggle } = useIsBookmarked(userId, targetId, targetType)
  const [isToggling, setIsToggling] = useState(false)

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isToggling || loading || !userId) return

    setIsToggling(true)
    await toggle()
    setIsToggling(false)
  }

  const Icon = isBookmarked ? BookmarkCheck : Bookmark

  return (
    <button
      onClick={handleToggle}
      disabled={loading || isToggling || !userId}
      className={cn(
        'p-2 rounded-full transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center',
        'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        className
      )}
      aria-label={isBookmarked ? '북마크 해제' : '북마크 추가'}
      aria-pressed={isBookmarked}
    >
      <Icon className={cn('h-5 w-5', isToggling && 'animate-pulse')} />
    </button>
  )
}

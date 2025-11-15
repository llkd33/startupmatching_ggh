'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ActiveFilter {
  key: string
  label: string
  value: string | number
  onRemove: () => void
}

interface FilterStatusBarProps {
  activeFilters: ActiveFilter[]
  onClearAll?: () => void
  className?: string
}

export function FilterStatusBar({ activeFilters, onClearAll, className }: FilterStatusBarProps) {
  if (activeFilters.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border', className)}>
      <span className="text-sm font-medium text-gray-700">적용된 필터:</span>
      {activeFilters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="flex items-center gap-1 px-2 py-1 text-sm"
        >
          <span>{filter.label}:</span>
          <span className="font-semibold">{filter.value}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={filter.onRemove}
            className="h-4 w-4 p-0 hover:bg-transparent min-h-[16px] min-w-[16px]"
            aria-label={`${filter.label} 필터 제거`}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      {onClearAll && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-sm text-gray-600 hover:text-gray-900 ml-auto min-h-[32px]"
        >
          모두 제거
        </Button>
      )}
    </div>
  )
}


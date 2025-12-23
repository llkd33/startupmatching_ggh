'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, ButtonProps } from '@/components/ui/button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  pageSize?: number
  onPageChange: (page: number) => void
  disabled?: boolean
  className?: string
  showInfo?: boolean
  siblingCount?: number // Number of page buttons on each side of current page
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 20,
  onPageChange,
  disabled = false,
  className,
  showInfo = true,
  siblingCount = 1
}: PaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = React.useCallback(() => {
    const pages: (number | 'ellipsis')[] = []

    // Always show first page
    pages.push(1)

    // Calculate range around current page
    const leftSibling = Math.max(2, currentPage - siblingCount)
    const rightSibling = Math.min(totalPages - 1, currentPage + siblingCount)

    // Add ellipsis after first page if needed
    if (leftSibling > 2) {
      pages.push('ellipsis')
    }

    // Add pages around current page
    for (let i = leftSibling; i <= rightSibling; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i)
      }
    }

    // Add ellipsis before last page if needed
    if (rightSibling < totalPages - 1) {
      pages.push('ellipsis')
    }

    // Always show last page if there's more than one page
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }, [currentPage, totalPages, siblingCount])

  const handleKeyDown = (e: React.KeyboardEvent, page: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPageChange(page)
    }
  }

  // Calculate display range
  const startItem = totalItems ? ((currentPage - 1) * pageSize) + 1 : 0
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : 0

  if (totalPages <= 1) {
    return null
  }

  const pages = getPageNumbers()

  return (
    <nav
      role="navigation"
      aria-label="페이지 탐색"
      className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 px-2", className)}
    >
      {/* Info */}
      {showInfo && totalItems !== undefined && (
        <p className="text-sm text-muted-foreground order-2 sm:order-1">
          전체 {totalItems.toLocaleString()}건 중 {startItem.toLocaleString()}-{endItem.toLocaleString()}건 표시
        </p>
      )}

      {/* Pagination controls */}
      <div
        className="flex items-center gap-1 order-1 sm:order-2"
        role="group"
        aria-label="페이지"
      >
        {/* Previous button */}
        <PaginationButton
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || currentPage === 1}
          aria-label="이전 페이지"
        >
          <ChevronLeft className="h-4 w-4" />
        </PaginationButton>

        {/* Page numbers - hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="flex items-center justify-center w-10 h-10 text-muted-foreground"
                  aria-hidden="true"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              )
            }

            const isActive = page === currentPage

            return (
              <PaginationButton
                key={page}
                variant={isActive ? "default" : "outline"}
                onClick={() => onPageChange(page)}
                onKeyDown={(e) => handleKeyDown(e, page)}
                disabled={disabled}
                aria-label={`${page}페이지로 이동`}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  isActive && "pointer-events-none"
                )}
              >
                {page}
              </PaginationButton>
            )
          })}
        </div>

        {/* Mobile page indicator */}
        <div className="flex sm:hidden items-center px-3 text-sm text-foreground">
          <span className="font-medium">{currentPage}</span>
          <span className="mx-1 text-muted-foreground">/</span>
          <span className="text-muted-foreground">{totalPages}</span>
        </div>

        {/* Next button */}
        <PaginationButton
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || currentPage === totalPages}
          aria-label="다음 페이지"
        >
          <ChevronRight className="h-4 w-4" />
        </PaginationButton>
      </div>
    </nav>
  )
}

// Pagination button with proper touch target
interface PaginationButtonProps extends ButtonProps {
  children: React.ReactNode
}

function PaginationButton({ children, className, ...props }: PaginationButtonProps) {
  return (
    <Button
      className={cn(
        "min-h-[44px] min-w-[44px] h-10 w-10",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

// Compact pagination for tight spaces
interface CompactPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
  className?: string
}

export function CompactPagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className
}: CompactPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="navigation"
      aria-label="페이지 탐색"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        aria-label="이전 페이지"
        className="min-h-[44px] min-w-[44px]"
      >
        이전
      </Button>
      <div
        className="flex items-center gap-1 px-2 text-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="font-medium text-foreground">{currentPage}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{totalPages}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        aria-label="다음 페이지"
        className="min-h-[44px] min-w-[44px]"
      >
        다음
      </Button>
    </div>
  )
}

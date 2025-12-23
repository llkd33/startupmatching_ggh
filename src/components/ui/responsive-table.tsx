'use client'

import React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from './card'

interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
  className?: string
  mobileHidden?: boolean // Hide on mobile
  mobileLabel?: string // Alternative label for mobile
  priority?: number // For responsive priority (1 = always show, 2 = hide on small, 3 = hide on medium)
}

interface ResponsiveTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  className?: string
  mobileCardRender?: (item: T) => React.ReactNode // Custom mobile card view
  loading?: boolean
}

export function ResponsiveTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  emptyMessage = "데이터가 없습니다",
  emptyIcon,
  className,
  mobileCardRender,
  loading = false
}: ResponsiveTableProps<T>) {
  // Default mobile card render
  const defaultMobileCard = (item: T) => (
    <Card className="p-4 mb-3 hover:shadow-md transition-shadow">
      <div className="space-y-2">
        {columns.map((column) => {
          if (column.mobileHidden) return null

          const value = column.render
            ? column.render(item)
            : (item as any)[column.key]

          return (
            <div key={column.key} className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground">
                {column.mobileLabel || column.label}
              </span>
              <span className="text-sm font-medium text-foreground">{value}</span>
            </div>
          )
        })}
      </div>
      {onRowClick && (
        <div className="flex justify-end mt-3 pt-2 border-t">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
    </Card>
  )

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </Card>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        {emptyIcon && <div className="mb-4 flex justify-center">{emptyIcon}</div>}
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table */}
      <div className={cn("hidden md:block overflow-x-auto", className)}>
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-left text-sm font-medium text-muted-foreground",
                    column.className,
                    column.priority === 3 && "hidden lg:table-cell",
                    column.priority === 2 && "hidden sm:table-cell"
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "bg-background hover:bg-muted/50 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-sm text-foreground",
                      column.className,
                      column.priority === 3 && "hidden lg:table-cell",
                      column.priority === 2 && "hidden sm:table-cell"
                    )}
                  >
                    {column.render
                      ? column.render(item)
                      : (item as any)[column.key]
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.map((item) => (
          <div
            key={item.id}
            onClick={() => onRowClick?.(item)}
            className={onRowClick ? "cursor-pointer" : ""}
          >
            {mobileCardRender ? mobileCardRender(item) : defaultMobileCard(item)}
          </div>
        ))}
      </div>
    </>
  )
}

// Responsive Data Grid (for stats and metrics)
interface DataGridItem {
  label: string
  value: string | number | React.ReactNode
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  action?: () => void
}

interface ResponsiveDataGridProps {
  items: DataGridItem[]
  columns?: {
    mobile: number
    tablet: number
    desktop: number
  }
}

export function ResponsiveDataGrid({
  items,
  columns = { mobile: 1, tablet: 2, desktop: 4 }
}: ResponsiveDataGridProps) {
  // Use explicit grid classes for Tailwind JIT
  const gridClasses = cn(
    "grid gap-4",
    columns.mobile === 1 && "grid-cols-1",
    columns.mobile === 2 && "grid-cols-2",
    columns.tablet === 2 && "sm:grid-cols-2",
    columns.tablet === 3 && "sm:grid-cols-3",
    columns.desktop === 3 && "lg:grid-cols-3",
    columns.desktop === 4 && "lg:grid-cols-4"
  )

  return (
    <div className={gridClasses}>
      {items.map((item, index) => (
        <Card
          key={index}
          className={cn(
            "p-4",
            item.action && "cursor-pointer hover:shadow-md transition-shadow"
          )}
          onClick={item.action}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            {item.icon && (
              <span className="text-muted-foreground">{item.icon}</span>
            )}
          </div>

          <div className="text-2xl font-bold text-foreground mb-1">
            {item.value}
          </div>

          {item.trend && (
            <div className={cn(
              "text-xs flex items-center gap-1",
              item.trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              <span>{item.trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(item.trend.value)}%</span>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

// Responsive List with mobile optimization
interface ResponsiveListItem {
  id: string | number
  primary: React.ReactNode
  secondary?: React.ReactNode
  meta?: React.ReactNode
  avatar?: React.ReactNode
  actions?: React.ReactNode
}

interface ResponsiveListProps {
  items: ResponsiveListItem[]
  onItemClick?: (item: ResponsiveListItem) => void
  className?: string
  emptyMessage?: string
}

export function ResponsiveList({
  items,
  onItemClick,
  className,
  emptyMessage = "데이터가 없습니다"
}: ResponsiveListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn("divide-y divide-border", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className={cn(
            "flex items-center gap-3 p-4 bg-background",
            onItemClick && "cursor-pointer hover:bg-muted/50 transition-colors"
          )}
        >
          {item.avatar && (
            <div className="flex-shrink-0">{item.avatar}</div>
          )}

          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">
              {item.primary}
            </div>
            {item.secondary && (
              <div className="text-sm text-muted-foreground truncate">
                {item.secondary}
              </div>
            )}
          </div>

          {item.meta && (
            <div className="flex-shrink-0 text-sm text-muted-foreground">
              {item.meta}
            </div>
          )}

          {item.actions && (
            <div className="flex-shrink-0">{item.actions}</div>
          )}
        </div>
      ))}
    </div>
  )
}
'use client'

import React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
  className?: string
  mobileHidden?: boolean // Hide on mobile
  priority?: number // For responsive priority (1 = always show, 2 = hide on small, 3 = hide on medium)
}

interface ResponsiveTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  emptyMessage?: string
  className?: string
  mobileCardRender?: (item: T) => React.ReactNode // Custom mobile card view
}

export function ResponsiveTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  emptyMessage = "데이터가 없습니다",
  className,
  mobileCardRender
}: ResponsiveTableProps<T>) {
  // Default mobile card render
  const defaultMobileCard = (item: T) => (
    <div className="bg-white rounded-lg border p-4 mb-3">
      {columns.map((column) => {
        if (column.mobileHidden) return null
        
        const value = column.render 
          ? column.render(item)
          : (item as any)[column.key]
        
        return (
          <div key={column.key} className="flex justify-between py-1">
            <span className="text-sm text-gray-500">{column.label}:</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        )
      })}
      {onRowClick && (
        <ChevronRight className="h-4 w-4 text-gray-400 ml-auto mt-2" />
      )}
    </div>
  )
  
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    )
  }
  
  return (
    <>
      {/* Desktop Table */}
      <div className={cn("hidden md:block overflow-x-auto", className)}>
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-left text-sm font-medium text-gray-700",
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
          <tbody className="divide-y">
            {data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "bg-white hover:bg-gray-50 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-sm",
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
      <div className="md:hidden">
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
  return (
    <div className={cn(
      "grid gap-4",
      `grid-cols-${columns.mobile}`,
      `sm:grid-cols-${columns.tablet}`,
      `lg:grid-cols-${columns.desktop}`
    )}>
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "bg-white rounded-lg border p-4",
            item.action && "cursor-pointer hover:shadow-md transition-shadow"
          )}
          onClick={item.action}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm text-gray-500">{item.label}</span>
            {item.icon && (
              <span className="text-gray-400">{item.icon}</span>
            )}
          </div>
          
          <div className="text-2xl font-bold mb-1">
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
        </div>
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
}

export function ResponsiveList({
  items,
  onItemClick,
  className
}: ResponsiveListProps) {
  return (
    <div className={cn("divide-y", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className={cn(
            "flex items-center gap-3 p-4 bg-white",
            onItemClick && "cursor-pointer hover:bg-gray-50 transition-colors"
          )}
        >
          {item.avatar && (
            <div className="flex-shrink-0">{item.avatar}</div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {item.primary}
            </div>
            {item.secondary && (
              <div className="text-sm text-gray-500 truncate">
                {item.secondary}
              </div>
            )}
          </div>
          
          {item.meta && (
            <div className="flex-shrink-0 text-sm text-gray-500">
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
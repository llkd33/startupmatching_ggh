'use client'

import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface ResponsiveTableProps<T> {
  data: T[]
  columns: {
    key: keyof T | string
    header: string
    render?: (item: T) => React.ReactNode
    className?: string
    mobileHide?: boolean
    priority?: number // Higher priority shows first on mobile
  }[]
  mobileCard?: (item: T) => React.ReactNode
  className?: string
}

export function ResponsiveTable<T extends { id?: string | number }>({
  data,
  columns,
  mobileCard,
  className
}: ResponsiveTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set())

  const toggleExpand = (id: string | number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  // Sort columns by priority for mobile
  const mobileColumns = columns
    .filter(col => !col.mobileHide)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 3) // Show max 3 columns on mobile

  return (
    <>
      {/* Desktop Table */}
      <div className={cn("hidden md:block overflow-x-auto", className)}>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={cn(
                    "text-left px-4 py-3 font-medium text-gray-700",
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, rowIndex) => (
              <tr key={item.id || rowIndex} className="border-b hover:bg-gray-50">
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={cn("px-4 py-3", column.className)}
                  >
                    {column.render
                      ? column.render(item)
                      : String(item[column.key as keyof T])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards/List */}
      <div className="md:hidden space-y-3">
        {data.map((item, index) => {
          const itemId = item.id || index
          const isExpanded = expandedRows.has(itemId)

          if (mobileCard) {
            return <div key={itemId}>{mobileCard(item)}</div>
          }

          return (
            <div
              key={itemId}
              className="bg-white rounded-lg border p-4"
            >
              {/* Main mobile content */}
              <div className="space-y-2">
                {mobileColumns.map((column, colIndex) => (
                  <div key={colIndex} className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      {column.header}:
                    </span>
                    <span className="font-medium">
                      {column.render
                        ? column.render(item)
                        : String(item[column.key as keyof T])}
                    </span>
                  </div>
                ))}
              </div>

              {/* Expandable section for additional columns */}
              {columns.length > mobileColumns.length && (
                <>
                  <button
                    onClick={() => toggleExpand(itemId)}
                    className="mt-3 flex items-center justify-center w-full text-sm text-blue-600 hover:text-blue-700"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        접기
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        더보기
                      </>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {columns
                        .filter(col => !mobileColumns.includes(col))
                        .map((column, colIndex) => (
                          <div key={colIndex} className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              {column.header}:
                            </span>
                            <span className="font-medium">
                              {column.render
                                ? column.render(item)
                                : String(item[column.key as keyof T])}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// Simplified responsive list for simpler use cases
export function ResponsiveList<T>({
  items,
  renderItem,
  className,
}: {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}
    </div>
  )
}
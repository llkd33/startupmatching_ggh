'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/toast-custom'
import {
  ExportFormat,
  ExportColumn,
  downloadCSV,
  downloadExcel,
} from '@/lib/export'

interface ExportButtonProps<T extends Record<string, any>> {
  data: T[]
  columns: ExportColumn<T>[]
  filename: string
  sheetName?: string
  disabled?: boolean
  className?: string
  onExport?: (format: ExportFormat) => void
}

export function ExportButton<T extends Record<string, any>>({
  data,
  columns,
  filename,
  sheetName = 'Data',
  disabled = false,
  className,
  onExport,
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: ExportFormat) => {
    if (data.length === 0) {
      toast.warning('내보낼 데이터가 없습니다')
      return
    }

    setIsExporting(true)

    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const fullFilename = `${filename}_${timestamp}`

      if (format === 'csv') {
        downloadCSV(data, columns, fullFilename)
        toast.success('CSV 파일이 다운로드되었습니다')
      } else {
        downloadExcel(data, columns, fullFilename, sheetName)
        toast.success('Excel 파일이 다운로드되었습니다')
      }

      onExport?.(format)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('내보내기에 실패했습니다')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting}
          className={className}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          내보내기
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleExport('csv')}
          className="cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-2" />
          CSV로 내보내기
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('xlsx')}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel로 내보내기
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// 간단한 버전 (포맷 선택 없이 바로 다운로드)
interface SimpleExportButtonProps<T extends Record<string, any>> {
  data: T[]
  columns: ExportColumn<T>[]
  filename: string
  format?: ExportFormat
  sheetName?: string
  disabled?: boolean
  className?: string
  label?: string
}

export function SimpleExportButton<T extends Record<string, any>>({
  data,
  columns,
  filename,
  format = 'xlsx',
  sheetName = 'Data',
  disabled = false,
  className,
  label = '내보내기',
}: SimpleExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (data.length === 0) {
      toast.warning('내보낼 데이터가 없습니다')
      return
    }

    setIsExporting(true)

    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const fullFilename = `${filename}_${timestamp}`

      if (format === 'csv') {
        downloadCSV(data, columns, fullFilename)
        toast.success('CSV 파일이 다운로드되었습니다')
      } else {
        downloadExcel(data, columns, fullFilename, sheetName)
        toast.success('Excel 파일이 다운로드되었습니다')
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('내보내기에 실패했습니다')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || isExporting}
      onClick={handleExport}
      className={className}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  )
}

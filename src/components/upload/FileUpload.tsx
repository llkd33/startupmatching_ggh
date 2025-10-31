'use client'

import React, { useCallback, useState, useRef, useMemo } from 'react'
import { 
  Upload, 
  X, 
  File, 
  Image, 
  FileText, 
  Archive, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  Download,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast-custom'

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
  thumbnailUrl?: string
  uploadProgress?: number
  status: 'uploading' | 'completed' | 'error' | 'processing'
  error?: string
  metadata?: Record<string, any>
}

interface FileUploadProps {
  accept?: string
  multiple?: boolean
  maxSize?: number // bytes
  maxFiles?: number
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  onUpload: (file: File) => Promise<UploadedFile>
  onDelete?: (fileId: string) => Promise<void>
  disabled?: boolean
  className?: string
  showPreview?: boolean
  allowedTypes?: string[]
  dropzoneText?: string
  dragActiveText?: string
}

const PREVIEW_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE_MB = 10
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]

export function FileUpload({
  accept,
  multiple = false,
  maxSize = MAX_FILE_SIZE_MB * 1024 * 1024,
  maxFiles = 5,
  files = [],
  onFilesChange,
  onUpload,
  onDelete,
  disabled = false,
  className,
  showPreview = true,
  allowedTypes = ALLOWED_TYPES,
  dropzoneText = "파일을 드래그하거나 클릭하여 업로드",
  dragActiveText = "파일을 여기에 놓으세요"
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  // 파일 타입 검증
  const validateFile = useCallback((file: File): string | null => {
    // 크기 검증
    if (file.size > maxSize) {
      return `파일 크기가 너무 큽니다. 최대 ${Math.round(maxSize / 1024 / 1024)}MB까지 업로드 가능합니다.`
    }

    // 타입 검증
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return '지원하지 않는 파일 형식입니다.'
    }

    // 최대 파일 개수 검증
    if (files.length >= maxFiles) {
      return `최대 ${maxFiles}개까지 업로드 가능합니다.`
    }

    // 중복 파일 검증
    if (files.some(f => f.name === file.name && f.size === file.size)) {
      return '이미 업로드된 파일입니다.'
    }

    return null
  }, [maxSize, allowedTypes, files, maxFiles])

  // 파일 업로드 처리
  const handleFileUpload = useCallback(async (file: File) => {
    const validation = validateFile(file)
    if (validation) {
      toast.error(validation)
      return
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`
    const tempFile: UploadedFile = {
      id: tempId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      uploadProgress: 0
    }

    // 임시 파일을 목록에 추가
    onFilesChange([...files, tempFile])
    setUploading(prev => new Set([...prev, tempId]))

    try {
      const uploadedFile = await onUpload(file)
      
      // 업로드 완료된 파일로 교체
      onFilesChange(files.map(f => 
        f.id === tempId 
          ? { ...uploadedFile, status: 'completed' as const }
          : f
      ))
      
      toast.success('파일이 업로드되었습니다')
    } catch (error) {
      // 에러 상태로 업데이트
      onFilesChange(files.map(f => 
        f.id === tempId 
          ? { 
              ...f, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : '업로드 실패' 
            }
          : f
      ))
      
      toast.error('파일 업로드에 실패했습니다')
    } finally {
      setUploading(prev => {
        const newSet = new Set(prev)
        newSet.delete(tempId)
        return newSet
      })
    }
  }, [files, onFilesChange, onUpload, validateFile])

  // 여러 파일 업로드 처리
  const handleFilesUpload = useCallback(async (fileList: FileList) => {
    const filesToUpload = Array.from(fileList)
    
    if (!multiple && filesToUpload.length > 1) {
      toast.error('하나의 파일만 업로드 가능합니다')
      return
    }

    // 순차적으로 파일 업로드 (병렬 처리는 서버 부하를 고려하여 제한)
    for (const file of filesToUpload.slice(0, maxFiles - files.length)) {
      await handleFileUpload(file)
    }
  }, [multiple, maxFiles, files.length, handleFileUpload])

  // 드래그 이벤트 처리
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled) return

    const { files: droppedFiles } = e.dataTransfer
    if (droppedFiles?.length) {
      handleFilesUpload(droppedFiles)
    }
  }, [disabled, handleFilesUpload])

  // 파일 선택 처리
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { files: selectedFiles } = e.target
    if (selectedFiles?.length) {
      handleFilesUpload(selectedFiles)
    }
    
    // input 초기화
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [handleFilesUpload])

  // 파일 삭제
  const handleDeleteFile = useCallback(async (file: UploadedFile) => {
    try {
      if (onDelete) {
        await onDelete(file.id)
      }
      
      onFilesChange(files.filter(f => f.id !== file.id))
      toast.success('파일이 삭제되었습니다')
    } catch (error) {
      toast.error('파일 삭제에 실패했습니다')
    }
  }, [files, onFilesChange, onDelete])

  // 파일 아이콘 선택
  const getFileIcon = useCallback((type: string) => {
    if (type.startsWith('image/')) return Image
    if (type === 'application/pdf') return FileText
    if (type.includes('document') || type.includes('text')) return FileText
    if (type.includes('zip') || type.includes('rar')) return Archive
    return File
  }, [])

  // 파일 크기 포맷팅
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  // 허용된 파일 타입 표시
  const allowedTypesText = useMemo(() => {
    const typeMap: Record<string, string> = {
      'image/jpeg': 'JPG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/webp': 'WEBP',
      'application/pdf': 'PDF',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'text/plain': 'TXT'
    }
    
    return allowedTypes.map(type => typeMap[type] || type).join(', ')
  }, [allowedTypes])

  const dropzoneClasses = cn(
    "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
    dragActive
      ? "border-blue-500 bg-blue-50"
      : "border-gray-300 hover:border-gray-400",
    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
  )

  const dropzoneContentClasses = cn(
    "flex flex-col items-center gap-3",
    disabled && "opacity-50 cursor-not-allowed"
  )

  return (
    <div className={cn("w-full", className)}>
      {/* 드롭존 */}
      <div
        className={dropzoneClasses}
        aria-disabled={disabled || undefined}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (disabled) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />
        
        <div className={dropzoneContentClasses}>
          <Upload className={cn(
            "h-10 w-10",
            dragActive ? "text-blue-500" : "text-gray-400"
          )} />
          
          <div>
            <p className="text-sm font-medium">
              {dragActive ? dragActiveText : dropzoneText}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {allowedTypesText} • 최대 {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        </div>
      </div>
      
      {/* 업로드 정보 */}
      {files.length > 0 && (
        <div className="mt-4 text-xs text-gray-500">
          {files.length}/{maxFiles}개 파일
        </div>
      )}

      {/* 파일 목록 */}
      {files.length > 0 && (
        <div className="mt-4 space-y-3">
          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onDelete={() => handleDeleteFile(file)}
              showPreview={showPreview}
              getFileIcon={getFileIcon}
              formatFileSize={formatFileSize}
              disabled={disabled}
            />
          ))}
        </div>
      )}
      
      {/* 에러 메시지 */}
      {files.some(f => f.status === 'error') && (
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            일부 파일의 업로드에 실패했습니다. 다시 시도하거나 파일을 확인해주세요.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// 개별 파일 아이템 컴포넌트
interface FileItemProps {
  file: UploadedFile
  onDelete: () => void
  showPreview: boolean
  getFileIcon: (type: string) => React.ComponentType<any>
  formatFileSize: (bytes: number) => string
  disabled: boolean
}

const FileItem = React.memo(function FileItem({
  file,
  onDelete,
  showPreview,
  getFileIcon,
  formatFileSize,
  disabled
}: FileItemProps) {
  const Icon = getFileIcon(file.type)
  const isImage = PREVIEW_TYPES.includes(file.type)
  const isUploading = file.status === 'uploading'
  const hasError = file.status === 'error'

  return (
    <Card className={cn(
      "transition-all",
      hasError && "border-red-200 bg-red-50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* 파일 아이콘/썸네일 */}
          <div className="flex-shrink-0">
            {showPreview && isImage && file.thumbnailUrl ? (
              <img
                src={file.thumbnailUrl}
                alt={file.name}
                className="h-12 w-12 rounded object-cover"
              />
            ) : (
              <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                <Icon className="h-6 w-6 text-gray-500" />
              </div>
            )}
          </div>

          {/* 파일 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
              
              {/* 상태 배지 */}
              <div className="flex items-center gap-1">
                {file.status === 'completed' && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    완료
                  </Badge>
                )}
                
                {file.status === 'processing' && (
                  <Badge variant="secondary" className="text-xs">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    처리중
                  </Badge>
                )}
                
                {hasError && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    실패
                  </Badge>
                )}
              </div>
            </div>

            {/* 업로드 진행률 */}
            {isUploading && file.uploadProgress !== undefined && (
              <div className="mt-2">
                <Progress value={file.uploadProgress} className="h-1" />
                <p className="text-xs text-gray-500 mt-1">
                  {file.uploadProgress}% 업로드 중...
                </p>
              </div>
            )}

            {/* 에러 메시지 */}
            {hasError && file.error && (
              <p className="text-xs text-red-600 mt-1">
                {file.error}
              </p>
            )}

            {/* 액션 버튼 */}
            <div className="flex items-center gap-2 mt-2">
              {file.url && file.status === 'completed' && (
                <>
                  {isImage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs p-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(file.url, '_blank')
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      미리보기
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs p-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      const a = document.createElement('a')
                      a.href = file.url!
                      a.download = file.name
                      a.click()
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    다운로드
                  </Button>
                </>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs p-1 text-red-600 hover:text-red-700 ml-auto"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                disabled={disabled || isUploading}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

FileItem.displayName = 'FileItem'

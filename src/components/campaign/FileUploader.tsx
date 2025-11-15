'use client'

import { useState, useCallback } from 'react'
import { CloudArrowUpIcon, DocumentIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { Loader2, Eye } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { validateFileType, validateFileSize, formatFileSize, getFileCategory } from '@/lib/upload'
import { toast } from 'sonner'

// Attachment 타입 정의
interface Attachment {
  name: string
  url: string
  type: string
  size: number
}

interface FileUploaderProps {
  attachments: Attachment[]
  onChange: (attachments: Attachment[]) => void
  maxFiles?: number
  maxSizeMB?: number
  allowedTypes?: string[]
}

interface UploadingFile {
  id: string
  name: string
  size: number
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

export default function FileUploader({ 
  attachments, 
  onChange,
  maxFiles = 5,
  maxSizeMB = 10,
  allowedTypes
}: FileUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [externalLink, setExternalLink] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setError(null)
    
    const filesArray = Array.from(files)
    
    // 최대 파일 개수 검증
    if (attachments.length + filesArray.length > maxFiles) {
      const errorMsg = `최대 ${maxFiles}개 파일까지 업로드 가능합니다. (현재: ${attachments.length}개)`
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    const newAttachments: Attachment[] = []
    const newUploadingFiles = new Map(uploadingFiles)

    for (const file of filesArray) {
      const fileId = `upload-${Date.now()}-${Math.random()}`
      
      // 파일 타입 검증
      if (allowedTypes && allowedTypes.length > 0) {
        const typeError = validateFileType(file, allowedTypes)
        if (typeError) {
          toast.error(`${file.name}: ${typeError}`)
          continue
        }
      }

      // 파일 크기 검증
      const sizeError = validateFileSize(file, maxSizeMB * 1024 * 1024)
      if (sizeError) {
        toast.error(`${file.name}: ${sizeError}`)
        continue
      }

      // 중복 파일 검증
      if (attachments.some(a => a.name === file.name && a.size === file.size)) {
        toast.warning(`${file.name}: 이미 추가된 파일입니다.`)
        continue
      }

      // 업로드 중 상태 추가
      newUploadingFiles.set(fileId, {
        id: fileId,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'uploading'
      })
      setUploadingFiles(newUploadingFiles)

      // 시뮬레이션: 실제 업로드 대신 로컬 파일 URL 생성
      // 실제 환경에서는 uploadFile 함수를 사용하여 Supabase에 업로드
      try {
        // 진행률 시뮬레이션
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => {
            const updated = new Map(prev)
            const current = updated.get(fileId)
            if (current && current.status === 'uploading') {
              updated.set(fileId, {
                ...current,
                progress: Math.min(95, current.progress + 10)
              })
            }
            return updated
          })
        }, 200)

        // 실제 업로드 로직 (현재는 로컬 URL만 생성)
        await new Promise(resolve => setTimeout(resolve, 1000))

        clearInterval(progressInterval)

        const attachment: Attachment = {
          name: file.name,
          url: URL.createObjectURL(file),
          type: file.type,
          size: file.size,
        }
        
        newAttachments.push(attachment)

        // 업로드 완료 상태
        setUploadingFiles(prev => {
          const updated = new Map(prev)
          updated.set(fileId, {
            id: fileId,
            name: file.name,
            size: file.size,
            progress: 100,
            status: 'completed'
          })
          return updated
        })

        // 1초 후 업로드 상태 제거
        setTimeout(() => {
          setUploadingFiles(prev => {
            const updated = new Map(prev)
            updated.delete(fileId)
            return updated
          })
        }, 1000)

        toast.success(`${file.name} 업로드 완료`)
      } catch (err) {
        // 에러 상태
        setUploadingFiles(prev => {
          const updated = new Map(prev)
          updated.set(fileId, {
            id: fileId,
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'error',
            error: err instanceof Error ? err.message : '업로드 실패'
          })
          return updated
        })
        toast.error(`${file.name} 업로드 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
      }
    }

    if (newAttachments.length > 0) {
      onChange([...attachments, ...newAttachments])
    }
  }, [attachments, maxFiles, maxSizeMB, allowedTypes, onChange, uploadingFiles])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const addExternalLink = () => {
    if (!externalLink.trim()) return
    setError(null)

    try {
      new URL(externalLink)
    } catch {
      setError('올바른 URL을 입력해주세요.')
      return
    }

    if (attachments.length >= maxFiles) {
      setError(`최대 ${maxFiles}개 파일까지 추가 가능합니다.`)
      return
    }

    const attachment: Attachment = {
      name: externalLink.split('/').pop() || 'External Link',
      url: externalLink,
      type: 'link',
      size: 0,
    }

    onChange([...attachments, attachment])
    setExternalLink('')
  }

  const removeAttachment = (index: number) => {
    onChange(attachments.filter((_, i) => i !== index))
  }

  const getFileIcon = (type: string) => {
    const category = getFileCategory(type)
    switch (category) {
      case 'image':
        return '🖼️'
      case 'document':
        return '📄'
      case 'archive':
        return '📦'
      default:
        return '📎'
    }
  }

  const isUploading = uploadingFiles.size > 0

  return (
    <div className="space-y-4">
      {/* 업로드 중인 파일 표시 */}
      {Array.from(uploadingFiles.values()).map((uploadingFile) => (
        <div
          key={uploadingFile.id}
          className="p-3 border border-blue-200 bg-blue-50 rounded-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center flex-1 min-w-0">
              <span className="text-lg mr-2">{getFileIcon('')}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadingFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadingFile.size)}
                </p>
              </div>
            </div>
            {uploadingFile.status === 'uploading' && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            )}
            {uploadingFile.status === 'completed' && (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            )}
            {uploadingFile.status === 'error' && (
              <XCircleIcon className="h-5 w-5 text-red-600" />
            )}
          </div>
          {uploadingFile.status === 'uploading' && (
            <Progress value={uploadingFile.progress} className="h-2" />
          )}
          {uploadingFile.status === 'error' && uploadingFile.error && (
            <p className="text-xs text-red-600 mt-1">{uploadingFile.error}</p>
          )}
        </div>
      ))}

      {/* 업로드 완료된 파일 목록 */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center flex-1 min-w-0">
                <span className="text-lg mr-2" aria-hidden="true">
                  {getFileIcon(attachment.type)}
                </span>
                <div className="ml-1 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)} • {attachment.type || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {attachment.url && !attachment.url.startsWith('http') && (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-500"
                    aria-label={`${attachment.name} 미리보기`}
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(index)}
                  className="text-red-600 hover:text-red-500 min-h-[44px] min-w-[44px]"
                  aria-label={`${attachment.name} 삭제`}
                >
                  <TrashIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="file-upload"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 transition-colors duration-200 ${
              isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
            }`}
          >
            <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
              isDragging ? 'border-indigo-500' : 'border-gray-300 hover:border-gray-400'
            }`}>
              <div className="space-y-1 text-center">
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <span>파일 선택</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    multiple
                    onChange={handleFileSelect}
                    disabled={isUploading || attachments.length >= maxFiles}
                    accept={allowedTypes?.join(',')}
                  />
                  <p className="pl-1">또는 드래그 앤 드롭</p>
                </div>
                <p className="text-xs text-gray-500">
                  최대 {maxSizeMB}MB, {maxFiles}개 파일
                  {allowedTypes && allowedTypes.length > 0 && (
                    <span className="block mt-1">
                      허용 형식: {allowedTypes.map(t => t.split('/')[1]).join(', ')}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            외부 링크 추가 (Google Drive, Dropbox 등)
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={attachments.length >= maxFiles}
            />
            <button
              type="button"
              onClick={addExternalLink}
              disabled={!externalLink.trim() || attachments.length >= maxFiles}
              className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 sm:text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              추가
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
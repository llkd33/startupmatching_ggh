'use client'

import { useState } from 'react'
import { CloudArrowUpIcon, DocumentIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Attachment } from '@/types/supabase'

interface FileUploaderProps {
  attachments: Attachment[]
  onChange: (attachments: Attachment[]) => void
  maxFiles?: number
  maxSizeMB?: number
}

export default function FileUploader({ 
  attachments, 
  onChange,
  maxFiles = 5,
  maxSizeMB = 10
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [externalLink, setExternalLink] = useState('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setError(null)
    
    // Check file count
    if (attachments.length + files.length > maxFiles) {
      setError(`최대 ${maxFiles}개 파일까지 업로드 가능합니다.`)
      return
    }

    const newAttachments: Attachment[] = []

    for (const file of Array.from(files)) {
      // Check file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`)
        continue
      }

      // In a real app, you would upload to Supabase Storage or S3
      // For now, we'll create a mock attachment
      const attachment: Attachment = {
        name: file.name,
        url: URL.createObjectURL(file), // In production, this would be the uploaded URL
        type: file.type,
        size: file.size,
      }
      
      newAttachments.push(attachment)
    }

    onChange([...attachments, ...newAttachments])
    
    // Reset input
    e.target.value = ''
  }

  const addExternalLink = () => {
    if (!externalLink.trim()) return

    setError(null)

    // Basic URL validation
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'External'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center flex-1 min-w-0">
                <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="ml-3 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="ml-4 flex-shrink-0 text-red-600 hover:text-red-500"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="file-upload"
            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
          >
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400">
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
                    disabled={uploading || attachments.length >= maxFiles}
                  />
                  <p className="pl-1">또는 드래그 앤 드롭</p>
                </div>
                <p className="text-xs text-gray-500">
                  최대 {maxSizeMB}MB, {maxFiles}개 파일
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
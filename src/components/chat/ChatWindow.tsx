'use client'

import { useState, useEffect, useRef } from 'react'
import { db, auth } from '@/lib/supabase'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { notifyMessageReceived } from '@/lib/notifications'
import { uploadFile, formatFileSize, getFileCategory, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/upload'
import { PaperAirplaneIcon, PaperClipIcon, XMarkIcon, DocumentIcon, PhotoIcon, CheckIcon } from '@heroicons/react/24/solid'
import { ArrowDownTrayIcon, CheckIcon as CheckOutlineIcon } from '@heroicons/react/24/outline'

interface ChatWindowProps {
  campaignId: string
  otherUserId: string
  otherUserName: string
  campaignTitle?: string
  threadId?: string
}

interface AttachedFile {
  file: File
  preview?: string
}

export default function ChatWindow({ campaignId, otherUserId, otherUserName, campaignTitle, threadId }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use real-time messages hook
  const { messages, loading, markAllAsRead } = useRealtimeMessages(campaignId, currentUser?.id || '')

  useEffect(() => {
    loadCurrentUser()
  }, [])

  // Mark all messages as read when component mounts or messages change
  useEffect(() => {
    if (currentUser?.id && messages.length > 0) {
      markAllAsRead()
    }
  }, [currentUser?.id, messages.length, markAllAsRead])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadCurrentUser = async () => {
    const user = await auth.getUser()
    setCurrentUser(user)
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError(null)

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 업로드 가능합니다.`)
      return
    }

    // Validate file type
    const allowedTypes = [
      ...ALLOWED_FILE_TYPES.IMAGES,
      ...ALLOWED_FILE_TYPES.DOCUMENTS
    ]
    if (!allowedTypes.includes(file.type)) {
      setFileError('지원하지 않는 파일 형식입니다. (이미지, PDF, Word, 텍스트 파일만 가능)')
      return
    }

    // Create preview for images
    let preview: string | undefined
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file)
    }

    setAttachedFile({ file, preview })
  }

  // Remove attached file
  const removeAttachedFile = () => {
    if (attachedFile?.preview) {
      URL.revokeObjectURL(attachedFile.preview)
    }
    setAttachedFile(null)
    setFileError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !attachedFile) || !currentUser) return

    setSending(true)
    setUploadProgress(null)

    try {
      let fileUrl: string | undefined
      let fileName: string | undefined
      let fileSize: number | undefined
      let messageType = 'text'

      // Upload file if attached
      if (attachedFile) {
        setUploadProgress(10)
        const uploadedFile = await uploadFile(attachedFile.file, 'ATTACHMENTS', currentUser.id)
        setUploadProgress(90)

        fileUrl = uploadedFile.url
        fileName = attachedFile.file.name
        fileSize = attachedFile.file.size
        messageType = getFileCategory(attachedFile.file.type) === 'image' ? 'image' : 'file'
      }

      const messageText = newMessage.trim() || (attachedFile ? `[파일] ${attachedFile.file.name}` : '')

      const { data, error } = await db.messages.send(
        campaignId,
        null, // proposalId
        currentUser.id,
        otherUserId,
        messageText,
        messageType,
        fileUrl,
        fileName,
        fileSize
      )
      if (error) throw error

      setUploadProgress(100)

      // The real-time subscription will automatically update the messages
      setNewMessage('')
      removeAttachedFile()

      // Send notification to receiver
      if (otherUserId && campaignTitle) {
        await notifyMessageReceived(
          otherUserId,
          currentUser.email || otherUserName,
          campaignTitle,
          attachedFile ? `[파일] ${attachedFile.file.name}` : messageText,
          campaignId,
          threadId
        )
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setFileError('메시지 전송에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSending(false)
      setUploadProgress(null)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    }
  }

  // Render file attachment in message
  const renderFileAttachment = (message: any, isOwnMessage: boolean) => {
    const fileUrl = message.file_url
    const fileName = message.file_name
    const fileSize = message.file_size
    const messageType = message.message_type || message.type

    if (!fileUrl) return null

    const isImage = messageType === 'image'

    if (isImage) {
      return (
        <div className="mt-2">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={fileUrl}
              alt={fileName || '첨부 이미지'}
              className="max-w-full rounded-lg max-h-64 object-contain hover:opacity-90 transition-opacity"
              loading="lazy"
            />
          </a>
          {fileName && (
            <p className={`text-xs mt-1 ${isOwnMessage ? 'text-indigo-100' : 'text-muted-foreground'}`}>
              {fileName}
            </p>
          )}
        </div>
      )
    }

    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`
          mt-2 flex items-center gap-2 p-2 rounded-md transition-colors
          ${isOwnMessage
            ? 'bg-indigo-700 hover:bg-indigo-800'
            : 'bg-muted hover:bg-muted/80'
          }
        `}
      >
        <DocumentIcon className="h-8 w-8 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName || '첨부 파일'}</p>
          {fileSize && (
            <p className={`text-xs ${isOwnMessage ? 'text-indigo-200' : 'text-muted-foreground'}`}>
              {formatFileSize(fileSize)}
            </p>
          )}
        </div>
        <ArrowDownTrayIcon className="h-5 w-5 flex-shrink-0" />
      </a>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">메시지 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-background border-b border-border px-6 py-4">
        <h3 className="text-lg font-semibold text-foreground">{otherUserName}</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/20">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground">
            아직 메시지가 없습니다. 대화를 시작해보세요!
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUser?.id
            const senderName = message.sender?.raw_user_meta_data?.full_name || message.sender?.email || '사용자'

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : ''}`}>
                  <div className={`
                    px-4 py-2 rounded-lg
                    ${isOwnMessage
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-foreground border border-border'
                    }
                  `}>
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold mb-1 text-muted-foreground">{senderName}</p>
                    )}
                    {/* Text content */}
                    {message.content && !message.content.startsWith('[파일]') && (
                      <p className="text-sm">{message.content || (message as any).message}</p>
                    )}
                    {/* File attachment */}
                    {renderFileAttachment(message, isOwnMessage)}
                  </div>
                  <div className={`
                    flex items-center gap-1 text-xs text-muted-foreground mt-1
                    ${isOwnMessage ? 'justify-end' : 'justify-start'}
                  `}>
                    <span>{formatTime(message.created_at)}</span>
                    {isOwnMessage && (
                      <span className="flex items-center" aria-label={message.is_read ? '읽음' : '전송됨'}>
                        {message.is_read ? (
                          // Double check for read
                          <span className="flex -space-x-1 text-primary">
                            <CheckIcon className="h-3 w-3" />
                            <CheckIcon className="h-3 w-3" />
                          </span>
                        ) : (
                          // Single check for sent
                          <CheckOutlineIcon className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {attachedFile && (
        <div className="bg-muted/50 border-t border-border px-6 py-3">
          <div className="flex items-center gap-3">
            {attachedFile.preview ? (
              <img
                src={attachedFile.preview}
                alt="미리보기"
                className="h-16 w-16 rounded-lg object-cover border border-border"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border border-border">
                <DocumentIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {attachedFile.file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachedFile.file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={removeAttachedFile}
              className="p-2 rounded-full hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="첨부 파일 삭제"
            >
              <XMarkIcon className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          {uploadProgress !== null && (
            <div className="mt-2">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                업로드 중... {uploadProgress}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* File Error */}
      {fileError && (
        <div className="bg-destructive/10 border-t border-destructive/20 px-6 py-2">
          <p className="text-sm text-destructive flex items-center gap-2">
            <XMarkIcon className="h-4 w-4" />
            {fileError}
          </p>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={sendMessage} className="bg-background border-t border-border px-6 py-4">
        <div className="flex items-center gap-3">
          {/* File attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            disabled={sending}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || !!attachedFile}
            className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="파일 첨부"
          >
            <PaperClipIcon className="h-5 w-5 text-muted-foreground" />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
            disabled={sending}
          />

          <button
            type="submit"
            disabled={sending || (!newMessage.trim() && !attachedFile)}
            className="inline-flex items-center justify-center p-2 rounded-full text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px]"
            aria-label="메시지 보내기"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
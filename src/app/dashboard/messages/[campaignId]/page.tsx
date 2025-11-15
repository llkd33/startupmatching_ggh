'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { supabase, db } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  ArrowLeft, 
  Paperclip, 
  MoreVertical,
  User,
  Building2,
  Clock,
  CheckCheck,
  Info,
  MessageCircle,
  Search,
  X,
  Edit2,
  Trash2,
  Check,
  FileIcon,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { MessageThreadSkeleton } from '@/components/ui/loading-states'
import { notifyMessageReceived } from '@/lib/notifications'
import { toast } from 'sonner'

interface Message {
  id: string
  campaign_id: string
  proposal_id: string | null
  sender_id: string
  receiver_id: string
  content: string
  message_type: 'text' | 'file' | 'system'
  file_url: string | null
  file_name: string | null
  file_size: number | null
  is_read: boolean
  read_at: string | null
  created_at: string
  updated_at?: string | null
  sender?: {
    email: string
    expert_profiles?: { name: string }[]
    organization_profiles?: { organization_name: string }[]
  }
}

interface Campaign {
  id: string
  title: string
  description: string
  status: string
  organization_profiles: {
    organization_name: string
    user_id: string
  }
}

interface Participant {
  id: string
  name: string
  type: 'expert' | 'organization'
  email: string
}

export default function ChatPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const threadId = searchParams.get('thread')
  
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [otherParticipant, setOtherParticipant] = useState<Participant | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use real-time messages hook
  const { messages: realtimeMessages, loading: messagesLoading } = useRealtimeMessages(
    campaignId || '', 
    currentUser?.id || ''
  )

  useEffect(() => {
    checkAuthAndLoadData()
  }, [campaignId])

  useEffect(() => {
    if (realtimeMessages) {
      setMessages(realtimeMessages)
      scrollToBottom()
      markMessagesAsRead()
    }
  }, [realtimeMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkAuthAndLoadData = async () => {
    if (!campaignId) return

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    setCurrentUser(user)
    await Promise.all([
      loadCampaignData(),
      loadOtherParticipant(user.id)
    ])
    setLoading(false)
  }

  const loadCampaignData = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          organization_profiles(organization_name, user_id)
        `)
        .eq('id', campaignId)
        .single()

      if (error) throw error
      setCampaign(data)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading campaign:', error)
      }
    }
  }

  const loadOtherParticipant = async (currentUserId: string) => {
    try {
      // Get the message thread to find the other participant
      const { data: threadData, error: threadError } = await supabase
        .from('message_threads')
        .select('participant_1, participant_2')
        .eq('campaign_id', campaignId)
        .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`)
        .single()

      if (threadError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Thread not found:', threadError)
        }
        return
      }

      const otherUserId = threadData.participant_1 === currentUserId 
        ? threadData.participant_2 
        : threadData.participant_1

      // Get other participant details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id, email, role,
          expert_profiles(name),
          organization_profiles(organization_name)
        `)
        .eq('id', otherUserId)
        .single()

      if (userError) throw userError

      const participant: Participant = {
        id: userData.id,
        email: userData.email,
        type: userData.role as 'expert' | 'organization',
        name: userData.role === 'expert' 
          ? userData.expert_profiles?.[0]?.name || userData.email
          : userData.organization_profiles?.[0]?.organization_name || userData.email
      }

      setOtherParticipant(participant)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading other participant:', error)
      }
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser || !otherParticipant || sending) return

    setSending(true)
    try {
      const { error } = await db.messages.send(
        campaignId || '',
        null,
        currentUser.id,
        otherParticipant.id,
        newMessage.trim(),
        'text'
      )

      if (error) throw error

      // Send notification to receiver
      if (otherParticipant?.id && campaign?.title) {
        await notifyMessageReceived(
          otherParticipant.id,
          currentUser?.email || '사용자',
          campaign.title,
          newMessage.trim(),
          campaignId || '',
          threadId || undefined
        )
      }

      setNewMessage('')
      inputRef.current?.focus()
    } catch (error: any) {
      toast.error(error.message || '메시지 전송에 실패했습니다.')
      if (process.env.NODE_ENV === 'development') {
        console.error('Error sending message:', error)
      }
    } finally {
      setSending(false)
    }
  }

  const handleSearch = async (term: string) => {
    if (!term.trim() || !campaignId || !currentUser) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const { data, error } = await db.messages.search(campaignId, currentUser.id, term)
      if (error) throw error
      setSearchResults(data || [])
    } catch (error: any) {
      toast.error('검색 중 오류가 발생했습니다.')
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id)
    setEditContent(message.content)
  }

  const saveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return

    try {
      const { error } = await db.messages.update(editingMessageId, editContent.trim())
      if (error) throw error
      toast.success('메시지가 수정되었습니다.')
      setEditingMessageId(null)
      setEditContent('')
    } catch (error: any) {
      toast.error('메시지 수정에 실패했습니다.')
      console.error('Edit error:', error)
    }
  }

  const cancelEdit = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('정말 이 메시지를 삭제하시겠습니까?')) return

    try {
      const { error } = await db.messages.delete(messageId)
      if (error) throw error
      toast.success('메시지가 삭제되었습니다.')
    } catch (error: any) {
      toast.error('메시지 삭제에 실패했습니다.')
      console.error('Delete error:', error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser || !otherParticipant) return

    // File size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    setSending(true)
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `messages/${campaignId}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('messages')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('messages')
        .getPublicUrl(filePath)

      // Send message with file
      const { error: messageError } = await db.messages.send(
        campaignId || '',
        null,
        currentUser.id,
        otherParticipant.id,
        `파일: ${file.name}`,
        'file',
        urlData.publicUrl,
        file.name,
        file.size
      )

      if (messageError) throw messageError

      toast.success('파일이 전송되었습니다.')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      toast.error('파일 업로드에 실패했습니다.')
      console.error('File upload error:', error)
    } finally {
      setSending(false)
    }
  }

  const markAllAsRead = async () => {
    if (!currentUser || !campaignId) return

    try {
      await db.messages.markAllAsRead(campaignId, currentUser.id)
      toast.success('모든 메시지를 읽음으로 표시했습니다.')
    } catch (error: any) {
      toast.error('읽음 표시에 실패했습니다.')
      console.error('Mark all as read error:', error)
    }
  }

  const markMessagesAsRead = async () => {
    if (!currentUser || !messages.length) return

    const unreadMessageIds = messages
      .filter(msg => msg.receiver_id === currentUser.id && !msg.is_read)
      .map(msg => msg.id)

    if (unreadMessageIds.length === 0) return

    try {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadMessageIds)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error marking messages as read:', error)
      }
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      })
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getSenderName = (message: Message) => {
    if (message.sender_id === currentUser?.id) {
      return '나'
    }
    return otherParticipant?.name || '상대방'
  }

  if (loading || messagesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <MessageThreadSkeleton />
      </div>
    )
  }

  if (!campaign || !otherParticipant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">대화를 찾을 수 없습니다</h3>
            <p className="text-sm text-gray-500 mb-4">
              요청하신 대화가 존재하지 않거나 접근 권한이 없습니다.
            </p>
            <Button asChild>
              <Link href="/dashboard/messages">메시지 목록으로 돌아가기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <Card className="mb-4">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {otherParticipant.type === 'organization' ? (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <CardTitle className="text-lg">{otherParticipant.name}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {campaign.title}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {otherParticipant.type === 'organization' ? '기관' : '전문가'}
                </Badge>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Campaign Info */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">캠페인 정보</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {campaign.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                      {campaign.status === 'active' ? '진행중' : campaign.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {campaign.organization_profiles.organization_name}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="flex-shrink-0"
              >
                모두 읽음
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="메시지 검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  handleSearch(e.target.value)
                }}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setSearchResults([])
                    setIsSearching(false)
                  }}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="flex-1 flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {isSearching ? (
              <div className="text-center text-gray-500 py-4">
                검색 중...
              </div>
            ) : searchTerm && searchResults.length > 0 ? (
              <>
                <div className="text-sm text-gray-600 mb-4">
                  검색 결과: {searchResults.length}개
                </div>
                {searchResults.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${message.sender_id === currentUser?.id ? 'order-2' : ''}`}>
                      <div className={`
                        px-4 py-2 rounded-lg break-words border-2 border-yellow-400
                        ${message.sender_id === currentUser?.id 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                        }
                      `}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>아직 메시지가 없습니다.</p>
                <p className="text-sm">대화를 시작해보세요!</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwnMessage = message.sender_id === currentUser?.id
                const showSender = index === 0 || messages[index - 1].sender_id !== message.sender_id
                const isSystemMessage = message.message_type === 'system'
                const isEditing = editingMessageId === message.id
                const isHovered = hoveredMessageId === message.id
                
                if (isSystemMessage) {
                  return (
                    <div key={message.id} className="text-center">
                      <div className="inline-block bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {message.content}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                  )
                }
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
                    onMouseEnter={() => setHoveredMessageId(message.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : ''}`}>
                      {showSender && !isOwnMessage && (
                        <p className="text-xs font-medium text-gray-600 mb-1 px-1">
                          {getSenderName(message)}
                        </p>
                      )}
                      {isEditing ? (
                        <div className="bg-white border-2 border-blue-500 rounded-lg p-2">
                          <Input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="mb-2"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                              취소
                            </Button>
                            <Button size="sm" onClick={saveEdit}>
                              저장
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className={`
                          px-4 py-2 rounded-lg break-words relative
                          ${isOwnMessage 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                          }
                        `}>
                          {message.file_url && (
                            <div className="mb-2">
                              <a
                                href={message.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm underline"
                              >
                                <FileIcon className="h-4 w-4" />
                                {message.file_name}
                                <Download className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {isOwnMessage && isHovered && (
                            <div className="absolute -right-12 top-0 flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleEditMessage(message)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-600"
                                onClick={() => handleDeleteMessage(message.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      <div className={`
                        flex items-center gap-1 text-xs text-gray-500 mt-1
                        ${isOwnMessage ? 'justify-end' : 'justify-start'}
                      `}>
                        {message.updated_at && message.updated_at !== message.created_at && (
                          <span className="text-gray-400">(수정됨)</span>
                        )}
                        <span>{formatMessageTime(message.created_at)}</span>
                        {isOwnMessage && (
                          <div className="flex items-center">
                            {message.is_read ? (
                              <CheckCheck className="h-3 w-3 text-blue-500" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Message Input */}
          <div className="border-t p-4">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                disabled={sending || !!editingMessageId}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !editingMessageId) {
                    e.preventDefault()
                    sendMessage(e)
                  }
                }}
              />
              <Button
                type="submit"
                disabled={sending || !newMessage.trim() || !!editingMessageId}
                size="sm"
                className="flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              Enter로 전송, Shift+Enter로 줄바꿈 | 파일 첨부 가능 (최대 10MB)
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

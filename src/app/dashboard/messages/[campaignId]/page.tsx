'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
  MessageCircle
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'

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
  is_read: boolean
  read_at: string | null
  created_at: string
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
      console.error('Error loading campaign:', error)
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
        console.error('Thread not found:', threadError)
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
      console.error('Error loading other participant:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser || !otherParticipant || sending) return

    setSending(true)
    try {
      const { error } = await supabase.rpc('send_message', {
        p_campaign_id: campaignId,
        p_proposal_id: null,
        p_sender_id: currentUser.id,
        p_receiver_id: otherParticipant.id,
        p_content: newMessage.trim(),
        p_message_type: 'text'
      })

      if (error) throw error

      setNewMessage('')
      inputRef.current?.focus()
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
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
      console.error('Error marking messages as read:', error)
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
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4">대화를 불러오는 중...</p>
          </div>
        </div>
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
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
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
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="flex-1 flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
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
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : ''}`}>
                      {showSender && !isOwnMessage && (
                        <p className="text-xs font-medium text-gray-600 mb-1 px-1">
                          {getSenderName(message)}
                        </p>
                      )}
                      <div className={`
                        px-4 py-2 rounded-lg break-words
                        ${isOwnMessage 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                        }
                      `}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <div className={`
                        flex items-center gap-1 text-xs text-gray-500 mt-1
                        ${isOwnMessage ? 'justify-end' : 'justify-start'}
                      `}>
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
                disabled
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                disabled={sending}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(e)
                  }
                }}
              />
              <Button
                type="submit"
                disabled={sending || !newMessage.trim()}
                size="sm"
                className="flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              Enter로 전송, Shift+Enter로 줄바꿈
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

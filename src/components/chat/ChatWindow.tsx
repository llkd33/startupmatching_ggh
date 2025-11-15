'use client'

import { useState, useEffect, useRef } from 'react'
import { db, auth } from '@/lib/supabase'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { notifyMessageReceived } from '@/lib/notifications'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'

interface ChatWindowProps {
  campaignId: string
  otherUserId: string
  otherUserName: string
  campaignTitle?: string
  threadId?: string
}

export default function ChatWindow({ campaignId, otherUserId, otherUserName, campaignTitle, threadId }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Use real-time messages hook
  const { messages, loading } = useRealtimeMessages(campaignId, currentUser?.id || '')

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadCurrentUser = async () => {
    const user = await auth.getUser()
    setCurrentUser(user)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser) return

    setSending(true)
    try {
      const messageData = {
        campaign_id: campaignId,
        sender_id: currentUser.id,
        receiver_id: otherUserId,
        message: newMessage.trim(),
      }

      const messageText = newMessage.trim()
      const { data, error } = await db.messages.send(
        campaignId,
        null, // proposalId
        currentUser.id,
        otherUserId,
        messageText,
        'text'
      )
      if (error) throw error

      // The real-time subscription will automatically update the messages

      setNewMessage('')
      
      // Send notification to receiver
      if (otherUserId && campaignTitle) {
        await notifyMessageReceived(
          otherUserId,
          currentUser.email || otherUserName,
          campaignTitle,
          messageText,
          campaignId,
          threadId
        )
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">메시지 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">{otherUserName}</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500">
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
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-200 text-gray-900'
                    }
                  `}>
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold mb-1">{senderName}</p>
                    )}
                    <p className="text-sm">{message.content || (message as any).message}</p>
                  </div>
                  <p className={`
                    text-xs text-gray-500 mt-1
                    ${isOwnMessage ? 'text-right' : 'text-left'}
                  `}>
                    {formatTime(message.created_at)}
                    {isOwnMessage && message.is_read && (
                      <span className="ml-2">읽음</span>
                    )}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="bg-white border-t px-6 py-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
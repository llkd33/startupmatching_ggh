'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db, auth } from '@/lib/supabase'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { NotificationType } from '@/types/supabase'
import { 
  BellIcon, 
  BriefcaseIcon, 
  DocumentTextIcon, 
  ChatBubbleLeftRightIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'

export default function NotificationList() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // Use real-time notifications hook
  const { notifications, unreadCount } = useRealtimeNotifications(currentUser?.id || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    setLoading(true)
    const user = await auth.getUser()
    setCurrentUser(user)
    setLoading(false)
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await db.notifications.markAsRead(notificationIds)
      // The real-time subscription will automatically update the notifications
    } catch (err) {
      console.error('Failed to mark notifications as read:', err)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead([notification.id])
    }

    // Navigate based on notification type
    const { type, data } = notification
    
    switch (type) {
      case 'campaign_match':
        router.push(`/dashboard/campaigns/${data.campaign_id}`)
        break
      case 'proposal_received':
        router.push(`/dashboard/campaigns/${data.campaign_id}/proposals`)
        break
      case 'proposal_status':
        router.push(`/dashboard/proposals/${data.proposal_id}`)
        break
      case 'message_received':
        router.push(`/dashboard/messages/${data.campaign_id}`)
        break
      default:
        break
    }
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'campaign_match':
        return BriefcaseIcon
      case 'proposal_received':
      case 'proposal_status':
        return DocumentTextIcon
      case 'message_received':
        return ChatBubbleLeftRightIcon
      case 'system':
        return ExclamationCircleIcon
      default:
        return BellIcon
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    
    return date.toLocaleDateString('ko-KR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">알림 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            알림
          </h3>
          {notifications.filter(n => !n.is_read).length > 0 && (
            <button
              type="button"
              onClick={() => markAsRead(notifications.filter(n => !n.is_read).map(n => n.id))}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              모두 읽음 표시
            </button>
          )}
        </div>
      </div>
      
      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">새로운 알림이 없습니다.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type)
            
            return (
              <li key={notification.id}>
                <button
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    w-full px-4 py-4 hover:bg-gray-50 flex items-start text-left
                    ${!notification.is_read ? 'bg-blue-50' : ''}
                  `}
                >
                  <div className="flex-shrink-0">
                    <Icon className={`
                      h-6 w-6
                      ${!notification.is_read ? 'text-blue-600' : 'text-gray-400'}
                    `} />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`
                      text-sm font-medium
                      ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}
                    `}>
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="ml-3 flex-shrink-0">
                      <div className="h-2 w-2 bg-blue-600 rounded-full" />
                    </div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
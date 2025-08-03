'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, BellRing, Check, X, ExternalLink, Archive, MoreVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Notification {
  id: string
  type: 'connection_request' | 'connection_approved' | 'connection_rejected' | 'campaign_match' | 'profile_update' | 'system'
  title: string
  message: string
  related_id?: string
  related_type?: string
  action_url?: string
  action_text?: string
  is_read: boolean
  is_archived: boolean
  created_at: string
  read_at?: string
}

interface NotificationCenterProps {
  userId: string
  onUnreadCountChange?: (count: number) => void
}

export default function NotificationCenter({ userId, onUnreadCountChange }: NotificationCenterProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all')

  useEffect(() => {
    loadNotifications()
    setupRealtimeSubscription()
  }, [userId])

  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.is_read && !n.is_archived).length
    onUnreadCountChange?.(unreadCount)
  }, [notifications, onUnreadCountChange])

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setNotifications(data || [])
    } catch (err) {
      console.error('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new as Notification, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => 
              prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
            )
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        notification_id: notificationId
      })
      
      if (error) throw error

      setNotifications(prev =>
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase.rpc('mark_all_notifications_read')
      if (error) throw error

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }

  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_archived: true, 
          archived_at: new Date().toISOString() 
        })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_archived: true, archived_at: new Date().toISOString() }
            : n
        )
      )
    } catch (err) {
      console.error('Error archiving notification:', err)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'connection_request':
        return '👋'
      case 'connection_approved':
        return '✅'
      case 'connection_rejected':
        return '❌'
      case 'campaign_match':
        return '🎯'
      case 'profile_update':
        return '📝'
      case 'system':
        return '🔔'
      default:
        return '📢'
    }
  }

  const getNotificationTypeText = (type: Notification['type']) => {
    switch (type) {
      case 'connection_request':
        return '연결 요청'
      case 'connection_approved':
        return '요청 승인'
      case 'connection_rejected':
        return '요청 거절'
      case 'campaign_match':
        return '캠페인 매칭'
      case 'profile_update':
        return '프로필 업데이트'
      case 'system':
        return '시스템'
      default:
        return '알림'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.is_read && !notification.is_archived
      case 'archived':
        return notification.is_archived
      default:
        return !notification.is_archived
    }
  })

  const unreadCount = notifications.filter(n => !n.is_read && !n.is_archived).length

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 센터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5 text-blue-600" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            알림 센터
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-1" />
                모두 읽음
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          최근 알림과 활동을 확인하세요
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Filter Tabs */}
        <div className="flex space-x-1 mb-6 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            전체 ({notifications.filter(n => !n.is_archived).length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            읽지 않음 ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('archived')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              filter === 'archived'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            보관함 ({notifications.filter(n => n.is_archived).length})
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {filter === 'unread' && '읽지 않은 알림이 없습니다.'}
              {filter === 'archived' && '보관된 알림이 없습니다.'}
              {filter === 'all' && '알림이 없습니다.'}
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`group relative border rounded-lg p-4 transition-all hover:shadow-sm cursor-pointer ${
                  notification.is_read ? 'bg-white' : 'bg-blue-50 border-blue-200'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {getNotificationTypeText(notification.type)}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ko
                        })}
                      </span>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-1">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    
                    {notification.action_text && notification.action_url && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {notification.action_text}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        archiveNotification(notification.id)
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
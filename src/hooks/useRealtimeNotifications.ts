'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data: any
  is_read: boolean
  created_at: string
}

export function useRealtimeNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    const activeUserId = userId.trim()

    if (!activeUserId) {
      setChannel(null)
      return
    }

    // Create a channel for user notifications
    const notificationChannel = supabase
      .channel(`user-notifications-${activeUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${activeUserId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          
          // Add new notification to the list
          setNotifications((current) => [newNotification, ...current])
          
          // Update unread count
          if (!newNotification.is_read) {
            setUnreadCount((count) => count + 1)
          }

          // Show browser notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/icon-192x192.png',
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${activeUserId}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification
          const oldNotification = payload.old as Notification
          
          // Update notification in the list
          setNotifications((current) =>
            current.map((notif) =>
              notif.id === updatedNotification.id ? updatedNotification : notif
            )
          )
          
          // Update unread count if read status changed
          if (!oldNotification.is_read && updatedNotification.is_read) {
            setUnreadCount((count) => Math.max(0, count - 1))
          }
        }
      )
      .subscribe()

    setChannel(notificationChannel)

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Cleanup subscription on unmount
    return () => {
      if (notificationChannel) {
        supabase.removeChannel(notificationChannel)
      }
    }
  }, [userId])

  // Load initial notifications
  useEffect(() => {
    const activeUserId = userId.trim()

    if (!activeUserId) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', activeUserId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data && !error) {
        setNotifications(data)
        setUnreadCount(data.filter((n) => !n.is_read).length)
      }
    }

    loadNotifications()
  }, [userId])

  return { notifications, unreadCount, channel }
}

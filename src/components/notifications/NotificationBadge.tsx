'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, BellRing } from 'lucide-react'

interface NotificationBadgeProps {
  userId?: string | null
}

const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const getValidUserId = (value?: string | null) => {
  const trimmed = value?.trim()
  return trimmed && USER_ID_PATTERN.test(trimmed) ? trimmed : null
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    return typeof message === 'string' && message ? message : error
  }

  return error
}

export default function NotificationBadge({ userId }: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true
    let cleanupSubscription: (() => void) | undefined

    const loadUnreadCount = async (activeUserId: string) => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', activeUserId)
          .eq('is_read', false)

        if (!isActive) {
          return
        }

        if (error) {
          console.error('Error loading unread count:', error.message || error)
          setUnreadCount(0)
        } else {
          setUnreadCount(count || 0)
        }
      } catch (err) {
        if (!isActive) {
          return
        }

        console.error('Error loading unread count:', getErrorMessage(err))
        setUnreadCount(0) // Default to 0 on error
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    const setupRealtimeSubscription = (activeUserId: string) => {
      const channel = supabase
        .channel(`notification_count:${activeUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${activeUserId}`
          },
          () => {
            // Reload count when notifications change
            void loadUnreadCount(activeUserId)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    const initializeNotificationCount = async () => {
      setLoading(true)

      const propUserId = getValidUserId(userId)
      let activeUserId = propUserId

      if (!activeUserId) {
        try {
          const { data } = await supabase.auth.getUser()
          activeUserId = getValidUserId(data.user?.id)
        } catch {
          activeUserId = null
        }
      }

      if (!isActive) {
        return
      }

      if (!activeUserId) {
        setUnreadCount(0)
        setLoading(false)
        return
      }

      await loadUnreadCount(activeUserId)

      if (!isActive) {
        return
      }

      cleanupSubscription = setupRealtimeSubscription(activeUserId)
    }

    void initializeNotificationCount()

    return () => {
      isActive = false
      cleanupSubscription?.()
    }
  }, [userId])

  if (loading) {
    return (
      <Button variant="ghost" size="sm" className="relative">
        <Bell className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Link href="/dashboard/notifications">
      <Button variant="ghost" size="sm" className="relative">
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-blue-600" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    </Link>
  )
}

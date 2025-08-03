'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeSubscriptionProps {
  table: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

export function useRealtimeSubscription({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeSubscriptionProps) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let subscription: RealtimeChannel

    const setupSubscription = () => {
      subscription = supabase
        .channel(`${table}-${filter || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: filter,
          },
          (payload) => {
            console.log('Realtime event:', payload)
            
            switch (payload.eventType) {
              case 'INSERT':
                onInsert?.(payload)
                break
              case 'UPDATE':
                onUpdate?.(payload)
                break
              case 'DELETE':
                onDelete?.(payload)
                break
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status)
          setIsConnected(status === 'SUBSCRIBED')
        })

      setChannel(subscription)
    }

    setupSubscription()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [table, filter, onInsert, onUpdate, onDelete])

  const unsubscribe = () => {
    if (channel) {
      channel.unsubscribe()
      setChannel(null)
      setIsConnected(false)
    }
  }

  return {
    isConnected,
    unsubscribe,
  }
}
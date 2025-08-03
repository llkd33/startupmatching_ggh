'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface Message {
  id: string
  campaign_id: string
  sender_id: string
  receiver_id: string
  message: string
  is_read: boolean
  read_at: string | null
  created_at: string
  sender?: any
}

export function useRealtimeMessages(campaignId: string, userId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!campaignId || !userId) return

    // Initial load
    loadMessages()

    // Set up realtime subscription
    const messageChannel = supabase
      .channel(`messages:${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `campaign_id=eq.${campaignId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message
          
          // Fetch sender details
          const { data: senderData } = await supabase
            .from('users')
            .select('*')
            .eq('id', newMessage.sender_id)
            .single()

          setMessages(prev => [...prev, {
            ...newMessage,
            sender: senderData,
          }])

          // Mark as read if receiver
          if (newMessage.receiver_id === userId && !newMessage.is_read) {
            await supabase
              .from('messages')
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq('id', newMessage.id)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message
          setMessages(prev => 
            prev.map(msg => msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg)
          )
        }
      )
      .subscribe()

    setChannel(messageChannel)

    return () => {
      if (messageChannel) {
        supabase.removeChannel(messageChannel)
      }
    }
  }, [campaignId, userId])

  const loadMessages = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(*)
      `)
      .eq('campaign_id', campaignId)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data)
    }
    setLoading(false)
  }

  return { messages, loading, channel }
}
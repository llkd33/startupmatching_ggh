'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface Message {
  id: string
  campaign_id: string
  proposal_id: string | null
  sender_id: string
  receiver_id: string
  content: string
  message_type: 'text' | 'file' | 'system' | 'image'
  file_url: string | null
  file_name: string | null
  file_size: number | null
  is_read: boolean
  read_at: string | null
  created_at: string
  sender?: any
}

export function useRealtimeMessages(campaignId: string, userId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

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
      // Calculate initial unread count
      const unread = data.filter(
        (m: Message) => m.receiver_id === userId && !m.is_read
      ).length
      setUnreadCount(unread)
    }
    setLoading(false)
  }

  // Mark all unread messages as read
  const markAllAsRead = useCallback(async () => {
    if (!campaignId || !userId) return

    const unreadMessages = messages.filter(
      m => m.receiver_id === userId && !m.is_read
    )

    if (unreadMessages.length === 0) return

    try {
      const { error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('campaign_id', campaignId)
        .eq('receiver_id', userId)
        .eq('is_read', false)

      if (!error) {
        // Update local state
        setMessages(prev =>
          prev.map(m =>
            m.receiver_id === userId && !m.is_read
              ? { ...m, is_read: true, read_at: new Date().toISOString() }
              : m
          )
        )
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('Failed to mark messages as read:', err)
    }
  }, [campaignId, userId, messages])

  // Mark specific message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', messageId)

      if (!error) {
        setMessages(prev =>
          prev.map(m =>
            m.id === messageId
              ? { ...m, is_read: true, read_at: new Date().toISOString() }
              : m
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to mark message as read:', err)
    }
  }, [])

  return {
    messages,
    loading,
    channel,
    unreadCount,
    markAllAsRead,
    markAsRead
  }
}
/**
 * 알림 생성 및 전송 유틸리티
 */

import { supabase } from './supabase'

export interface NotificationData {
  user_id: string
  type: 'connection_request' | 'connection_approved' | 'connection_rejected' | 'campaign_match' | 'proposal_status_changed' | 'message_received' | 'profile_update' | 'system'
  title: string
  content: string
  data?: Record<string, any>
  action_url?: string
  action_text?: string
}

/**
 * 알림 생성 및 전송
 */
export async function sendNotification(notification: NotificationData): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notifications: [{
          user_id: notification.user_id,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          data: notification.data || {},
          action_url: notification.action_url,
          action_text: notification.action_text,
        }],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      if (process.env.NODE_ENV === 'development') {
        console.error('Error sending notification:', error)
      }
      return false
    }

    return true
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error sending notification:', error)
    }
    return false
  }
}

/**
 * 여러 알림 일괄 전송
 */
export async function sendNotifications(notifications: NotificationData[]): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notifications: notifications.map(n => ({
          user_id: n.user_id,
          type: n.type,
          title: n.title,
          content: n.content,
          data: n.data || {},
          action_url: n.action_url,
          action_text: n.action_text,
        })),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      if (process.env.NODE_ENV === 'development') {
        console.error('Error sending notifications:', error)
      }
      return false
    }

    return true
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error sending notifications:', error)
    }
    return false
  }
}

/**
 * 제안서 상태 변경 알림 전송
 */
export async function notifyProposalStatusChange(
  proposalId: string,
  newStatus: 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn',
  campaignTitle: string,
  expertUserId: string
): Promise<boolean> {
  const statusMessages = {
    submitted: '제출되었습니다',
    under_review: '검토 중입니다',
    accepted: '승인되었습니다',
    rejected: '거절되었습니다',
    withdrawn: '철회되었습니다',
  }

  const statusEmojis = {
    submitted: '📝',
    under_review: '👀',
    accepted: '✅',
    rejected: '❌',
    withdrawn: '↩️',
  }

  const notification: NotificationData = {
    user_id: expertUserId,
    type: 'proposal_status_changed',
    title: `${statusEmojis[newStatus]} 제안서 상태 변경`,
    content: `"${campaignTitle}" 캠페인에 제출하신 제안서가 ${statusMessages[newStatus]}.`,
    data: {
      proposal_id: proposalId,
      status: newStatus,
      campaign_title: campaignTitle,
    },
    action_url: `/dashboard/proposals/${proposalId}`,
    action_text: '제안서 보기',
  }

  return await sendNotification(notification)
}

/**
 * 채팅 메시지 수신 알림 전송
 */
export async function notifyMessageReceived(
  receiverUserId: string,
  senderName: string,
  campaignTitle: string,
  messagePreview: string,
  campaignId: string,
  threadId?: string
): Promise<boolean> {
  const notification: NotificationData = {
    user_id: receiverUserId,
    type: 'message_received',
    title: `💬 ${senderName}님의 새 메시지`,
    content: `"${campaignTitle}" 캠페인 관련 메시지: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
    data: {
      campaign_id: campaignId,
      thread_id: threadId,
      sender_name: senderName,
    },
    action_url: threadId ? `/dashboard/messages/${campaignId}?thread=${threadId}` : `/dashboard/messages/${campaignId}`,
    action_text: '메시지 보기',
  }

  return await sendNotification(notification)
}


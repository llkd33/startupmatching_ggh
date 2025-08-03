'use client'

import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ChatWindow from '@/components/chat/ChatWindow'

export default function MessagePage() {
  const params = useParams()
  const campaignId = params.campaignId as string

  // In a real app, you would fetch campaign and participant details
  // For now, we'll use placeholder data
  const otherUserId = 'placeholder-user-id'
  const otherUserName = '전문가'

  return (
    <DashboardLayout>
      <div className="h-full bg-gray-50">
        <ChatWindow
          campaignId={campaignId}
          otherUserId={otherUserId}
          otherUserName={otherUserName}
        />
      </div>
    </DashboardLayout>
  )
}
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { 
  FileX, 
  Search, 
  Inbox, 
  Users, 
  Bell, 
  MessageSquare,
  Briefcase,
  FileText,
  UserX,
  AlertCircle
} from 'lucide-react'

interface EmptyStateProps {
  type?: 'search' | 'inbox' | 'users' | 'notifications' | 'messages' | 'campaigns' | 'proposals' | 'error' | 'custom'
  title: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'ghost'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

const iconMap = {
  search: Search,
  inbox: Inbox,
  users: Users,
  notifications: Bell,
  messages: MessageSquare,
  campaigns: Briefcase,
  proposals: FileText,
  error: AlertCircle,
  custom: FileX
}

export function EmptyState({
  type = 'custom',
  title,
  description,
  icon,
  action,
  secondaryAction,
  className = ''
}: EmptyStateProps) {
  const IconComponent = iconMap[type]
  
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="relative mb-4">
        {icon || (
          <div className="relative">
            <div className="absolute inset-0 bg-gray-100 rounded-full blur-xl opacity-60" />
            <div className="relative bg-white rounded-full p-4 shadow-sm">
              <IconComponent className="h-12 w-12 text-gray-400" />
            </div>
          </div>
        )}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              size="sm"
            >
              {action.label}
            </Button>
          )}
          
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              size="sm"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Preset empty states for common scenarios
export function NoSearchResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      type="search"
      title="검색 결과가 없습니다"
      description="다른 검색어를 시도하거나 필터를 조정해보세요"
      action={onClear ? {
        label: "검색 초기화",
        onClick: onClear,
        variant: "outline"
      } : undefined}
    />
  )
}

export function NoNotifications() {
  return (
    <EmptyState
      type="notifications"
      title="새로운 알림이 없습니다"
      description="중요한 업데이트가 있으면 여기에 표시됩니다"
    />
  )
}

export function NoMessages({ onStartChat }: { onStartChat?: () => void }) {
  return (
    <EmptyState
      type="messages"
      title="아직 메시지가 없습니다"
      description="전문가나 기관과 대화를 시작해보세요"
      action={onStartChat ? {
        label: "대화 시작하기",
        onClick: onStartChat
      } : undefined}
    />
  )
}

export function NoCampaigns({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      type="campaigns"
      title="아직 캠페인이 없습니다"
      description="첫 번째 캠페인을 만들어 전문가를 찾아보세요"
      action={{
        label: "캠페인 만들기",
        onClick: onCreate
      }}
    />
  )
}

export function NoProposals({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      type="proposals"
      title="제출된 제안서가 없습니다"
      description="캠페인을 둘러보고 제안서를 제출해보세요"
      action={onBrowse ? {
        label: "캠페인 둘러보기",
        onClick: onBrowse
      } : undefined}
    />
  )
}

export function NoExperts({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyState
      type="users"
      title="전문가를 찾을 수 없습니다"
      description="검색 조건을 조정하거나 더 많은 전문가를 초대하세요"
      action={onInvite ? {
        label: "전문가 초대하기",
        onClick: onInvite
      } : undefined}
    />
  )
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      type="error"
      title="문제가 발생했습니다"
      description="일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      action={onRetry ? {
        label: "다시 시도",
        onClick: onRetry,
        variant: "outline"
      } : undefined}
    />
  )
}
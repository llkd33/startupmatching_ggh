'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, WifiOff, ServerOff, FileX, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorAlertProps {
  title: string
  description: string
  type?: 'network' | 'server' | 'generic' | 'not-found' | 'permission'
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

const errorIcons = {
  network: WifiOff,
  server: ServerOff,
  generic: AlertCircle,
  'not-found': FileX,
  permission: ShieldAlert
}

const errorMessages = {
  network: {
    title: '인터넷 연결을 확인해주세요',
    description: '네트워크 연결이 불안정합니다. 연결을 확인한 후 다시 시도해주세요.'
  },
  server: {
    title: '서버에 문제가 발생했습니다',
    description: '일시적인 서버 오류입니다. 잠시 후 다시 시도해주세요.'
  },
  generic: {
    title: '문제가 발생했습니다',
    description: '예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  },
  'not-found': {
    title: '찾을 수 없습니다',
    description: '요청하신 내용을 찾을 수 없습니다. URL을 확인해주세요.'
  },
  permission: {
    title: '접근 권한이 없습니다',
    description: '이 페이지에 접근할 권한이 없습니다. 관리자에게 문의해주세요.'
  }
}

export function ErrorAlert({ 
  title, 
  description, 
  type = 'generic',
  action,
  className
}: ErrorAlertProps) {
  const Icon = errorIcons[type]
  
  // 기본 메시지 사용 (title/description이 제공되지 않은 경우)
  const displayTitle = title || errorMessages[type].title
  const displayDescription = description || errorMessages[type].description

  return (
    <Alert 
      variant="destructive" 
      className={cn("my-4", className)}
    >
      <Icon className="h-4 w-4" />
      <AlertTitle className="font-semibold">{displayTitle}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{displayDescription}</p>
        {action && (
          <Button
            variant="outline"
            size="sm"
            onClick={action.onClick}
            className="mt-2"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

// 편의 함수들
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorAlert
      type="network"
      title="인터넷 연결을 확인해주세요"
      description="네트워크 연결이 불안정합니다. 연결을 확인한 후 다시 시도해주세요."
      action={onRetry ? {
        label: "다시 시도",
        onClick: onRetry
      } : undefined}
    />
  )
}

export function ServerError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorAlert
      type="server"
      title="서버에 문제가 발생했습니다"
      description="일시적인 서버 오류입니다. 잠시 후 다시 시도해주세요."
      action={onRetry ? {
        label: "다시 시도",
        onClick: onRetry
      } : undefined}
    />
  )
}

export function NotFoundError({ 
  onGoHome,
  resource = "페이지"
}: { 
  onGoHome?: () => void
  resource?: string
}) {
  return (
    <ErrorAlert
      type="not-found"
      title={`${resource}를 찾을 수 없습니다`}
      description="요청하신 내용을 찾을 수 없습니다. URL을 확인하거나 홈으로 돌아가주세요."
      action={onGoHome ? {
        label: "홈으로 가기",
        onClick: onGoHome
      } : undefined}
    />
  )
}

export function PermissionError({ 
  onContactAdmin
}: { 
  onContactAdmin?: () => void
}) {
  return (
    <ErrorAlert
      type="permission"
      title="접근 권한이 없습니다"
      description="이 페이지에 접근할 권한이 없습니다. 관리자에게 문의해주세요."
      action={onContactAdmin ? {
        label: "관리자에게 문의",
        onClick: onContactAdmin
      } : undefined}
    />
  )
}


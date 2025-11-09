'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface NextStepProps {
  title: string
  description: string
  action: {
    label: string
    href: string
  }
  progress?: number
  completed?: boolean
  icon?: React.ReactNode
}

export function NextStepWidget({ 
  title, 
  description, 
  action, 
  progress,
  completed = false,
  icon
}: NextStepProps) {
  if (completed) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "border-2 transition-all duration-300 hover:shadow-lg",
      "bg-gradient-to-br from-blue-50 via-white to-purple-50",
      "border-blue-200"
    )}>
      <CardHeader>
        <div className="flex items-start gap-3">
          {icon && (
            <div className="p-2 bg-blue-100 rounded-lg">
              {icon}
            </div>
          )}
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">진행률</span>
              <span className="font-semibold text-blue-600">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <Link href={action.href}>
            {action.label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

interface NextStepData {
  title: string
  description: string
  action: {
    label: string
    href: string
  }
  progress?: number
  completed?: boolean
  icon?: React.ReactNode
}

export function getNextStepForUser(
  userRole: string | null,
  stats: {
    campaigns: number
    proposals: number
    messages: number
    connections: number
  },
  profileComplete?: boolean
): NextStepData | null {
  if (!userRole) return null

  if (userRole === 'expert') {
    // 프로필 미완성
    if (profileComplete === false) {
      return {
        title: '프로필을 완성하세요',
        description: '프로필 완성도가 높을수록 더 많은 캠페인에 매칭될 수 있어요',
        action: {
          label: '프로필 완성하기',
          href: '/profile/expert/complete'
        },
        progress: 60,
        icon: <Sparkles className="h-5 w-5 text-blue-600" />
      }
    }

    // 제안서 없음
    if (stats.proposals === 0) {
      return {
        title: '첫 제안서를 제출해보세요',
        description: '관심있는 캠페인을 찾아 제안서를 제출해보세요',
        action: {
          label: '캠페인 둘러보기',
          href: '/dashboard/campaigns'
        },
        icon: <ArrowRight className="h-5 w-5 text-blue-600" />
      }
    }

    // 메시지 없음
    if (stats.messages === 0 && stats.proposals > 0) {
      return {
        title: '기관과 소통을 시작하세요',
        description: '제안서를 제출한 캠페인에서 메시지를 확인해보세요',
        action: {
          label: '메시지 확인하기',
          href: '/dashboard/messages'
        },
        icon: <ArrowRight className="h-5 w-5 text-blue-600" />
      }
    }
  } else if (userRole === 'organization') {
    // 캠페인 없음
    if (stats.campaigns === 0) {
      return {
        title: '첫 캠페인을 만들어보세요',
        description: '캠페인을 만들면 전문가들이 제안서를 보낼 수 있어요',
        action: {
          label: '캠페인 만들기',
          href: '/dashboard/campaigns/new'
        },
        icon: <ArrowRight className="h-5 w-5 text-blue-600" />
      }
    }

    // 제안서 있지만 확인 안함
    if (stats.proposals > 0) {
      return {
        title: '새로운 제안서를 확인하세요',
        description: `${stats.proposals}개의 제안서가 대기중입니다`,
        action: {
          label: '제안서 확인하기',
          href: '/dashboard/proposals'
        },
        icon: <ArrowRight className="h-5 w-5 text-blue-600" />
      }
    }
  }

  return null
}


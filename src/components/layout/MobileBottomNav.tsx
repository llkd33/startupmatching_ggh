'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard as Home,
  Briefcase,
  MessageSquare,
  UserCircle,
  PlusCircle,
  FolderOpen,
  CheckSquare
} from 'lucide-react'

interface MobileBottomNavProps {
  role: 'expert' | 'organization'
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname()
  
  // 전문가와 기관별 메뉴 아이템
  const expertItems = [
    { 
      icon: Home, 
      label: '홈', 
      href: '/dashboard',
      ariaLabel: '대시보드 홈으로 이동'
    },
    { 
      icon: Briefcase, 
      label: '검색', 
      href: '/dashboard/campaigns/search',
      ariaLabel: '캠페인 검색'
    },
    { 
      icon: FolderOpen, 
      label: '제안서', 
      href: '/dashboard/proposals',
      ariaLabel: '내 제안서 관리'
    },
    { 
      icon: CheckSquare, 
      label: '태스크', 
      href: '/dashboard/tasks',
      ariaLabel: '태스크 관리'
    },
    { 
      icon: UserCircle, 
      label: '프로필', 
      href: '/profile/expert/edit',
      ariaLabel: '내 프로필'
    },
  ]
  
  const organizationItems = [
    { 
      icon: Home, 
      label: '홈', 
      href: '/dashboard',
      ariaLabel: '대시보드 홈으로 이동'
    },
    { 
      icon: Briefcase, 
      label: '캠페인', 
      href: '/dashboard/campaigns',
      ariaLabel: '내 캠페인 관리'
    },
    { 
      icon: PlusCircle, 
      label: '생성', 
      href: '/dashboard/campaigns/create',
      ariaLabel: '새 캠페인 만들기'
    },
    { 
      icon: MessageSquare, 
      label: '메시지', 
      href: '/dashboard/messages',
      ariaLabel: '메시지 확인'
    },
    { 
      icon: UserCircle, 
      label: '프로필', 
      href: '/profile/organization/edit',
      ariaLabel: '내 프로필'
    },
  ]
  
  const items = role === 'expert' ? expertItems : organizationItems
  
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-50 shadow-lg-safe-bottom"
      role="navigation"
      aria-label="주요 네비게이션 메뉴"
    >
      <div className="flex justify-around items-center h-16">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full",
                "min-h-[44px] touch-manipulation", // 터치 친화적 최소 크기
                isActive ? "text-blue-600" : "text-gray-600"
              )}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 mb-1" aria-hidden="true" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}


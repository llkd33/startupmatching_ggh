'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { auth, db } from '@/lib/supabase'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { UserRole } from '@/types/supabase'
import {
  HomeIcon,
  UserIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Use real-time notifications hook
  const { unreadCount } = useRealtimeNotifications(user?.id || '')

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const currentUser = await auth.getUser()
    if (!currentUser) {
      router.push('/auth/login')
      return
    }

    setUser(currentUser)
    
    // Get user role
    const { data } = await db.users.getProfile(currentUser.id)
    if (data) {
      setUserRole(data.role)
    }
  }


  const handleLogout = async () => {
    await auth.signOut()
    router.push('/auth/login')
  }

  const navigation = [
    { name: '대시보드', href: '/dashboard', icon: HomeIcon },
    ...(userRole === 'expert' ? [
      { name: '내 프로필', href: '/dashboard/profile', icon: UserIcon },
      { name: '캠페인 찾기', href: '/dashboard/campaigns/search', icon: MagnifyingGlassIcon },
      { name: '내 제안서', href: '/dashboard/proposals', icon: DocumentTextIcon },
    ] : []),
    ...(userRole === 'organization' ? [
      { name: '기관 정보', href: '/dashboard/organization', icon: UserIcon },
      { name: '캠페인 관리', href: '/dashboard/campaigns', icon: BriefcaseIcon },
      { name: '전문가 검색', href: '/dashboard/experts', icon: MagnifyingGlassIcon },
      { name: '받은 제안서', href: '/dashboard/proposals/received', icon: DocumentTextIcon },
    ] : []),
    { name: '메시지', href: '/dashboard/messages', icon: ChatBubbleLeftRightIcon },
    { name: '알림', href: '/dashboard/notifications', icon: BellIcon },
  ]

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 flex z-40">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold text-gray-900">Expert Matching</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      group flex items-center px-2 py-2 text-base font-medium rounded-md
                      ${pathname === item.href
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <item.icon className="mr-4 h-6 w-6" />
                    {item.name}
                    {item.name === '알림' && unreadCount > 0 && (
                      <span className="ml-auto inline-block py-0.5 px-3 text-xs rounded-full bg-red-500 text-white">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div>
                  <img
                    className="inline-block h-10 w-10 rounded-full"
                    src={`https://ui-avatars.com/api/?name=${user?.email || 'User'}`}
                    alt=""
                  />
                </div>
                <div className="ml-3">
                  <p className="text-base font-medium text-gray-700">
                    {user?.user_metadata?.full_name || user?.email}
                  </p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-gray-900">Expert Matching</h1>
              </div>
              <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      group flex items-center px-2 py-2 text-sm font-medium rounded-md
                      ${pathname === item.href
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <item.icon className="mr-3 h-6 w-6" />
                    {item.name}
                    {item.name === '알림' && unreadCount > 0 && (
                      <span className="ml-auto inline-block py-0.5 px-3 text-xs rounded-full bg-red-500 text-white">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center w-full">
                <div>
                  <img
                    className="inline-block h-9 w-9 rounded-full"
                    src={`https://ui-avatars.com/api/?name=${user?.email || 'User'}`}
                    alt=""
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.user_metadata?.full_name || user?.email}
                  </p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}
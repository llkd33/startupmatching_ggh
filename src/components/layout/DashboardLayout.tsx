'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthContext'
import { Button } from '@/components/ui/button'
import NotificationBadge from '@/components/notifications/NotificationBadge'
import { MobileBottomNav } from './MobileBottomNav'
import { 
  LayoutDashboard, 
  Search, 
  UserCircle, 
  MessageSquare, 
  FileText, 
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Briefcase,
  Users,
  PlusCircle,
  ChevronLeft,
  Bell,
  TrendingUp,
  Calendar,
  FolderOpen,
  CheckSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, role, signOut } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Desktop sidebar collapse state from localStorage
  useEffect(() => {
    const collapsed = localStorage.getItem('sidebar-collapsed') === 'true'
    setIsCollapsed(collapsed)
  }, [])

  const handleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  const handleLogout = async () => {
    try {
      await signOut()
      // signOut 함수 내부에서 이미 리다이렉트 처리됨
    } catch (error) {
      console.error('Logout error:', error)
      // 에러가 발생해도 홈으로 이동
      window.location.href = '/'
    }
  }

  const expertMenuItems = [
    { icon: LayoutDashboard, label: '대시보드', href: '/dashboard' },
    { icon: Search, label: '캠페인 찾기', href: '/dashboard/campaigns/search' },
    { icon: FolderOpen, label: '내 제안서', href: '/dashboard/proposals' },
    { icon: CheckSquare, label: 'Tasks', href: '/dashboard/tasks' },
    { icon: MessageSquare, label: '메시지', href: '/dashboard/messages' },
    { icon: UserCircle, label: '내 프로필', href: '/profile/expert/edit' },
    { icon: Settings, label: '설정', href: '/dashboard/settings' },
  ]

  const organizationMenuItems = [
    { icon: LayoutDashboard, label: '대시보드', href: '/dashboard' },
    { icon: Briefcase, label: '내 캠페인', href: '/dashboard/campaigns' },
    { icon: PlusCircle, label: '캠페인 생성', href: '/dashboard/campaigns/create' },
    { icon: Users, label: '전문가 찾기', href: '/dashboard/experts' },
    { icon: FileText, label: '제안서 관리', href: '/dashboard/proposals' },
    { icon: CheckSquare, label: 'Tasks', href: '/dashboard/tasks' },
    { icon: MessageSquare, label: '메시지', href: '/dashboard/messages' },
    { icon: TrendingUp, label: '분석', href: '/dashboard/analytics' },
    { icon: Settings, label: '설정', href: '/dashboard/settings' },
  ]

  const menuItems = role === 'expert' ? expertMenuItems : organizationMenuItems

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-3 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="메뉴 토글"
              aria-expanded={isSidebarOpen}
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Logo and Home */}
            <Link href="/" className="flex items-center gap-2 group">
              <Home className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
              <span className="font-bold text-lg hidden sm:inline">전문가 매칭</span>
            </Link>

            {/* Desktop sidebar toggle */}
            <button
              onClick={handleCollapse}
              className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="사이드바 토글"
              aria-expanded={!isCollapsed}
            >
              <ChevronLeft className={cn(
                "w-4 h-4 transition-transform",
                isCollapsed && "rotate-180"
              )} aria-hidden="true" />
            </button>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Quick action button */}
            {role === 'expert' ? (
              <Button 
                asChild
                size="sm"
                className="hidden sm:flex"
              >
                <Link href="/dashboard/campaigns/search">
                  <Search className="w-4 h-4 mr-2" />
                  캠페인 찾기
                </Link>
              </Button>
            ) : (
              <Button 
                asChild
                size="sm"
                className="hidden sm:flex"
              >
                <Link href="/dashboard/experts">
                  <Users className="w-4 h-4 mr-2" />
                  전문가 찾기
                </Link>
              </Button>
            )}

            <NotificationBadge userId={user?.id || ''} />

            {/* User menu */}
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-sm text-gray-600">
                {user?.email}
              </span>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900 min-h-[44px] md:min-h-0"
                aria-label="로그아웃"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline ml-2">로그아웃</span>
                <span className="sr-only">로그아웃</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden lg:flex flex-col bg-white border-r transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}>
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || 
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group min-h-[44px]",
                        isActive 
                          ? "bg-blue-50 text-blue-600" 
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      )}
                      title={isCollapsed ? item.label : undefined}
                      aria-label={isCollapsed ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"
                      )} aria-hidden="true" />
                      {!isCollapsed && (
                        <span className="font-medium">{item.label}</span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User info at bottom */}
          {!isCollapsed && (
            <div className="p-4 border-t">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserCircle className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {role === 'expert' ? '전문가' : '기관'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Sidebar */}
        {isSidebarOpen && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 lg:hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <Link href="/" className="font-bold text-lg">
                  전문가 매칭
                </Link>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-3 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="메뉴 닫기"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <nav className="flex-1 p-4 overflow-y-auto">
                <ul className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || 
                      (item.href !== '/dashboard' && pathname.startsWith(item.href))
                    
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors min-h-[44px]",
                            isActive 
                              ? "bg-blue-50 text-blue-600" 
                              : "text-gray-700 hover:bg-gray-100"
                          )}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon className={cn(
                            "w-5 h-5",
                            isActive ? "text-blue-600" : "text-gray-500"
                          )} aria-hidden="true" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </nav>

              {/* User info at bottom */}
              <div className="p-4 border-t">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {role === 'expert' ? '전문가' : '기관'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    handleLogout()
                    setIsSidebarOpen(false)
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </Button>
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav role={role || 'expert'} />
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminNav from './AdminNav'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Shield,
  Home,
} from 'lucide-react'

interface NavigationItem {
  href: string
  label: string
  icon: 'Home' | 'Users' | 'Mail' | 'Briefcase' | 'FileText' | 'BarChart3' | 'Settings' | 'ClipboardList'
}

interface AdminLayoutClientProps {
  children: React.ReactNode
  navigationItems: NavigationItem[]
}

export default function AdminLayoutClient({ children, navigationItems }: AdminLayoutClientProps) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Desktop sidebar collapse state from localStorage
  useEffect(() => {
    const collapsed = localStorage.getItem('admin-sidebar-collapsed') === 'true'
    setIsCollapsed(collapsed)
  }, [])

  const handleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('admin-sidebar-collapsed', String(newState))
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/signout', { method: 'POST' })
      if (response.ok) {
        router.push('/admin-login')
      }
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = '/admin-login'
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-3 rounded-lg hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="메뉴 토글"
              aria-expanded={isSidebarOpen}
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Logo and Title */}
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-red-500" />
              <span className="font-bold text-lg hidden sm:inline text-foreground">관리자 패널</span>
            </div>

            {/* Desktop sidebar toggle */}
            <button
              onClick={handleCollapse}
              className="hidden lg:flex p-2 rounded-lg hover:bg-muted transition-colors min-h-[44px] min-w-[44px] items-center justify-center"
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
            {/* Back to home */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden sm:flex"
            >
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                홈으로
              </Link>
            </Button>

            {/* Logout */}
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground min-h-[44px]"
              aria-label="로그아웃"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline ml-2">로그아웃</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden lg:flex flex-col bg-background border-r transition-all duration-300 min-h-[calc(100vh-4rem)]",
          isCollapsed ? "w-16" : "w-64"
        )}>
          <AdminNav items={navigationItems} isCollapsed={isCollapsed} />

          {/* Version info at bottom */}
          {!isCollapsed && (
            <div className="mt-auto p-4 border-t">
              <p className="text-xs text-muted-foreground">
                관리자 v1.0.0
              </p>
            </div>
          )}
        </aside>

        {/* Mobile Sidebar */}
        {isSidebarOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-72 bg-background z-50 lg:hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-red-500" />
                  <span className="font-bold text-lg text-foreground">관리자 패널</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-3 rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="메뉴 닫기"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4">
                <AdminNav
                  items={navigationItems}
                  onItemClick={() => setIsSidebarOpen(false)}
                />
              </div>

              {/* Bottom actions */}
              <div className="p-4 border-t space-y-2">
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                >
                  <Link href="/" onClick={() => setIsSidebarOpen(false)}>
                    <Home className="w-4 h-4 mr-2" />
                    홈으로
                  </Link>
                </Button>
                <Button
                  onClick={() => {
                    handleLogout()
                    setIsSidebarOpen(false)
                  }}
                  variant="destructive"
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
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

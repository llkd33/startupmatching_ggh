'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthContext'
import { ThemeToggleSimple } from '@/components/ui/theme-toggle'

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, role, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 컨텍스트에서 즉시 반영되므로 로딩만 정리
    setLoading(false)
  }, [])

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

  // Don't show navigation on auth pages
  if (pathname.startsWith('/auth/')) {
    return null
  }

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              전문가 매칭
            </Link>
            
            {user && (
              <div className="hidden md:flex ml-10 space-x-4">
                <Link 
                  href="/dashboard" 
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  대시보드
                </Link>
                
                {role === 'expert' && (
                  <>
                    <Link 
                      href="/dashboard/campaigns/search" 
                      className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      캠페인 찾기
                    </Link>
                    <Link 
                      href="/profile/expert/edit" 
                      className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      내 프로필
                    </Link>
                  </>
                )}
                
                {role === 'organization' && (
                  <>
                    <Link 
                      href="/dashboard/campaigns" 
                      className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      내 캠페인
                    </Link>
                    <Link
                      href="/dashboard/campaigns/create"
                      className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                    >
                      캠페인 생성
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {!loading && (
              <>
                {user ? (
                  <div className="hidden md:flex items-center space-x-4">
                    <ThemeToggleSimple />
                    <span className="text-sm text-muted-foreground">
                      {user.email}
                    </span>
                    <Button onClick={handleLogout} variant="outline" size="sm">
                      로그아웃
                    </Button>
                  </div>
                ) : (
                  <div className="hidden md:flex items-center space-x-2">
                    <ThemeToggleSimple />
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/auth/login">로그인</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href="/auth/register">회원가입</Link>
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Mobile menu button with improved touch target */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-3 -mr-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
              aria-label="모바일 메뉴 토글"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu with improved touch targets */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="px-2 pt-3 pb-4 space-y-1">
            {user ? (
              <>
                <Link 
                  href="/dashboard" 
                  className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[48px] flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  대시보드
                </Link>
                
                {role === 'expert' && (
                  <>
                    <Link 
                      href="/dashboard/campaigns/search" 
                      className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[48px] flex items-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      캠페인 찾기
                    </Link>
                    <Link 
                      href="/profile/expert/edit" 
                      className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[48px] flex items-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      내 프로필
                    </Link>
                  </>
                )}
                
                {role === 'organization' && (
                  <>
                    <Link 
                      href="/dashboard/campaigns" 
                      className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[48px] flex items-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      내 캠페인
                    </Link>
                    <Link 
                      href="/dashboard/campaigns/create" 
                      className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[48px] flex items-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      캠페인 생성
                    </Link>
                  </>
                )}
                
                <div className="border-t mt-3 pt-3">
                  <div className="px-4 py-2 text-sm text-gray-600">
                    {user.email}
                  </div>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    className="block w-full text-left px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[48px] flex items-center"
                  >
                    로그아웃
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link 
                  href="/auth/login" 
                  className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[48px] flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  로그인
                </Link>
                <Link 
                  href="/auth/register" 
                  className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[48px] flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
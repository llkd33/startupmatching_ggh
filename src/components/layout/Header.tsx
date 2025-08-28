'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthContext'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const { user, signOut } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-200 ${
      isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
    }`}>
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg"></div>
            <span className="font-bold text-xl">StartupMatch</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#how-it-works" className="text-gray-700 hover:text-primary transition">
              이용방법
            </Link>
            <Link href="#features" className="text-gray-700 hover:text-primary transition">
              전문가 찾기
            </Link>
            <Link href="#cta" className="text-gray-700 hover:text-primary transition">
              회사소개
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost">대시보드</Button>
                </Link>
                <Button variant="outline" onClick={handleLogout}>
                  로그아웃
                </Button>
              </div>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost">로그인</Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    무료 시작하기
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="모바일 메뉴 토글"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white shadow-lg border-t">
            <div className="px-4 py-4 space-y-1">
              <Link 
                href="#how-it-works" 
                className="block px-3 py-3 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md transition-colors min-h-[44px] flex items-center"
              >
                이용방법
              </Link>
              <Link 
                href="#features" 
                className="block px-3 py-3 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md transition-colors min-h-[44px] flex items-center"
              >
                전문가 찾기
              </Link>
              <Link 
                href="#cta" 
                className="block px-3 py-3 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md transition-colors min-h-[44px] flex items-center"
              >
                회사소개
              </Link>
              <div className="pt-4 border-t space-y-3">
                {user ? (
                  <>
                    <Link href="/dashboard" className="block">
                      <Button variant="outline" className="w-full min-h-[44px]">대시보드</Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="w-full min-h-[44px]" 
                      onClick={handleLogout}
                    >
                      로그아웃
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" className="block">
                      <Button variant="outline" className="w-full min-h-[44px]">로그인</Button>
                    </Link>
                    <Link href="/auth/register" className="block">
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 min-h-[44px]">
                        무료 시작하기
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
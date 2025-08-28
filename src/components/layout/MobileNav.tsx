'use client'

import { useState, useEffect } from 'react'
import { X, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MobileNavProps {
  children: React.ReactNode
  className?: string
}

export function MobileNav({ children, className }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <>
      {/* Menu Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">메뉴</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4">
          {children}
        </nav>
      </aside>
    </>
  )
}

// Mobile-optimized navigation item
export function MobileNavItem({
  href,
  icon,
  label,
  isActive,
  badge,
}: {
  href: string
  icon: React.ReactNode
  label: string
  isActive?: boolean
  badge?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group",
        isActive
          ? "bg-blue-50 text-blue-600"
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn(
          "flex-shrink-0",
          isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"
        )}>
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      {badge}
    </Link>
  )
}
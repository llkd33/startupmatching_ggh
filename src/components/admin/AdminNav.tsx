'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  Briefcase,
  FileText,
  BarChart3,
  Settings,
  Home,
  Mail,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type IconName = 'Home' | 'Users' | 'Mail' | 'Briefcase' | 'FileText' | 'BarChart3' | 'Settings' | 'ClipboardList'

type Item = {
  href: string
  label: string
  icon: IconName
}

const iconMap: Record<IconName, React.ComponentType<{ className?: string }>> = {
  Home,
  Users,
  Mail,
  Briefcase,
  FileText,
  BarChart3,
  Settings,
  ClipboardList,
}

interface AdminNavProps {
  items: Item[]
  isCollapsed?: boolean
  onItemClick?: () => void
}

export default function AdminNav({ items, isCollapsed = false, onItemClick }: AdminNavProps) {
  const pathname = usePathname()

  return (
    <nav className="mt-2 px-2">
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = iconMap[item.icon]
          const isActive = pathname === item.href || (
            item.href !== '/admin' && pathname.startsWith(item.href)
          )

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  'flex items-center px-4 py-3 rounded-lg transition-colors min-h-[44px]',
                  isActive
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isActive ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'
                )} aria-hidden="true" />
                {!isCollapsed && (
                  <span className="ml-3 font-medium">{item.label}</span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}


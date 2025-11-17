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
} from 'lucide-react'

type IconName = 'Home' | 'Users' | 'Mail' | 'Briefcase' | 'FileText' | 'BarChart3' | 'Settings'

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
}

export default function AdminNav({ items }: { items: Item[] }) {
  const pathname = usePathname()

  return (
    <nav className="mt-2">
      {items.map((item) => {
        const Icon = iconMap[item.icon]
        const isActive = pathname === item.href || (
          item.href !== '/admin' && pathname.startsWith(item.href)
        )

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              `flex items-center px-6 py-3 transition-colors ` +
              (isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900')
            }
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-700' : 'text-gray-500'}`} />
            <span className="font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}


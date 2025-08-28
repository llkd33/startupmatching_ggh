import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  label?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
}

export function LoadingSpinner({ 
  size = 'md', 
  className,
  label = '로딩 중...'
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <Loader2 className={cn("animate-spin text-blue-600", sizeClasses[size])} />
      {label && (
        <span className="mt-2 text-sm text-gray-600">{label}</span>
      )}
    </div>
  )
}

export function FullPageLoader({ label = '로딩 중...' }: { label?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <LoadingSpinner size="xl" label={label} />
    </div>
  )
}

export function InlineLoader({ label = '로딩 중...' }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  )
}
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LucideIcon, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface EnhancedStatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  loading?: boolean
  href?: string
  trend?: {
    value: number // 퍼센트 변화
    period?: string // "이번 주", "이번 달" 등
  }
  description?: string
  className?: string
}

export function EnhancedStatCard({
  title,
  value,
  icon: Icon,
  loading = false,
  href,
  trend,
  description,
  className
}: EnhancedStatCardProps) {
  const [displayValue, setDisplayValue] = useState<number | string>(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // 숫자 카운트업 애니메이션
  useEffect(() => {
    if (loading || typeof value !== 'number') {
      setDisplayValue(value)
      return
    }

    setIsAnimating(true)
    const startValue = typeof displayValue === 'number' ? displayValue : 0
    const endValue = value
    const duration = 800 // ms
    const steps = 30
    const stepValue = (endValue - startValue) / steps
    const stepDuration = duration / steps

    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      const newValue = Math.round(startValue + stepValue * currentStep)
      setDisplayValue(Math.min(newValue, endValue))

      if (currentStep >= steps) {
        setDisplayValue(endValue)
        setIsAnimating(false)
        clearInterval(timer)
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [value, loading])

  const content = (
    <Card 
      className={cn(
        "transition-all duration-300",
        href && "hover:shadow-lg hover:scale-[1.02] cursor-pointer",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "p-2 rounded-lg",
          href ? "bg-primary/10" : "bg-muted"
        )}>
          <Icon className={cn(
            "h-4 w-4",
            href ? "text-primary" : "text-muted-foreground"
          )} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16 mb-2" />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <div className={cn(
                "text-2xl font-bold transition-all duration-300",
                isAnimating && "scale-110"
              )}>
                {displayValue}
              </div>
              {trend && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  trend.value >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {trend.value >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(trend.value)}%
                  {trend.period && (
                    <span className="text-muted-foreground ml-1">
                      {trend.period}
                    </span>
                  )}
                </div>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
            {href && (
              <div className="flex items-center gap-1 text-xs text-primary mt-2 font-medium">
                자세히 보기
                <ArrowUpRight className="h-3 w-3" />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}


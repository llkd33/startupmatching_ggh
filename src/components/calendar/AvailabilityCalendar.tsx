'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

// 요일 정의
const DAYS = [
  { key: 'mon', label: '월', fullLabel: '월요일' },
  { key: 'tue', label: '화', fullLabel: '화요일' },
  { key: 'wed', label: '수', fullLabel: '수요일' },
  { key: 'thu', label: '목', fullLabel: '목요일' },
  { key: 'fri', label: '금', fullLabel: '금요일' },
  { key: 'sat', label: '토', fullLabel: '토요일' },
  { key: 'sun', label: '일', fullLabel: '일요일' },
] as const

// 시간대 정의 (1시간 단위)
const TIME_SLOTS = [
  { key: '09', label: '09:00' },
  { key: '10', label: '10:00' },
  { key: '11', label: '11:00' },
  { key: '12', label: '12:00' },
  { key: '13', label: '13:00' },
  { key: '14', label: '14:00' },
  { key: '15', label: '15:00' },
  { key: '16', label: '16:00' },
  { key: '17', label: '17:00' },
  { key: '18', label: '18:00' },
] as const

export type DayKey = typeof DAYS[number]['key']
export type TimeKey = typeof TIME_SLOTS[number]['key']

// 가용성 스케줄 타입
export interface AvailabilitySchedule {
  [day: string]: string[] // day -> array of time keys (e.g., { mon: ['09', '10', '14'] })
}

interface AvailabilityCalendarProps {
  value: AvailabilitySchedule
  onChange: (schedule: AvailabilitySchedule) => void
  readOnly?: boolean
  className?: string
}

export function AvailabilityCalendar({
  value,
  onChange,
  readOnly = false,
  className,
}: AvailabilityCalendarProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'add' | 'remove' | null>(null)

  const isSlotAvailable = useCallback(
    (day: DayKey, time: TimeKey) => {
      return value[day]?.includes(time) ?? false
    },
    [value]
  )

  const toggleSlot = useCallback(
    (day: DayKey, time: TimeKey, forceState?: boolean) => {
      if (readOnly) return

      const daySlots = value[day] || []
      const isCurrentlyAvailable = daySlots.includes(time)

      let newDaySlots: string[]
      if (forceState !== undefined) {
        if (forceState && !isCurrentlyAvailable) {
          newDaySlots = [...daySlots, time].sort()
        } else if (!forceState && isCurrentlyAvailable) {
          newDaySlots = daySlots.filter((t) => t !== time)
        } else {
          return
        }
      } else {
        if (isCurrentlyAvailable) {
          newDaySlots = daySlots.filter((t) => t !== time)
        } else {
          newDaySlots = [...daySlots, time].sort()
        }
      }

      onChange({
        ...value,
        [day]: newDaySlots,
      })
    },
    [value, onChange, readOnly]
  )

  const handleMouseDown = (day: DayKey, time: TimeKey) => {
    if (readOnly) return
    setIsDragging(true)
    const isAvailable = isSlotAvailable(day, time)
    setDragMode(isAvailable ? 'remove' : 'add')
    toggleSlot(day, time)
  }

  const handleMouseEnter = (day: DayKey, time: TimeKey) => {
    if (!isDragging || readOnly) return
    toggleSlot(day, time, dragMode === 'add')
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragMode(null)
  }

  const selectAllDay = (day: DayKey) => {
    if (readOnly) return
    const allTimes = TIME_SLOTS.map((t) => t.key)
    onChange({
      ...value,
      [day]: allTimes,
    })
  }

  const clearDay = (day: DayKey) => {
    if (readOnly) return
    onChange({
      ...value,
      [day]: [],
    })
  }

  const selectAllTime = (time: TimeKey) => {
    if (readOnly) return
    const newSchedule = { ...value }
    DAYS.forEach((day) => {
      const daySlots = newSchedule[day.key] || []
      if (!daySlots.includes(time)) {
        newSchedule[day.key] = [...daySlots, time].sort()
      }
    })
    onChange(newSchedule)
  }

  const clearAllTime = (time: TimeKey) => {
    if (readOnly) return
    const newSchedule = { ...value }
    DAYS.forEach((day) => {
      newSchedule[day.key] = (newSchedule[day.key] || []).filter((t) => t !== time)
    })
    onChange(newSchedule)
  }

  const selectWeekdays = () => {
    if (readOnly) return
    const weekdays: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri']
    const businessHours: TimeKey[] = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18']

    const newSchedule: AvailabilitySchedule = {}
    weekdays.forEach((day) => {
      newSchedule[day] = businessHours
    })
    onChange(newSchedule)
  }

  const clearAll = () => {
    if (readOnly) return
    onChange({})
  }

  // 총 가용 시간 계산
  const totalHours = Object.values(value).reduce(
    (sum, slots) => sum + (slots?.length || 0),
    0
  )

  return (
    <div
      className={cn('select-none', className)}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 빠른 선택 버튼 */}
      {!readOnly && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectWeekdays}
          >
            평일 업무시간
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAll}
          >
            전체 초기화
          </Button>
          <span className="ml-auto text-sm text-muted-foreground self-center">
            총 {totalHours}시간 가용
          </span>
        </div>
      )}

      {/* 데스크톱 캘린더 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-sm font-medium text-muted-foreground border border-border bg-muted/30">
                시간
              </th>
              {DAYS.map((day) => (
                <th
                  key={day.key}
                  className="p-2 text-sm font-medium text-foreground border border-border bg-muted/30"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{day.label}</span>
                    {!readOnly && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => selectAllDay(day.key)}
                          className="p-1 rounded hover:bg-primary/20 transition-colors"
                          title="전체 선택"
                        >
                          <Check className="w-3 h-3 text-primary" />
                        </button>
                        <button
                          type="button"
                          onClick={() => clearDay(day.key)}
                          className="p-1 rounded hover:bg-destructive/20 transition-colors"
                          title="전체 해제"
                        >
                          <X className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time) => (
              <tr key={time.key}>
                <td className="p-2 text-sm text-muted-foreground border border-border bg-muted/20 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span>{time.label}</span>
                    {!readOnly && (
                      <div className="flex gap-1 ml-1">
                        <button
                          type="button"
                          onClick={() => selectAllTime(time.key)}
                          className="p-0.5 rounded hover:bg-primary/20 transition-colors"
                          title="전체 선택"
                        >
                          <Check className="w-2.5 h-2.5 text-primary" />
                        </button>
                        <button
                          type="button"
                          onClick={() => clearAllTime(time.key)}
                          className="p-0.5 rounded hover:bg-destructive/20 transition-colors"
                          title="전체 해제"
                        >
                          <X className="w-2.5 h-2.5 text-destructive" />
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                {DAYS.map((day) => {
                  const isAvailable = isSlotAvailable(day.key, time.key)
                  return (
                    <td
                      key={`${day.key}-${time.key}`}
                      className={cn(
                        'p-0 border border-border transition-colors',
                        !readOnly && 'cursor-pointer',
                        isAvailable
                          ? 'bg-primary/80 hover:bg-primary'
                          : 'bg-background hover:bg-muted'
                      )}
                      onMouseDown={() => handleMouseDown(day.key, time.key)}
                      onMouseEnter={() => handleMouseEnter(day.key, time.key)}
                    >
                      <div className="w-full h-8" />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일 캘린더 */}
      <div className="md:hidden space-y-4">
        {DAYS.map((day) => (
          <Card key={day.key} className="overflow-hidden">
            <CardHeader className="py-3 px-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{day.fullLabel}</CardTitle>
                {!readOnly && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAllDay(day.key)}
                      className="h-8 px-2"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      전체
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => clearDay(day.key)}
                      className="h-8 px-2"
                    >
                      <X className="w-4 h-4 mr-1" />
                      초기화
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-2">
                {TIME_SLOTS.map((time) => {
                  const isAvailable = isSlotAvailable(day.key, time.key)
                  return (
                    <button
                      key={`${day.key}-${time.key}`}
                      type="button"
                      onClick={() => toggleSlot(day.key, time.key)}
                      disabled={readOnly}
                      className={cn(
                        'px-3 py-2 text-sm rounded-md transition-colors min-h-[44px]',
                        isAvailable
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                        !readOnly && 'hover:opacity-80'
                      )}
                    >
                      {time.label}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {readOnly && totalHours === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          등록된 가용 시간이 없습니다.
        </div>
      )}

      {/* 범례 */}
      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary" />
          <span>가용</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted border border-border" />
          <span>불가</span>
        </div>
        {!readOnly && (
          <span className="text-xs">드래그하여 여러 시간대를 선택/해제할 수 있습니다</span>
        )}
      </div>
    </div>
  )
}

// 읽기 전용 미니 뷰 (프로필 카드 등에 사용)
interface AvailabilityBadgeProps {
  schedule: AvailabilitySchedule
  className?: string
}

export function AvailabilityBadge({ schedule, className }: AvailabilityBadgeProps) {
  const totalHours = Object.values(schedule || {}).reduce(
    (sum, slots) => sum + (slots?.length || 0),
    0
  )

  if (totalHours === 0) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        가용 시간 미설정
      </span>
    )
  }

  // 가용 요일 표시
  const availableDays = DAYS.filter(
    (day) => (schedule[day.key]?.length || 0) > 0
  ).map((day) => day.label)

  return (
    <div className={cn('text-sm', className)}>
      <span className="text-muted-foreground">가용: </span>
      <span className="font-medium">{availableDays.join(', ')}</span>
      <span className="text-muted-foreground ml-2">({totalHours}시간/주)</span>
    </div>
  )
}

export default AvailabilityCalendar

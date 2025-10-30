import { useState, useEffect, useCallback, useRef } from 'react'

interface MousePosition {
  x: number
  y: number
}

interface UseThrottledMouseMoveOptions {
  throttleMs?: number
  enabled?: boolean
}

/**
 * Hook for throttled mouse movement tracking
 * Optimized for performance by limiting update frequency
 */
export function useThrottledMouseMove({
  throttleMs = 50,
  enabled = true
}: UseThrottledMouseMoveOptions = {}): MousePosition {
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 })
  const lastUpdate = useRef<number>(0)
  const rafId = useRef<number>()

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const now = Date.now()

      // Throttle updates
      if (now - lastUpdate.current < throttleMs) {
        return
      }

      // Cancel any pending animation frame
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }

      // Use requestAnimationFrame for smooth updates
      rafId.current = requestAnimationFrame(() => {
        setMousePosition({ x: e.clientX, y: e.clientY })
        lastUpdate.current = now
      })
    },
    [throttleMs]
  )

  useEffect(() => {
    if (!enabled) {
      return
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [enabled, handleMouseMove])

  return mousePosition
}

'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { toast } from '@/components/ui/toast-custom'

interface AutoSaveOptions {
  key: string // LocalStorage 키
  delay?: number // 자동 저장 딜레이 (ms)
  enabled?: boolean // 자동 저장 활성화 여부
  onSave?: (data: any) => void // 저장 시 콜백
  onRestore?: (data: any) => void // 복구 시 콜백
}

interface AutoSaveState {
  lastSaved: Date | null
  isSaving: boolean
  hasDraft: boolean
}

/**
 * 자동 저장 훅
 *
 * @example
 * const { save, restore, clear, state } = useAutoSave({
 *   key: 'campaign-draft',
 *   delay: 3000,
 *   enabled: true
 * })
 *
 * // 폼 데이터 변경 시 자동 저장
 * useEffect(() => {
 *   save(formData)
 * }, [formData])
 */
export function useAutoSave<T = any>({
  key,
  delay = 3000,
  enabled = true,
  onSave,
  onRestore
}: AutoSaveOptions) {
  const [state, setState] = useState<AutoSaveState>({
    lastSaved: null,
    isSaving: false,
    hasDraft: false
  })

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dataRef = useRef<T | null>(null)

  // 초기 마운트 시 임시 저장 데이터 확인
  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setState(prev => ({ ...prev, hasDraft: true }))
      } catch (error) {
        console.error('Failed to parse stored data:', error)
        localStorage.removeItem(key)
      }
    }
  }, [key])

  // 자동 저장 함수
  const save = useCallback((data: T) => {
    if (!enabled || typeof window === 'undefined') return

    // 이전 타이머 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    dataRef.current = data

    // 저장 중 표시
    setState(prev => ({ ...prev, isSaving: true }))

    // 딜레이 후 저장
    timeoutRef.current = setTimeout(() => {
      try {
        const storageKey = key
        const timestamp = new Date().toISOString()
        const payload = {
          data,
          timestamp,
          version: 1
        }

        localStorage.setItem(storageKey, JSON.stringify(payload))

        setState({
          lastSaved: new Date(),
          isSaving: false,
          hasDraft: true
        })

        onSave?.(data)
      } catch (error) {
        console.error('Failed to save draft:', error)
        setState(prev => ({ ...prev, isSaving: false }))

        // LocalStorage 용량 초과 에러 처리
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          toast.error('저장 공간이 부족합니다. 일부 임시 저장 데이터를 삭제해주세요.')
        }
      }
    }, delay)
  }, [key, delay, enabled, onSave])

  // 임시 저장 데이터 복구
  const restore = useCallback((): T | null => {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(key)
      if (!stored) return null

      const parsed = JSON.parse(stored)
      const data = parsed.data as T

      onRestore?.(data)

      return data
    } catch (error) {
      console.error('Failed to restore draft:', error)
      return null
    }
  }, [key, onRestore])

  // 임시 저장 데이터 삭제
  const clear = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(key)
      setState({
        lastSaved: null,
        isSaving: false,
        hasDraft: false
      })

      // 타이머 취소
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    } catch (error) {
      console.error('Failed to clear draft:', error)
    }
  }, [key])

  // 저장 중인 데이터 즉시 저장 (submit 시 사용)
  const saveNow = useCallback(() => {
    if (!dataRef.current || typeof window === 'undefined') return

    // 타이머 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    try {
      const timestamp = new Date().toISOString()
      const payload = {
        data: dataRef.current,
        timestamp,
        version: 1
      }

      localStorage.setItem(key, JSON.stringify(payload))

      setState({
        lastSaved: new Date(),
        isSaving: false,
        hasDraft: true
      })

      onSave?.(dataRef.current)
    } catch (error) {
      console.error('Failed to save draft immediately:', error)
    }
  }, [key, onSave])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    save,
    restore,
    clear,
    saveNow,
    state
  }
}

/**
 * 임시 저장 데이터 메타정보 가져오기
 */
export function getDraftMetadata(key: string) {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(key)
    if (!stored) return null

    const parsed = JSON.parse(stored)
    return {
      timestamp: parsed.timestamp,
      version: parsed.version
    }
  } catch {
    return null
  }
}

/**
 * 모든 임시 저장 데이터 목록 가져오기
 */
export function getAllDrafts(prefix?: string) {
  if (typeof window === 'undefined') return []

  const drafts: Array<{ key: string; timestamp: string }> = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue

    if (prefix && !key.startsWith(prefix)) continue

    try {
      const stored = localStorage.getItem(key)
      if (!stored) continue

      const parsed = JSON.parse(stored)
      if (parsed.timestamp) {
        drafts.push({
          key,
          timestamp: parsed.timestamp
        })
      }
    } catch {
      // 파싱 실패 시 무시
    }
  }

  return drafts.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

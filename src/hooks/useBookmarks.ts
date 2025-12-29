'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type BookmarkType = 'campaign' | 'expert' | 'organization'

export interface Bookmark {
  id: string
  user_id: string
  target_type: BookmarkType
  target_id: string
  created_at: string
  // Joined data
  campaign?: {
    id: string
    title: string
    industry: string
    budget_min: number
    budget_max: number
    status: string
  }
  expert?: {
    id: string
    user_id: string
    specialty: string
    bio: string
    user?: {
      email: string
      raw_user_meta_data?: {
        full_name?: string
      }
    }
  }
}

interface UseBookmarksOptions {
  userId: string
  targetType?: BookmarkType
}

interface UseBookmarksReturn {
  bookmarks: Bookmark[]
  loading: boolean
  error: string | null
  isBookmarked: (targetId: string, targetType: BookmarkType) => boolean
  addBookmark: (targetId: string, targetType: BookmarkType) => Promise<boolean>
  removeBookmark: (targetId: string, targetType: BookmarkType) => Promise<boolean>
  toggleBookmark: (targetId: string, targetType: BookmarkType) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useBookmarks({ userId, targetType }: UseBookmarksOptions): UseBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBookmarks = useCallback(async () => {
    if (!userId) {
      setBookmarks([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('bookmarks')
        .select(`
          id,
          user_id,
          target_type,
          target_id,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (targetType) {
        query = query.eq('target_type', targetType)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        // Table might not exist yet, return empty array
        if (fetchError.code === '42P01') {
          setBookmarks([])
        } else {
          throw fetchError
        }
      } else {
        setBookmarks(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err)
      setError('북마크를 불러오는데 실패했습니다.')
      setBookmarks([])
    } finally {
      setLoading(false)
    }
  }, [userId, targetType])

  useEffect(() => {
    fetchBookmarks()
  }, [fetchBookmarks])

  const isBookmarked = useCallback((targetId: string, type: BookmarkType): boolean => {
    return bookmarks.some(b => b.target_id === targetId && b.target_type === type)
  }, [bookmarks])

  const addBookmark = useCallback(async (targetId: string, type: BookmarkType): Promise<boolean> => {
    if (!userId) return false

    try {
      const { data, error: insertError } = await supabase
        .from('bookmarks')
        .insert({
          user_id: userId,
          target_type: type,
          target_id: targetId
        })
        .select()
        .single()

      if (insertError) throw insertError

      setBookmarks(prev => [data, ...prev])
      return true
    } catch (err) {
      console.error('Failed to add bookmark:', err)
      return false
    }
  }, [userId])

  const removeBookmark = useCallback(async (targetId: string, type: BookmarkType): Promise<boolean> => {
    if (!userId) return false

    try {
      const { error: deleteError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('target_type', type)
        .eq('target_id', targetId)

      if (deleteError) throw deleteError

      setBookmarks(prev => prev.filter(b => !(b.target_id === targetId && b.target_type === type)))
      return true
    } catch (err) {
      console.error('Failed to remove bookmark:', err)
      return false
    }
  }, [userId])

  const toggleBookmark = useCallback(async (targetId: string, type: BookmarkType): Promise<boolean> => {
    if (isBookmarked(targetId, type)) {
      return removeBookmark(targetId, type)
    } else {
      return addBookmark(targetId, type)
    }
  }, [isBookmarked, addBookmark, removeBookmark])

  return {
    bookmarks,
    loading,
    error,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    refresh: fetchBookmarks
  }
}

// Single bookmark check hook for individual items
export function useIsBookmarked(userId: string, targetId: string, targetType: BookmarkType): {
  isBookmarked: boolean
  loading: boolean
  toggle: () => Promise<boolean>
} {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !targetId) {
      setLoading(false)
      return
    }

    const checkBookmark = async () => {
      try {
        const { data, error } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', userId)
          .eq('target_type', targetType)
          .eq('target_id', targetId)
          .single()

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows found, which is expected
          if (error.code !== '42P01') {
            console.error('Error checking bookmark:', error)
          }
        }

        setIsBookmarked(!!data)
      } catch (err) {
        console.error('Failed to check bookmark:', err)
      } finally {
        setLoading(false)
      }
    }

    checkBookmark()
  }, [userId, targetId, targetType])

  const toggle = useCallback(async (): Promise<boolean> => {
    if (!userId || !targetId) return false

    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('target_type', targetType)
          .eq('target_id', targetId)

        if (error) throw error
        setIsBookmarked(false)
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: userId,
            target_type: targetType,
            target_id: targetId
          })

        if (error) throw error
        setIsBookmarked(true)
      }
      return true
    } catch (err) {
      console.error('Failed to toggle bookmark:', err)
      return false
    }
  }, [userId, targetId, targetType, isBookmarked])

  return { isBookmarked, loading, toggle }
}

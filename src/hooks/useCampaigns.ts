import { useState, useEffect } from 'react'
import { browserSupabase } from '@/lib/supabase-client'
import { handleSupabaseError } from '@/lib/error-handler'

export interface Campaign {
  id: string
  title: string
  description: string
  type: string
  category: string
  keywords: string[]
  budget_min: number | null
  budget_max: number | null
  start_date: string | null
  end_date: string | null
  location: string | null
  required_experts: number
  status: string
  created_at: string
  organization_id: string
}

export type UserRole = 'organization' | 'expert' | 'admin'

interface UseCampaignsOptions {
  userId: string
  role: UserRole
  pageSize?: number
}

interface UseCampaignsReturn {
  campaigns: Campaign[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

export function useCampaigns({
  userId,
  role,
  pageSize = 20
}: UseCampaignsOptions): UseCampaignsReturn {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const loadCampaigns = async (isLoadMore = false) => {
    if (!isLoadMore) {
      setLoading(true)
    }

    try {
      let query = browserSupabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(pageSize)

      // Apply cursor for pagination
      if (isLoadMore && cursor) {
        query = query.lt('created_at', cursor)
      }

      if (role === 'organization') {
        // For organizations, show their own campaigns
        const { data: orgProfile, error: orgError } = await browserSupabase
          .from('organization_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()

        if (orgError) {
          throw orgError
        }

        if (orgProfile?.id) {
          query = query.eq('organization_id', orgProfile.id)
        } else {
          // No organization profile found, return empty
          setCampaigns([])
          setHasMore(false)
          return
        }
      }
      // For experts, show all active campaigns (no filter needed)

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      const newCampaigns = data || []

      if (isLoadMore) {
        setCampaigns(prev => [...prev, ...newCampaigns])
      } else {
        setCampaigns(newCampaigns)
      }

      // Update cursor and hasMore
      setHasMore(newCampaigns.length === pageSize)
      if (newCampaigns.length > 0) {
        setCursor(newCampaigns[newCampaigns.length - 1].created_at)
      }

      setError(null)
    } catch (err) {
      const error = err as Error
      setError(error)
      handleSupabaseError(error, true, { context: 'load_campaigns' })
      if (!isLoadMore) {
        setCampaigns([])
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!hasMore || loading) return
    await loadCampaigns(true)
  }

  const refresh = async () => {
    setCursor(null)
    setHasMore(true)
    await loadCampaigns(false)
  }

  useEffect(() => {
    loadCampaigns(false)
  }, [userId, role])

  return {
    campaigns,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  }
}

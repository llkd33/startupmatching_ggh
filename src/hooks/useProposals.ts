import { useState, useEffect } from 'react'
import { browserSupabase } from '@/lib/supabase-client'
import { handleSupabaseError } from '@/lib/error-handler'
import type { UserRole } from './useCampaigns'

export interface Proposal {
  id: string
  campaign_id: string
  expert_id: string
  proposal_text: string
  estimated_budget: number | null
  estimated_start_date: string | null
  estimated_end_date: string | null
  portfolio_links: string[]
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  response_message: string | null
  submitted_at: string
  reviewed_at: string | null
  campaigns: {
    title: string
    description: string
    status: string
    organization_profiles: {
      organization_name: string
      user_id: string
    }
  }
  expert_profiles?: {
    name: string
    title: string
    hourly_rate: number | null
    users: {
      email: string
    }
  }
}

interface UseProposalsOptions {
  userId: string
  role: UserRole
  pageSize?: number
}

interface UseProposalsReturn {
  proposals: Proposal[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

export function useProposals({
  userId,
  role,
  pageSize = 20
}: UseProposalsOptions): UseProposalsReturn {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const loadProposals = async (isLoadMore = false) => {
    if (!isLoadMore) {
      setLoading(true)
    }

    try {
      let query = browserSupabase
        .from('proposals')
        .select(`
          *,
          campaigns(
            title,
            description,
            status,
            organization_profiles(organization_name, user_id)
          ),
          expert_profiles(
            name,
            title,
            hourly_rate,
            users(email)
          )
        `)
        .order('submitted_at', { ascending: false })
        .limit(pageSize)

      // Apply cursor for pagination
      if (isLoadMore && cursor) {
        query = query.lt('submitted_at', cursor)
      }

      if (role === 'expert') {
        // For experts, show their own proposals
        const { data: expertProfile } = await browserSupabase
          .from('expert_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()

        if (expertProfile?.id) {
          query = query.eq('expert_id', expertProfile.id)
        } else {
          setProposals([])
          setHasMore(false)
          return
        }
      } else if (role === 'organization') {
        // For organizations, show proposals for their campaigns
        const { data: orgProfile } = await browserSupabase
          .from('organization_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()

        if (orgProfile?.id) {
          const { data: campaigns } = await browserSupabase
            .from('campaigns')
            .select('id')
            .eq('organization_id', orgProfile.id)

          const campaignIds = campaigns?.map(c => c.id) || []
          if (campaignIds.length > 0) {
            query = query.in('campaign_id', campaignIds)
          } else {
            setProposals([])
            setHasMore(false)
            return
          }
        } else {
          setProposals([])
          setHasMore(false)
          return
        }
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      const newProposals = data || []

      if (isLoadMore) {
        setProposals(prev => [...prev, ...newProposals])
      } else {
        setProposals(newProposals)
      }

      setHasMore(newProposals.length === pageSize)
      if (newProposals.length > 0) {
        setCursor(newProposals[newProposals.length - 1].submitted_at)
      }

      setError(null)
    } catch (err) {
      const error = err as Error
      setError(error)
      handleSupabaseError(error, true, { context: 'load_proposals' })
      if (!isLoadMore) {
        setProposals([])
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!hasMore || loading) return
    await loadProposals(true)
  }

  const refresh = async () => {
    setCursor(null)
    setHasMore(true)
    await loadProposals(false)
  }

  useEffect(() => {
    loadProposals(false)
  }, [userId, role])

  return {
    proposals,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  }
}

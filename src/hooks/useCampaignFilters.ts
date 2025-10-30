import { useState, useMemo } from 'react'
import type { Campaign } from './useCampaigns'

export type CampaignStatus = 'all' | 'active' | 'draft' | 'completed' | 'cancelled'

interface UseCampaignFiltersOptions {
  campaigns: Campaign[]
}

interface UseCampaignFiltersReturn {
  filteredCampaigns: Campaign[]
  searchTerm: string
  setSearchTerm: (term: string) => void
  statusFilter: CampaignStatus
  setStatusFilter: (status: CampaignStatus) => void
  hasActiveFilters: boolean
  clearFilters: () => void
}

export function useCampaignFilters({
  campaigns
}: UseCampaignFiltersOptions): UseCampaignFiltersReturn {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<CampaignStatus>('all')

  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns

    // Apply search filter
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(campaign =>
        campaign.title?.toLowerCase().includes(lowerSearch) ||
        campaign.description?.toLowerCase().includes(lowerSearch) ||
        campaign.keywords?.some(keyword =>
          keyword.toLowerCase().includes(lowerSearch)
        )
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter)
    }

    return filtered
  }, [campaigns, searchTerm, statusFilter])

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all'

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  return {
    filteredCampaigns,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    hasActiveFilters,
    clearFilters
  }
}

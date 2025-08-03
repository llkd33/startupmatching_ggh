'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/supabase'
import { ProposalStatus } from '@/types/supabase'
import ProposalCard from './ProposalCard'

interface ProposalListProps {
  campaignId: string
  organizationView?: boolean
}

export default function ProposalList({ campaignId, organizationView = false }: ProposalListProps) {
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ProposalStatus | 'all'>('all')

  useEffect(() => {
    loadProposals()
  }, [campaignId])

  const loadProposals = async () => {
    setLoading(true)
    try {
      const { data, error } = await db.proposals.getByCampaign(campaignId)
      if (error) throw error
      setProposals(data || [])
    } catch (err) {
      console.error('Failed to load proposals:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (proposalId: string, status: ProposalStatus) => {
    try {
      const { error } = await db.proposals.updateStatus(proposalId, status)
      if (error) throw error
      
      // Update local state
      setProposals(prev => 
        prev.map(p => p.id === proposalId ? { ...p, status } : p)
      )
      
      // TODO: Send notification to expert
    } catch (err) {
      console.error('Failed to update proposal status:', err)
    }
  }

  const filteredProposals = filter === 'all' 
    ? proposals 
    : proposals.filter(p => p.status === filter)

  const statusCounts = {
    all: proposals.length,
    submitted: proposals.filter(p => p.status === 'submitted').length,
    under_review: proposals.filter(p => p.status === 'under_review').length,
    accepted: proposals.filter(p => p.status === 'accepted').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
    withdrawn: proposals.filter(p => p.status === 'withdrawn').length,
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${filter === status
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {status === 'all' && '전체'}
              {status === 'submitted' && '제출됨'}
              {status === 'under_review' && '검토중'}
              {status === 'accepted' && '승인됨'}
              {status === 'rejected' && '거절됨'}
              {status === 'withdrawn' && '철회됨'}
              <span className="ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium bg-gray-100 text-gray-900">
                {count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Proposal List */}
      <div className="mt-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center">
              <svg className="animate-spin h-5 w-5 mr-3 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              로딩 중...
            </div>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {filter === 'all' 
                ? '아직 제출된 제안서가 없습니다.'
                : '해당 상태의 제안서가 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                organizationView={organizationView}
                onStatusUpdate={organizationView ? handleStatusUpdate : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
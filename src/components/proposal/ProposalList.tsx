'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/supabase'
import ProposalCard from './ProposalCard'
import { NoProposals, NoSearchResults } from '@/components/ui/empty-state'
import { ListItemSkeleton } from '@/components/ui/loading-states'
import { notifyProposalStatusChange } from '@/lib/notifications'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, Square, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ProposalStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn'

interface ProposalListProps {
  campaignId: string
  organizationView?: boolean
}

export default function ProposalList({ campaignId, organizationView = false }: ProposalListProps) {
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ProposalStatus | 'all'>('all')
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(new Set())
  const [isProcessingBulk, setIsProcessingBulk] = useState(false)

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
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load proposals:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (proposalId: string, status: ProposalStatus) => {
    try {
      // Get proposal details before updating
      const proposal = proposals.find(p => p.id === proposalId)
      if (!proposal) {
        toast.error('제안서를 찾을 수 없습니다.')
        return
      }

      const { error } = await db.proposals.updateStatus(proposalId, status)
      if (error) throw error
      
      // Update local state
      setProposals(prev => 
        prev.map(p => p.id === proposalId ? { ...p, status } : p)
      )
      
      // Send notification to expert
      const expertUserId = proposal.expert_profiles?.users?.id
      const campaignTitle = proposal.campaigns?.title || '캠페인'
      
      if (expertUserId) {
        await notifyProposalStatusChange(
          proposalId,
          status,
          campaignTitle,
          expertUserId
        )
      }

      toast.success('제안서 상태가 업데이트되었습니다.')
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update proposal status:', err)
      }
      toast.error(err.message || '제안서 상태 업데이트에 실패했습니다.')
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

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedProposals.size === filteredProposals.length) {
      setSelectedProposals(new Set())
    } else {
      setSelectedProposals(new Set(filteredProposals.map(p => p.id)))
    }
  }

  // 개별 선택/해제
  const toggleSelectProposal = (proposalId: string) => {
    const newSelected = new Set(selectedProposals)
    if (newSelected.has(proposalId)) {
      newSelected.delete(proposalId)
    } else {
      newSelected.add(proposalId)
    }
    setSelectedProposals(newSelected)
  }

  // 일괄 상태 변경
  const handleBulkStatusChange = async (newStatus: ProposalStatus) => {
    if (selectedProposals.size === 0) {
      toast.error('제안서를 선택해주세요.')
      return
    }

    const confirmMessage = `선택한 ${selectedProposals.size}개의 제안서를 ${
      newStatus === 'accepted' ? '승인' :
      newStatus === 'rejected' ? '거절' :
      newStatus === 'under_review' ? '검토중으로 변경' : '변경'
    }하시겠습니까?`

    if (!confirm(confirmMessage)) return

    setIsProcessingBulk(true)
    try {
      const selectedIds = Array.from(selectedProposals)
      const errors: string[] = []

      for (const proposalId of selectedIds) {
        try {
          const proposal = proposals.find(p => p.id === proposalId)
          if (!proposal) continue

          const { error } = await db.proposals.updateStatus(proposalId, newStatus)
          if (error) throw error

          // 알림 발송
          const expertUserId = proposal.expert_profiles?.users?.id
          const campaignTitle = proposal.campaigns?.title || '캠페인'

          if (expertUserId) {
            await notifyProposalStatusChange(
              proposalId,
              newStatus,
              campaignTitle,
              expertUserId
            )
          }
        } catch (err: any) {
          errors.push(`${proposalId}: ${err.message}`)
        }
      }

      if (errors.length === 0) {
        toast.success(`${selectedIds.length}개의 제안서가 업데이트되었습니다.`)
        setProposals(prev =>
          prev.map(p => selectedIds.includes(p.id) ? { ...p, status: newStatus } : p)
        )
        setSelectedProposals(new Set())
      } else {
        toast.error(`일부 제안서 업데이트에 실패했습니다. (${errors.length}/${selectedIds.length})`)
        console.error('Bulk update errors:', errors)
      }

      await loadProposals()
    } catch (err: any) {
      toast.error('일괄 처리 중 오류가 발생했습니다.')
      console.error('Bulk processing error:', err)
    } finally {
      setIsProcessingBulk(false)
    }
  }

  return (
    <div>
      {/* 일괄 작업 툴바 */}
      {organizationView && filteredProposals.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="flex items-center gap-2"
              >
                {selectedProposals.size === filteredProposals.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                전체 선택
              </Button>

              {selectedProposals.size > 0 && (
                <Badge variant="secondary">
                  {selectedProposals.size}개 선택됨
                </Badge>
              )}
            </div>

            {selectedProposals.size > 0 && (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={isProcessingBulk}
                      className="flex items-center gap-2"
                    >
                      일괄 작업
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('accepted')}>
                      선택한 제안서 승인
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('rejected')}>
                      선택한 제안서 거절
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('under_review')}>
                      검토중으로 변경
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      )}

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
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="py-12">
            {proposals.length === 0 ? (
              <NoProposals />
            ) : (
              <NoSearchResults onClear={() => setFilter('all')} />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProposals.map((proposal) => (
              <div key={proposal.id} className="relative">
                {organizationView && (
                  <div className="absolute left-4 top-4 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelectProposal(proposal.id)
                      }}
                      className="p-2 bg-white rounded-md shadow-sm hover:bg-gray-50 border border-gray-200"
                    >
                      {selectedProposals.has(proposal.id) ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                )}
                <div className={organizationView ? 'ml-12' : ''}>
                  <ProposalCard
                    proposal={proposal}
                    organizationView={organizationView}
                    onStatusUpdate={organizationView ? handleStatusUpdate : undefined}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
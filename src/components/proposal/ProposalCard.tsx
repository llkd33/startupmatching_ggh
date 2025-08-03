'use client'

import { useState } from 'react'
import { ProposalStatus } from '@/types/supabase'
import { 
  CalendarIcon, 
  CurrencyDollarIcon, 
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/24/solid'

interface ProposalCardProps {
  proposal: {
    id: string
    proposal_text: string
    estimated_budget: number | null
    estimated_start_date: string | null
    estimated_end_date: string | null
    portfolio_links: string[]
    status: ProposalStatus
    submitted_at: string
    reviewed_at: string | null
    expert_profiles: {
      id: string
      average_rating: number
      total_reviews: number
      hashtags: string[]
      users: {
        email: string
        raw_user_meta_data: any
      }
    }
  }
  organizationView?: boolean
  onStatusUpdate?: (proposalId: string, status: ProposalStatus) => void
}

export default function ProposalCard({ proposal, organizationView, onStatusUpdate }: ProposalCardProps) {
  const [showFullText, setShowFullText] = useState(false)
  const expert = proposal.expert_profiles
  const expertName = expert.users.raw_user_meta_data?.full_name || '전문가'

  const getStatusBadge = (status: ProposalStatus) => {
    const badges = {
      submitted: { color: 'bg-blue-100 text-blue-800', text: '제출됨' },
      under_review: { color: 'bg-yellow-100 text-yellow-800', text: '검토중' },
      accepted: { color: 'bg-green-100 text-green-800', text: '승인됨' },
      rejected: { color: 'bg-red-100 text-red-800', text: '거절됨' },
      withdrawn: { color: 'bg-gray-100 text-gray-800', text: '철회됨' },
    }
    return badges[status]
  }

  const statusBadge = getStatusBadge(proposal.status)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {expertName}
          </h3>
          <div className="flex items-center mt-1">
            <div className="flex items-center">
              {[0, 1, 2, 3, 4].map((rating) => (
                <StarIcon
                  key={rating}
                  className={`h-4 w-4 ${
                    expert.average_rating > rating ? 'text-yellow-400' : 'text-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-600">
              {expert.average_rating.toFixed(1)} ({expert.total_reviews}개 리뷰)
            </span>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
          {statusBadge.text}
        </span>
      </div>

      {/* Expert Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {expert.hashtags.slice(0, 5).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Proposal Text */}
      <div className="mb-4">
        <p className={`text-gray-700 ${!showFullText && 'line-clamp-3'}`}>
          {proposal.proposal_text}
        </p>
        {proposal.proposal_text.length > 200 && (
          <button
            type="button"
            onClick={() => setShowFullText(!showFullText)}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
          >
            {showFullText ? '접기' : '더 보기'}
          </button>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
        {proposal.estimated_budget && (
          <div className="flex items-center text-sm text-gray-600">
            <CurrencyDollarIcon className="h-4 w-4 mr-1" />
            {proposal.estimated_budget.toLocaleString()}원
          </div>
        )}
        {(proposal.estimated_start_date || proposal.estimated_end_date) && (
          <div className="flex items-center text-sm text-gray-600">
            <CalendarIcon className="h-4 w-4 mr-1" />
            {proposal.estimated_start_date} ~ {proposal.estimated_end_date || '협의'}
          </div>
        )}
        <div className="flex items-center text-sm text-gray-600">
          <ClockIcon className="h-4 w-4 mr-1" />
          {new Date(proposal.submitted_at).toLocaleDateString()} 제출
        </div>
      </div>

      {/* Portfolio Links */}
      {proposal.portfolio_links.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">포트폴리오</p>
          <div className="space-y-1">
            {proposal.portfolio_links.map((link, index) => (
              <a
                key={index}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
              >
                <LinkIcon className="h-4 w-4 mr-1" />
                {link}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {organizationView && onStatusUpdate && proposal.status === 'submitted' && (
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => onStatusUpdate(proposal.id, 'under_review')}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            검토 시작
          </button>
          <button
            type="button"
            onClick={() => onStatusUpdate(proposal.id, 'accepted')}
            className="flex-1 px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <CheckCircleIcon className="h-4 w-4 inline mr-1" />
            승인
          </button>
          <button
            type="button"
            onClick={() => onStatusUpdate(proposal.id, 'rejected')}
            className="flex-1 px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <XCircleIcon className="h-4 w-4 inline mr-1" />
            거절
          </button>
        </div>
      )}

      {organizationView && proposal.status === 'accepted' && (
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <button
            type="button"
            className="flex-1 px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            채팅 시작
          </button>
          <button
            type="button"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            프로필 보기
          </button>
        </div>
      )}
    </div>
  )
}
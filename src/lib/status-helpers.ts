/**
 * Status helpers - Centralized status colors, labels, and icons
 *
 * This file contains all status-related utilities to avoid code duplication
 * and ensure consistency across the application.
 */

import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText
} from 'lucide-react'

// Campaign Status
export const CAMPAIGN_STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
} as const

export const CAMPAIGN_STATUS_LABELS = {
  active: '진행중',
  draft: '임시저장',
  completed: '완료',
  cancelled: '취소됨',
  in_progress: '진행중',
} as const

export type CampaignStatus = keyof typeof CAMPAIGN_STATUS_COLORS

export function getCampaignStatusColor(status: string): string {
  return CAMPAIGN_STATUS_COLORS[status as CampaignStatus] || CAMPAIGN_STATUS_COLORS.draft
}

export function getCampaignStatusText(status: string): string {
  return CAMPAIGN_STATUS_LABELS[status as CampaignStatus] || status
}

// Proposal Status
export const PROPOSAL_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
} as const

export const PROPOSAL_STATUS_LABELS = {
  pending: '검토중',
  accepted: '승인됨',
  rejected: '거절됨',
  withdrawn: '철회됨',
} as const

export type ProposalStatus = keyof typeof PROPOSAL_STATUS_COLORS

export function getProposalStatusColor(status: string): string {
  return PROPOSAL_STATUS_COLORS[status as ProposalStatus] || PROPOSAL_STATUS_COLORS.pending
}

export function getProposalStatusText(status: string): string {
  return PROPOSAL_STATUS_LABELS[status as ProposalStatus] || status
}

export function getProposalStatusIcon(status: string) {
  switch (status) {
    case 'pending':
      return AlertCircle
    case 'accepted':
      return CheckCircle
    case 'rejected':
      return XCircle
    case 'withdrawn':
      return Clock
    default:
      return FileText
  }
}

// Campaign Type
export const CAMPAIGN_TYPE_LABELS = {
  mentoring: '멘토링/강의',
  investment: '투자 매칭',
  service: '서비스 아웃소싱',
  consulting: '컨설팅',
  development: '개발',
} as const

export type CampaignType = keyof typeof CAMPAIGN_TYPE_LABELS

export function getCampaignTypeText(type: string): string {
  return CAMPAIGN_TYPE_LABELS[type as CampaignType] || type
}

// Format currency
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '₩0'
  return `₩${amount.toLocaleString()}`
}

// Format budget range
export function formatBudgetRange(
  min: number | null | undefined,
  max: number | null | undefined
): string {
  if (min && max) {
    return `${formatCurrency(min)} - ${formatCurrency(max)}`
  }
  if (min) {
    return `${formatCurrency(min)} 이상`
  }
  if (max) {
    return `${formatCurrency(max)} 이하`
  }
  return '협의'
}

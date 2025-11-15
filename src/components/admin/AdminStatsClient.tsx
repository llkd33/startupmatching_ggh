'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Briefcase, FileText, Activity, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { campaignStatusLabel, proposalStatusLabel } from '@/lib/i18n/status'
import { SkeletonCard } from '@/components/ui/skeleton'

interface AdminStats {
  userCount: number
  expertCount: number
  organizationCount: number
  campaignCount: number
  proposalCount: number
  activeCampaignCount: number
  acceptedProposalCount: number
  recentCampaigns: any[]
  recentProposals: any[]
  error?: string
}

export default function AdminStatsClient() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('인증이 필요합니다.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats(data)
      if (data.error) {
        setError(data.error)
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err)
      setError(err.message || '통계를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">오류 발생</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!stats) return null

  const statItems = [
    { label: '전체 사용자', value: stats.userCount || 0, icon: Users, color: 'bg-blue-500', href: '/admin/users' },
    { label: '전문가', value: stats.expertCount || 0, icon: Users, color: 'bg-green-500', href: '/admin/users?role=expert' },
    { label: '기관', value: stats.organizationCount || 0, icon: Briefcase, color: 'bg-purple-500', href: '/admin/users?role=organization' },
    { label: '전체 캠페인', value: stats.campaignCount || 0, icon: FileText, color: 'bg-orange-500', href: '/admin/campaigns' },
    { label: '활성 캠페인', value: stats.activeCampaignCount || 0, icon: Activity, color: 'bg-emerald-500', href: '/admin/campaigns?status=active' },
    { label: '전체 제안서', value: stats.proposalCount || 0, icon: FileText, color: 'bg-indigo-500', href: '/admin/proposals' },
    { label: '승인된 제안서', value: stats.acceptedProposalCount || 0, icon: CheckCircle, color: 'bg-teal-500', href: '/admin/proposals?status=accepted' },
  ]

  return (
    <div>
      {error && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statItems.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.label}
                  </CardTitle>
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>최근 캠페인</CardTitle>
            <CardDescription>최근 등록된 캠페인 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentCampaigns && stats.recentCampaigns.length > 0 ? (
              <div className="space-y-4">
                {stats.recentCampaigns.map((campaign: any) => (
                  <div key={campaign.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{campaign.title}</p>
                      <p className="text-sm text-gray-600">
                        by {campaign.organization_profiles?.organization_name || 'Unknown'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      campaign.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      campaign.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                      campaign.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaignStatusLabel(campaign.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">캠페인이 없습니다</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Proposals */}
        <Card>
          <CardHeader>
            <CardTitle>최근 제안서</CardTitle>
            <CardDescription>최근 제출된 제안서 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentProposals && stats.recentProposals.length > 0 ? (
              <div className="space-y-4">
                {stats.recentProposals.map((proposal: any) => (
                  <div key={proposal.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">
                        {proposal.expert_profiles?.name || 'Unknown Expert'}
                      </p>
                      <p className="text-sm text-gray-600">
                        for {proposal.campaigns?.title}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      proposal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      proposal.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      proposal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      proposal.status === 'withdrawn' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {proposalStatusLabel(proposal.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">제안서가 없습니다</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

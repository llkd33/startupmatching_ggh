import { checkAdminAuth, getServerSupabase } from '@/lib/admin'
import { Users, Briefcase, FileText, TrendingUp, Shield, Activity, CheckCircle, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { campaignStatusLabel, proposalStatusLabel } from '@/lib/i18n/status'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  await checkAdminAuth()

  // Fetch statistics
  const supabase = getServerSupabase()
  const [
    { count: userCount },
    { count: expertCount },
    { count: organizationCount },
    { count: campaignCount },
    { count: proposalCount },
    { count: activeCampaignCount },
    { count: acceptedProposalCount },
    { data: recentCampaigns },
    { data: recentProposals }
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'expert'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'organization'),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }),
    supabase.from('proposals').select('id', { count: 'exact', head: true }),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('status', 'accepted'),
    supabase.from('campaigns')
      .select('*, organization_profiles(organization_name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('proposals')
      .select('*, campaigns(title), expert_profiles(name)')
      .order('created_at', { ascending: false })
      .limit(5)
  ])

  const stats = [
    { label: '전체 사용자', value: userCount || 0, icon: Users, color: 'bg-blue-500', href: '/admin/users' },
    { label: '전문가', value: expertCount || 0, icon: Users, color: 'bg-green-500', href: '/admin/users?role=expert' },
    { label: '기관', value: organizationCount || 0, icon: Briefcase, color: 'bg-purple-500', href: '/admin/users?role=organization' },
    { label: '전체 캠페인', value: campaignCount || 0, icon: FileText, color: 'bg-orange-500', href: '/admin/campaigns' },
    { label: '활성 캠페인', value: activeCampaignCount || 0, icon: Activity, color: 'bg-emerald-500', href: '/admin/campaigns?status=active' },
    { label: '전체 제안서', value: proposalCount || 0, icon: FileText, color: 'bg-indigo-500', href: '/admin/proposals' },
    { label: '승인된 제안서', value: acceptedProposalCount || 0, icon: CheckCircle, color: 'bg-teal-500', href: '/admin/proposals?status=accepted' },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-2">
          <Shield className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold text-gray-900">슈퍼 관리자 대시보드</h1>
        </div>
        <p className="text-gray-600">시스템 전체 현황을 모니터링하고 관리합니다</p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
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
          );
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
            {recentCampaigns && recentCampaigns.length > 0 ? (
              <div className="space-y-4">
                {recentCampaigns.map((campaign: any) => (
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
            {recentProposals && recentProposals.length > 0 ? (
              <div className="space-y-4">
                {recentProposals.map((proposal: any) => (
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
  );
}

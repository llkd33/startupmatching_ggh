'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Users, 
  Briefcase, 
  FileText, 
  TrendingUp,
  DollarSign,
  Activity
} from 'lucide-react';

interface Analytics {
  totalUsers: number;
  totalExperts: number;
  totalOrganizations: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalProposals: number;
  acceptedProposals: number;
  averageProposalValue: number;
  userGrowth: { date: string; count: number }[];
  campaignsByType: { type: string; count: number }[];
  proposalsByStatus: { status: string; count: number }[];
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    
    // Fetch all the metrics
    const [
      { count: totalUsers },
      { count: totalExperts },
      { count: totalOrganizations },
      { count: totalCampaigns },
      { count: activeCampaigns },
      { count: totalProposals },
      { data: acceptedProposalsData },
      { data: proposalValues },
      { data: campaignTypes },
      { data: proposalStatuses }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'expert'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'organization'),
      supabase.from('campaigns').select('*', { count: 'exact', head: true }),
      supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('proposals').select('*', { count: 'exact', head: true }),
      supabase.from('proposals').select('*', { count: 'exact' }).eq('status', 'accepted'),
      supabase.from('proposals').select('proposed_budget'),
      supabase.from('campaigns').select('type'),
      supabase.from('proposals').select('status')
    ]);

    // Calculate average proposal value
    const avgProposalValue = proposalValues && proposalValues.length > 0
      ? proposalValues.reduce((sum: number, p: any) => sum + (p.proposed_budget || 0), 0) / proposalValues.length
      : 0;

    // Group campaigns by type
    const campaignsByType = campaignTypes
      ? Object.entries(
          campaignTypes.reduce((acc: any, curr: any) => {
            acc[curr.type] = (acc[curr.type] || 0) + 1;
            return acc;
          }, {})
        ).map(([type, count]) => ({ type, count: count as number }))
      : [];

    // Group proposals by status
    const proposalsByStatus = proposalStatuses
      ? Object.entries(
          proposalStatuses.reduce((acc: any, curr: any) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
          }, {})
        ).map(([status, count]) => ({ status, count: count as number }))
      : [];

    setAnalytics({
      totalUsers: totalUsers || 0,
      totalExperts: totalExperts || 0,
      totalOrganizations: totalOrganizations || 0,
      totalCampaigns: totalCampaigns || 0,
      activeCampaigns: activeCampaigns || 0,
      totalProposals: totalProposals || 0,
      acceptedProposals: acceptedProposalsData?.length || 0,
      averageProposalValue: avgProposalValue,
      userGrowth: [], // Would need date-based query
      campaignsByType,
      proposalsByStatus
    });

    setLoading(false);
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  const stats = [
    { 
      label: 'Total Users', 
      value: analytics.totalUsers, 
      icon: Users, 
      color: 'bg-blue-500',
      subtext: `${analytics.totalExperts} experts, ${analytics.totalOrganizations} organizations`
    },
    { 
      label: 'Active Campaigns', 
      value: analytics.activeCampaigns, 
      icon: Briefcase, 
      color: 'bg-green-500',
      subtext: `of ${analytics.totalCampaigns} total`
    },
    { 
      label: 'Total Proposals', 
      value: analytics.totalProposals, 
      icon: FileText, 
      color: 'bg-purple-500',
      subtext: `${analytics.acceptedProposals} accepted`
    },
    { 
      label: 'Avg Proposal Value', 
      value: `$${Math.round(analytics.averageProposalValue).toLocaleString()}`, 
      icon: DollarSign, 
      color: 'bg-orange-500',
      subtext: 'Per proposal'
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaigns by Type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Campaigns by Type</h2>
          <div className="space-y-3">
            {analytics.campaignsByType.map((item) => (
              <div key={item.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-gray-700">{item.type}</span>
                  <span className="text-gray-600">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ 
                      width: `${(item.count / analytics.totalCampaigns) * 100}%` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Proposals by Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Proposals by Status</h2>
          <div className="space-y-3">
            {analytics.proposalsByStatus.map((item) => {
              const colors = {
                pending: 'bg-yellow-500',
                accepted: 'bg-green-500',
                rejected: 'bg-red-500',
                withdrawn: 'bg-gray-500'
              };
              return (
                <div key={item.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-700">{item.status}</span>
                    <span className="text-gray-600">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${colors[item.status as keyof typeof colors] || 'bg-gray-500'} h-2 rounded-full`}
                      style={{ 
                        width: `${(item.count / analytics.totalProposals) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Success Metrics */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Platform Success Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {analytics.totalProposals > 0 
                ? `${Math.round((analytics.acceptedProposals / analytics.totalProposals) * 100)}%`
                : '0%'
              }
            </p>
            <p className="text-sm text-gray-600">Proposal Acceptance Rate</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {analytics.totalCampaigns > 0
                ? `${Math.round((analytics.activeCampaigns / analytics.totalCampaigns) * 100)}%`
                : '0%'
              }
            </p>
            <p className="text-sm text-gray-600">Campaign Activity Rate</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {analytics.totalUsers > 0
                ? `${Math.round((analytics.totalExperts / analytics.totalUsers) * 100)}%`
                : '0%'
              }
            </p>
            <p className="text-sm text-gray-600">Expert User Ratio</p>
          </div>
        </div>
      </div>
    </div>
  );
}
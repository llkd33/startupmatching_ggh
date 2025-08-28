'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveDataGrid } from '@/components/ui/responsive-table';
import { 
  Users, 
  Briefcase, 
  FileText, 
  TrendingUp, 
  Shield, 
  Activity, 
  CheckCircle, 
  UserPlus,
  DollarSign,
  AlertCircle,
  BarChart3,
  Calendar,
  MessageSquare,
  Settings,
  LogOut,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Download,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalUsers: number;
  experts: number;
  organizations: number;
  campaigns: number;
  activeCampaigns: number;
  proposals: number;
  acceptedProposals: number;
  revenue: number;
  growthRate: number;
  activeUsers: number;
  newUsersToday: number;
  pendingVerifications: number;
}

interface RecentActivity {
  id: string;
  type: 'user_signup' | 'campaign_created' | 'proposal_submitted' | 'payment_received';
  description: string;
  timestamp: string;
  user?: string;
  amount?: number;
}

interface AdminDashboardProps {
  stats: DashboardStats;
  recentActivities: RecentActivity[];
  recentCampaigns: any[];
  recentProposals: any[];
}

export default function AdminDashboard({ 
  stats, 
  recentActivities, 
  recentCampaigns, 
  recentProposals 
}: AdminDashboardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('7days');

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
    window.location.reload();
  };

  const quickActions = [
    { label: '사용자 관리', href: '/admin/users', icon: Users, color: 'text-blue-600' },
    { label: '캠페인 관리', href: '/admin/campaigns', icon: Briefcase, color: 'text-purple-600' },
    { label: '제안서 검토', href: '/admin/proposals', icon: FileText, color: 'text-green-600' },
    { label: '시스템 설정', href: '/admin/settings', icon: Settings, color: 'text-gray-600' },
  ];

  const statCards = [
    { 
      label: '전체 사용자', 
      value: stats.totalUsers, 
      icon: Users, 
      color: 'bg-blue-500', 
      trend: { value: 12, isPositive: true },
      href: '/admin/users' 
    },
    { 
      label: '활성 캠페인', 
      value: stats.activeCampaigns, 
      icon: Activity, 
      color: 'bg-green-500',
      trend: { value: 8, isPositive: true },
      href: '/admin/campaigns?status=active' 
    },
    { 
      label: '이번 달 수익', 
      value: `₩${stats.revenue.toLocaleString()}`, 
      icon: DollarSign, 
      color: 'bg-emerald-500',
      trend: { value: stats.growthRate, isPositive: stats.growthRate > 0 },
      href: '/admin/analytics' 
    },
    { 
      label: '대기중 검증', 
      value: stats.pendingVerifications, 
      icon: AlertCircle, 
      color: 'bg-orange-500',
      trend: { value: 3, isPositive: false },
      href: '/admin/users?filter=pending' 
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup': return <UserPlus className="w-4 h-4" />;
      case 'campaign_created': return <Briefcase className="w-4 h-4" />;
      case 'proposal_submitted': return <FileText className="w-4 h-4" />;
      case 'payment_received': return <DollarSign className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_signup': return 'text-blue-600 bg-blue-100';
      case 'campaign_created': return 'text-purple-600 bg-purple-100';
      case 'proposal_submitted': return 'text-green-600 bg-green-100';
      case 'payment_received': return 'text-emerald-600 bg-emerald-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-red-500" />
            관리자 대시보드
          </h1>
          <p className="text-gray-600 mt-1">시스템 전체 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="today">오늘</option>
            <option value="7days">최근 7일</option>
            <option value="30days">최근 30일</option>
            <option value="90days">최근 90일</option>
          </select>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            리포트 다운로드
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href}>
              <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gray-50`}>
                      <Icon className={`w-5 h-5 ${action.color}`} />
                    </div>
                    <span className="font-medium text-gray-700">{action.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
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
                  <div className="text-2xl font-bold">{stat.value}</div>
                  {stat.trend && (
                    <div className="flex items-center mt-2">
                      <TrendingUp className={`w-4 h-4 mr-1 ${
                        stat.trend.isPositive ? 'text-green-600' : 'text-red-600'
                      }`} />
                      <span className={`text-sm ${
                        stat.trend.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.trend.isPositive ? '+' : '-'}{Math.abs(stat.trend.value)}%
                      </span>
                      <span className="text-sm text-gray-500 ml-1">vs 지난달</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>사용자 증가 추이</CardTitle>
              <CardDescription>최근 30일간 사용자 가입 현황</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              상세 분석
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">차트 컴포넌트 (recharts 등으로 구현 예정)</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>실시간 활동</CardTitle>
              <Link href="/admin/logs">
                <Button variant="ghost" size="sm">
                  전체 보기
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {activity.user && <span>{activity.user} · </span>}
                      {new Date(activity.timestamp).toLocaleTimeString('ko-KR')}
                    </p>
                  </div>
                  {activity.amount && (
                    <span className="text-sm font-medium text-green-600">
                      +₩{activity.amount.toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Campaigns */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>최근 캠페인</CardTitle>
              <Link href="/admin/campaigns">
                <Button variant="ghost" size="sm">
                  전체 보기
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCampaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{campaign.title}</p>
                    <p className="text-sm text-gray-500">
                      {campaign.profiles?.organization_name || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {campaign.status}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Proposals */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>최근 제안서</CardTitle>
              <Link href="/admin/proposals">
                <Button variant="ghost" size="sm">
                  전체 보기
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProposals.map((proposal) => (
                <div key={proposal.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {proposal.profiles?.name || 'Unknown Expert'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {proposal.campaigns?.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      proposal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      proposal.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {proposal.status}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>시스템 상태</CardTitle>
          <CardDescription>서비스 운영 상태 및 성능 지표</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">API 상태</span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600 mt-2">정상</p>
              <p className="text-xs text-gray-600 mt-1">응답시간: 45ms</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">데이터베이스</span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600 mt-2">정상</p>
              <p className="text-xs text-gray-600 mt-1">연결: 12/100</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">스토리지</span>
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600 mt-2">42%</p>
              <p className="text-xs text-gray-600 mt-1">4.2GB / 10GB</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">이메일 전송</span>
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-600 mt-2">제한</p>
              <p className="text-xs text-gray-600 mt-1">450/500 (일일 한도)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
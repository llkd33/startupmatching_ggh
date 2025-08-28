'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  Ban,
  RefreshCw
} from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string;
  organization_id: string;
  organization_name: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'suspended';
  budget_min: number;
  budget_max: number;
  type: string;
  keywords: string[];
  proposal_count: number;
  view_count: number;
  created_at: string;
  deadline: string;
  is_featured: boolean;
}

interface AdminCampaignsProps {
  campaigns: Campaign[];
  onRefresh: () => void;
}

export default function AdminCampaigns({ campaigns: initialCampaigns, onRefresh }: AdminCampaignsProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('created_at');
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    if (!confirm(`이 캠페인의 상태를 ${newStatus}로 변경하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    // API call to update status
    try {
      // Update local state
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId ? { ...c, status: newStatus as Campaign['status'] } : c
      ));
    } catch (error) {
      console.error('Failed to update campaign status:', error);
    }
    setLoading(false);
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('정말로 이 캠페인을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setLoading(true);
    try {
      // API call to delete
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
    setLoading(false);
  };

  const handleToggleFeatured = async (campaignId: string, currentFeatured: boolean) => {
    setLoading(true);
    try {
      // API call to toggle featured
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId ? { ...c, is_featured: !currentFeatured } : c
      ));
    } catch (error) {
      console.error('Failed to toggle featured:', error);
    }
    setLoading(false);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCampaigns.length === 0) {
      alert('선택된 캠페인이 없습니다.');
      return;
    }

    if (!confirm(`선택된 ${selectedCampaigns.length}개의 캠페인에 대해 ${action} 작업을 수행하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    try {
      // API call for bulk action
      if (action === 'delete') {
        setCampaigns(prev => prev.filter(c => !selectedCampaigns.includes(c.id)));
      } else if (action === 'suspend') {
        setCampaigns(prev => prev.map(c => 
          selectedCampaigns.includes(c.id) ? { ...c, status: 'suspended' as Campaign['status'] } : c
        ));
      }
      setSelectedCampaigns([]);
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    }
    setLoading(false);
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = 
      campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus;
    const matchesType = filterType === 'all' || campaign.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    switch (sortBy) {
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'deadline':
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      case 'proposals':
        return b.proposal_count - a.proposal_count;
      case 'budget':
        return b.budget_max - a.budget_max;
      default:
        return 0;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    suspended: campaigns.filter(c => c.status === 'suspended').length,
    totalProposals: campaigns.reduce((sum, c) => sum + c.proposal_count, 0),
    avgBudget: campaigns.reduce((sum, c) => sum + (c.budget_min + c.budget_max) / 2, 0) / campaigns.length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">캠페인 관리</h1>
          <p className="text-gray-600 mt-1">전체 캠페인을 관리하고 모니터링합니다</p>
        </div>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-gray-600">전체 캠페인</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-sm text-gray-600">활성 캠페인</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            <p className="text-sm text-gray-600">초안</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.suspended}</div>
            <p className="text-sm text-gray-600">중단됨</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalProposals}</div>
            <p className="text-sm text-gray-600">총 제안서</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">₩{Math.round(stats.avgBudget).toLocaleString()}</div>
            <p className="text-sm text-gray-600">평균 예산</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>필터 및 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="제목, 기관명, 키워드 검색..."
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="active">활성</option>
              <option value="draft">초안</option>
              <option value="completed">완료</option>
              <option value="cancelled">취소</option>
              <option value="suspended">중단</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 유형</option>
              <option value="lecture">강연/멘토링</option>
              <option value="investment">투자자 매칭</option>
              <option value="service">서비스 아웃소싱</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at">최신순</option>
              <option value="deadline">마감일순</option>
              <option value="proposals">제안서 많은순</option>
              <option value="budget">예산 높은순</option>
            </select>
          </div>

          {selectedCampaigns.length > 0 && (
            <div className="mt-4 flex gap-2">
              <Button 
                onClick={() => handleBulkAction('suspend')} 
                variant="outline"
                className="text-orange-600"
              >
                <Ban className="w-4 h-4 mr-2" />
                선택 항목 중단 ({selectedCampaigns.length})
              </Button>
              <Button 
                onClick={() => handleBulkAction('delete')} 
                variant="outline"
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                선택 항목 삭제 ({selectedCampaigns.length})
              </Button>
              <Button 
                onClick={() => setSelectedCampaigns([])} 
                variant="ghost"
              >
                선택 취소
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCampaigns.length === sortedCampaigns.length && sortedCampaigns.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCampaigns(sortedCampaigns.map(c => c.id));
                        } else {
                          setSelectedCampaigns([]);
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">캠페인</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">예산</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">제안서</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">마감일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      로딩 중...
                    </td>
                  </tr>
                ) : sortedCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      캠페인이 없습니다
                    </td>
                  </tr>
                ) : (
                  sortedCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCampaigns.includes(campaign.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCampaigns([...selectedCampaigns, campaign.id]);
                            } else {
                              setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaign.id));
                            }
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{campaign.title}</p>
                            {campaign.is_featured && (
                              <Badge className="bg-yellow-100 text-yellow-800">추천</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{campaign.organization_name}</p>
                          <div className="flex gap-1 mt-1">
                            {campaign.keywords.slice(0, 3).map((keyword, i) => (
                              <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={campaign.status}
                          onChange={(e) => handleStatusChange(campaign.id, e.target.value)}
                          className={`px-2 py-1 text-xs rounded-full border-0 ${getStatusColor(campaign.status)}`}
                        >
                          <option value="draft">초안</option>
                          <option value="active">활성</option>
                          <option value="completed">완료</option>
                          <option value="cancelled">취소</option>
                          <option value="suspended">중단</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium">₩{campaign.budget_min.toLocaleString()}</p>
                          <p className="text-gray-500">~ ₩{campaign.budget_max.toLocaleString()}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{campaign.proposal_count}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <Eye className="w-3 h-3" />
                          <span className="text-xs">{campaign.view_count} views</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p>{new Date(campaign.deadline).toLocaleDateString('ko-KR')}</p>
                          <p className="text-xs text-gray-500">
                            {Math.ceil((new Date(campaign.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}일 남음
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleFeatured(campaign.id, campaign.is_featured)}
                            title={campaign.is_featured ? "추천 해제" : "추천 설정"}
                          >
                            {campaign.is_featured ? (
                              <XCircle className="w-4 h-4 text-yellow-600" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(campaign.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
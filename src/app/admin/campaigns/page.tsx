'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Search, Eye, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SkeletonTable } from '@/components/ui/skeleton';
import { campaignStatusLabel } from '@/lib/i18n/status';
import { Button } from '@/components/ui/button';

interface Campaign {
  id: string;
  title: string;
  description: string;
  type: 'mentoring' | 'investment' | 'service';
  status: 'draft' | 'active' | 'in_progress' | 'completed' | 'cancelled';
  category: string;
  budget_min: number;
  budget_max: number;
  created_at: string;
  organization_profiles: {
    organization_name: string;
    is_verified: boolean;
  };
  proposals: { id: string }[];
}

export default function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || 'all');
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const supabase = createClientComponentClient();
  const debouncedSearch = useDebouncedValue(searchTerm, 350);
  const [currentPage, setCurrentPage] = useState<number>(
    Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  )
  const [pageSize, setPageSize] = useState<number>(() => {
    const s = parseInt(searchParams.get('size') || '20', 10)
    return [10, 20, 50].includes(s) ? s : 20
  })
  const [total, setTotal] = useState<number>(0)

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Reset to first page when filters or search change
  useEffect(() => {
    setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterStatus])

  // Refetch when filters or page change (server-side)
  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          organization_profiles!inner(organization_name, is_verified),
          proposals(id)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filterStatus && filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      } else {
        // 전체 조회 시에도 삭제된 캠페인(cancelled)은 제외하지 않음 - 필터에서 선택 가능
      }

      const term = debouncedSearch?.trim()
      if (term) {
        query = query.or(
          `title.ilike.%${term}%,category.ilike.%${term}%,organization_profiles.organization_name.ilike.%${term}%`
        )
      }

      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1
      const { data, count } = await query.range(from, to)
      setCampaigns(data || [])
      setTotal(count || 0)
      setLoading(false)
    }
    fetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterStatus, currentPage, pageSize])

  // Sync filters and pagination to URL (debounced for search)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set('q', debouncedSearch); else params.delete('q');
    if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus); else params.delete('status');
    params.set('page', String(currentPage))
    params.set('size', String(pageSize))
    router.replace(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterStatus, currentPage, pageSize]);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        organization_profiles!inner(organization_name, is_verified),
        proposals(id)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCampaigns(data);
    }
    setLoading(false);
  };

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: newStatus })
      .eq('id', campaignId);

    if (!error) {
      await fetchCampaigns();
      // Log admin action here
    }
  };

  const filteredCampaigns = campaigns

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">캠페인 관리</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">캠페인 검색</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="제목, 기관명 또는 카테고리로 검색..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">상태 필터</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">전체</option>
              <option value="draft">초안</option>
              <option value="active">활성</option>
              <option value="in_progress">진행중</option>
              <option value="completed">완료</option>
              <option value="cancelled">취소</option>
            </select>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && (
          <div className="p-4">
            <SkeletonTable rows={8} />
          </div>
        )}
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                캠페인
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                기관
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                유형
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                예산
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                제안서 수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!loading && filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-gray-600">
                  <div className="space-y-3">
                    <div>조건에 맞는 캠페인이 없습니다.</div>
                    {(searchTerm || filterStatus !== 'all') && (
                      <button
                        onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
                        className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
                      >
                        필터 초기화
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredCampaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{campaign.title || '제목 없음'}</div>
                      <div className="text-sm text-gray-500">{campaign.category || '-'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-900">
                        {campaign.organization_profiles?.organization_name || '-'}
                      </span>
                      {campaign.organization_profiles?.is_verified && (
                        <CheckCircle className="w-4 h-4 text-green-500 ml-1" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{campaign.type || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {campaign.budget_min && campaign.budget_max 
                      ? `₩${campaign.budget_min.toLocaleString()} - ₩${campaign.budget_max.toLocaleString()}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={campaign.status || 'draft'}
                      onChange={(e) => handleStatusChange(campaign.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(campaign.status || 'draft')}`}
                    >
                      <option value="draft">초안</option>
                      <option value="active">활성</option>
                      <option value="in_progress">진행중</option>
                      <option value="completed">완료</option>
                      <option value="cancelled">취소</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {campaign.proposals?.length || 0}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                      onClick={() => setSelectedCampaign(campaign)}
                      className="text-blue-600 hover:text-blue-900"
                        aria-label="캠페인 상세보기"
                    >
                      <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!confirm(`정말로 "${campaign.title || '이 캠페인'}" 캠페인을 삭제하시겠습니까?${(campaign.proposals?.length || 0) > 0 ? '\n\n관련 제안서가 있지만 삭제는 가능합니다.' : ''}`)) {
                            return
                          }

                          try {
                            const { data: { session } } = await supabase.auth.getSession()
                            if (!session) return

                            const response = await fetch(`/api/admin/campaigns?id=${campaign.id}`, {
                              method: 'DELETE',
                              headers: {
                                'Authorization': `Bearer ${session.access_token}`,
                                'Content-Type': 'application/json'
                              }
                            })

                            const result = await response.json()

                            if (!response.ok) {
                              const errorMsg = result.error || `HTTP ${response.status}: Failed to delete campaign`
                              console.error('Delete campaign API error:', {
                                status: response.status,
                                statusText: response.statusText,
                                error: result.error,
                                result
                              })
                              throw new Error(errorMsg)
                            }

                            if (!result.success) {
                              throw new Error(result.error || '캠페인 삭제에 실패했습니다.')
                            }

                            alert(result.message || '캠페인이 삭제되었습니다.')

                            if (result.hasProposals) {
                              alert('주의: 이 캠페인과 연관된 제안서가 있습니다. 데이터는 유지되지만 캠페인은 삭제되었습니다.')
                            }

                            // 페이지 새로고침으로 데이터 갱신
                            window.location.reload()
                          } catch (error: any) {
                            console.error('Error deleting campaign:', error)
                            const errorMessage = error.message || '캠페인 삭제에 실패했습니다.'
                            alert(errorMessage)
                            
                            // 에러 발생 시에도 목록 새로고침 시도
                            try {
                              const from = (currentPage - 1) * pageSize
                              const to = from + pageSize - 1
                              let query = supabase
                                .from('campaigns')
                                .select(`
                                  *,
                                  organization_profiles!inner(organization_name, is_verified),
                                  proposals(id)
                                `, { count: 'exact' })
                                .order('created_at', { ascending: false })

                              if (filterStatus && filterStatus !== 'all') {
                                query = query.eq('status', filterStatus)
                              }

                              const term = debouncedSearch?.trim()
                              if (term) {
                                query = query.or(
                                  `title.ilike.%${term}%,category.ilike.%${term}%,organization_profiles.organization_name.ilike.%${term}%`
                                )
                              }

                              const { data, count } = await query.range(from, to)
                              setCampaigns(data || [])
                              setTotal(count || 0)
                            } catch (refreshError) {
                              console.error('Failed to refresh campaigns:', refreshError)
                            }
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                        aria-label="캠페인 삭제"
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

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {(total || 0) > 0
            ? `${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, total || 0)} / 총 ${total || 0}개`
            : '총 0개'}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => { setCurrentPage(1); setPageSize(parseInt(e.target.value, 10)); }}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value={10}>10개</option>
            <option value={20}>20개</option>
            <option value={50}>50개</option>
          </select>
          <button
            className="px-3 py-2 border rounded-md text-sm disabled:opacity-50"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            이전
          </button>
          <button
            className="px-3 py-2 border rounded-md text-sm disabled:opacity-50"
            onClick={() => {
              const totalPages = Math.max(1, Math.ceil(total / pageSize))
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }}
            disabled={currentPage >= Math.max(1, Math.ceil(total / pageSize))}
          >
            다음
          </button>
        </div>
      </div>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">{selectedCampaign.title || '제목 없음'}</h2>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700">설명</h3>
                  <p className="text-gray-600 mt-1">{selectedCampaign.description || '-'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-700">기관</h3>
                    <p className="text-gray-600 mt-1">
                      {selectedCampaign.organization_profiles?.organization_name || '-'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-700">유형</h3>
                    <p className="text-gray-600 mt-1">{selectedCampaign.type || '-'}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-700">카테고리</h3>
                    <p className="text-gray-600 mt-1">{selectedCampaign.category || '-'}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-700">예산 범위</h3>
                    <p className="text-gray-600 mt-1">
                      {selectedCampaign.budget_min && selectedCampaign.budget_max
                        ? `₩${selectedCampaign.budget_min.toLocaleString()} - ₩${selectedCampaign.budget_max.toLocaleString()}`
                        : '-'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-700">생성일</h3>
                  <p className="text-gray-600 mt-1">
                    {selectedCampaign.created_at 
                      ? new Date(selectedCampaign.created_at).toLocaleString('ko-KR')
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

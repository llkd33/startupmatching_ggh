"use client";

import { useEffect, useMemo, useState, useCallback, memo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { supabase } from '@/lib/supabase';
import { Search, FileText, DollarSign, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { SkeletonTable } from '@/components/ui/skeleton';
import { proposalStatusLabel } from '@/lib/i18n/status';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { getErrorMessage, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/error-messages';

interface Proposal {
  id: string;
  cover_letter: string;
  proposed_budget: number;
  proposed_timeline: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  campaigns: {
    title: string;
    type: string;
    organization_profiles: {
      organization_name: string;
    };
  };
  expert_profiles: {
    name: string;
    hourly_rate: number;
  };
}

export default function ProposalManagement() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || 'all');
  const [loading, setLoading] = useState(true);
  // supabase는 더 이상 사용하지 않음 (API 라우트 사용)
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
    fetchProposals();
  }, []);

  // Reset to first page when filters or search change
  useEffect(() => {
    setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterStatus])

  // Refetch function - API 라우트 사용으로 최적화
  const fetchProposalsData = useCallback(async (page: number = currentPage) => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error(ERROR_MESSAGES.UNAUTHORIZED)
        setLoading(false)
        return
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        status: filterStatus === 'all' ? '' : filterStatus,
        search: debouncedSearch || ''
      })

      const response = await fetch(`/api/admin/proposals?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        // 캐싱 활성화 (10초)
        next: { revalidate: 10 }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: ERROR_MESSAGES.NETWORK_ERROR }))
        throw new Error(errorData.error || ERROR_MESSAGES.NETWORK_ERROR)
      }

      const result = await response.json()
      setProposals(result.proposals || [])
      setTotal(result.pagination?.total || 0)
      
      // 현재 페이지에 데이터가 없고 이전 페이지가 있으면 이전 페이지로 이동
      if ((!result.proposals || result.proposals.length === 0) && page > 1) {
        const prevPage = page - 1
        setCurrentPage(prevPage)
        // 재귀 호출로 이전 페이지 데이터 가져오기
        const prevParams = new URLSearchParams({
          page: prevPage.toString(),
          limit: pageSize.toString(),
          status: filterStatus === 'all' ? '' : filterStatus,
          search: debouncedSearch || ''
        })
        const prevResponse = await fetch(`/api/admin/proposals?${prevParams}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          next: { revalidate: 10 }
        })
        if (prevResponse.ok) {
          const prevResult = await prevResponse.json()
          setProposals(prevResult.proposals || [])
          setTotal(prevResult.pagination?.total || 0)
        }
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, ERROR_MESSAGES.NETWORK_ERROR)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, filterStatus, debouncedSearch, supabase])

  // Refetch proposals when filters/page change (server-side)
  useEffect(() => {
    fetchProposalsData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterStatus, currentPage, pageSize])

  // Sync filters and pagination to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set('q', debouncedSearch); else params.delete('q');
    if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus); else params.delete('status');
    params.set('page', String(currentPage))
    params.set('size', String(pageSize))
    router.replace(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterStatus, currentPage, pageSize]);

  const fetchProposals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        campaigns!inner(
          title,
          type,
          organization_profiles!inner(organization_name)
        ),
        expert_profiles!inner(name, hourly_rate)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProposals(data);
    }
    setLoading(false);
  };

  const filteredProposals = proposals

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'withdrawn': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">제안서 관리</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="proposal-search" className="block text-sm font-medium text-gray-700 mb-2">제안서 검색</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" aria-hidden="true" />
              <input
                id="proposal-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="캠페인/전문가/기관으로 검색..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                aria-describedby="proposal-search-description"
              />
              <span id="proposal-search-description" className="sr-only">캠페인 제목, 전문가 이름, 기관명으로 검색할 수 있습니다</span>
            </div>
          </div>
          
          <div>
            <label htmlFor="proposal-status-filter" className="block text-sm font-medium text-gray-700 mb-2">상태 필터</label>
            <select
              id="proposal-status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              aria-describedby="proposal-status-filter-description"
            >
              <span id="proposal-status-filter-description" className="sr-only">대기중, 승인됨, 거절됨, 철회됨 중에서 선택할 수 있습니다</span>
              <option value="all">전체</option>
              <option value="pending">대기중</option>
              <option value="accepted">승인됨</option>
              <option value="rejected">거절됨</option>
              <option value="withdrawn">철회됨</option>
            </select>
          </div>
        </div>
      </div>

      {/* Proposals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && (
          <div className="p-4" role="status" aria-live="polite" aria-label="제안서 목록을 불러오는 중">
            <SkeletonTable rows={8} />
          </div>
        )}
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                전문가
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                캠페인
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                기관
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                예산
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                제출일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!loading && filteredProposals.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-6">
                  <EmptyState
                    type="proposals"
                    title="제안서를 찾을 수 없습니다"
                    description={
                      searchTerm || filterStatus !== 'all'
                        ? "검색 조건에 맞는 제안서가 없습니다. 필터를 조정해보세요."
                        : "아직 제출된 제안서가 없습니다."
                    }
                    action={
                      searchTerm || filterStatus !== 'all'
                        ? {
                            label: "필터 초기화",
                            onClick: () => {
                              setSearchTerm('')
                              setFilterStatus('all')
                            },
                            variant: "outline"
                          }
                        : undefined
                    }
                  />
                </td>
              </tr>
            ) : (
              filteredProposals.map((proposal) => (
                <tr key={proposal.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {proposal.expert_profiles?.name || '이름 없음'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {proposal.campaigns?.title || '제목 없음'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {proposal.campaigns?.type || '-'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {proposal.campaigns?.organization_profiles?.organization_name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {proposal.proposed_budget ? `₩${proposal.proposed_budget.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(proposal.status || 'pending')}`}>
                      {proposal.status ? proposalStatusLabel(proposal.status) : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {proposal.created_at ? new Date(proposal.created_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!confirm(`정말로 이 제안서를 삭제하시겠습니까?`)) {
                          return
                        }

                        try {
                          const { data: { session } } = await supabase.auth.getSession()
                          if (!session) return

                          const response = await fetch(`/api/admin/proposals?id=${proposal.id}`, {
                            method: 'DELETE',
                            headers: {
                              'Authorization': `Bearer ${session.access_token}`,
                              'Content-Type': 'application/json'
                            }
                          })

                          const result = await response.json()

                          if (!response.ok) {
                            const errorMsg = result.error || ERROR_MESSAGES.DELETE_FAILED
                            throw new Error(errorMsg)
                          }

                          if (!result.success) {
                            throw new Error(result.error || ERROR_MESSAGES.DELETE_FAILED)
                          }

                          toast.success(result.message || SUCCESS_MESSAGES.DELETED)
                          
                          // 데이터 다시 가져오기
                          await fetchProposalsData(currentPage)
                        } catch (error: any) {
                          const errorMessage = getErrorMessage(error, ERROR_MESSAGES.DELETE_FAILED)
                          toast.error(errorMessage)
                          
                          // 에러 발생 시에도 목록 새로고침 시도
                          await fetchProposalsData(currentPage)
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                      aria-label="제안서 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* Mobile Card View */}
        {!loading && filteredProposals.length > 0 && (
          <div className="md:hidden space-y-3 p-4">
            {filteredProposals.map((proposal) => (
              <Card key={proposal.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {proposal.expert_profiles?.name || '이름 없음'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {proposal.campaigns?.title || '제목 없음'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {proposal.campaigns?.type || '-'}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!confirm(`정말로 이 제안서를 삭제하시겠습니까?`)) {
                          return
                        }

                        try {
                          const { data: { session } } = await supabase.auth.getSession()
                          if (!session) return

                          const response = await fetch(`/api/admin/proposals?id=${proposal.id}`, {
                            method: 'DELETE',
                            headers: {
                              'Authorization': `Bearer ${session.access_token}`,
                              'Content-Type': 'application/json'
                            }
                          })

                          const result = await response.json()

                          if (!response.ok) {
                            const errorMsg = result.error || ERROR_MESSAGES.DELETE_FAILED
                            throw new Error(errorMsg)
                          }

                          if (!result.success) {
                            throw new Error(result.error || ERROR_MESSAGES.DELETE_FAILED)
                          }

                          toast.success(result.message || SUCCESS_MESSAGES.DELETED)
                          
                          // 데이터 다시 가져오기
                          await fetchProposalsData(currentPage)
                        } catch (error: any) {
                          const errorMessage = getErrorMessage(error, ERROR_MESSAGES.DELETE_FAILED)
                          toast.error(errorMessage)
                          
                          // 에러 발생 시에도 목록 새로고침 시도
                          await fetchProposalsData(currentPage)
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                      aria-label={`${proposal.expert_profiles?.name || '제안서'} 삭제`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(proposal.status || 'pending')}`}>
                      {proposal.status ? proposalStatusLabel(proposal.status) : '-'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>기관: {proposal.campaigns?.organization_profiles?.organization_name || '-'}</div>
                    <div>예산: {proposal.proposed_budget ? `₩${proposal.proposed_budget.toLocaleString()}` : '-'}</div>
                    <div>제출일: {proposal.created_at ? new Date(proposal.created_at).toLocaleDateString('ko-KR') : '-'}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State for Mobile */}
        {!loading && filteredProposals.length === 0 && (
          <div className="md:hidden p-4">
            <EmptyState
              type="proposals"
              title="제안서를 찾을 수 없습니다"
              description={
                searchTerm || filterStatus !== 'all'
                  ? "검색 조건에 맞는 제안서가 없습니다. 필터를 조정해보세요."
                  : "아직 제출된 제안서가 없습니다."
              }
              action={
                searchTerm || filterStatus !== 'all'
                  ? {
                      label: "필터 초기화",
                      onClick: () => {
                        setSearchTerm('')
                        setFilterStatus('all')
                      },
                      variant: "outline"
                    }
                  : undefined
              }
            />
          </div>
        )}
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
            className="px-3 py-2 border rounded-md text-sm min-h-[44px]"
            aria-label="페이지당 항목 수"
          >
            <option value={10}>10개</option>
            <option value={20}>20개</option>
            <option value={50}>50개</option>
          </select>
          <button
            className="px-3 py-2 border rounded-md text-sm disabled:opacity-50 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            aria-label="이전 페이지"
          >
            이전
          </button>
          <button
            className="px-3 py-2 border rounded-md text-sm disabled:opacity-50 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={() => {
              const totalPages = Math.max(1, Math.ceil(total / pageSize))
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }}
            disabled={currentPage >= Math.max(1, Math.ceil(total / pageSize))}
            aria-label="다음 페이지"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}

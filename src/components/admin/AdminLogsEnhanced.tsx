'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Shield,
  AlertTriangle,
  Info,
  XCircle
} from 'lucide-react'
import { SkeletonTable } from '@/components/ui/skeleton'

interface AdminLog {
  id: string
  admin_user_id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  details: any
  created_at: string
  users?: {
    email: string
    name: string
  }
}

export default function AdminLogsEnhanced() {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // 필터 상태
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const pageSize = 50

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, actionFilter, priorityFilter, startDate, endDate])

  const fetchLogs = async () => {
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      })

      if (actionFilter !== 'all') params.set('action', actionFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (search) params.set('search', search)

      const response = await fetch(`/api/admin/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch logs')

      const result = await response.json()
      setLogs(result.logs || [])
      setTotalPages(result.pagination.totalPages)
      setTotalLogs(result.pagination.total)
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    setExporting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const filters: any = {}
      if (actionFilter !== 'all') filters.action = actionFilter
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate

      const response = await fetch('/api/admin/logs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filters })
      })

      if (!response.ok) throw new Error('Failed to export logs')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting logs:', error)
      alert('CSV 내보내기에 실패했습니다.')
    } finally {
      setExporting(false)
    }
  }

  const getPriorityIcon = (action: string) => {
    const highPriorityActions = [
      'DELETE_USER',
      'SOFT_DELETE_USER',
      'GRANT_ADMIN',
      'REVOKE_ADMIN',
      'DELETE_CAMPAIGN',
      'VERIFY_ORGANIZATION'
    ]

    if (highPriorityActions.includes(action)) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    }

    return <Info className="h-4 w-4 text-blue-600" />
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'GRANT_ADMIN': '관리자 권한 부여',
      'REVOKE_ADMIN': '관리자 권한 해제',
      'VERIFY_ORGANIZATION': '기관 인증',
      'UNVERIFY_ORGANIZATION': '기관 인증 해제',
      'SOFT_DELETE_USER': '사용자 삭제',
      'DELETE_USER': '사용자 삭제 (하드)',
      'DELETE_CAMPAIGN': '캠페인 삭제'
    }

    return labels[action] || action
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">감사 로그</h1>
          <p className="text-gray-600">관리자 활동 기록을 조회하고 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'CSV 내보내는 중...' : 'CSV 내보내기'}
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>필터 및 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="액션, 엔티티 타입..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                액션 필터
              </label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">전체</option>
                <option value="GRANT_ADMIN">관리자 권한 부여</option>
                <option value="REVOKE_ADMIN">관리자 권한 해제</option>
                <option value="VERIFY_ORGANIZATION">기관 인증</option>
                <option value="SOFT_DELETE_USER">사용자 삭제</option>
                <option value="DELETE_CAMPAIGN">캠페인 삭제</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                중요도
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">전체</option>
                <option value="high">높음</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기간
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 로그 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>활동 로그</CardTitle>
          <CardDescription>
            총 {totalLogs.toLocaleString()}개의 로그 (페이지 {currentPage}/{totalPages})
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <SkeletonTable rows={10} />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        시간
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        관리자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        액션
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        엔티티
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상세
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-6 text-center text-gray-600">
                          로그가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(log.created_at).toLocaleString('ko-KR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {log.users?.email || '시스템'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getPriorityIcon(log.action)}
                              <Badge variant="outline">
                                {getActionLabel(log.action)}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {log.entity_type && (
                              <div>
                                <div className="font-medium">{log.entity_type}</div>
                                <div className="text-xs text-gray-500">
                                  ID: {log.entity_id?.substring(0, 8)}...
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {log.details && (
                              <details className="cursor-pointer">
                                <summary className="text-blue-600 hover:text-blue-700">
                                  상세 보기
                                </summary>
                                <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    전체 {totalLogs.toLocaleString()}개 중 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalLogs)}개 표시
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                    >
                      이전
                    </Button>
                    <div className="flex items-center gap-2 px-3">
                      {currentPage} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                    >
                      다음
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useEffect, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  Shield, 
  UserCheck, 
  UserX, 
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  Mail
} from 'lucide-react'
import { InviteUserDialog } from '@/components/admin/InviteUserDialog'
import { BulkInviteDialog } from '@/components/admin/BulkInviteDialog'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SkeletonTable } from '@/components/ui/skeleton'

interface User {
  id: string
  email: string
  name?: string
  role: 'expert' | 'organization' | 'admin'
  is_admin: boolean
  organization_name?: string
  expertise?: string[]
  is_available?: boolean
  is_verified?: boolean
  created_at: string
  updated_at: string
}

export default function AdminUsersClient({ 
  initialUsers 
}: { 
  initialUsers: User[] 
}) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [filterRole, setFilterRole] = useState<string>(searchParams.get('role') || 'all')
  const [loading, setLoading] = useState(false)
  const debouncedSearch = useDebouncedValue(searchTerm, 350)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const pageSize = 20

  const fetchUsers = useCallback(async (page: number = currentPage) => {
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No session found')
        setLoading(false)
        return
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        role: filterRole,
        search: debouncedSearch || '',
        sortBy: 'created_at',
        sortOrder: 'desc'
      })

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        // 캐싱 비활성화 (항상 최신 데이터)
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const result = await response.json()
      setUsers(result.users || [])
      setTotalPages(result.pagination?.totalPages || 1)
      setTotalUsers(result.pagination?.total || 0)
      setCurrentPage(result.pagination?.page || 1)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, filterRole, debouncedSearch])

  // 필터 변경 시 URL 업데이트 및 첫 페이지로 리셋
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearch) params.set('q', debouncedSearch); else params.delete('q')
    if (filterRole && filterRole !== 'all') params.set('role', filterRole); else params.delete('role')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterRole])
  
  // 페이지 또는 필터 변경 시 데이터 로드
  useEffect(() => {
    fetchUsers(currentPage)
  }, [currentPage, fetchUsers])

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (!confirm(`정말로 이 사용자의 관리자 권한을 ${currentIsAdmin ? '해제' : '부여'}하시겠습니까?`)) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'toggle_admin',
          userId,
          currentIsAdmin
        })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle admin status')
      }

      await fetchUsers()
    } catch (error) {
      console.error('Error toggling admin:', error)
      alert('권한 변경에 실패했습니다.')
    }
  }

  const handleToggleVerified = async (userId: string, currentVerified: boolean, userRole: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'toggle_verified',
          userId,
          currentVerified,
          userRole
        })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle verified status')
      }

      await fetchUsers()
    } catch (error) {
      console.error('Error toggling verified:', error)
      alert('인증 상태 변경에 실패했습니다.')
    }
  }

  const handleUpdateEmail = async (userId: string, currentEmail: string) => {
    const email = prompt(`새 이메일 주소를 입력하세요:\n\n현재: ${currentEmail}`, currentEmail)
    
    if (!email || email === currentEmail) {
      return
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      alert('올바른 이메일 형식이 아닙니다.')
      return
    }

    if (!confirm(`이메일을 "${email}"로 변경하시겠습니까?`)) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update_email',
          userId,
          newEmail: email
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '이메일 업데이트에 실패했습니다.')
      }

      if (result.success) {
        alert(result.message || '이메일이 업데이트되었습니다.')
        await fetchUsers(currentPage)
      } else {
        throw new Error(result.error || '이메일 업데이트에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('Error updating email:', error)
      alert(error.message || '이메일 업데이트에 실패했습니다.')
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`정말로 "${userName}" 사용자를 삭제하시겠습니까?\n\n이 작업은 소프트 삭제이며, 관련 캠페인/제안서는 유지됩니다.\n사용자는 로그인할 수 없게 되며, 관리자 목록에서 제거됩니다.`)) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'soft_delete',
          userId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      if (result.success) {
        alert(result.message || '사용자가 삭제되었습니다.')

        if (result.hasRelatedData) {
          alert('주의: 이 사용자와 연관된 캠페인이나 제안서가 있습니다. 데이터는 유지되지만 사용자는 접근할 수 없습니다.')
        }

        // 삭제 후 데이터 다시 가져오기
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
          role: filterRole,
          search: debouncedSearch || '',
          sortBy: 'created_at',
          sortOrder: 'desc'
        })
        
        const refreshResponse = await fetch(`/api/admin/users?${params}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          cache: 'no-store'
        })
        
        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json()
          setUsers(refreshResult.users || [])
          setTotalPages(refreshResult.pagination?.totalPages || 1)
          setTotalUsers(refreshResult.pagination?.total || 0)
          
          // 현재 페이지에 데이터가 없고 이전 페이지가 있으면 이전 페이지로 이동
          if ((!refreshResult.users || refreshResult.users.length === 0) && currentPage > 1) {
            setCurrentPage(currentPage - 1)
          }
        } else {
          // API 호출 실패 시 fetchUsers 사용
          await fetchUsers(currentPage)
        }
      } else {
        throw new Error(result.error || '사용자 삭제에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('Error deleting user:', error)
      alert(error.message || '사용자 삭제에 실패했습니다.')
    }
  }
  
  // 필터링은 서버에서 처리하므로 클라이언트에서는 그대로 사용
  const filteredUsers = users
  
  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">사용자 관리</h1>
          <p className="text-gray-600">전체 사용자를 관리하고 권한을 설정합니다</p>
        </div>
        <div className="flex gap-2">
          <InviteUserDialog onSuccess={fetchUsers} />
          <BulkInviteDialog onSuccess={fetchUsers} />
        </div>
      </div>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>필터 및 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사용자 검색
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="이메일, 이름으로 검색..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                역할 필터
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">전체</option>
                <option value="expert">전문가</option>
                <option value="organization">기관</option>
                <option value="admin">관리자</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>사용자 목록</CardTitle>
              <CardDescription>총 {(totalUsers || 0).toLocaleString()}명의 사용자 (페이지 {currentPage || 1}/{totalPages || 1})</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && filteredUsers.length === 0 ? (
            <div className="p-4">
              <SkeletonTable rows={8} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      역할
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-gray-600">
                        <div className="space-y-3">
                          <div>조건에 맞는 사용자가 없습니다.</div>
                          {(searchTerm || filterRole !== 'all') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSearchTerm('')
                                setFilterRole('all')
                              }}
                            >
                              필터 초기화
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || user.organization_name || '이름 없음'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email || ''}</div>
                          </div>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {user.role && (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              user.role === 'expert' ? 'bg-blue-100 text-blue-800' :
                              user.role === 'organization' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role === 'expert' ? '전문가' :
                               user.role === 'organization' ? '기관' : 
                               user.role === 'admin' ? '관리자' : '기타'}
                            </span>
                          )}
                          {user.is_admin && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center">
                              <Shield className="w-3 h-3 mr-1" />
                              관리자
                            </span>
                          )}
                          {!user.role && (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                              미가입
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role === 'organization' && (
                          <button
                            onClick={() => handleToggleVerified(user.id, user.is_verified || false, user.role)}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                              user.is_verified
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.is_verified ? (
                              <>
                                <UserCheck className="w-3 h-3" />
                                인증됨
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3" />
                                미인증
                              </>
                            )}
                          </button>
                        )}
                        {user.role === 'expert' && (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.is_available
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.is_available ? '활동중' : '비활동'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateEmail(user.id, user.email)}
                            className="text-blue-600 hover:text-blue-900"
                            aria-label="이메일 수정"
                            title="이메일 수정"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                            className="text-gray-600 hover:text-gray-900"
                            aria-label={user.is_admin ? '관리자 권한 해제' : '관리자 권한 부여'}
                            title={user.is_admin ? '관리자 권한 해제' : '관리자 권한 부여'}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.name || user.organization_name || user.email)}
                            className="text-red-600 hover:text-red-900"
                            aria-label="사용자 삭제"
                            title="사용자 삭제"
                          >
                            <Trash2 className="w-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          )}

          {/* 페이지네이션 */}
          {!loading && totalPages > 1 && (
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                전체 {(totalUsers || 0).toLocaleString()}명 중 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalUsers || 0)}명 표시
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  이전
                </Button>
                <div className="flex items-center gap-2 px-3">
                  {currentPage || 1} / {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

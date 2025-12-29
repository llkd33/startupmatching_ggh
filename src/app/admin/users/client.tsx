'use client'

import { useEffect, useCallback, useState, useRef, memo } from 'react'
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
  Mail,
  RefreshCw,
  Wifi,
  WifiOff,
  Download
} from 'lucide-react'
import { ExportButton } from '@/components/admin/ExportButton'
import { formatDate, formatStatus, ExportColumn } from '@/lib/export'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SkeletonTable } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useInputDialog } from '@/components/ui/input-dialog'
import { toast } from 'sonner'
import { getErrorMessage, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/error-messages'
import { Pagination } from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

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

// 사용자 내보내기 컬럼 설정
const userExportColumns: ExportColumn<User>[] = [
  { key: 'id', header: 'ID' },
  { key: 'email', header: '이메일' },
  { key: 'name', header: '이름', formatter: (v, row) => v || row.organization_name || '-' },
  { key: 'role', header: '역할', formatter: (v) => formatStatus(v) },
  { key: 'is_admin', header: '관리자', formatter: (v: boolean) => v ? '예' : '아니오' },
  { key: 'is_verified', header: '인증', formatter: (v: boolean) => v ? '예' : '아니오' },
  { key: 'is_available', header: '활동 상태', formatter: (v: boolean) => v ? '활동중' : '비활동' },
  { key: 'created_at', header: '가입일', formatter: formatDate },
]

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

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    variant: 'default' | 'destructive' | 'warning'
    onConfirm: () => void | Promise<void>
  }>({
    open: false,
    title: '',
    description: '',
    variant: 'default',
    onConfirm: () => {},
  })

  const { prompt: promptInput, DialogComponent: InputDialogComponent } = useInputDialog()

  // Realtime state
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

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
        next: { revalidate: 10 }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const result = await response.json()
      setUsers(result.users || [])
      setTotalPages(result.pagination?.totalPages || 1)
      setTotalUsers(result.pagination?.total || 0)
      setCurrentPage(result.pagination?.page || 1)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, filterRole, debouncedSearch])

  // Setup realtime subscriptions for users (optimistic update)
  useEffect(() => {
    const channel = supabase
      .channel('admin-users-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          console.log('Users table changed:', payload)
          // Optimistic update: 변경된 항목만 업데이트
          if (payload.eventType === 'UPDATE' && payload.new) {
            setUsers(prevUsers => 
              prevUsers.map(user => 
                user.id === payload.new.id ? { ...user, ...payload.new } : user
              )
            )
          } else if (payload.eventType === 'INSERT' && payload.new) {
            // 새 사용자는 목록 앞에 추가 (현재 페이지가 첫 페이지인 경우만)
            if (currentPage === 1) {
              setUsers(prevUsers => [payload.new, ...prevUsers].slice(0, pageSize))
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            // 삭제된 사용자는 목록에서 제거
            setUsers(prevUsers => prevUsers.filter(user => user.id !== payload.old.id))
          } else {
            // 기타 변경사항은 전체 새로고침
            fetchUsers(currentPage)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expert_profiles' },
        (payload) => {
          console.log('Expert profiles changed:', payload)
          // 관련 사용자 정보만 업데이트
          if (payload.eventType === 'UPDATE' && payload.new) {
            setUsers(prevUsers => 
              prevUsers.map(user => {
                if (user.role === 'expert' && user.id === payload.new.user_id) {
                  return { ...user, is_available: payload.new.is_available }
                }
                return user
              })
            )
          } else {
            fetchUsers(currentPage)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organization_profiles' },
        (payload) => {
          console.log('Organization profiles changed:', payload)
          // 관련 사용자 정보만 업데이트
          if (payload.eventType === 'UPDATE' && payload.new) {
            setUsers(prevUsers => 
              prevUsers.map(user => {
                if (user.role === 'organization' && user.id === payload.new.user_id) {
                  return { ...user, is_verified: payload.new.is_verified }
                }
                return user
              })
            )
          } else {
            fetchUsers(currentPage)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected')
        } else if (status === 'CLOSED') {
          setRealtimeStatus('disconnected')
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeStatus('error')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [fetchUsers, currentPage, pageSize])

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
    setConfirmDialog({
      open: true,
      title: currentIsAdmin ? '관리자 권한 해제' : '관리자 권한 부여',
      description: `정말로 이 사용자의 관리자 권한을 ${currentIsAdmin ? '해제' : '부여'}하시겠습니까?`,
      variant: 'warning',
      onConfirm: async () => {
        setUpdatingUserId(userId)
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
            const errorData = await response.json().catch(() => ({ error: ERROR_MESSAGES.UPDATE_FAILED }))
            throw new Error(errorData.error || ERROR_MESSAGES.UPDATE_FAILED)
      }

          toast.success(currentIsAdmin ? '관리자 권한이 해제되었습니다.' : '관리자 권한이 부여되었습니다.')
      await fetchUsers()
    } catch (error) {
          const errorMessage = getErrorMessage(error, ERROR_MESSAGES.UPDATE_FAILED)
          toast.error(errorMessage)
        } finally {
          setUpdatingUserId(null)
        }
      }
    })
  }

  const handleToggleVerified = async (userId: string, currentVerified: boolean, userRole: string) => {
    setUpdatingUserId(userId)
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
        const errorData = await response.json().catch(() => ({ error: ERROR_MESSAGES.UPDATE_FAILED }))
        throw new Error(errorData.error || ERROR_MESSAGES.UPDATE_FAILED)
      }

      toast.success(currentVerified ? '인증이 해제되었습니다.' : '인증되었습니다.')
      await fetchUsers()
    } catch (error) {
      const errorMessage = getErrorMessage(error, ERROR_MESSAGES.UPDATE_FAILED)
      toast.error(errorMessage)
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleUpdateEmail = async (userId: string, currentEmail: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    const newEmail = await promptInput({
      title: '이메일 변경',
      description: `현재 이메일: ${currentEmail}`,
      label: '새 이메일 주소',
      placeholder: '새 이메일을 입력하세요',
      defaultValue: currentEmail,
      type: 'email',
      confirmText: '변경',
      validate: (value) => {
        if (!value || value === currentEmail) {
          return '새 이메일을 입력해주세요.'
        }
        if (!emailRegex.test(value)) {
          return '올바른 이메일 형식이 아닙니다.'
        }
        return null
      }
    })

    if (!newEmail || newEmail === currentEmail) {
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
          newEmail
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '이메일 업데이트에 실패했습니다.')
      }

      if (result.success) {
        toast.success(result.message || '이메일이 업데이트되었습니다.')
        await fetchUsers(currentPage)
      } else {
        throw new Error(result.error || '이메일 업데이트에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('Error updating email:', error)
      toast.error(error.message || '이메일 업데이트에 실패했습니다.')
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    setConfirmDialog({
      open: true,
      title: '사용자 삭제',
      description: `정말로 "${userName}" 사용자를 삭제하시겠습니까? 이 작업은 소프트 삭제이며, 관련 캠페인/제안서는 유지됩니다. 사용자는 로그인할 수 없게 됩니다.`,
      variant: 'destructive',
      onConfirm: async () => {
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
            toast.success(result.message || SUCCESS_MESSAGES.DELETED)

      if (result.hasRelatedData) {
              toast.warning('이 사용자와 연관된 캠페인이나 제안서가 있습니다. 데이터는 유지되지만 사용자는 접근할 수 없습니다.')
            }

            // 삭제 후 목록 업데이트
            setUsers(prevUsers => prevUsers.filter(u => u.id !== userId))

            try {
              await fetchUsers(currentPage)
            } catch (fetchError) {
              console.error('Error refreshing users after delete:', fetchError)
            }

            // 현재 페이지에 데이터가 없고 이전 페이지가 있으면 이전 페이지로 이동
            setTimeout(async () => {
              try {
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

                const checkResponse = await fetch(`/api/admin/users?${params}`, {
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`
                  },
                  cache: 'no-store'
                })

                if (checkResponse.ok) {
                  const checkResult = await checkResponse.json()
                  if ((!checkResult.users || checkResult.users.length === 0) && currentPage > 1) {
                    setCurrentPage(currentPage - 1)
                    await fetchUsers(currentPage - 1)
                  }
                }
              } catch (checkError) {
                console.error('Error checking page after delete:', checkError)
              }
            }, 200)
          } else {
            throw new Error(result.error || ERROR_MESSAGES.DELETE_FAILED)
          }
        } catch (error: any) {
      console.error('Error deleting user:', error)
          const errorMessage = getErrorMessage(error, ERROR_MESSAGES.DELETE_FAILED)
          toast.error(errorMessage)
        }
    }
    })
  }
  
  // 필터링은 서버에서 처리하므로 클라이언트에서는 그대로 사용
  const filteredUsers = users
  
  return (
    <div>
      {/* Dialogs */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
      <InputDialogComponent />

      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">사용자 관리</h1>
          <p className="text-muted-foreground">전체 사용자를 관리하고 권한을 설정합니다</p>
        </div>
        {/* Realtime status indicator */}
        <div className="flex items-center gap-2 text-sm">
          {realtimeStatus === 'connected' ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-muted-foreground">실시간 연결됨</span>
            </>
          ) : realtimeStatus === 'connecting' ? (
            <>
              <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
              <span className="text-muted-foreground">연결 중...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-muted-foreground">연결 끊김</span>
            </>
          )}
          {lastUpdated && (
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
              마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
            </span>
          )}
          <button
            onClick={() => fetchUsers(currentPage)}
            className="p-1.5 hover:bg-muted rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="새로고침"
          >
            <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
          </button>
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
              <label htmlFor="user-search" className="block text-sm font-medium text-foreground mb-2">
                사용자 검색
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" aria-hidden="true" />
                <input
                  id="user-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="이메일, 이름으로 검색..."
                  className="pl-10 pr-4 py-2 w-full border border-input bg-background text-foreground rounded-md focus:ring-ring focus:border-ring min-h-[44px]"
                  aria-describedby="user-search-description"
                />
                <span id="user-search-description" className="sr-only">이메일 주소나 사용자 이름으로 검색할 수 있습니다</span>
              </div>
            </div>
            
            <div>
              <label htmlFor="user-role-filter" className="block text-sm font-medium text-foreground mb-2">
                역할 필터
              </label>
              <select
                id="user-role-filter"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-md focus:ring-ring focus:border-ring min-h-[44px]"
                aria-label="사용자 역할 필터"
                aria-describedby="user-role-filter-description"
              >
                <span id="user-role-filter-description" className="sr-only">전문가, 기관, 관리자 중에서 선택할 수 있습니다</span>
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle>사용자 목록</CardTitle>
              <CardDescription>총 {(totalUsers || 0).toLocaleString()}명의 사용자 (페이지 {currentPage || 1}/{totalPages || 1})</CardDescription>
            </div>
            <ExportButton
              data={filteredUsers}
              columns={userExportColumns}
              filename="사용자목록"
              sheetName="사용자"
              disabled={loading || filteredUsers.length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && filteredUsers.length === 0 ? (
            <div className="p-4" role="status" aria-live="polite" aria-label="사용자 목록을 불러오는 중">
              <SkeletonTable rows={8} />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    역할
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6">
                      <EmptyState
                        type="users"
                        title="사용자를 찾을 수 없습니다"
                        description={
                          searchTerm || filterRole !== 'all'
                            ? "검색 조건에 맞는 사용자가 없습니다. 필터를 조정해보세요."
                            : "등록된 사용자가 없습니다."
                        }
                        action={
                          searchTerm || filterRole !== 'all'
                            ? {
                                label: "필터 초기화",
                                onClick: () => {
                              setSearchTerm('')
                              setFilterRole('all')
                                },
                                variant: "outline"
                              }
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onToggleVerified={handleToggleVerified}
                      onUpdateEmail={handleUpdateEmail}
                      onToggleAdmin={handleToggleAdmin}
                      onDelete={handleDeleteUser}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}

          {/* 페이지네이션 */}
          {!loading && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalUsers}
                pageSize={pageSize}
                onPageChange={fetchUsers}
                disabled={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 사용자 목록 행 컴포넌트 (메모이제이션)
interface UserRowProps {
  user: {
    id: string
    name: string | null
    email: string
    role: string | null
    is_admin: boolean
    is_verified?: boolean | null
    is_available?: boolean | null
    organization_name?: string | null
    created_at: string | null
  }
  onToggleVerified: (userId: string, currentVerified: boolean, userRole: string) => void
  onUpdateEmail: (userId: string, currentEmail: string) => void
  onToggleAdmin: (userId: string, currentIsAdmin: boolean) => void
  onDelete: (userId: string, userName: string) => void
}

const UserRow = memo(({ 
  user, 
  onToggleVerified, 
  onUpdateEmail, 
  onToggleAdmin, 
  onDelete 
}: UserRowProps) => {
  return (
    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || user.organization_name || '이름 없음'}
                          </div>
                            <div className="text-sm text-muted-foreground">{user.email || ''}</div>
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
                            user.is_available === true
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.is_available === true ? '활동중' : '비활동'}
                          </span>
                        )}
                        {!user.role && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
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
            <div className="px-6 py-4 border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalUsers}
                pageSize={pageSize}
                onPageChange={fetchUsers}
                disabled={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

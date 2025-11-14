'use client'

import { useEffect, useMemo, useState } from 'react'
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
  UserPlus
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

  // Sync filters to URL (debounced)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearch) params.set('q', debouncedSearch); else params.delete('q')
    if (filterRole && filterRole !== 'all') params.set('role', filterRole); else params.delete('role')
    router.replace(`${pathname}?${params.toString()}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterRole])
  
  const fetchUsers = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setUsers(data)
    }
    setLoading(false)
  }
  
  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (!confirm(`정말로 이 사용자의 관리자 권한을 ${currentIsAdmin ? '해제' : '부여'}하시겠습니까?`)) {
      return
    }
    
    const { error } = await supabase
      .from('users')
      .update({ is_admin: !currentIsAdmin })
      .eq('id', userId)
    
    if (!error) {
      // Log admin action
      await supabase
        .from('admin_logs')
        .insert({
          action: currentIsAdmin ? 'REVOKE_ADMIN' : 'GRANT_ADMIN',
          entity_type: 'user',
          entity_id: userId,
          details: { timestamp: new Date().toISOString() }
        })
      
      await fetchUsers()
    }
  }
  
  const handleToggleVerified = async (userId: string, currentVerified: boolean) => {
    // Update verification status in the appropriate profile table
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (user?.role === 'organization') {
      const { error } = await supabase
        .from('organization_profiles')
        .update({ is_verified: !currentVerified })
        .eq('user_id', userId)
      
      if (!error) {
        await fetchUsers()
      }
    }
  }
  
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('정말로 이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }
    
    // Note: Actual user deletion should be handled carefully
    // For now, we'll just remove admin privileges
    const { error } = await supabase
      .from('users')
      .update({ is_admin: false })
      .eq('id', userId)
    
    if (!error) {
      // Log admin action
      await supabase
        .from('admin_logs')
        .insert({
          action: 'DELETE_USER',
          entity_type: 'user',
          entity_id: userId,
          details: { timestamp: new Date().toISOString() }
        })
      
      await fetchUsers()
    }
  }
  
  const filteredUsers = useMemo(() => users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.organization_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = 
      filterRole === 'all' || 
      user.role === filterRole ||
      (filterRole === 'admin' && user.is_admin)
    
    return matchesSearch && matchesRole
  }), [users, searchTerm, filterRole])
  
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
          <CardTitle>사용자 목록</CardTitle>
          <CardDescription>총 {filteredUsers.length}명의 사용자</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="p-4">
              <SkeletonTable rows={8} />
            </div>
          )}
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
                {!loading && filteredUsers.length === 0 ? (
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
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.role === 'expert' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'organization' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'expert' ? '전문가' :
                             user.role === 'organization' ? '기관' : '기타'}
                          </span>
                          {user.is_admin && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center">
                              <Shield className="w-3 h-3 mr-1" />
                              관리자
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role === 'organization' && (
                          <button
                            onClick={() => handleToggleVerified(user.id, user.is_verified || false)}
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
                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                            className="text-gray-600 hover:text-gray-900"
                            aria-label={user.is_admin ? '관리자 권한 해제' : '관리자 권한 부여'}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                            aria-label="사용자 삭제"
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
  )
}

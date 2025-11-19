'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Mail,
  Copy,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  UserPlus
} from 'lucide-react'
import { InviteUserDialog } from '@/components/admin/InviteUserDialog'
import { BulkInviteDialog } from '@/components/admin/BulkInviteDialog'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { toast } from 'sonner'

interface Invitation {
  id: string
  email: string
  name: string
  phone: string
  role: 'expert' | 'organization'
  organization_name?: string
  position?: string
  token: string
  status: 'pending' | 'accepted' | 'expired'
  expires_at: string
  accepted_at: string | null
  created_at: string
  invited_by_user?: {
    id: string
    email: string
  }
}

export default function AdminInvitationsClient({ 
  initialInvitations 
}: { 
  initialInvitations: Invitation[] 
}) {
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(initialInvitations.length)
  const debouncedSearch = useDebouncedValue(searchTerm, 350)

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filterStatus])

  useEffect(() => {
    fetchInvitations()
  }, [debouncedSearch, filterStatus, currentPage, pageSize])

  // 만료된 초대 자동 업데이트 (1분마다 체크)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setInvitations(prev => prev.map(inv => {
        if (inv.status === 'pending' && new Date(inv.expires_at) < now) {
          return { ...inv, status: 'expired' as const }
        }
        return inv
      }))
    }, 60000) // 1분마다 체크

    return () => clearInterval(interval)
  }, [])

  const fetchInvitations = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No session found')
        toast.error('로그인이 필요합니다.')
        setLoading(false)
        return
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        status: filterStatus === 'all' ? '' : filterStatus,
        search: debouncedSearch || ''
      })

      const response = await fetch(`/api/admin/invitations?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        // 캐싱 활성화 (10초)
        next: { revalidate: 10 }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to fetch invitations')
      }

      const result = await response.json()
      
      if (result.invitations) {
        setInvitations(result.invitations)
        setTotal(result.pagination?.total || 0)
      } else {
        setInvitations([])
        setTotal(0)
      }
    } catch (err: any) {
      console.error('Error fetching invitations:', err)
      toast.error(err.message || '초대 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/auth/invite/accept/${token}`
    navigator.clipboard.writeText(inviteUrl)
        toast.success('초대장 링크가 복사되었습니다.')
  }

  const resendInvite = async (invitation: Invitation) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const inviteUrl = `${appUrl}/auth/invite/accept/${invitation.token}`

    // 이메일 재시도 로직 (최대 3회)
    const sendEmailWithRetry = async (retries = 3): Promise<boolean> => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: invitation.email,
              subject: `[${process.env.NEXT_PUBLIC_APP_NAME || 'StartupMatching'}] 초대가 도착했습니다`,
          html: generateInviteEmailHTML(
            invitation.name,
            invitation.email,
            inviteUrl,
            invitation.phone,
            invitation.organization_name || ''
          ),
            }),
          })

          if (response.ok) {
            return true
          }
          
          // 마지막 시도가 아니면 잠시 대기 후 재시도
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
          }
        } catch (error) {
          if (i === retries - 1) {
            throw error
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
      }
      return false
    }

    try {
      const success = await sendEmailWithRetry()
      if (success) {
        toast.success(`${invitation.email}로 초대장을 다시 보냈습니다.`)
      } else {
        throw new Error('Failed to send email after retries')
      }
    } catch (error) {
      toast.error('초대장 재발송에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date()
    
    if (status === 'accepted') {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />수락됨</Badge>
    }
    if (status === 'expired' || isExpired) {
      return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />만료됨</Badge>
    }
    return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />대기중</Badge>
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">초대 관리</h1>
          <p className="text-gray-600">회원 초대 내역을 확인하고 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <InviteUserDialog onSuccess={fetchInvitations} />
          <BulkInviteDialog onSuccess={fetchInvitations} />
          <Button
            variant="outline"
            onClick={fetchInvitations}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
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
                검색
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="이메일 또는 이름으로 검색..."
                  className="pl-10 min-h-[44px]"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태 필터
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              >
                <option value="all">전체</option>
                <option value="pending">대기중</option>
                <option value="accepted">수락됨</option>
                <option value="expired">만료됨</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle>초대 목록</CardTitle>
          <CardDescription>
            총 {total}개의 초대
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              조건에 맞는 초대가 없습니다.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">역할</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">만료일</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">초대한 사람</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invitation.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invitation.name}
                        {invitation.organization_name && (
                          <div className="text-xs text-gray-400">{invitation.organization_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline">
                          {invitation.role === 'expert' ? '전문가' : '기관'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invitation.status, invitation.expires_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.expires_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invitation.invited_by_user?.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteLink(invitation.token)}
                            title="초대장 링크 복사"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          {invitation.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resendInvite(invitation)}
                              title="초대장 재발송"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const inviteUrl = `${window.location.origin}/auth/invite/accept/${invitation.token}`
                              window.open(inviteUrl, '_blank')
                            }}
                            title="초대장 링크 열기"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {total > 0
                      ? `${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, total)} / 총 ${total}개`
                      : '총 0개'}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setCurrentPage(1)
                        setPageSize(parseInt(e.target.value, 10))
                      }}
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
                    <span className="text-sm text-gray-600">
                      {currentPage} / {Math.max(1, Math.ceil(total / pageSize))}
                    </span>
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
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function generateInviteEmailHTML(name: string, email: string, inviteUrl: string, phone: string, organizationName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>초대장</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">초대가 도착했습니다! 🎉</h1>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p style="font-size: 16px; margin-bottom: 20px;">안녕하세요, <strong>${name}</strong>님!</p>
    
    ${organizationName ? `<p style="font-size: 16px; margin-bottom: 20px;"><strong>${organizationName}</strong>에서 가입 초대를 보내드립니다.</p>` : ''}
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      아래 링크를 클릭하여 가입을 완료해주세요.
    </p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <p style="margin: 0 0 15px 0; font-size: 14px; color: #333; font-weight: bold;">🔐 가입 정보</p>
      <div style="margin-bottom: 10px;">
        <p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">이메일 주소:</p>
        <p style="margin: 0; font-size: 15px; color: #333; font-weight: bold; word-break: break-all;">${email}</p>
      </div>
      <div style="margin-bottom: 10px;">
        <p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">임시 비밀번호:</p>
        <p style="margin: 0; font-size: 15px; color: #333; font-weight: bold;">${phone}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">※ 등록하신 전화번호입니다 (하이픈 없이 숫자만 입력해주세요)</p>
      </div>
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
        <p style="margin: 0; font-size: 12px; color: #666;">
          💡 보안을 위해 가입 후 비밀번호를 변경하는 것을 권장합니다.
        </p>
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        가입하러 가기 →
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
      <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
    </p>
    
    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin-top: 30px;">
      <p style="margin: 0 0 10px 0; font-size: 13px; color: #856404; font-weight: bold;">
        ⚠️ 중요 안내사항
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #856404; line-height: 1.8;">
        <li>이 초대 링크는 <strong>7일 후 만료</strong>됩니다.</li>
        <li>만료된 링크는 사용할 수 없으며, 운영팀에 새로운 초대를 요청해주시기 바랍니다.</li>
        <li>이미 가입이 완료된 경우 로그인 페이지에서 로그인하실 수 있습니다.</li>
        <li>가입 과정에서 문제가 발생하시면 운영팀에 문의해주시기 바랍니다.</li>
      </ul>
    </div>
    
    <p style="font-size: 11px; color: #999; margin-top: 20px; text-align: center;">
      이 이메일은 자동으로 발송되었습니다. 회신하지 마세요.
    </p>
  </div>
</body>
</html>
  `
}


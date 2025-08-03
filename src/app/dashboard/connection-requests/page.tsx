'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CheckCircle, XCircle, Clock, User, Building, Mail, Phone } from 'lucide-react'

interface ConnectionRequest {
  id: string
  subject: string
  message: string
  project_type: string
  expected_budget?: string
  expected_duration?: string
  urgency: 'low' | 'medium' | 'high'
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  created_at: string
  expert_responded_at?: string
  shared_contact_info?: {
    name: string
    email: string
    phone?: string
  }
  expert_profiles?: {
    name: string
    expertise_areas: string[]
    location: string
  }
  organization_profiles?: {
    name: string
    type: string
  }
}

export default function ConnectionRequestsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [requests, setRequests] = useState<ConnectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    checkUserAndLoadRequests()
  }, [])

  const checkUserAndLoadRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)

      // Get user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData) {
        setUserRole(userData.role)
        await loadConnectionRequests(user.id, userData.role)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadConnectionRequests = async (userId: string, role: string) => {
    try {
      let query = supabase
        .from('connection_requests')
        .select(`
          *,
          expert_profiles(name, expertise_areas, location),
          organization_profiles(name, type)
        `)
        .order('created_at', { ascending: false })

      if (role === 'expert') {
        // Get expert profile ID
        const { data: expertProfile } = await supabase
          .from('expert_profiles')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (expertProfile) {
          query = query.eq('expert_id', expertProfile.id)
        }
      } else {
        // Get organization profile ID
        const { data: orgProfile } = await supabase
          .from('organization_profiles')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (orgProfile) {
          query = query.eq('organization_id', orgProfile.id)
        }
      }

      const { data, error } = await query

      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      console.error('Error loading connection requests:', error)
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기 중'
      case 'approved': return '승인됨'
      case 'rejected': return '거절됨'
      case 'expired': return '만료됨'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'low': return '여유있음'
      case 'medium': return '보통'
      case 'high': return '긴급'
      default: return urgency
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true
    return request.status === filter
  })

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">연결 요청 관리</h1>
          <p className="text-gray-600">
            {userRole === 'expert' 
              ? '받은 연결 요청을 검토하고 응답하세요'
              : '보낸 연결 요청의 현황을 확인하세요'
            }
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            onClick={() => setFilter('all')}
            className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            전체 ({requests.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            대기 중 ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            승인됨 ({requests.filter(r => r.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              filter === 'rejected'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            거절됨 ({requests.filter(r => r.status === 'rejected').length})
          </button>
        </div>

        {/* Connection Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-gray-500">
                  {filter === 'all' && '연결 요청이 없습니다.'}
                  {filter === 'pending' && '대기 중인 연결 요청이 없습니다.'}
                  {filter === 'approved' && '승인된 연결 요청이 없습니다.'}
                  {filter === 'rejected' && '거절된 연결 요청이 없습니다.'}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{request.subject}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          {userRole === 'expert' ? (
                            <>
                              <Building className="h-4 w-4" />
                              {request.organization_profiles?.name}
                            </>
                          ) : (
                            <>
                              <User className="h-4 w-4" />
                              {request.expert_profiles?.name}
                            </>
                          )}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(request.created_at), {
                            addSuffix: true,
                            locale: ko
                          })}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusText(request.status)}
                      </Badge>
                      <span className={`text-sm font-medium ${getUrgencyColor(request.urgency)}`}>
                        {getUrgencyText(request.urgency)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Project Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">프로젝트 유형:</span>
                        <p className="text-gray-600">{request.project_type}</p>
                      </div>
                      {request.expected_budget && (
                        <div>
                          <span className="font-medium text-gray-700">예상 예산:</span>
                          <p className="text-gray-600">{request.expected_budget}</p>
                        </div>
                      )}
                      {request.expected_duration && (
                        <div>
                          <span className="font-medium text-gray-700">예상 기간:</span>
                          <p className="text-gray-600">{request.expected_duration}</p>
                        </div>
                      )}
                    </div>

                    {/* Message */}
                    <div>
                      <span className="font-medium text-gray-700">상세 메시지:</span>
                      <p className="text-gray-600 mt-1 whitespace-pre-line">{request.message}</p>
                    </div>

                    {/* Contact Info (for approved requests) */}
                    {request.status === 'approved' && request.shared_contact_info && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-2">
                          {userRole === 'expert' ? '내 연락처가 공유되었습니다' : '전문가 연락처'}
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{request.shared_contact_info.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-green-600" />
                            <a 
                              href={`mailto:${request.shared_contact_info.email}`}
                              className="text-green-700 hover:underline"
                            >
                              {request.shared_contact_info.email}
                            </a>
                          </div>
                          {request.shared_contact_info.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-green-600" />
                              <a 
                                href={`tel:${request.shared_contact_info.phone}`}
                                className="text-green-700 hover:underline"
                              >
                                {request.shared_contact_info.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status Info */}
                    {request.expert_responded_at && (
                      <div className="text-xs text-gray-500">
                        응답일: {formatDistanceToNow(new Date(request.expert_responded_at), {
                          addSuffix: true,
                          locale: ko
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
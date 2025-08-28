'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  MessageCircle, 
  Clock, 
  User,
  Building2,
  ChevronRight,
  Filter
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { MessageThreadSkeleton } from '@/components/ui/loading-states'
import { NoMessages, NoSearchResults } from '@/components/ui/empty-state'
import { ResponsiveList } from '@/components/ui/responsive-table'
import { handleSupabaseError } from '@/lib/error-handler'

interface MessageThread {
  id: string
  campaign_id: string
  participant_1: string
  participant_2: string
  participant_1_email: string
  participant_2_email: string
  participant_1_name: string | null
  participant_2_name: string | null
  participant_1_org_name: string | null
  participant_2_org_name: string | null
  campaign_title: string
  last_message_content: string | null
  last_message_time: string
  unread_count: number
  created_at: string
}

export default function MessagesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [filteredThreads, setFilteredThreads] = useState<MessageThread[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'campaigns' | 'proposals'>('all')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndLoadThreads()
  }, [])

  useEffect(() => {
    filterThreads()
  }, [threads, searchTerm, filterType])

  const checkAuthAndLoadThreads = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    setCurrentUser(user)

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData) {
      setUserRole(userData.role)
      await loadMessageThreads(user.id)
    }
  }

  const loadMessageThreads = async (userId: string) => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('message_thread_view')
        .select('*')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false })

      if (error) throw error

      setThreads(data || [])
    } catch (error) {
      handleSupabaseError(error as Error)
    } finally {
      setLoading(false)
    }
  }

  const filterThreads = () => {
    let filtered = threads

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(thread => {
        const otherParticipantName = getOtherParticipantName(thread)
        const otherParticipantOrg = getOtherParticipantOrgName(thread)
        
        return (
          thread.campaign_title.toLowerCase().includes(search) ||
          otherParticipantName.toLowerCase().includes(search) ||
          (otherParticipantOrg && otherParticipantOrg.toLowerCase().includes(search)) ||
          (thread.last_message_content && thread.last_message_content.toLowerCase().includes(search))
        )
      })
    }

    // Type filter
    switch (filterType) {
      case 'unread':
        filtered = filtered.filter(thread => thread.unread_count > 0)
        break
      case 'campaigns':
        filtered = filtered.filter(thread => thread.campaign_id)
        break
      case 'proposals':
        // Filter for proposal-related messages could be implemented later
        // For now, show all threads as proposals are typically within campaigns
        break
    }

    setFilteredThreads(filtered)
  }

  const getOtherParticipantName = (thread: MessageThread) => {
    if (currentUser?.id === thread.participant_1) {
      return thread.participant_2_name || thread.participant_2_org_name || thread.participant_2_email
    } else {
      return thread.participant_1_name || thread.participant_1_org_name || thread.participant_1_email
    }
  }

  const getOtherParticipantOrgName = (thread: MessageThread) => {
    if (currentUser?.id === thread.participant_1) {
      return thread.participant_2_org_name
    } else {
      return thread.participant_1_org_name
    }
  }

  const getOtherParticipantType = (thread: MessageThread) => {
    if (currentUser?.id === thread.participant_1) {
      return thread.participant_2_org_name ? 'organization' : 'expert'
    } else {
      return thread.participant_1_org_name ? 'organization' : 'expert'
    }
  }

  const getTotalUnreadCount = () => {
    return threads.reduce((total, thread) => total + thread.unread_count, 0)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">메시지</h1>
              <p className="text-gray-600 mt-2">
                프로젝트 관련 대화를 확인하고 관리하세요
              </p>
            </div>
          </div>
        </div>
        <MessageThreadSkeleton />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">메시지</h1>
            <p className="text-gray-600 mt-2">
              프로젝트 관련 대화를 확인하고 관리하세요
            </p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {getTotalUnreadCount()}
            </div>
            <div className="text-sm text-gray-500">읽지 않은 메시지</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="대화 상대, 캠페인, 메시지 내용으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 rounded-md border border-input text-sm"
              >
                <option value="all">모든 대화</option>
                <option value="unread">읽지 않음</option>
                <option value="campaigns">캠페인</option>
                <option value="proposals">제안서</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Threads */}
      {filteredThreads.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            {threads.length === 0 ? (
              <NoMessages onStartChat={() => {
                router.push(userRole === 'expert' ? '/dashboard/campaigns' : '/dashboard/experts')
              }} />
            ) : (
              <NoSearchResults onClear={() => {
                setSearchTerm('')
                setFilterType('all')
              }} />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredThreads.map((thread) => {
            const otherParticipantName = getOtherParticipantName(thread)
            const otherParticipantOrg = getOtherParticipantOrgName(thread)
            const otherParticipantType = getOtherParticipantType(thread)
            
            return (
              <Card 
                key={thread.id} 
                className={`hover:shadow-lg transition-shadow cursor-pointer ${
                  thread.unread_count > 0 ? 'ring-2 ring-blue-100 bg-blue-50/30' : ''
                }`}
                onClick={() => router.push(`/dashboard/messages/${thread.campaign_id}?thread=${thread.id}`)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-shrink-0">
                          {otherParticipantType === 'organization' ? (
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-green-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {otherParticipantName}
                            </h3>
                            {thread.unread_count > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {thread.unread_count}
                              </Badge>
                            )}
                          </div>
                          {otherParticipantOrg && (
                            <p className="text-sm text-gray-500 truncate">
                              {otherParticipantOrg}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          캠페인: {thread.campaign_title}
                        </p>
                        {thread.last_message_content && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {thread.last_message_content}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(thread.last_message_time), {
                            addSuffix: true,
                            locale: ko
                          })}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {otherParticipantType === 'organization' ? '기관' : '전문가'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 ml-4">
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Bell, 
  BellOff, 
  Trash2, 
  Edit2, 
  Save,
  X,
  Plus,
  Filter,
  Clock,
  TrendingUp
} from 'lucide-react'
import { useToast } from '@/components/ui/toast-provider'
import { cn } from '@/lib/utils'

interface SavedSearch {
  id: string
  user_id: string
  name: string
  query: string
  filters: {
    industry?: string
    budget?: string
    urgency?: string
    skills?: string[]
  }
  notification_enabled: boolean
  notification_frequency: 'instant' | 'daily' | 'weekly'
  created_at: string
  last_matched: string
  match_count: number
}

interface SavedSearchesProps {
  userId: string
  onSearchSelect?: (search: SavedSearch) => void
  className?: string
}

// Simple Switch component if not available
function Switch({ 
  checked, 
  onCheckedChange,
  id
}: { 
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-blue-600" : "bg-gray-200"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  )
}

export function SavedSearches({ userId, onSearchSelect, className }: SavedSearchesProps) {
  const { success, error: showError } = useToast()
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSearch, setNewSearch] = useState({
    name: '',
    query: '',
    filters: {},
    notification_enabled: false,
    notification_frequency: 'daily' as const
  })

  useEffect(() => {
    loadSavedSearches()
  }, [userId])

  const loadSavedSearches = async () => {
    try {
      // Mock data for demonstration - replace with actual Supabase query
      const mockData: SavedSearch[] = [
        {
          id: '1',
          user_id: userId,
          name: 'React 프론트엔드 프로젝트',
          query: 'React',
          filters: {
            industry: 'IT',
            budget: '10000000-30000000',
            skills: ['React', 'TypeScript']
          },
          notification_enabled: true,
          notification_frequency: 'daily',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          last_matched: new Date().toISOString(),
          match_count: 5
        },
        {
          id: '2',
          user_id: userId,
          name: '고예산 AI 프로젝트',
          query: 'AI Machine Learning',
          filters: {
            budget: '50000000',
            urgency: 'high'
          },
          notification_enabled: false,
          notification_frequency: 'weekly',
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          last_matched: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          match_count: 2
        }
      ]
      
      setSavedSearches(mockData)
    } catch (error) {
      console.error('Failed to load saved searches:', error)
      showError('저장된 검색을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const saveSearch = async () => {
    if (!newSearch.name || !newSearch.query) {
      showError('검색명과 검색어를 입력해주세요.')
      return
    }

    try {
      const newSavedSearch: SavedSearch = {
        id: Date.now().toString(),
        user_id: userId,
        ...newSearch,
        created_at: new Date().toISOString(),
        last_matched: new Date().toISOString(),
        match_count: 0
      }
      
      setSavedSearches([newSavedSearch, ...savedSearches])
      setShowAddForm(false)
      setNewSearch({
        name: '',
        query: '',
        filters: {},
        notification_enabled: false,
        notification_frequency: 'daily'
      })
      
      success('검색이 저장되었습니다.')
    } catch (error) {
      console.error('Failed to save search:', error)
      showError('검색 저장에 실패했습니다.')
    }
  }

  const updateSearch = async (id: string, updates: Partial<SavedSearch>) => {
    try {
      setSavedSearches(prev => 
        prev.map(search => 
          search.id === id ? { ...search, ...updates } : search
        )
      )
      success('검색이 업데이트되었습니다.')
    } catch (error) {
      console.error('Failed to update search:', error)
      showError('업데이트에 실패했습니다.')
    }
  }

  const deleteSearch = async (id: string) => {
    if (!confirm('이 검색을 삭제하시겠습니까?')) return
    
    try {
      setSavedSearches(prev => prev.filter(search => search.id !== id))
      success('검색이 삭제되었습니다.')
    } catch (error) {
      console.error('Failed to delete search:', error)
      showError('삭제에 실패했습니다.')
    }
  }

  const toggleNotification = async (id: string, enabled: boolean) => {
    await updateSearch(id, { notification_enabled: enabled })
  }

  const formatDate = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return '오늘'
    if (days === 1) return '어제'
    if (days < 7) return `${days}일 전`
    if (days < 30) return `${Math.floor(days / 7)}주 전`
    return `${Math.floor(days / 30)}개월 전`
  }

  const getFilterDisplay = (filters: SavedSearch['filters']) => {
    const parts = []
    if (filters.industry) parts.push(filters.industry)
    if (filters.budget) {
      const budgetMap: Record<string, string> = {
        '0-5000000': '~500만원',
        '5000000-10000000': '500-1000만원',
        '10000000-30000000': '1000-3000만원',
        '30000000-50000000': '3000-5000만원',
        '50000000': '5000만원+'
      }
      parts.push(budgetMap[filters.budget] || filters.budget)
    }
    if (filters.urgency) parts.push(`긴급도: ${filters.urgency}`)
    return parts
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">저장된 검색</h3>
          <p className="text-sm text-gray-600">
            검색 조건을 저장하고 알림을 받으세요
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          새 검색 저장
        </Button>
      </div>

      {/* Add New Search Form */}
      {showAddForm && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">새 검색 저장</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="search-name">검색명</Label>
                <Input
                  id="search-name"
                  placeholder="예: React 프론트엔드 프로젝트"
                  value={newSearch.name}
                  onChange={(e) => setNewSearch({ ...newSearch, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="search-query">검색어</Label>
                <Input
                  id="search-query"
                  placeholder="예: React TypeScript"
                  value={newSearch.query}
                  onChange={(e) => setNewSearch({ ...newSearch, query: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="new-notification"
                checked={newSearch.notification_enabled}
                onCheckedChange={(checked) => 
                  setNewSearch({ ...newSearch, notification_enabled: checked })
                }
              />
              <Label htmlFor="new-notification">
                새 매칭 알림 받기
              </Label>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false)
                  setNewSearch({
                    name: '',
                    query: '',
                    filters: {},
                    notification_enabled: false,
                    notification_frequency: 'daily'
                  })
                }}
              >
                취소
              </Button>
              <Button size="sm" onClick={saveSearch}>
                <Save className="w-4 h-4 mr-2" />
                저장
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Searches List */}
      {savedSearches.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">저장된 검색이 없습니다</h4>
            <p className="text-sm text-gray-600 mb-4">
              자주 사용하는 검색 조건을 저장하고<br />
              새로운 매칭이 있을 때 알림을 받아보세요
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedSearches.map((search) => (
            <Card 
              key={search.id} 
              className={cn(
                "hover:shadow-md transition-shadow cursor-pointer",
                search.notification_enabled && "border-blue-200"
              )}
              onClick={() => !editingId && onSearchSelect?.(search)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editingId === search.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="mb-2"
                      />
                    ) : (
                      <CardTitle className="text-base mb-1">
                        {search.name}
                      </CardTitle>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>생성: {formatDate(search.created_at)}</span>
                      {search.match_count > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 font-medium">
                            {search.match_count}개 매칭
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {editingId === search.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            updateSearch(search.id, { name: editName })
                            setEditingId(null)
                          }}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditName(search.name)
                            setEditingId(search.id)
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSearch(search.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Search Query */}
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">{search.query}</span>
                </div>
                
                {/* Filters */}
                {Object.keys(search.filters).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {getFilterDisplay(search.filters).map((filter, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {filter}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Notification Toggle */}
                <div 
                  className="flex items-center justify-between pt-2 border-t"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    {search.notification_enabled ? (
                      <Bell className="w-4 h-4 text-blue-600" />
                    ) : (
                      <BellOff className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-600">
                      {search.notification_enabled ? '알림 켜짐' : '알림 꺼짐'}
                    </span>
                  </div>
                  <Switch
                    checked={search.notification_enabled}
                    onCheckedChange={(checked) => 
                      toggleNotification(search.id, checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Notification Settings Info */}
      {savedSearches.some(s => s.notification_enabled) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">알림 설정됨</p>
                <p className="text-blue-700">
                  새로운 매칭 캠페인이 등록되면 이메일로 알려드립니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
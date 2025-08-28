'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Search, Filter, X, ChevronDown, MapPin, Star, Calendar, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

// 필터 옵션 타입 정의
export interface FilterOption {
  id: string
  label: string
  count?: number
  group?: string
}

export interface FilterGroup {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  type: 'checkbox' | 'range' | 'select' | 'multi-select'
  options?: FilterOption[]
  min?: number
  max?: number
  step?: number
  placeholder?: string
}

export interface SearchFilters {
  query: string
  location?: string
  skills: string[]
  experience: string[]
  availability: string[]
  hourlyRate: [number, number]
  rating: number
  sortBy: string
  verified?: boolean
}

interface AdvancedSearchFilterProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  filterGroups: FilterGroup[]
  resultCount?: number
  loading?: boolean
  className?: string
}

const SORT_OPTIONS = [
  { value: 'relevance', label: '관련도순' },
  { value: 'rating', label: '평점순' },
  { value: 'experience', label: '경력순' },
  { value: 'price-low', label: '가격낮은순' },
  { value: 'price-high', label: '가격높은순' },
  { value: 'recent', label: '최신순' }
]

export function AdvancedSearchFilter({
  filters,
  onFiltersChange,
  filterGroups,
  resultCount,
  loading = false,
  className
}: AdvancedSearchFilterProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(filterGroups.slice(0, 3).map(g => g.id))
  )

  // 검색어 변경 핸들러
  const handleQueryChange = useCallback((query: string) => {
    onFiltersChange({ ...filters, query })
  }, [filters, onFiltersChange])

  // 필터 변경 핸들러
  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }, [filters, onFiltersChange])

  // 체크박스 필터 토글
  const toggleCheckboxFilter = useCallback((groupId: string, optionId: string) => {
    const currentValues = filters[groupId as keyof SearchFilters] as string[] || []
    const newValues = currentValues.includes(optionId)
      ? currentValues.filter(id => id !== optionId)
      : [...currentValues, optionId]
    
    handleFilterChange(groupId as keyof SearchFilters, newValues)
  }, [filters, handleFilterChange])

  // 필터 초기화
  const resetFilters = useCallback(() => {
    onFiltersChange({
      query: '',
      location: '',
      skills: [],
      experience: [],
      availability: [],
      hourlyRate: [0, 200],
      rating: 0,
      sortBy: 'relevance'
    })
  }, [onFiltersChange])

  // 활성 필터 개수 계산
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.query) count++
    if (filters.location) count++
    if (filters.skills.length > 0) count++
    if (filters.experience.length > 0) count++
    if (filters.availability.length > 0) count++
    if (filters.hourlyRate[0] > 0 || filters.hourlyRate[1] < 200) count++
    if (filters.rating > 0) count++
    if (filters.verified) count++
    return count
  }, [filters])

  // 필터 그룹 확장/축소
  const toggleGroupExpansion = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }, [])

  return (
    <div className={cn("space-y-4", className)}>
      {/* 검색 바 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 메인 검색 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="기술, 경험, 키워드로 검색..."
                value={filters.query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="pl-10 min-h-[44px]"
              />
            </div>
            
            {/* 위치 검색 */}
            <div className="sm:w-48 relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="위치"
                value={filters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="pl-10 min-h-[44px]"
              />
            </div>
            
            {/* 정렬 */}
            <div className="sm:w-36">
              <Select
                value={filters.sortBy}
                onValueChange={(value) => handleFilterChange('sortBy', value)}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 필터 토글 */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="min-h-[44px] relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              필터
              {activeFilterCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>
          
          {/* 결과 개수 */}
          {resultCount !== undefined && (
            <div className="flex justify-between items-center mt-3 pt-3 border-t text-sm text-gray-600">
              <span>
                {loading ? '검색 중...' : `${resultCount.toLocaleString()}개의 결과`}
              </span>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-3 w-3 mr-1" />
                  필터 초기화
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 고급 필터 */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              상세 필터
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {filterGroups.map((group) => (
              <Collapsible
                key={group.id}
                open={expandedGroups.has(group.id)}
                onOpenChange={() => toggleGroupExpansion(group.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-0 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      {group.icon && <group.icon className="h-4 w-4" />}
                      <span className="font-medium">{group.label}</span>
                    </div>
                    <ChevronDown 
                      className={cn(
                        "h-4 w-4 transition-transform",
                        expandedGroups.has(group.id) && "transform rotate-180"
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-3">
                  {group.type === 'checkbox' && group.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.options.map((option) => {
                        const isSelected = (filters[group.id as keyof SearchFilters] as string[] || []).includes(option.id)
                        return (
                          <div
                            key={option.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`${group.id}-${option.id}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleCheckboxFilter(group.id, option.id)}
                            />
                            <Label 
                              htmlFor={`${group.id}-${option.id}`}
                              className="text-sm flex-1 cursor-pointer"
                            >
                              {option.label}
                              {option.count && (
                                <span className="text-gray-400 ml-1">({option.count})</span>
                              )}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  
                  {group.type === 'range' && group.min !== undefined && group.max !== undefined && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{group.min.toLocaleString()}원</span>
                        <span>{group.max.toLocaleString()}원</span>
                      </div>
                      <Slider
                        value={filters[group.id as keyof SearchFilters] as [number, number]}
                        onValueChange={(value) => handleFilterChange(group.id as keyof SearchFilters, value)}
                        max={group.max}
                        min={group.min}
                        step={group.step || 1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm font-medium">
                        <span>
                          {((filters[group.id as keyof SearchFilters] as [number, number])?.[0] || 0).toLocaleString()}원
                        </span>
                        <span>
                          {((filters[group.id as keyof SearchFilters] as [number, number])?.[1] || 0).toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {group.type === 'select' && group.options && (
                    <Select
                      value={filters[group.id as keyof SearchFilters] as string}
                      onValueChange={(value) => handleFilterChange(group.id as keyof SearchFilters, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={group.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {group.options.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                            {option.count && (
                              <span className="text-gray-400 ml-1">({option.count})</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
            
            {/* 인증된 전문가만 */}
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="verified-only"
                checked={filters.verified || false}
                onCheckedChange={(checked) => handleFilterChange('verified', checked)}
              />
              <Label htmlFor="verified-only" className="text-sm cursor-pointer">
                인증된 전문가만 보기
              </Label>
            </div>
            
            {/* 최소 평점 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">최소 평점</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={filters.rating >= rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('rating', rating)}
                    className="px-2"
                  >
                    <Star className={cn(
                      "h-3 w-3",
                      filters.rating >= rating ? "fill-current" : ""
                    )} />
                  </Button>
                ))}
                {filters.rating > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFilterChange('rating', 0)}
                    className="px-2 text-gray-500"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 활성 필터 태그 */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.query && (
            <Badge variant="secondary" className="gap-1">
              검색: {filters.query}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleQueryChange('')}
              />
            </Badge>
          )}
          
          {filters.location && (
            <Badge variant="secondary" className="gap-1">
              <MapPin className="h-3 w-3" />
              {filters.location}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('location', '')}
              />
            </Badge>
          )}
          
          {filters.skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="gap-1">
              {skill}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => toggleCheckboxFilter('skills', skill)}
              />
            </Badge>
          ))}
          
          {filters.rating > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3" />
              {filters.rating}점 이상
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('rating', 0)}
              />
            </Badge>
          )}
          
          {filters.verified && (
            <Badge variant="secondary" className="gap-1">
              인증됨
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('verified', false)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
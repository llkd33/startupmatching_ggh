'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Search, TrendingUp, History, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import debounce from 'lodash/debounce'

interface SearchSuggestion {
  id: string
  text: string
  type: 'expert' | 'skill' | 'company' | 'recent' | 'trending'
  metadata?: {
    count?: number
    lastUsed?: string
  }
}

interface SearchAutocompleteProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  getSuggestions?: (query: string) => Promise<SearchSuggestion[]>
  recentSearches?: string[]
  trendingSearches?: string[]
  className?: string
}

export function SearchAutocomplete({
  placeholder = "Search for experts, skills, or companies...",
  value,
  onChange,
  onSearch,
  getSuggestions,
  recentSearches = [],
  trendingSearches = [],
  className
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Default suggestions when input is empty
  const defaultSuggestions: SearchSuggestion[] = [
    ...recentSearches.slice(0, 3).map(text => ({
      id: `recent-${text}`,
      text,
      type: 'recent' as const
    })),
    ...trendingSearches.slice(0, 3).map(text => ({
      id: `trending-${text}`,
      text,
      type: 'trending' as const,
      metadata: { count: Math.floor(Math.random() * 100) + 20 }
    }))
  ]

  // Debounced search function
  const debouncedGetSuggestions = useCallback(
    debounce(async (query: string) => {
      if (!getSuggestions || query.length < 2) {
        setSuggestions(defaultSuggestions)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const results = await getSuggestions(query)
        setSuggestions(results)
      } catch (error) {
        console.error('Failed to get suggestions:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 300),
    [getSuggestions]
  )

  useEffect(() => {
    if (value) {
      debouncedGetSuggestions(value)
    } else {
      setSuggestions(defaultSuggestions)
    }
  }, [value])

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else if (value) {
          handleSearch(value)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text)
    setIsOpen(false)
    setSelectedIndex(-1)
    if (onSearch) {
      onSearch(suggestion.text)
    }
  }

  const handleSearch = (searchValue: string) => {
    if (onSearch && searchValue) {
      onSearch(searchValue)
      setIsOpen(false)
      
      // Save to recent searches
      const updatedRecent = [searchValue, ...recentSearches.filter(s => s !== searchValue)].slice(0, 10)
      if (typeof window !== 'undefined') {
        localStorage.setItem('recentSearches', JSON.stringify(updatedRecent))
      }
    }
  }

  const clearSearch = () => {
    onChange('')
    setSuggestions(defaultSuggestions)
    inputRef.current?.focus()
  }

  const getTypeIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return <History className="w-4 h-4 text-gray-400" />
      case 'trending':
        return <TrendingUp className="w-4 h-4 text-blue-500" />
      default:
        return <Search className="w-4 h-4 text-gray-400" />
    }
  }

  const getTypeLabel = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'expert':
        return <Badge variant="outline" className="ml-auto">전문가</Badge>
      case 'skill':
        return <Badge variant="outline" className="ml-auto">기술</Badge>
      case 'company':
        return <Badge variant="outline" className="ml-auto">회사</Badge>
      default:
        return null
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
            setSelectedIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10 h-12 text-base"
          autoComplete="off"
          aria-label="Search"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="search-suggestions"
          role="combobox"
        />
        {value && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && (suggestions.length > 0 || isLoading) && (
        <div
          ref={dropdownRef}
          id="search-suggestions"
          className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
          role="listbox"
        >
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {!value && defaultSuggestions.length > 0 && (
                <>
                  {recentSearches.length > 0 && (
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                      최근 검색
                    </div>
                  )}
                  {trendingSearches.length > 0 && !recentSearches.length && (
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                      인기 검색어
                    </div>
                  )}
                </>
              )}
              
              <ul className="max-h-80 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.id}
                    className={cn(
                      "px-3 py-3 cursor-pointer transition-colors flex items-center gap-3",
                      index === selectedIndex 
                        ? "bg-blue-50 text-blue-900" 
                        : "hover:bg-gray-50",
                      index > 0 && suggestions[index - 1].type !== suggestion.type && "border-t"
                    )}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    role="option"
                    aria-selected={index === selectedIndex}
                  >
                    {getTypeIcon(suggestion.type)}
                    <span className="flex-1">
                      <span className="font-medium">{suggestion.text}</span>
                      {suggestion.metadata?.count && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({suggestion.metadata.count} results)
                        </span>
                      )}
                    </span>
                    {getTypeLabel(suggestion.type)}
                  </li>
                ))}
              </ul>

              {trendingSearches.length > 0 && recentSearches.length > 0 && !value && (
                <div className="border-t">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                    인기 검색어
                  </div>
                  <ul>
                    {trendingSearches.slice(0, 3).map((text, index) => (
                      <li
                        key={`trending-${index}`}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center gap-3"
                        onClick={() => handleSuggestionClick({ 
                          id: `trending-${text}`, 
                          text, 
                          type: 'trending' 
                        })}
                      >
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span className="flex-1">{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
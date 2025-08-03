'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'

interface KeywordInputProps {
  keywords: string[]
  onChange: (keywords: string[]) => void
  maxKeywords?: number
}

const KEYWORD_SUGGESTIONS = [
  'React', 'Node.js', 'Python', 'Java', 'Spring', 'Django',
  'AI/ML', '데이터분석', '클라우드', 'AWS', 'DevOps', '보안',
  '마케팅', '브랜딩', 'UI/UX', '디자인', '영업', '투자유치',
  '스타트업', '창업', '컨설팅', '멘토링', '교육', '강의',
]

export default function KeywordInput({ 
  keywords, 
  onChange,
  maxKeywords = 10 
}: KeywordInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const addKeyword = (keyword: string) => {
    const trimmed = keyword.trim()
    
    if (!trimmed || keywords.includes(trimmed) || keywords.length >= maxKeywords) {
      return
    }
    
    onChange([...keywords, trimmed])
    setInputValue('')
    setShowSuggestions(false)
  }

  const removeKeyword = (keyword: string) => {
    onChange(keywords.filter(k => k !== keyword))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword(inputValue)
    }
  }

  const filteredSuggestions = KEYWORD_SUGGESTIONS.filter(
    s => s.toLowerCase().includes(inputValue.toLowerCase()) && !keywords.includes(s)
  )

  return (
    <div>
      <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">
        키워드
      </label>
      <p className="mt-1 text-sm text-gray-500">
        전문가 매칭에 사용될 키워드를 입력해주세요.
      </p>
      
      <div className="mt-2">
        {keywords.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-indigo-200"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <div className="flex gap-2">
            <input
              type="text"
              id="keywords"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setShowSuggestions(true)
              }}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="키워드 입력"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={keywords.length >= maxKeywords}
            />
            <button
              type="button"
              onClick={() => addKeyword(inputValue)}
              disabled={keywords.length >= maxKeywords || !inputValue.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              추가
            </button>
          </div>

          {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
              {filteredSuggestions.slice(0, 5).map((suggestion) => (
                <div
                  key={suggestion}
                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
                  onClick={() => addKeyword(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-1 text-sm text-gray-500">
          {keywords.length}/{maxKeywords}개 키워드 사용 중
        </p>
      </div>
    </div>
  )
}
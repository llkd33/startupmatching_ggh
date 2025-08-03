'use client'

import { useState } from 'react'
import { CareerItem } from '@/types/supabase'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

interface CareerInputProps {
  careers: CareerItem[]
  onChange: (careers: CareerItem[]) => void
}

// Mock data for autocomplete - in production, this would come from an API
const COMPANY_SUGGESTIONS = [
  '삼성전자', '네이버', '카카오', 'LG전자', 'SK텔레콤', '현대자동차',
  '쿠팡', '배달의민족', '토스', '당근마켓', '직방', '야놀자',
]

const POSITION_SUGGESTIONS = [
  'CEO', 'CTO', 'CFO', 'COO', 'CMO',
  '대표이사', '이사', '부장', '차장', '과장', '대리', '사원',
  '개발자', '디자이너', '마케터', 'PM', 'PO', '연구원',
  '시니어 개발자', '주니어 개발자', '프론트엔드 개발자', '백엔드 개발자',
]

export default function CareerInput({ careers, onChange }: CareerInputProps) {
  const [showCompanySuggestions, setShowCompanySuggestions] = useState<number | null>(null)
  const [showPositionSuggestions, setShowPositionSuggestions] = useState<number | null>(null)

  const addCareer = () => {
    onChange([
      ...careers,
      {
        company: '',
        position: '',
        start_date: '',
        end_date: '',
        description: '',
      },
    ])
  }

  const updateCareer = (index: number, field: keyof CareerItem, value: string) => {
    const updated = [...careers]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const removeCareer = (index: number) => {
    onChange(careers.filter((_, i) => i !== index))
  }

  const filterSuggestions = (value: string, suggestions: string[]) => {
    return suggestions.filter(s => 
      s.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 5)
  }

  return (
    <div className="space-y-4">
      {careers.map((career, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">
                회사명
              </label>
              <input
                type="text"
                value={career.company}
                onChange={(e) => {
                  updateCareer(index, 'company', e.target.value)
                  setShowCompanySuggestions(e.target.value ? index : null)
                }}
                onBlur={() => setTimeout(() => setShowCompanySuggestions(null), 200)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="예: 네이버"
              />
              {showCompanySuggestions === index && career.company && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  {filterSuggestions(career.company, COMPANY_SUGGESTIONS).map((suggestion) => (
                    <div
                      key={suggestion}
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
                      onClick={() => {
                        updateCareer(index, 'company', suggestion)
                        setShowCompanySuggestions(null)
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">
                직책
              </label>
              <input
                type="text"
                value={career.position}
                onChange={(e) => {
                  updateCareer(index, 'position', e.target.value)
                  setShowPositionSuggestions(e.target.value ? index : null)
                }}
                onBlur={() => setTimeout(() => setShowPositionSuggestions(null), 200)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="예: 시니어 개발자"
              />
              {showPositionSuggestions === index && career.position && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  {filterSuggestions(career.position, POSITION_SUGGESTIONS).map((suggestion) => (
                    <div
                      key={suggestion}
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
                      onClick={() => {
                        updateCareer(index, 'position', suggestion)
                        setShowPositionSuggestions(null)
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                시작일
              </label>
              <input
                type="month"
                value={career.start_date}
                onChange={(e) => updateCareer(index, 'start_date', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                종료일
              </label>
              <input
                type="month"
                value={career.end_date || ''}
                onChange={(e) => updateCareer(index, 'end_date', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="재직중"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                주요 업무 (4-5개 단어)
              </label>
              <input
                type="text"
                value={career.description || ''}
                onChange={(e) => updateCareer(index, 'description', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="예: React 프론트엔드 개발"
              />
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => removeCareer(index)}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              삭제
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addCareer}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <PlusIcon className="h-4 w-4 mr-1" />
        경력 추가
      </button>
    </div>
  )
}
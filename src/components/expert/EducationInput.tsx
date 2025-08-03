'use client'

import { useState } from 'react'
import { EducationItem } from '@/types/supabase'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

interface EducationInputProps {
  educations: EducationItem[]
  onChange: (educations: EducationItem[]) => void
}

// Mock data for autocomplete
const SCHOOL_SUGGESTIONS = [
  '서울대학교', '연세대학교', '고려대학교', 'KAIST', 'POSTECH',
  '성균관대학교', '한양대학교', '중앙대학교', '경희대학교', '서강대학교',
  '이화여자대학교', '한국외국어대학교', '서울시립대학교', '건국대학교',
]

const MAJOR_SUGGESTIONS = [
  '컴퓨터공학', '소프트웨어공학', '전자공학', '기계공학', '산업공학',
  '경영학', '경제학', '심리학', '디자인', '마케팅',
  '데이터사이언스', '인공지능', '정보보호', '미디어학', '광고홍보학',
]

const DEGREE_OPTIONS = [
  { value: '학사', label: '학사' },
  { value: '석사', label: '석사' },
  { value: '박사', label: '박사' },
  { value: '전문학사', label: '전문학사' },
]

export default function EducationInput({ educations, onChange }: EducationInputProps) {
  const [showSchoolSuggestions, setShowSchoolSuggestions] = useState<number | null>(null)
  const [showMajorSuggestions, setShowMajorSuggestions] = useState<number | null>(null)

  const addEducation = () => {
    onChange([
      ...educations,
      {
        school: '',
        major: '',
        degree: '학사',
        graduation_year: '',
      },
    ])
  }

  const updateEducation = (index: number, field: keyof EducationItem, value: string) => {
    const updated = [...educations]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const removeEducation = (index: number) => {
    onChange(educations.filter((_, i) => i !== index))
  }

  const filterSuggestions = (value: string, suggestions: string[]) => {
    return suggestions.filter(s => 
      s.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 5)
  }

  return (
    <div className="space-y-4">
      {educations.map((education, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">
                학교명
              </label>
              <input
                type="text"
                value={education.school}
                onChange={(e) => {
                  updateEducation(index, 'school', e.target.value)
                  setShowSchoolSuggestions(e.target.value ? index : null)
                }}
                onBlur={() => setTimeout(() => setShowSchoolSuggestions(null), 200)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="예: 서울대학교"
              />
              {showSchoolSuggestions === index && education.school && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  {filterSuggestions(education.school, SCHOOL_SUGGESTIONS).map((suggestion) => (
                    <div
                      key={suggestion}
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
                      onClick={() => {
                        updateEducation(index, 'school', suggestion)
                        setShowSchoolSuggestions(null)
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
                전공
              </label>
              <input
                type="text"
                value={education.major}
                onChange={(e) => {
                  updateEducation(index, 'major', e.target.value)
                  setShowMajorSuggestions(e.target.value ? index : null)
                }}
                onBlur={() => setTimeout(() => setShowMajorSuggestions(null), 200)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="예: 컴퓨터공학"
              />
              {showMajorSuggestions === index && education.major && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  {filterSuggestions(education.major, MAJOR_SUGGESTIONS).map((suggestion) => (
                    <div
                      key={suggestion}
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
                      onClick={() => {
                        updateEducation(index, 'major', suggestion)
                        setShowMajorSuggestions(null)
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
                학위
              </label>
              <select
                value={education.degree}
                onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {DEGREE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                졸업년도
              </label>
              <input
                type="number"
                value={education.graduation_year}
                onChange={(e) => updateEducation(index, 'graduation_year', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="2020"
                min="1950"
                max={new Date().getFullYear() + 5}
              />
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => removeEducation(index)}
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
        onClick={addEducation}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <PlusIcon className="h-4 w-4 mr-1" />
        학력 추가
      </button>
    </div>
  )
}
'use client'

import { useState } from 'react'

interface ResumeParserProps {
  onParseComplete: (data: any) => void
}

export default function ResumeParser({ onParseComplete }: ResumeParserProps) {
  const [resumeText, setResumeText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseResume = () => {
    setParsing(true)
    
    // Simple parsing logic - can be enhanced with AI later
    const lines = resumeText.split('\n').filter(line => line.trim())
    
    const parsedData = {
      name: '',
      phone: '',
      career: [] as any[],
      education: [] as any[],
      skills: [] as string[],
    }

    // Extract name (usually first non-empty line)
    const namePattern = /^[가-힣]{2,5}$/
    for (const line of lines) {
      if (namePattern.test(line.trim())) {
        parsedData.name = line.trim()
        break
      }
    }

    // Extract phone
    const phonePattern = /010[-.\s]?\d{3,4}[-.\s]?\d{4}/
    const phoneMatch = resumeText.match(phonePattern)
    if (phoneMatch) {
      parsedData.phone = phoneMatch[0].replace(/[-.\s]/g, '-')
    }

    // Extract email
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    const emailMatch = resumeText.match(emailPattern)

    // Extract career history
    const careerKeywords = ['경력', '직장', '근무', '재직', '회사']
    const educationKeywords = ['학력', '대학', '고등학교', '졸업', '전공']
    
    let inCareerSection = false
    let inEducationSection = false
    
    lines.forEach((line, index) => {
      // Check for career section
      if (careerKeywords.some(keyword => line.includes(keyword))) {
        inCareerSection = true
        inEducationSection = false
      }
      // Check for education section
      else if (educationKeywords.some(keyword => line.includes(keyword))) {
        inEducationSection = true
        inCareerSection = false
      }
      
      // Parse career entries
      if (inCareerSection && index > 0) {
        // Look for date patterns (YYYY.MM or YYYY/MM or YYYY-MM)
        const datePattern = /(\d{4})[.\-/](\d{1,2})/g
        const dates = line.match(datePattern)
        
        if (dates && dates.length >= 1) {
          // This might be a career entry
          const companyPattern = /[가-힣A-Za-z]+(?:주식회사|㈜|\(주\)|Inc\.|Corp\.)?/
          const companyMatch = line.match(companyPattern)
          
          if (companyMatch) {
            parsedData.career.push({
              company: companyMatch[0],
              position: '',
              startDate: dates[0],
              endDate: dates[1] || '',
              description: ''
            })
          }
        }
      }
      
      // Parse education entries
      if (inEducationSection && index > 0) {
        const universityKeywords = ['대학교', '대학', '대학원']
        if (universityKeywords.some(keyword => line.includes(keyword))) {
          const schoolMatch = line.match(/[가-힣]+(?:대학교|대학|대학원)/)
          if (schoolMatch) {
            parsedData.education.push({
              school: schoolMatch[0],
              major: '',
              degree: '학사',
              graduationYear: ''
            })
          }
        }
      }
    })

    // Extract skills (common IT/business terms)
    const skillKeywords = [
      '투자', '유통', '마케팅', '비즈니스 개발', '재무', '법무', 'HR', '브랜딩', 
      'AWS', 'Docker', 'Kubernetes', 'SQL', 'MongoDB',
      '마케팅', '영업', '기획', '전략', '컨설팅', '프로젝트', 
      '관리', '분석', '개발', '디자인', 'PM', 'PO'
    ]
    
    skillKeywords.forEach(skill => {
      if (resumeText.includes(skill)) {
        parsedData.skills.push(skill)
      }
    })

    // Additional keyword extraction from text
    const words = resumeText.split(/\s+/)
    const techWords = words.filter(word => 
      /^[A-Z][a-zA-Z]+/.test(word) && word.length > 3
    )
    parsedData.skills = [...new Set([...parsedData.skills, ...techWords.slice(0, 10)])]

    setTimeout(() => {
      setParsing(false)
      onParseComplete(parsedData)
    }, 1500)
  }

  const handleFileDrop = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (file.type === 'text/plain') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        setResumeText(text)
        setError(null)
      }
      reader.readAsText(file)
    } else {
      setError('지원되지 않는 파일 형식입니다. .txt 파일을 드롭하거나 내용을 직접 붙여넣어 주세요.')
    }
  }, [])

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFileDrop(e.dataTransfer.files)
  }


  return (
    <div className="space-y-4">
      <div 
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 transition-colors duration-200 ${
          isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
        }`}>
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          
          <div>
            <label htmlFor="resume-text" className="sr-only">
              이력서 텍스트
            </label>
            <textarea
              id="resume-text"
              rows={10}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="여기에 이력서 내용을 붙여넣거나, .txt 파일을 드래그 앤 드롭하세요.&#10;&#10;예시:&#10;홍길동&#10;010-1234-5678&#10;email@example.com&#10;&#10;경력사항&#10;2020.03 - 현재 ABC회사 마케팅팀 과장&#10;2018.01 - 2020.02 XYZ스타트업 개발팀 대리&#10;&#10;학력사항&#10;2018 서울대학교 컴퓨터공학과 졸업"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={parseResume}
              disabled={!resumeText.trim() || parsing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {parsing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  분석 중...
                </>
              ) : (
                '이력서 분석하기'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          💡 이력서 붙여넣기 팁
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 워드/한글 문서에서 전체 선택(Ctrl+A) 후 복사(Ctrl+C)</li>
          <li>• PDF는 텍스트 선택 후 복사</li>
          <li>• 이름, 연락처, 경력, 학력이 포함되어 있으면 더 정확합니다</li>
          <li>• 개인정보는 안전하게 처리되며 저장됩니다</li>
        </ul>
      </div>
    </div>
  )
}
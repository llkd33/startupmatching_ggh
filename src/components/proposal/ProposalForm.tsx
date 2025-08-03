'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/supabase'
import { CalendarIcon, CurrencyDollarIcon, LinkIcon } from '@heroicons/react/24/outline'

interface ProposalFormProps {
  campaignId: string
  expertId: string
  campaignData?: any
}

export default function ProposalForm({ campaignId, expertId, campaignData }: ProposalFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    proposal_text: '',
    estimated_budget: '',
    estimated_start_date: '',
    estimated_end_date: '',
    portfolio_links: [] as string[],
  })

  const [newLink, setNewLink] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const proposalData = {
        campaign_id: campaignId,
        expert_id: expertId,
        proposal_text: formData.proposal_text,
        estimated_budget: formData.estimated_budget ? parseFloat(formData.estimated_budget) : null,
        estimated_start_date: formData.estimated_start_date || null,
        estimated_end_date: formData.estimated_end_date || null,
        portfolio_links: formData.portfolio_links,
      }

      const { error } = await db.proposals.submit(proposalData)
      if (error) throw error

      // TODO: Create notification for organization
      
      router.push('/dashboard/proposals')
    } catch (err: any) {
      setError(err.message || '제안서 제출 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const addPortfolioLink = () => {
    if (!newLink.trim()) return

    try {
      new URL(newLink)
      setFormData(prev => ({
        ...prev,
        portfolio_links: [...prev.portfolio_links, newLink],
      }))
      setNewLink('')
    } catch {
      setError('올바른 URL을 입력해주세요.')
    }
  }

  const removeLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      portfolio_links: prev.portfolio_links.filter((_, i) => i !== index),
    }))
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
      {campaignData && (
        <div className="bg-gray-50 px-4 py-5 sm:rounded-lg sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {campaignData.title}
          </h3>
          <p className="text-sm text-gray-600">
            {campaignData.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {campaignData.start_date} ~ {campaignData.end_date}
            </div>
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-4 w-4 mr-1" />
              예산: {campaignData.budget_min?.toLocaleString()} ~ {campaignData.budget_max?.toLocaleString()}원
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="proposal_text" className="block text-sm font-medium text-gray-700">
              제안 내용 <span className="text-red-500">*</span>
            </label>
            <p className="mt-1 text-sm text-gray-500">
              프로젝트에 대한 이해도, 수행 방안, 차별화 포인트 등을 자세히 작성해주세요.
            </p>
            <textarea
              id="proposal_text"
              rows={8}
              value={formData.proposal_text}
              onChange={(e) => handleChange('proposal_text', e.target.value)}
              required
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="안녕하세요. 저는 10년차 React 전문가로서..."
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="estimated_budget" className="block text-sm font-medium text-gray-700">
                제안 금액 (원)
              </label>
              <input
                type="number"
                id="estimated_budget"
                value={formData.estimated_budget}
                onChange={(e) => handleChange('estimated_budget', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="3000000"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="estimated_start_date" className="block text-sm font-medium text-gray-700">
                  시작 가능일
                </label>
                <input
                  type="date"
                  id="estimated_start_date"
                  value={formData.estimated_start_date}
                  onChange={(e) => handleChange('estimated_start_date', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="estimated_end_date" className="block text-sm font-medium text-gray-700">
                  완료 예정일
                </label>
                <input
                  type="date"
                  id="estimated_end_date"
                  value={formData.estimated_end_date}
                  onChange={(e) => handleChange('estimated_end_date', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              포트폴리오 링크
            </label>
            <p className="mt-1 text-sm text-gray-500">
              관련 프로젝트나 포트폴리오 링크를 추가해주세요.
            </p>
            
            {formData.portfolio_links.length > 0 && (
              <div className="mt-2 space-y-2">
                {formData.portfolio_links.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-gray-400" />
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-indigo-600 hover:text-indigo-500 truncate"
                    >
                      {link}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="text-sm text-red-600 hover:text-red-500"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 flex gap-2">
              <input
                type="url"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="https://portfolio.example.com"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <button
                type="button"
                onClick={addPortfolioLink}
                disabled={!newLink.trim()}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading || !formData.proposal_text}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '제출 중...' : '제안서 제출'}
        </button>
      </div>
    </form>
  )
}
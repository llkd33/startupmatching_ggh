'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CampaignForm from '@/components/campaign/CampaignForm'

export default function CreateCampaignPage() {
  const { user, loading, isOrganization } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || !isOrganization)) {
      router.push('/auth/login')
    }
  }, [user, loading, isOrganization, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!user || !isOrganization) {
    return null
  }

  const organizationId = user.profile?.id

  if (!organizationId) {
    return (
      <DashboardLayout>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-yellow-800">
                캠페인을 생성하려면 먼저 기관 프로필을 완성해주세요.
              </p>
              <button
                onClick={() => router.push('/dashboard/organization')}
                className="mt-2 text-yellow-600 hover:text-yellow-500 font-medium"
              >
                프로필 완성하기 →
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">캠페인 생성</h1>
            <p className="mt-2 text-gray-600">
              새로운 전문가 매칭 캠페인을 생성해보세요.
            </p>
          </div>
          
          <CampaignForm organizationId={organizationId} />
        </div>
      </div>
    </DashboardLayout>
  )
}
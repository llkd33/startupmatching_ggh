'use client'

import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

const CampaignForm = dynamic(() => import('@/components/campaign/CampaignForm'), {
  ssr: false,
  loading: () => (
    <div className="rounded-md border border-gray-200 bg-white p-8 text-center text-gray-500">
      캠페인 양식을 불러오는 중...
    </div>
  ),
})

type OrganizationProfileResponse = {
  profile?: {
    id: string
    is_profile_complete?: boolean | null
  }
}

type CampaignEditData = {
  id: string
  organization_id: string
  title: string
  description: string
  type: string
  category: string | null
  keywords: string[] | null
  budget_min: number | null
  budget_max: number | null
  start_date: string | null
  end_date: string | null
  location: string | null
  required_experts: number
  attachments?: unknown[] | null
  status: string
}

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>()
  const { user, session, loading } = useAuth()
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [campaign, setCampaign] = useState<CampaignEditData | null>(null)
  const [loadingPage, setLoadingPage] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) {
      return
    }

    if (!user) {
      router.replace('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    let cancelled = false

    const loadEditContext = async () => {
      if (loading) {
        return
      }

      if (!user?.id || !id) {
        if (!cancelled) {
          setLoadingPage(false)
        }
        return
      }

      if (!cancelled) {
        setLoadError(null)
        setLoadingPage(true)
      }

      try {
        const accessToken = session?.access_token || (
          await supabase.auth.getSession()
        ).data.session?.access_token

        if (!accessToken) {
          router.replace('/auth/login')
          return
        }

        const profileResponse = await fetch('/api/profile/organization', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (profileResponse.status === 401) {
          router.replace('/auth/login')
          return
        }

        if (profileResponse.status === 403) {
          throw new Error('기관 계정으로 확인되지 않아 캠페인을 수정할 수 없습니다.')
        }

        if (!profileResponse.ok) {
          throw new Error('기관 프로필을 불러오지 못했습니다.')
        }

        const profileData = await profileResponse.json() as OrganizationProfileResponse
        const orgId = profileData.profile?.id

        if (!orgId) {
          throw new Error('기관 프로필을 찾을 수 없습니다.')
        }

        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select(`
            id,
            organization_id,
            title,
            description,
            type,
            category,
            keywords,
            budget_min,
            budget_max,
            start_date,
            end_date,
            location,
            required_experts,
            attachments,
            status
          `)
          .eq('id', id)
          .maybeSingle()

        if (campaignError) {
          throw campaignError
        }

        if (!campaignData) {
          throw new Error('캠페인을 찾을 수 없습니다.')
        }

        const campaignRecord = campaignData as CampaignEditData

        if (campaignRecord.organization_id !== orgId) {
          throw new Error('이 캠페인을 수정할 권한이 없습니다.')
        }

        if (!cancelled) {
          setOrganizationId(orgId)
          setCampaign(campaignRecord)
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error loading campaign edit context:', err)
        }
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : '캠페인 수정 정보를 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) {
          setLoadingPage(false)
        }
      }
    }

    loadEditContext()

    return () => {
      cancelled = true
    }
  }, [id, user?.id, session?.access_token, loading, router])

  if (loading || loadingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (loadError || !organizationId || !campaign) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-6">
            <h3 className="text-lg font-medium text-red-900 mb-2">
              캠페인 수정 준비 중 오류가 발생했습니다
            </h3>
            <p className="text-red-800 mb-4">
              {loadError || '캠페인을 불러오지 못했습니다.'}
            </p>
            <Button onClick={() => router.push('/dashboard/campaigns')}>
              캠페인 목록으로 이동
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">캠페인 수정</h1>
          <p className="mt-2 text-gray-600">
            캠페인 내용을 수정하고 다시 저장하세요.
          </p>
        </div>

        <CampaignForm organizationId={organizationId} initialData={campaign} />
      </div>
    </div>
  )
}

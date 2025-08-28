'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { organizationProfileSchema, type OrganizationProfileInput } from '@/lib/validations/auth'
import { supabase, db } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SimpleProgressBar } from '@/components/ui/progress-steps'
import { useToast } from '@/components/ui/toast-provider'
import { HelpCircle } from 'lucide-react'

const industries = [
  'IT/소프트웨어',
  '제조업',
  '금융/보험',
  '의료/헬스케어',
  '교육',
  '유통/리테일',
  '건설/부동산',
  '미디어/엔터테인먼트',
  '컨설팅',
  '기타'
]

const employeeCounts = [
  '1-10명',
  '11-50명',
  '51-100명',
  '101-300명',
  '301-1000명',
  '1000명 이상'
]

export default function CompleteOrganizationProfilePage() {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [completedFields, setCompletedFields] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch
  } = useForm<OrganizationProfileInput>({
    resolver: zodResolver(organizationProfileSchema)
  })

  const watchedFields = watch()

  useEffect(() => {
    checkAuthAndLoadProfile()
  }, [])

  useEffect(() => {
    // Calculate progress based on filled fields
    const requiredFields = ['organizationName', 'representativeName', 'industry', 'employeeCount']
    const optionalFields = ['businessNumber', 'contactPosition', 'website', 'description']
    
    let completed = 0
    requiredFields.forEach(field => {
      if (watchedFields[field as keyof OrganizationProfileInput]) completed++
    })
    optionalFields.forEach(field => {
      if (watchedFields[field as keyof OrganizationProfileInput]) completed++
    })
    
    setCompletedFields(completed)
  }, [watchedFields])

  const checkAuthAndLoadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    setUserId(user.id)

    // 기존 프로필 데이터 로드 (있는 경우)
    const { data: profile } = await supabase
      .from('organization_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      setValue('organizationName', profile.organization_name || '')
      setValue('businessNumber', profile.business_number || '')
      setValue('representativeName', profile.representative_name || '')
      setValue('contactPosition', profile.contact_position || '')
      setValue('industry', profile.industry || '')
      setValue('employeeCount', profile.employee_count || '')
      setValue('website', profile.website || '')
      setValue('description', profile.description || '')
    }
  }

  const onSubmit = async (data: OrganizationProfileInput) => {
    if (!userId) return

    setIsLoading(true)

    try {
      // 프로필 업데이트 또는 생성
      const { error: profileError } = await supabase
        .from('organization_profiles')
        .upsert({
          user_id: userId,
          organization_name: data.organizationName,
          business_number: data.businessNumber || null,
          representative_name: data.representativeName,
          contact_position: data.contactPosition || null,
          industry: data.industry,
          employee_count: data.employeeCount,
          website: data.website || null,
          description: data.description || null,
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        throw profileError
      }

      // 성공 시 대시보드로 이동
      success('프로필이 성공적으로 저장되었습니다!')
      router.push('/dashboard')
    } catch (error: any) {
      const errorMessage = error.message || '프로필 저장 중 오류가 발생했습니다'
      setError('root', {
        message: errorMessage
      })
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">조직 프로필 완성하기</CardTitle>
            <CardDescription>
              조직 정보를 입력하여 프로필을 완성해주세요. 전문가들이 귀사를 더 잘 이해할 수 있습니다.
            </CardDescription>
            <div className="mt-4">
              <SimpleProgressBar 
                current={completedFields} 
                total={8} 
                className="mt-4"
              />
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {errors.root && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {errors.root.message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="organizationName">조직명 *</Label>
                    <div className="group relative">
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        정식 법인명 또는 기관명을 입력해주세요
                      </div>
                    </div>
                  </div>
                  <Input
                    id="organizationName"
                    {...register('organizationName')}
                    disabled={isLoading}
                    className="h-12"
                  />
                  {errors.organizationName && (
                    <p className="text-sm text-red-600">{errors.organizationName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="businessNumber">사업자등록번호</Label>
                    <div className="group relative">
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        10자리 사업자등록번호 (선택사항)
                      </div>
                    </div>
                  </div>
                  <Input
                    id="businessNumber"
                    placeholder="123-45-67890"
                    {...register('businessNumber')}
                    disabled={isLoading}
                    className="h-12"
                  />
                  {errors.businessNumber && (
                    <p className="text-sm text-red-600">{errors.businessNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="representativeName">대표자명 *</Label>
                  <Input
                    id="representativeName"
                    {...register('representativeName')}
                    disabled={isLoading}
                  />
                  {errors.representativeName && (
                    <p className="text-sm text-red-600">{errors.representativeName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPosition">담당자 직책</Label>
                  <Input
                    id="contactPosition"
                    placeholder="인사팀장"
                    {...register('contactPosition')}
                    disabled={isLoading}
                  />
                  {errors.contactPosition && (
                    <p className="text-sm text-red-600">{errors.contactPosition.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">업종 *</Label>
                  <select
                    id="industry"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    {...register('industry')}
                    disabled={isLoading}
                  >
                    <option value="">선택해주세요</option>
                    {industries.map(industry => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                  {errors.industry && (
                    <p className="text-sm text-red-600">{errors.industry.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeCount">직원 수 *</Label>
                  <select
                    id="employeeCount"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    {...register('employeeCount')}
                    disabled={isLoading}
                  >
                    <option value="">선택해주세요</option>
                    {employeeCounts.map(count => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                  {errors.employeeCount && (
                    <p className="text-sm text-red-600">{errors.employeeCount.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">웹사이트</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  {...register('website')}
                  disabled={isLoading}
                />
                {errors.website && (
                  <p className="text-sm text-red-600">{errors.website.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">조직 소개</Label>
                <textarea
                  id="description"
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  placeholder="조직에 대한 간단한 소개를 작성해주세요"
                  {...register('description')}
                  disabled={isLoading}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  disabled={isLoading}
                  className="flex-1"
                >
                  나중에 완성하기
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? '저장 중...' : '프로필 완성하기'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
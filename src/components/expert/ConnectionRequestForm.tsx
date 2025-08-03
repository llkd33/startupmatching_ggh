'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { generateConnectionRequestEmail } from '@/lib/email/connection-request-templates'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { X, Send, User, Building } from 'lucide-react'

const connectionRequestSchema = z.object({
  subject: z.string().min(5, '제목은 최소 5자 이상이어야 합니다'),
  message: z.string().min(20, '메시지는 최소 20자 이상이어야 합니다'),
  projectType: z.string().min(1, '프로젝트 유형을 선택해주세요'),
  expectedBudget: z.string().optional(),
  expectedDuration: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high'], {
    required_error: '긴급도를 선택해주세요'
  })
})

type ConnectionRequestInput = z.infer<typeof connectionRequestSchema>

interface ConnectionRequestFormProps {
  expertId: string
  expertName: string
  organizationId: string
  organizationName: string
  onClose: () => void
  onSuccess: () => void
}

export default function ConnectionRequestForm({
  expertId,
  expertName,
  organizationId,
  organizationName,
  onClose,
  onSuccess
}: ConnectionRequestFormProps) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch
  } = useForm<ConnectionRequestInput>({
    resolver: zodResolver(connectionRequestSchema),
    defaultValues: {
      subject: `${organizationName}에서 협업 제안드립니다`,
      message: '',
      projectType: '',
      expectedBudget: '',
      expectedDuration: '',
      urgency: 'medium'
    }
  })

  const onSubmit = async (data: ConnectionRequestInput) => {
    setSubmitError(null)

    try {
      // Create connection request
      const requestData = {
        expert_id: expertId,
        organization_id: organizationId,
        subject: data.subject,
        message: data.message,
        project_type: data.projectType,
        expected_budget: data.expectedBudget || null,
        expected_duration: data.expectedDuration || null,
        urgency: data.urgency,
        status: 'pending',
        created_at: new Date().toISOString()
      }

      const { data: newRequest, error: insertError } = await supabase
        .from('connection_requests')
        .insert([requestData])
        .select()
        .single()

      if (insertError) throw insertError

      // Get expert email for notification
      const { data: expertData, error: expertError } = await supabase
        .from('expert_profiles')
        .select(`
          users!inner(email)
        `)
        .eq('id', expertId)
        .single()

      if (expertError) throw expertError

      // Generate email content
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const token = 'secure-token' // In production, generate a secure token
      
      const emailContent = generateConnectionRequestEmail({
        expertName: expertName,
        organizationName: organizationName,
        subject: data.subject,
        message: data.message,
        projectType: data.projectType,
        expectedBudget: data.expectedBudget,
        expectedDuration: data.expectedDuration,
        urgency: data.urgency,
        requestId: newRequest.id,
        approveUrl: `${baseUrl}/api/connection-requests/${newRequest.id}/approve?token=${token}`,
        rejectUrl: `${baseUrl}/api/connection-requests/${newRequest.id}/reject?token=${token}`
      })

      // In a real implementation, send email via Supabase Edge Function or external service
      // For now, we'll just log the email data
      console.log('Email notification would be sent:', {
        to: expertData.users.email,
        ...emailContent
      })

      onSuccess()
    } catch (err: any) {
      setSubmitError(err.message || '연결 요청 전송 중 오류가 발생했습니다.')
    }
  }

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'low': return '여유있음'
      case 'medium': return '보통'
      case 'high': return '긴급'
      default: return urgency
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                전문가 연결 요청
              </CardTitle>
              <CardDescription className="mt-2">
                전문가와의 협업을 위한 연결을 요청합니다
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Request Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium mb-3">요청 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">전문가:</span>
                <span className="font-medium">{expertName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">요청 기관:</span>
                <span className="font-medium">{organizationName}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Subject */}
            <div>
              <Label htmlFor="subject">제목 *</Label>
              <Input
                id="subject"
                {...register('subject')}
                placeholder="협업 제안의 제목을 입력해주세요"
                className={errors.subject ? 'border-red-500' : ''}
              />
              {errors.subject && (
                <p className="text-sm text-red-600 mt-1">{errors.subject.message}</p>
              )}
            </div>

            {/* Project Type */}
            <div>
              <Label htmlFor="projectType">프로젝트 유형 *</Label>
              <select
                id="projectType"
                {...register('projectType')}
                className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                  errors.projectType ? 'border-red-500' : ''
                }`}
              >
                <option value="">프로젝트 유형을 선택해주세요</option>
                <option value="mentoring">멘토링/강의</option>
                <option value="consulting">컨설팅</option>
                <option value="development">개발 프로젝트</option>
                <option value="investment">투자 검토</option>
                <option value="partnership">사업 파트너십</option>
                <option value="other">기타</option>
              </select>
              {errors.projectType && (
                <p className="text-sm text-red-600 mt-1">{errors.projectType.message}</p>
              )}
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="message">상세 메시지 *</Label>
              <Textarea
                id="message"
                {...register('message')}
                rows={6}
                placeholder="협업 목적, 프로젝트 내용, 기대사항 등을 자세히 설명해주세요"
                className={errors.message ? 'border-red-500' : ''}
              />
              {errors.message && (
                <p className="text-sm text-red-600 mt-1">{errors.message.message}</p>
              )}
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expectedBudget">예상 예산</Label>
                <Input
                  id="expectedBudget"
                  {...register('expectedBudget')}
                  placeholder="예: 1,000만원 ~ 2,000만원"
                />
              </div>

              <div>
                <Label htmlFor="expectedDuration">예상 기간</Label>
                <Input
                  id="expectedDuration"
                  {...register('expectedDuration')}
                  placeholder="예: 3개월, 6주 등"
                />
              </div>
            </div>

            {/* Urgency */}
            <div>
              <Label htmlFor="urgency">긴급도 *</Label>
              <select
                id="urgency"
                {...register('urgency')}
                className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                  errors.urgency ? 'border-red-500' : ''
                }`}
              >
                <option value="low">여유있음 - 몇 주 내 시작</option>
                <option value="medium">보통 - 1-2주 내 시작</option>
                <option value="high">긴급 - 즉시 시작</option>
              </select>
              {errors.urgency && (
                <p className="text-sm text-red-600 mt-1">{errors.urgency.message}</p>
              )}
            </div>

            {/* Preview */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">요청 미리보기</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>제목:</strong> {watch('subject') || '제목 없음'}</p>
                <p><strong>프로젝트:</strong> {watch('projectType') || '미선택'}</p>
                <p><strong>긴급도:</strong> 
                  <span className={getUrgencyColor(watch('urgency'))}>
                    {' ' + getUrgencyText(watch('urgency'))}
                  </span>
                </p>
                {watch('expectedBudget') && (
                  <p><strong>예상 예산:</strong> {watch('expectedBudget')}</p>
                )}
                {watch('expectedDuration') && (
                  <p><strong>예상 기간:</strong> {watch('expectedDuration')}</p>
                )}
              </div>
            </div>

            {/* Error Display */}
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '전송 중...' : '연결 요청 보내기'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
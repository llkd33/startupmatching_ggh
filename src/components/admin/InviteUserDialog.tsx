'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlus, Loader2, CheckCircle } from 'lucide-react'
import { toast } from '@/components/ui/toast-custom'

interface InviteUserDialogProps {
  onSuccess?: () => void
}

export function InviteUserDialog({ onSuccess }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    name: '',
    role: 'expert' as 'expert' | 'organization',
    organization_name: '',
    position: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 전화번호 형식 검증
      const phoneRegex = /^01[0-9]-?[0-9]{4}-?[0-9]{4}$/
      if (!phoneRegex.test(formData.phone)) {
        setError('올바른 전화번호 형식으로 입력해주세요. (예: 010-1234-5678)')
        setLoading(false)
        return
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setError('올바른 이메일 형식으로 입력해주세요.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          phone: formData.phone,
          name: formData.name,
          role: formData.role,
          organization_name: formData.role === 'organization' ? formData.organization_name : undefined,
          position: formData.role === 'organization' ? formData.position : undefined
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '사용자 초대에 실패했습니다.')
      }

      // 성공 메시지 (경고 포함 가능)
      if (data.warning) {
        if (data.warning === 'test_account_limit') {
          toast.warning(
            `초대가 생성되었습니다.\n\n⚠️ Resend 테스트 계정 제한으로 이메일 발송에 실패했습니다.\n도메인 인증 후 모든 사용자에게 이메일을 보낼 수 있습니다.\n\n초대 링크를 복사하여 수동으로 전달해주세요:\n${data.inviteUrl}`,
            { duration: 10000 }
          )
        } else {
          toast.warning(
            `초대가 생성되었습니다.\n\n⚠️ 이메일 발송에 실패했습니다.\n초대 링크를 복사하여 수동으로 전달해주세요:\n${data.inviteUrl}`,
            { duration: 8000 }
          )
        }
      } else {
        toast.success('사용자 초대가 완료되었습니다. 이메일이 발송되었습니다.')
      }

      // 폼 초기화
      setFormData({
        email: '',
        phone: '',
        name: '',
        role: 'expert',
        organization_name: '',
        position: ''
      })

      setOpen(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error('Error inviting user:', err)
      setError(err.message || '사용자 초대 중 오류가 발생했습니다.')
      toast.error(err.message || '사용자 초대에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="min-h-[44px]">
          <UserPlus className="w-4 h-4 mr-2" />
          사용자 초대
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>사용자 초대</DialogTitle>
          <DialogDescription>
            사용자 정보를 입력하면 계정이 생성되고 초대 이메일이 발송됩니다.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <p className="text-xs text-blue-800">
              <strong>안내:</strong> 이메일이 ID가 되고, 전화번호가 초기 비밀번호가 됩니다.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              이름 <span className="text-red-600">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="홍길동"
              required
              className="min-h-[44px]"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              이메일 (ID) <span className="text-red-600">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              required
              className="min-h-[44px]"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              전화번호 (초기 비밀번호) <span className="text-red-600">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="010-1234-5678"
              required
              className="min-h-[44px]"
              disabled={loading}
              autoComplete="tel"
            />
            <p className="text-xs text-gray-500">
              전화번호가 초기 비밀번호로 사용됩니다. (하이픈 제외, 숫자만)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              역할 <span className="text-red-600">*</span>
            </Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'expert' | 'organization' })}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              required
            >
              <option value="expert">전문가</option>
              <option value="organization">기관</option>
            </select>
          </div>

          {formData.role === 'organization' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="organization_name">
                  기관명 <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="organization_name"
                  type="text"
                  value={formData.organization_name}
                  onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                  placeholder="기관명"
                  required={formData.role === 'organization'}
                  className="min-h-[44px]"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">
                  직책
                </Label>
                <Input
                  id="position"
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="직책 (선택사항)"
                  className="min-h-[44px]"
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 min-h-[44px]"
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 min-h-[44px]"
              disabled={loading}
              isLoading={loading}
            >
              {loading ? '초대 중...' : '초대하기'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


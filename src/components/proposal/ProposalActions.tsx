'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptProposalAndRejectOthers, rejectProposal } from '@/lib/proposal-management'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast-custom'
import { CheckCircle, XCircle } from 'lucide-react'

interface ProposalActionsProps {
  proposalId: string
  campaignId: string
  expertName: string
  onActionComplete?: () => void
}

export function ProposalActions({
  proposalId,
  campaignId,
  expertName,
  onActionComplete,
}: ProposalActionsProps) {
  const router = useRouter()
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [acceptMessage, setAcceptMessage] = useState('')
  const [rejectMessage, setRejectMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAccept = async () => {
    setIsProcessing(true)
    try {
      const result = await acceptProposalAndRejectOthers(
        proposalId,
        campaignId,
        acceptMessage || undefined
      )

      if (result.success) {
        toast.success(
          `${expertName}님을 선정했습니다. 선정/탈락 이메일이 발송되었습니다.`,
          { duration: 5000 }
        )
        setIsAcceptDialogOpen(false)
        setAcceptMessage('') // Clear message
        if (onActionComplete) {
          onActionComplete()
        } else {
          router.refresh()
        }
      } else {
        toast.error(result.error || '처리 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error accepting proposal:', error)
      toast.error('처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    setIsProcessing(true)
    try {
      const result = await rejectProposal(
        proposalId,
        rejectMessage || undefined
      )

      if (result.success) {
        toast.success(
          `제안서가 거절되었습니다. ${expertName}님께 이메일이 발송되었습니다.`,
          { duration: 5000 }
        )
        setIsRejectDialogOpen(false)
        setRejectMessage('') // Clear message
        if (onActionComplete) {
          onActionComplete()
        } else {
          router.refresh()
        }
      } else {
        toast.error(result.error || '처리 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error rejecting proposal:', error)
      toast.error('처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex gap-2">
      {/* Accept Dialog */}
      <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <DialogTrigger asChild>
          <Button className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            승인
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>전문가 선정 확인</DialogTitle>
            <DialogDescription>
              <strong>{expertName}</strong>님을 이 프로젝트의 전문가로 선정하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">⚠️ 중요 안내</h4>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>선정 시 다른 모든 제안서는 자동으로 거절됩니다</li>
                <li>선정된 전문가에게 축하 이메일이 발송됩니다</li>
                <li>거절된 전문가들에게 정중한 거절 이메일이 발송됩니다</li>
                <li>캠페인 상태가 '진행중'으로 변경됩니다</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accept-message">
                축하 메시지 (선택)
              </Label>
              <Textarea
                id="accept-message"
                value={acceptMessage}
                onChange={(e) => setAcceptMessage(e.target.value)}
                placeholder="선정된 전문가에게 전달할 메시지를 작성해주세요. (기본 메시지가 자동으로 발송됩니다)"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAcceptDialogOpen(false)}
              disabled={isProcessing}
            >
              취소
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? '처리 중...' : '선정 확정'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <XCircle className="h-4 w-4 mr-2" />
            거절
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>제안서 거절 확인</DialogTitle>
            <DialogDescription>
              <strong>{expertName}</strong>님의 제안서를 거절하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 정중한 거절 사유를 작성하시면 전문가에게 도움이 됩니다.
                향후 다른 프로젝트에서 더 나은 매칭을 위해 피드백을 제공해주세요.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reject-message">
                거절 사유 (선택)
              </Label>
              <Textarea
                id="reject-message"
                value={rejectMessage}
                onChange={(e) => setRejectMessage(e.target.value)}
                placeholder="예: 다른 전문가와 진행하기로 결정했습니다. 회원님의 훌륭한 제안에 감사드립니다."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={isProcessing}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing}
            >
              {isProcessing ? '처리 중...' : '거절'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

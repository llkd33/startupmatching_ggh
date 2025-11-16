/**
 * 프로포절 관리 시스템
 *
 * 기능:
 * 1. 프로포절 승인/거절 처리
 * 2. 선정/탈락 이메일 자동 발송
 */

import { supabase } from './supabase'
import { sendSelectionResultEmails } from './campaign-matching'

/**
 * 프로포절 승인 및 나머지 자동 거절
 */
export async function acceptProposalAndRejectOthers(
  proposalId: string,
  campaignId: string,
  responseMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. 해당 캠페인의 모든 pending 프로포절 가져오기
    const { data: allProposals, error: fetchError } = await supabase
      .from('proposals')
      .select('id, expert_id, status')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')

    if (fetchError) throw fetchError

    // 2. 선택된 프로포절 승인
    const { error: acceptError } = await supabase
      .from('proposals')
      .update({
        status: 'accepted',
        response_message: responseMessage || '축하합니다! 프로젝트에 선정되셨습니다.',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', proposalId)

    if (acceptError) throw acceptError

    // 3. 선택된 전문가 ID 찾기
    const selectedProposal = allProposals?.find((p) => p.id === proposalId)
    if (!selectedProposal) {
      throw new Error('Selected proposal not found')
    }

    // 4. 나머지 프로포절 거절
    const rejectedProposalIds = allProposals
      ?.filter((p) => p.id !== proposalId)
      .map((p) => p.id) || []

    if (rejectedProposalIds.length > 0) {
      const { error: rejectError } = await supabase
        .from('proposals')
        .update({
          status: 'rejected',
          response_message: responseMessage ||
            '신중한 검토 끝에 다른 전문가와 진행하기로 결정했습니다. 훌륭한 제안에 감사드립니다.',
          reviewed_at: new Date().toISOString(),
        })
        .in('id', rejectedProposalIds)

      if (rejectError) {
        console.error('Error rejecting other proposals:', rejectError)
        // 거절 실패는 로그만 남기고 계속 진행
      }
    }

    // 5. 캠페인 상태를 'in_progress'로 변경
    const { error: campaignError } = await supabase
      .from('campaigns')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    if (campaignError) {
      console.error('Error updating campaign status:', campaignError)
    }

    // 6. 선정/탈락 이메일 발송 (비동기, 백그라운드)
    // await를 사용하여 이메일 발송이 완료될 때까지 대기
    try {
      await sendSelectionResultEmails(
        campaignId,
        selectedProposal.expert_id,
        rejectedProposalIds
      )
      if (process.env.NODE_ENV === 'development') {
        console.log('Selection result emails sent successfully')
      }
    } catch (error) {
      console.error('Error sending selection emails:', error)
      // 이메일 발송 실패해도 제안서 승인은 성공으로 처리
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in acceptProposalAndRejectOthers:', error)
    return {
      success: false,
      error: error.message || 'Failed to process proposal',
    }
  }
}

/**
 * 개별 프로포절 거절
 */
export async function rejectProposal(
  proposalId: string,
  responseMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 프로포절 정보 가져오기
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select(`
        *,
        expert_profiles(
          name,
          users(email)
        ),
        campaigns(
          title,
          organization_profiles(organization_name)
        )
      `)
      .eq('id', proposalId)
      .single()

    if (fetchError) throw fetchError
    if (!proposal) throw new Error('Proposal not found')

    // 프로포절 거절 처리
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        status: 'rejected',
        response_message: responseMessage ||
          '신중한 검토 끝에 다른 전문가와 진행하기로 결정했습니다. 훌륭한 제안에 감사드립니다.',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', proposalId)

    if (updateError) throw updateError

    // 거절 이메일 발송 (비동기)
    const expert = proposal.expert_profiles as any
    const campaign = proposal.campaigns as any

    // Send rejection email via API route
    fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expert.users.email,
        subject: `"${campaign.title}" 프로젝트 결과 안내`,
        html: `
          <h2>프로젝트 결과 안내</h2>
          <p>안녕하세요, ${expert.name}님</p>
          <p>"${campaign.title}" 프로젝트에 제안서를 제출해 주셔서 감사합니다.</p>
          <p>신중한 검토 끝에, 이번에는 다른 전문가와 진행하기로 결정하였습니다.</p>
          ${responseMessage ? `<p><strong>기관 메시지:</strong> ${responseMessage}</p>` : ''}
          <p>앞으로 더 적합한 프로젝트에서 뵙기를 기대합니다.</p>
        `,
      }),
    }).catch((error) => {
      console.error('Failed to send rejection email:', error)
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error in rejectProposal:', error)
    return {
      success: false,
      error: error.message || 'Failed to reject proposal',
    }
  }
}

/**
 * 여러 프로포절 일괄 거절
 */
export async function bulkRejectProposals(
  proposalIds: string[],
  responseMessage?: string
): Promise<{ success: boolean; rejectedCount: number; error?: string }> {
  try {
    const { error } = await supabase
      .from('proposals')
      .update({
        status: 'rejected',
        response_message: responseMessage ||
          '신중한 검토 끝에 다른 전문가와 진행하기로 결정했습니다.',
        reviewed_at: new Date().toISOString(),
      })
      .in('id', proposalIds)

    if (error) throw error

    return {
      success: true,
      rejectedCount: proposalIds.length,
    }
  } catch (error: any) {
    console.error('Error in bulkRejectProposals:', error)
    return {
      success: false,
      rejectedCount: 0,
      error: error.message || 'Failed to reject proposals',
    }
  }
}

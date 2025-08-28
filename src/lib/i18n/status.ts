export function campaignStatusLabel(status?: string) {
  switch (status) {
    case 'draft':
      return '초안'
    case 'active':
      return '활성'
    case 'in_progress':
      return '진행중'
    case 'completed':
      return '완료'
    case 'cancelled':
      return '취소'
    default:
      return status || ''
  }
}

export function proposalStatusLabel(status?: string) {
  switch (status) {
    case 'pending':
      return '대기중'
    case 'accepted':
      return '승인됨'
    case 'rejected':
      return '거절됨'
    case 'withdrawn':
      return '철회됨'
    default:
      return status || ''
  }
}

export function severityLabel(severity?: string) {
  switch (severity) {
    case 'info':
      return '정보'
    case 'warning':
      return '경고'
    case 'error':
      return '오류'
    case 'critical':
      return '심각'
    default:
      return severity || ''
  }
}


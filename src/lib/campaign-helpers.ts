/**
 * Campaign utility functions for formatting and display
 */

/**
 * Get localized status text
 */
export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    active: '진행중',
    draft: '임시저장',
    completed: '완료',
    cancelled: '취소됨'
  }
  return statusMap[status] || status
}

/**
 * Get status badge color classes
 */
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Get localized campaign type text
 */
export function getTypeText(type: string): string {
  const typeMap: Record<string, string> = {
    mentoring: '멘토링/강의',
    investment: '투자 매칭',
    service: '서비스 아웃소싱'
  }
  return typeMap[type] || type
}

/**
 * Format budget range for display
 */
export function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return '예산 미정'
  if (min && max) return `₩${min.toLocaleString()} - ₩${max.toLocaleString()}`
  if (min) return `₩${min.toLocaleString()}+`
  if (max) return `~₩${max.toLocaleString()}`
  return '예산 미정'
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * 데이터 내보내기 유틸리티
 * CSV 및 Excel 형식으로 데이터를 내보내는 기능 제공
 */

import * as XLSX from 'xlsx'

export type ExportFormat = 'csv' | 'xlsx'

export interface ExportColumn<T> {
  key: keyof T | string
  header: string
  formatter?: (value: any, row: T) => string | number
}

/**
 * 데이터를 CSV 문자열로 변환
 */
export function toCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[]
): string {
  // BOM for UTF-8
  const BOM = '\ufeff'

  // 헤더 행
  const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`)
  const headerRow = headers.join(',')

  // 데이터 행
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = getNestedValue(row, col.key as string)
        const formattedValue = col.formatter ? col.formatter(value, row) : value

        // 값이 null/undefined인 경우 빈 문자열
        if (formattedValue === null || formattedValue === undefined) {
          return '""'
        }

        // 숫자는 그대로
        if (typeof formattedValue === 'number') {
          return formattedValue
        }

        // 문자열은 쌍따옴표로 감싸고 내부 쌍따옴표는 이스케이프
        const stringValue = String(formattedValue)
        return `"${stringValue.replace(/"/g, '""')}"`
      })
      .join(',')
  })

  return BOM + [headerRow, ...rows].join('\n')
}

/**
 * 데이터를 Excel 워크북으로 변환
 */
export function toExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  sheetName: string = 'Sheet1'
): XLSX.WorkBook {
  // 헤더 배열
  const headers = columns.map((col) => col.header)

  // 데이터 배열
  const rows = data.map((row) => {
    return columns.map((col) => {
      const value = getNestedValue(row, col.key as string)
      const formattedValue = col.formatter ? col.formatter(value, row) : value

      if (formattedValue === null || formattedValue === undefined) {
        return ''
      }

      return formattedValue
    })
  })

  // 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // 열 너비 자동 조절
  const colWidths = headers.map((header, i) => {
    const maxLength = Math.max(
      header.length,
      ...rows.map((row) => String(row[i] || '').length)
    )
    return { wch: Math.min(maxLength + 2, 50) }
  })
  worksheet['!cols'] = colWidths

  // 워크북 생성
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  return workbook
}

/**
 * 파일 다운로드 트리거
 */
export function downloadFile(
  content: string | ArrayBuffer,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * CSV 파일 다운로드
 */
export function downloadCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  const csv = toCSV(data, columns)
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8')
}

/**
 * Excel 파일 다운로드
 */
export function downloadExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName: string = 'Sheet1'
): void {
  const workbook = toExcel(data, columns, sheetName)
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  downloadFile(
    excelBuffer,
    `${filename}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
}

/**
 * 중첩된 객체에서 값 가져오기
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj)
}

/**
 * 날짜 포맷터
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * 날짜/시간 포맷터
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 금액 포맷터
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(value)
}

/**
 * 상태 라벨 변환
 */
export const statusLabels: Record<string, string> = {
  // 캠페인 상태
  draft: '초안',
  open: '모집중',
  closed: '마감',
  completed: '완료',
  cancelled: '취소',

  // 제안서 상태
  pending: '대기중',
  reviewing: '검토중',
  accepted: '수락됨',
  rejected: '거절됨',
  withdrawn: '철회됨',

  // 사용자 역할
  expert: '전문가',
  organization: '기관',
  admin: '관리자',
}

/**
 * 상태 포맷터
 */
export function formatStatus(value: string | null | undefined): string {
  if (!value) return ''
  return statusLabels[value] || value
}

// 미리 정의된 내보내기 컬럼 설정
export const exportColumns = {
  users: [
    { key: 'id', header: 'ID' },
    { key: 'email', header: '이메일' },
    { key: 'role', header: '역할', formatter: formatStatus },
    { key: 'is_admin', header: '관리자 여부', formatter: (v: boolean) => v ? '예' : '아니오' },
    { key: 'created_at', header: '가입일', formatter: formatDate },
  ],

  campaigns: [
    { key: 'id', header: 'ID' },
    { key: 'title', header: '제목' },
    { key: 'status', header: '상태', formatter: formatStatus },
    { key: 'budget', header: '예산', formatter: formatCurrency },
    { key: 'deadline', header: '마감일', formatter: formatDate },
    { key: 'organization.email', header: '기관 이메일' },
    { key: 'created_at', header: '생성일', formatter: formatDate },
  ],

  proposals: [
    { key: 'id', header: 'ID' },
    { key: 'campaign.title', header: '캠페인' },
    { key: 'expert.email', header: '전문가 이메일' },
    { key: 'status', header: '상태', formatter: formatStatus },
    { key: 'proposed_budget', header: '제안 금액', formatter: formatCurrency },
    { key: 'created_at', header: '제출일', formatter: formatDate },
  ],

  expertProfiles: [
    { key: 'id', header: 'ID' },
    { key: 'user.email', header: '이메일' },
    { key: 'name', header: '이름' },
    { key: 'expertise_areas', header: '전문 분야', formatter: (v: string[]) => v?.join(', ') || '' },
    { key: 'years_of_experience', header: '경력(년)' },
    { key: 'hourly_rate', header: '시간당 요금', formatter: formatCurrency },
    { key: 'created_at', header: '등록일', formatter: formatDate },
  ],

  organizationProfiles: [
    { key: 'id', header: 'ID' },
    { key: 'user.email', header: '이메일' },
    { key: 'organization_name', header: '기관명' },
    { key: 'organization_type', header: '기관 유형' },
    { key: 'contact_person', header: '담당자' },
    { key: 'contact_email', header: '연락처 이메일' },
    { key: 'created_at', header: '등록일', formatter: formatDate },
  ],

  tasks: [
    { key: 'id', header: 'ID' },
    { key: 'title', header: '제목' },
    { key: 'status', header: '상태', formatter: formatStatus },
    { key: 'priority', header: '우선순위' },
    { key: 'due_date', header: '마감일', formatter: formatDate },
    { key: 'assignee.email', header: '담당자' },
    { key: 'created_at', header: '생성일', formatter: formatDate },
  ],

  messages: [
    { key: 'id', header: 'ID' },
    { key: 'sender.email', header: '발신자' },
    { key: 'receiver.email', header: '수신자' },
    { key: 'content', header: '내용' },
    { key: 'is_read', header: '읽음', formatter: (v: boolean) => v ? '예' : '아니오' },
    { key: 'created_at', header: '전송일시', formatter: formatDateTime },
  ],

  bookmarks: [
    { key: 'id', header: 'ID' },
    { key: 'user.email', header: '사용자' },
    { key: 'target_type', header: '대상 유형' },
    { key: 'target_id', header: '대상 ID' },
    { key: 'created_at', header: '추가일', formatter: formatDate },
  ],
}

export type ExportType = keyof typeof exportColumns

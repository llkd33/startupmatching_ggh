import { z } from 'zod'

export const campaignSchema = z.object({
  title: z.string().min(5, '제목은 최소 5자 이상이어야 합니다'),
  description: z.string().min(20, '설명은 최소 20자 이상이어야 합니다'),
  type: z.enum(['mentoring', 'investment', 'service'], {
    required_error: '캠페인 유형을 선택해주세요'
  }),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  keywords: z.array(z.string()).min(1, '최소 1개 이상의 키워드를 입력해주세요'),
  budgetMin: z.number().min(0, '최소 예산은 0 이상이어야 합니다').optional(),
  budgetMax: z.number().min(0, '최대 예산은 0 이상이어야 합니다').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  requiredExperts: z.number().min(1, '필요한 전문가 수는 최소 1명입니다'),
})
.refine(data => {
  if (data.budgetMin && data.budgetMax) {
    return data.budgetMax >= data.budgetMin
  }
  return true
}, {
  message: '최대 예산은 최소 예산보다 크거나 같아야 합니다',
  path: ['budgetMax']
})
.refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate)
  }
  return true
}, {
  message: '종료일은 시작일보다 늦어야 합니다',
  path: ['endDate']
})

export type CampaignInput = z.infer<typeof campaignSchema>

export const CAMPAIGN_TYPES = [
  { value: 'mentoring', label: '멘토링/강의' },
  { value: 'investment', label: '투자 매칭' },
  { value: 'service', label: '서비스 아웃소싱' }
] as const

export const CAMPAIGN_CATEGORIES = {
  mentoring: [
    'IT/개발',
    '마케팅',
    '디자인',
    '경영/전략',
    '영업',
    '창업',
    '기타'
  ],
  investment: [
    '시드 투자',
    '시리즈 A',
    '시리즈 B+',
    '브릿지 투자',
    '성장 투자',
    '기타'
  ],
  service: [
    '웹/앱 개발',
    '마케팅',
    '디자인',
    '컨설팅',
    '번역',
    '영상 제작',
    '기타'
  ]
} as const
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GraduationCap, Code2, TrendingUp } from 'lucide-react'

interface CampaignTemplate {
  id: string
  name: string
  icon: React.ReactNode
  type: 'mentoring' | 'investment' | 'service'
  title: string
  description: string
  category: string
  keywords: string[]
}

const templates: CampaignTemplate[] = [
  {
    id: 'mentoring',
    name: '스타트업 멘토링',
    icon: <GraduationCap className="w-6 h-6" />,
    type: 'mentoring',
    title: '스타트업 성장 멘토링 요청',
    description: '초기 스타트업의 성장을 위한 멘토링을 받고 싶습니다.\n\n프로젝트 목적:\n- 비즈니스 모델 검증 및 개선\n- 시장 진입 전략 수립\n- 팀 구성 및 조직 운영 조언\n\n요구사항:\n- 스타트업 창업 및 성장 경험 5년 이상\n- 주 1회 2시간 멘토링 세션\n\n예상 기간: 3개월',
    category: '경영/전략',
    keywords: ['스타트업', '멘토링', '비즈니스 모델']
  },
  {
    id: 'investment',
    name: '투자 유치 지원',
    icon: <TrendingUp className="w-6 h-6" />,
    type: 'investment',
    title: '투자 유치를 위한 전문가 매칭',
    description: '투자 유치를 위한 전문가의 도움이 필요합니다.\n\n프로젝트 목적:\n- 투자자 네트워크 연결\n- 투자 제안서 작성 지원\n- 투자 유치 전략 수립\n\n요구사항:\n- VC/엔젤 투자자 네트워크 보유\n- 투자 유치 경험 3년 이상\n\n예상 예산: 협의',
    category: '시드 투자',
    keywords: ['투자', 'VC', '엔젤투자']
  },
  {
    id: 'consulting',
    name: '비즈니스 컨설팅',
    icon: <Code2 className="w-6 h-6" />,
    type: 'service',
    title: '스타트업 비즈니스 전략 컨설팅',
    description: '스타트업의 성장을 위한 비즈니스 전략 컨설팅을 받고 싶습니다.\n\n프로젝트 목적:\n- 시장 분석 및 경쟁 전략 수립\n- 비즈니스 모델 최적화\n- 성장 전략 수립\n\n요구사항:\n- 스타트업 컨설팅 경력 5년 이상\n- 월 2회 컨설팅 세션\n\n예상 기간: 6개월',
    category: '컨설팅',
    keywords: ['비즈니스', '전략', '컨설팅']
  }
]

interface CampaignTemplateSelectorProps {
  onSelect: (template: CampaignTemplate) => void
}

export default function CampaignTemplateSelector({ onSelect }: CampaignTemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">템플릿 선택 (선택사항)</h3>
        <p className="text-sm text-gray-600">
          템플릿을 선택하면 자동으로 필드가 채워집니다. 원하시면 직접 작성도 가능합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
            onClick={() => onSelect(template)}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  {template.icon}
                </div>
                <h4 className="font-semibold">{template.name}</h4>
                <p className="text-xs text-gray-500">{template.description.split('\n')[0]}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full min-h-[44px]"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(template)
                  }}
                >
                  이 템플릿 사용
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSelect({} as CampaignTemplate)}
          className="min-h-[44px]"
        >
          템플릿 없이 직접 작성하기
        </Button>
      </div>
    </div>
  )
}

export type { CampaignTemplate }


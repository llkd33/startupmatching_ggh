'use client'

interface RegionSelectorProps {
  selectedRegions: string[]
  onChange: (regions: string[]) => void
}

const REGIONS = [
  { value: '전국', label: '전국' },
  { value: '서울', label: '서울' },
  { value: '경기', label: '경기' },
  { value: '인천', label: '인천' },
  { value: '부산', label: '부산' },
  { value: '대구', label: '대구' },
  { value: '광주', label: '광주' },
  { value: '대전', label: '대전' },
  { value: '울산', label: '울산' },
  { value: '세종', label: '세종' },
  { value: '강원', label: '강원' },
  { value: '충북', label: '충북' },
  { value: '충남', label: '충남' },
  { value: '전북', label: '전북' },
  { value: '전남', label: '전남' },
  { value: '경북', label: '경북' },
  { value: '경남', label: '경남' },
  { value: '제주', label: '제주' },
]

export default function RegionSelector({ selectedRegions, onChange }: RegionSelectorProps) {
  const toggleRegion = (region: string) => {
    if (region === '전국') {
      // If selecting 전국, clear all other selections
      onChange(['전국'])
    } else {
      // Remove 전국 if it was selected
      const filtered = selectedRegions.filter(r => r !== '전국')
      
      if (filtered.includes(region)) {
        onChange(filtered.filter(r => r !== region))
      } else {
        onChange([...filtered, region])
      }
    }
  }

  const isSelected = (region: string) => {
    return selectedRegions.includes(region)
  }

  const isDisabled = (region: string) => {
    return region !== '전국' && selectedRegions.includes('전국')
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {REGIONS.map((region) => (
          <label
            key={region.value}
            className={`
              relative flex cursor-pointer rounded-lg border px-3 py-2
              ${isSelected(region.value)
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 bg-white'
              }
              ${isDisabled(region.value)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-50'
              }
            `}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={isSelected(region.value)}
              onChange={() => toggleRegion(region.value)}
              disabled={isDisabled(region.value)}
            />
            <div className="flex items-center justify-center w-full">
              <div className="text-sm">
                <p
                  className={`font-medium ${
                    isSelected(region.value) ? 'text-indigo-900' : 'text-gray-900'
                  }`}
                >
                  {region.label}
                </p>
              </div>
            </div>
          </label>
        ))}
      </div>

      {selectedRegions.length === 0 && (
        <p className="mt-3 text-sm text-red-600">
          최소 1개 이상의 지역을 선택해주세요.
        </p>
      )}

      {selectedRegions.includes('전국') && (
        <p className="mt-3 text-sm text-gray-500">
          전국을 선택하셨습니다. 모든 지역에서 서비스 제공이 가능합니다.
        </p>
      )}
    </div>
  )
}
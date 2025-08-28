import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  description?: string
  completed?: boolean
}

interface ProgressStepsProps {
  steps: Step[]
  currentStep: number
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressSteps({
  steps,
  currentStep,
  orientation = 'horizontal',
  size = 'md'
}: ProgressStepsProps) {
  const sizeClasses = {
    sm: {
      circle: 'w-8 h-8',
      text: 'text-xs',
      title: 'text-sm',
      description: 'text-xs'
    },
    md: {
      circle: 'w-10 h-10',
      text: 'text-sm',
      title: 'text-base',
      description: 'text-sm'
    },
    lg: {
      circle: 'w-12 h-12',
      text: 'text-base',
      title: 'text-lg',
      description: 'text-base'
    }
  }

  const sizes = sizeClasses[size]

  return (
    <div className={cn(
      'flex',
      orientation === 'vertical' ? 'flex-col space-y-4' : 'flex-row items-center justify-between'
    )}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isUpcoming = index > currentStep

        return (
          <div
            key={step.id}
            className={cn(
              'flex items-center',
              orientation === 'vertical' ? 'flex-row' : 'flex-col',
              index < steps.length - 1 && orientation === 'horizontal' && 'flex-1'
            )}
          >
            {/* Step indicator */}
            <div className={cn(
              'flex items-center',
              orientation === 'vertical' ? 'flex-row' : 'flex-col'
            )}>
              <div className="relative">
                <div
                  className={cn(
                    sizes.circle,
                    'rounded-full flex items-center justify-center font-semibold transition-colors',
                    isCompleted && 'bg-green-600 text-white',
                    isCurrent && 'bg-blue-600 text-white ring-4 ring-blue-100',
                    isUpcoming && 'bg-gray-200 text-gray-500'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className={sizes.text}>{index + 1}</span>
                  )}
                </div>
              </div>

              {/* Step content */}
              <div className={cn(
                orientation === 'vertical' ? 'ml-4 flex-1' : 'mt-2 text-center'
              )}>
                <p className={cn(
                  sizes.title,
                  'font-medium',
                  isCompleted && 'text-green-600',
                  isCurrent && 'text-blue-600',
                  isUpcoming && 'text-gray-500'
                )}>
                  {step.title}
                </p>
                {step.description && (
                  <p className={cn(
                    sizes.description,
                    'text-gray-500 mt-1',
                    isCurrent && 'text-gray-700'
                  )}>
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className={cn(
                orientation === 'horizontal' 
                  ? 'flex-1 mx-4 h-0.5' 
                  : 'ml-5 my-2 w-0.5 h-8',
                isCompleted ? 'bg-green-600' : 'bg-gray-200'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function SimpleProgressBar({ 
  current, 
  total,
  showPercentage = true,
  className 
}: { 
  current: number
  total: number
  showPercentage?: boolean
  className?: string 
}) {
  const percentage = Math.round((current / total) * 100)

  return (
    <div className={cn("w-full", className)}>
      {showPercentage && (
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">진행률</span>
          <span className="text-sm font-medium text-gray-900">{percentage}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {current} / {total} 단계 완료
      </p>
    </div>
  )
}
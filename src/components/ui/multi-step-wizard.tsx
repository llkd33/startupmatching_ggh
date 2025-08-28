'use client'

import { useState, ReactNode, useEffect } from 'react'
import { Button } from './button'
import { ProgressSteps } from './progress-steps'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'

interface WizardStep {
  id: string
  title: string
  description?: string
  component: ReactNode
  validation?: () => boolean | Promise<boolean>
  onStepComplete?: () => void | Promise<void>
}

interface MultiStepWizardProps {
  steps: WizardStep[]
  onComplete: () => void | Promise<void>
  onSaveProgress?: (currentStep: number, data?: any) => void | Promise<void>
  initialStep?: number
  showProgressBar?: boolean
  allowNavigation?: boolean
  className?: string
}

export function MultiStepWizard({
  steps,
  onComplete,
  onSaveProgress,
  initialStep = 0,
  showProgressBar = true,
  allowNavigation = true,
  className
}: MultiStepWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<number, string>>({})

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1
  const currentStepData = steps[currentStep]

  // Auto-save progress when step changes
  useEffect(() => {
    if (onSaveProgress) {
      onSaveProgress(currentStep)
    }
  }, [currentStep])

  const handleNext = async () => {
    setIsLoading(true)
    setErrors({})

    try {
      // Run validation if provided
      if (currentStepData.validation) {
        const isValid = await currentStepData.validation()
        if (!isValid) {
          setErrors({ [currentStep]: '이 단계를 완료하려면 필수 정보를 입력해주세요.' })
          setIsLoading(false)
          return
        }
      }

      // Mark step as completed
      setCompletedSteps(prev => new Set([...prev, currentStep]))

      // Run step completion handler if provided
      if (currentStepData.onStepComplete) {
        await currentStepData.onStepComplete()
      }

      // Save progress
      if (onSaveProgress) {
        await onSaveProgress(currentStep)
      }

      if (isLastStep) {
        await onComplete()
      } else {
        setCurrentStep(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error proceeding to next step:', error)
      setErrors({ [currentStep]: '다음 단계로 진행 중 오류가 발생했습니다.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
      setErrors({})
    }
  }

  const handleStepClick = (stepIndex: number) => {
    if (!allowNavigation) return
    
    // Only allow navigation to completed steps or the next step
    if (stepIndex <= currentStep || completedSteps.has(stepIndex - 1)) {
      setCurrentStep(stepIndex)
      setErrors({})
    }
  }

  const formatStepsForProgress = steps.map((step, index) => ({
    id: step.id,
    title: step.title,
    description: step.description,
    completed: completedSteps.has(index)
  }))

  return (
    <div className={cn('w-full', className)}>
      {showProgressBar && (
        <div className="mb-8">
          <ProgressSteps
            steps={formatStepsForProgress}
            currentStep={currentStep}
            orientation="horizontal"
            size="md"
          />
        </div>
      )}

      {/* Step Content */}
      <div className="min-h-[400px]">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentStepData.title}
          </h2>
          {currentStepData.description && (
            <p className="mt-2 text-sm text-gray-600">
              {currentStepData.description}
            </p>
          )}
        </div>

        {errors[currentStep] && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors[currentStep]}</p>
          </div>
        )}

        <div className="step-content">
          {currentStepData.component}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstStep || isLoading}
          className="min-w-[120px]"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          이전 단계
        </Button>

        <div className="flex gap-3">
          {onSaveProgress && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onSaveProgress(currentStep)}
              isLoading={isLoading}
              loadingText="저장 중..."
            >
              <Save className="w-4 h-4 mr-2" />
              진행상황 저장
            </Button>
          )}

          <Button
            type="button"
            onClick={handleNext}
            isLoading={isLoading}
            loadingText={isLastStep ? "완료 중..." : "처리 중..."}
            className="min-w-[120px]"
          >
            {isLastStep ? (
              <>
                완료
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                다음 단계
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile-optimized navigation dots */}
      <div className="flex justify-center mt-6 space-x-2 md:hidden">
        {steps.map((_, index) => (
          <button
            key={index}
            onClick={() => handleStepClick(index)}
            disabled={!allowNavigation || (index > currentStep && !completedSteps.has(index - 1))}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              index === currentStep 
                ? 'bg-blue-600 w-8' 
                : completedSteps.has(index)
                  ? 'bg-green-600'
                  : 'bg-gray-300'
            )}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

// Helper component for wizard step content
export function WizardStepContent({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {children}
    </div>
  )
}
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';

interface ProgressIndicatorProps {
  progress: number;
  message?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'striped';
  className?: string;
}

export function ProgressIndicator({
  progress,
  message,
  showPercentage = true,
  size = 'md',
  variant = 'default',
  className,
}: ProgressIndicatorProps) {
  const heights = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const getBackgroundClass = () => {
    switch (variant) {
      case 'gradient':
        return 'bg-gradient-to-r from-blue-500 to-purple-600';
      case 'striped':
        return 'bg-blue-600 bg-stripes animate-stripes';
      default:
        return 'bg-blue-600';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {(message || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {message && <span className="text-sm text-gray-600">{message}</span>}
          {showPercentage && (
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            getBackgroundClass()
          )}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  className?: string;
}

export function CircularProgress({
  progress,
  size = 60,
  strokeWidth = 4,
  showPercentage = true,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-blue-600 transition-all duration-300 ease-out"
        />
      </svg>
      {showPercentage && (
        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StepProgress({
  currentStep,
  totalSteps,
  stepLabels,
  size = 'md',
  className,
}: StepProgressProps) {
  const circleSize = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const lineHeight = {
    sm: 'h-0.5',
    md: 'h-1',
    lg: 'h-1.5',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber <= currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    circleSize[size],
                    'rounded-full flex items-center justify-center font-medium transition-all duration-300',
                    {
                      'bg-blue-600 text-white': isCompleted,
                      'bg-gray-200 text-gray-500': !isCompleted,
                      'ring-2 ring-blue-600 ring-offset-2': isCurrent,
                    }
                  )}
                >
                  {isCompleted && stepNumber < currentStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    stepNumber
                  )}
                </div>
                {stepLabels && stepLabels[index] && (
                  <span
                    className={cn(
                      'text-xs mt-2 text-center',
                      isCompleted ? 'text-gray-700' : 'text-gray-400'
                    )}
                  >
                    {stepLabels[index]}
                  </span>
                )}
              </div>
              {index < totalSteps - 1 && (
                <div className="flex-1 mx-2">
                  <div className={cn('bg-gray-200', lineHeight[size])}>
                    <div
                      className={cn(
                        'h-full bg-blue-600 transition-all duration-300',
                        lineHeight[size]
                      )}
                      style={{
                        width: stepNumber <= currentStep ? '100%' : '0%',
                      }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
  blur?: boolean;
  fullScreen?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function LoadingOverlay({
  isLoading,
  message,
  progress,
  blur = true,
  fullScreen = false,
  className,
  children,
}: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>;

  const overlayContent = (
    <div className="flex flex-col items-center justify-center gap-4">
      {progress !== undefined ? (
        <CircularProgress progress={progress} size={80} />
      ) : (
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      )}
      {message && (
        <p className="text-sm font-medium text-gray-700 text-center max-w-xs">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {overlayContent}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {children}
      <div
        className={cn(
          'absolute inset-0 z-10 flex items-center justify-center bg-white/80',
          blur && 'backdrop-blur-sm'
        )}
      >
        {overlayContent}
      </div>
    </div>
  );
}

interface UploadProgressProps {
  progress: number;
  fileName?: string;
  fileSize?: number;
  onCancel?: () => void;
  className?: string;
}

export function UploadProgress({
  progress,
  fileName,
  fileSize,
  onCancel,
  className,
}: UploadProgressProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={cn('bg-white rounded-lg border p-4', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {fileName && (
            <p className="font-medium text-gray-900 truncate pr-2">{fileName}</p>
          )}
          {fileSize && (
            <p className="text-sm text-gray-500">{formatFileSize(fileSize)}</p>
          )}
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cancel upload"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <ProgressIndicator
        progress={progress}
        size="sm"
        variant="gradient"
        showPercentage={true}
      />
      <div className="mt-2 flex items-center text-sm">
        {progress < 100 ? (
          <>
            <Clock className="w-4 h-4 mr-1 text-blue-600" />
            <span className="text-gray-600">Uploading...</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
            <span className="text-green-600">Upload complete</span>
          </>
        )}
      </div>
    </div>
  );
}

// Add CSS for striped progress bar
const stripedStyles = `
  @keyframes stripes {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 40px 0;
    }
  }

  .bg-stripes {
    background-image: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.15) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.15) 75%,
      transparent 75%,
      transparent
    );
    background-size: 40px 40px;
  }

  .animate-stripes {
    animation: stripes 1s linear infinite;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'progress-indicator-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = stripedStyles;
    document.head.appendChild(style);
  }
}
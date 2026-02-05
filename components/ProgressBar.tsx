'use client';

import type { Step, StepNumber } from '@/types/reservation';

interface ProgressBarProps {
  steps: Step[];
  onStepClick: (stepNumber: StepNumber) => void;
}

/**
 * ProgressBar Component
 * Displays reservation progress with clickable steps and checkmark icons for completed steps
 */
export default function ProgressBar({ steps, onStepClick }: ProgressBarProps) {
  const CheckmarkIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-white"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );

  const getStepStyles = (step: Step) => {
    if (step.completed) {
      return 'bg-[#03adf0] text-white cursor-pointer hover:bg-[#0288c7] transition-colors';
    }
    if (step.active) {
      return 'bg-[#03adf0] text-white cursor-pointer hover:bg-[#0288c7] transition-colors';
    }
    return 'bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300 transition-colors';
  };

  const getLabelStyles = (step: Step) => {
    if (step.completed || step.active) {
      return 'text-[#03adf0] font-semibold';
    }
    return 'text-gray-500';
  };

  return (
    <div className="w-full mb-4 sm:mb-6">
      {/* Desktop view */}
      <div className="hidden sm:flex items-center relative pb-8">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1 relative">
            <div className="flex flex-col items-center flex-1 relative z-10">
              <button
                onClick={() => onStepClick(step.number)}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg mb-2 ${getStepStyles(step)}`}
                aria-label={`Przejdź do kroku ${step.number}: ${step.label}`}
              >
                {step.completed ? <CheckmarkIcon /> : step.number}
              </button>
              <span className={`text-xs text-center ${getLabelStyles(step)}`}>
                {step.label}
              </span>
            </div>
            {/* Line between circles */}
            {index < steps.length - 1 && (
              <div
                className="absolute top-6 left-1/2 h-0.5 z-0"
                style={{
                  marginLeft: '6px',
                  width: 'calc(100% - 6px)',
                }}
              >
                <div
                  className={`h-full ${
                    step.completed || step.active ? 'bg-[#03adf0]' : 'bg-gray-200'
                  }`}
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile view - compact horizontal with better scroll */}
      <div className="sm:hidden">
        {/* Step indicator bar */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">
            Krok {steps.find(s => s.active)?.number || 1} z {steps.length}
          </span>
          <span className="text-xs font-semibold text-[#03adf0]">
            {steps.find(s => s.active)?.label || steps[0].label}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
          <div 
            className="h-full bg-[#03adf0] rounded-full transition-all duration-300"
            style={{ 
              width: `${((steps.filter(s => s.completed).length + (steps.find(s => s.active) ? 0.5 : 0)) / steps.length) * 100}%` 
            }}
          />
        </div>
        {/* Step circles - scrollable */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-3 px-3 pb-2">
          {steps.map((step, index) => (
            <div key={step.number} className="flex flex-col items-center flex-shrink-0 min-w-[56px] relative">
              <button
                onClick={() => onStepClick(step.number)}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm mb-1 relative z-10 ${getStepStyles(step)}`}
                aria-label={`Przejdź do kroku ${step.number}: ${step.label}`}
              >
                {step.completed ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  step.number
                )}
              </button>
              <span className={`text-[9px] text-center leading-tight max-w-[56px] ${getLabelStyles(step)}`}>
                {step.label}
              </span>
              {/* Line between circles */}
              {index < steps.length - 1 && (
                <div
                  className="absolute top-4 left-1/2 h-0.5 z-0"
                  style={{
                    marginLeft: '4px',
                    width: 'calc(56px - 4px)',
                  }}
                >
                  <div
                    className={`h-full ${
                      step.completed || step.active ? 'bg-[#03adf0]' : 'bg-gray-200'
                    }`}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
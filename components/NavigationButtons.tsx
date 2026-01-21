'use client';

import type { StepNumber } from '@/types/reservation';

/**
 * NavigationButtons Component
 * Provides navigation between steps with "przejdź dalej" and "wróć" buttons
 */
interface NavigationButtonsProps {
  currentStep: StepNumber;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
}

export default function NavigationButtons({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
}: NavigationButtonsProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 pt-4 sm:pt-6">
      {!isFirstStep ? (
        <button
          onClick={onPrevious}
          className="text-gray-600 hover:text-[#03adf0] text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:justify-start order-2 sm:order-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          wróć
        </button>
      ) : (
        <div className="order-2 sm:order-1"></div>
      )}

      {!isLastStep && (
        <button
          onClick={onNext}
          className="bg-[#03adf0] text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-[#0288c7] transition-colors flex items-center justify-center gap-2 text-sm sm:text-base order-1 sm:order-2 ml-auto sm:ml-0"
        >
          przejdź dalej
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
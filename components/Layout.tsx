'use client';

import { useCamp } from '@/hooks/useCamp';
import { formatDateRange } from '@/utils/api';
import Header from './Header';
import ProgressBar from './ProgressBar';
import ReservationSummary from './ReservationSummary';
import Footer from './Footer';
import NavigationButtons from './NavigationButtons';
import type { LayoutProps, StepNumber } from '@/types/reservation';

/**
 * Layout Component
 * Main layout wrapper with all static elements (Header, ProgressBar, ReservationSummary, Footer, NavigationButtons)
 */
export default function Layout({
  currentStep,
  completedSteps,
  onStepClick,
  children,
}: LayoutProps) {
  const TOTAL_STEPS = 5;
  const { camp, loading, error } = useCamp();

  const steps = Array.from({ length: TOTAL_STEPS }, (_, i) => {
    const stepNumber = (i + 1) as StepNumber;
    return {
      number: stepNumber,
      label: getStepLabel(stepNumber),
      active: stepNumber === currentStep,
      completed: completedSteps.includes(stepNumber),
    };
  });

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS && onStepClick) {
      onStepClick((currentStep + 1) as StepNumber);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1 && onStepClick) {
      onStepClick((currentStep - 1) as StepNumber);
    }
  };

  return (
    <div className="min-h-screen w-full" style={{ overflow: 'visible', position: 'relative' }}>
      <Header />

      <main className="max-w-container mx-auto px-3 sm:px-6 py-4 sm:py-8" style={{ overflow: 'visible', position: 'relative' }}>
        {/* Breadcrumbs */}
        <div className="mb-3 sm:mb-4">
          <nav className="text-xs sm:text-sm text-gray-500">
            <span className="hover:text-[#03adf0] cursor-pointer">Radsas Fun</span>
            <span className="mx-1 sm:mx-2 text-gray-400">|</span>
            <span className="hover:text-[#03adf0] cursor-pointer">Rezerwacja</span>
            <span className="mx-1 sm:mx-2 text-gray-400">|</span>
            <span className="text-gray-400">Rezerwacji</span>
          </nav>
        </div>

        {/* Page Title */}
        <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2 leading-snug">
          {loading ? (
            'Ładowanie danych obozu...'
          ) : error ? (
            'Błąd ładowania danych obozu'
          ) : camp ? (
            `Rezerwacja obozu "${camp.name}" - ${(camp.period || 'lato') === 'lato' ? 'Lato' : 'Zima'} ${camp.start_date ? new Date(camp.start_date).getFullYear() : ''} - ${camp.city || ''} - ${camp.start_date && camp.end_date ? formatDateRange(camp.start_date, camp.end_date) : ''} ${camp.days_count ? `(${camp.days_count} ${camp.days_count === 1 ? 'dzień' : 'dni'})` : ''}`
          ) : (
            'Rezerwacja obozu'
          )}
        </h1>

        <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
          Poniższe dane służą do dokonania rezerwacji oraz utworzenia umowy.
        </p>

        {/* Progress Bar */}
        <ProgressBar steps={steps} onStepClick={onStepClick || (() => {})} />

        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
          {/* Left Column - Form Steps */}
          <div className="flex-1 lg:w-[75%] w-full">
            {children}
            {/* Navigation Buttons - inside left column, aligned to right */}
            <NavigationButtons
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          </div>

          {/* Right Column - Summary - Mobile: below, Desktop: sticky */}
          <aside 
            className="lg:w-[25%] w-full order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start"
            style={{ 
              alignSelf: 'flex-start'
            }}
          >
            <ReservationSummary />
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/**
 * Helper function to get step label
 * Singleton pattern: single source of truth for step labels
 * DRY: centralized step labels to avoid duplication
 */
const getStepLabel = (stepNumber: StepNumber): string => {
  const labels: Record<StepNumber, string> = {
    1: 'Dane osobowe',
    2: 'Szczegóły rezerwacji',
    3: 'Faktury',
    4: 'Zgody i regulaminy',
    5: 'Podsumowanie',
  };
  return labels[stepNumber];
};


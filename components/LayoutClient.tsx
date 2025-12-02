'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { formatDateRange } from '@/utils/api';
import HeaderTop from './HeaderTop';
import HeaderSecondary from './HeaderSecondary';
import ProgressBar from './ProgressBar';
import ReservationSummary from './ReservationSummary';
import Footer from './Footer';
import NavigationButtons from './NavigationButtons';
import type { LayoutProps, StepNumber, CampWithProperty, ReservationCamp } from '@/types/reservation';
import { useReservation } from '@/context/ReservationContext';

/**
 * Client-side Layout Component
 * Handles navigation and displays camp data passed from server
 */
export default function LayoutClient({
  currentStep,
  completedSteps,
  onStepClick,
  children,
  campData,
  isDisabled,
}: LayoutProps) {
  const TOTAL_STEPS = 5;
  const router = useRouter();
  const pathname = usePathname();
  const { updateReservationCamp, reservation } = useReservation();

  const steps = Array.from({ length: TOTAL_STEPS }, (_, i) => {
    const stepNumber = (i + 1) as StepNumber;
    return {
      number: stepNumber,
      label: getStepLabel(stepNumber),
      active: stepNumber === currentStep,
      completed: completedSteps.includes(stepNumber),
    };
  });

  // Navigate to specific step using URL
  const handleStepNavigation = async (step: StepNumber) => {
    if (!campData) return;
    
    // Extract campId and editionId from current path
    const pathParts = pathname.split('/').filter(Boolean);
    const campIdIndex = pathParts.indexOf('camps');
    if (campIdIndex !== -1 && campIdIndex + 1 < pathParts.length) {
      const campId = pathParts[campIdIndex + 1];
      const editionId = pathParts[campIdIndex + 3]; // edition/[editionId]
      
      // Navigate to new step URL
      const newPath = `/camps/${campId}/edition/${editionId}/step/${step}`;
      await router.push(newPath);
    }
  };

  // Use provided onStepClick or default to handleStepNavigation
  const stepClickHandler = onStepClick || handleStepNavigation;

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      // Validate current step before proceeding
      let isValid = true;
      
      // For step 2, use combined validation function
      if (currentStep === 2) {
        const validateStep2Combined = (window as any).validateStep2Combined;
        if (validateStep2Combined && typeof validateStep2Combined === 'function') {
          isValid = validateStep2Combined();
        }
      } else if (currentStep === 3) {
        // For step 3, use combined validation function
        const validateStep3Combined = (window as any).validateStep3Combined;
        if (validateStep3Combined && typeof validateStep3Combined === 'function') {
          isValid = validateStep3Combined();
        }
      } else {
        // Check if validation function exists for current step
        const validateFunction = (window as any)[`validateStep${currentStep}`];
        if (validateFunction && typeof validateFunction === 'function') {
          isValid = validateFunction();
        }
      }
      
      // Only proceed if validation passes
      if (isValid) {
        stepClickHandler((currentStep + 1) as StepNumber);
      } else {
        // Scroll to top to show validation errors
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      stepClickHandler((currentStep - 1) as StepNumber);
    }
  };

  // Format camp title from server data
  const getCampTitle = () => {
    if (!campData) {
      return 'Rezerwacja obozu';
    }

    const { camp, property } = campData;
    
    // Check if camp/edition exists (id = 0 means doesn't exist)
    if (camp.id === 0 || property.id === 0 || !camp.name) {
      return 'Obóz lub edycja nie istnieje';
    }

    const periodLabel = property.period === 'lato' ? 'Lato' : 'Zima';
    const year = new Date(property.start_date).getFullYear();
    
    return `Rezerwacja obozu "${camp.name}" - ${periodLabel} ${year} - ${property.city} - ${formatDateRange(property.start_date, property.end_date)} (${property.days_count} ${property.days_count === 1 ? 'dzień' : 'dni'})`;
  };
  
  // Check if camp/edition exists
  const campExists = campData && campData.camp.id > 0 && campData.property.id > 0 && campData.camp.name;

  // Update reservation state with camp information immediately when camp data is available
  // Use useLayoutEffect to run synchronously before browser paint (faster than useEffect)
  // This ensures camp info is updated as soon as the page loads (step 1), not when navigating to step 2
  // Check if camp data changed to avoid unnecessary updates
  useLayoutEffect(() => {
    if (campExists && campData) {
      // Check if camp info needs to be updated (avoid unnecessary updates)
      const currentCamp = reservation.camp;
      const shouldUpdate = !currentCamp || 
        currentCamp.id !== campData.camp.id ||
        currentCamp.name !== campData.camp.name ||
        currentCamp.properties.period !== campData.property.period ||
        currentCamp.properties.city !== campData.property.city ||
        currentCamp.properties.start_date !== campData.property.start_date ||
        currentCamp.properties.end_date !== campData.property.end_date;

      if (shouldUpdate) {
        const reservationCamp: ReservationCamp = {
          id: campData.camp.id,
          name: campData.camp.name,
          properties: {
            period: campData.property.period,
            city: campData.property.city,
            start_date: campData.property.start_date,
            end_date: campData.property.end_date,
          },
        };
        updateReservationCamp(reservationCamp);
      }
    }
  }, [campData?.camp.id, campData?.property.id, campData?.camp.name, campData?.property.period, campData?.property.city, campData?.property.start_date, campData?.property.end_date, campExists, updateReservationCamp, reservation.camp]);

  return (
    <div className="min-h-screen w-full" style={{ overflow: 'visible', position: 'relative' }}>
      <HeaderTop />
      <HeaderSecondary />

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
          {getCampTitle()}
        </h1>

        {campExists ? (
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
            Poniższe dane służą do dokonania rezerwacji oraz utworzenia umowy.
          </p>
        ) : (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 sm:mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Uwaga:</strong> Żądany obóz lub edycja nie istnieje. Sprawdź, czy adres URL jest poprawny.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* If camp/edition doesn't exist, show only message, no form */}
        {!campExists ? (
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-2xl mx-auto text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              Taka konfiguracja obozu nie istnieje
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              Żądany obóz lub edycja nie istnieje. Sprawdź, czy adres URL jest poprawny.
            </p>
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            <ProgressBar steps={steps} onStepClick={stepClickHandler} />

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
          </>
        )}
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


'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useReservation } from '@/context/ReservationContext';
import type { StepNumber } from '@/types/reservation';

const BASE_PRICE = 2200;
const TOTAL_STEPS = 5;

interface ReservationSummaryProps {
  currentStep?: StepNumber;
  onNext?: () => void;
}

/**
 * ReservationSummary Component
 * Displays reservation summary with dynamic pricing based on selected options
 * Button "przejdź dalej" navigates to next step or payment on last step
 */
export default function ReservationSummary({ currentStep, onNext }: ReservationSummaryProps = {}) {
  const { reservation } = useReservation();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle button click - navigate to next step or payment
  const handleNextClick = () => {
    if (onNext) {
      // Use provided onNext handler if available
      onNext();
      return;
    }

    // Default navigation logic
    if (!currentStep) {
      // If currentStep is not provided, try to extract from pathname
      const pathParts = pathname.split('/').filter(Boolean);
      const stepIndex = pathParts.indexOf('step');
      if (stepIndex !== -1 && stepIndex + 1 < pathParts.length) {
        const step = parseInt(pathParts[stepIndex + 1], 10);
        if (!isNaN(step) && step >= 1 && step <= TOTAL_STEPS) {
          navigateToStep(step as StepNumber);
          return;
        }
      }
      return;
    }

    navigateToStep(currentStep);
  };

  const navigateToStep = (step: StepNumber) => {
    if (step < TOTAL_STEPS) {
      // Navigate to next step
      const pathParts = pathname.split('/').filter(Boolean);
      const campIdIndex = pathParts.indexOf('camps');
      if (campIdIndex !== -1 && campIdIndex + 1 < pathParts.length) {
        const campId = pathParts[campIdIndex + 1];
        const editionId = pathParts[campIdIndex + 3]; // edition/[editionId]
        const nextStep = (step + 1) as StepNumber;
        const newPath = `/camps/${campId}/edition/${editionId}/step/${nextStep}`;
        router.push(newPath);
      }
    } else {
      // Last step - navigate to payment/finalization
      // This should already be handled by Step5 component, but we can navigate to profile
      router.push('/profil/aktualne-rezerwacje');
    }
  };

  // Separate base price from other items
  const baseItem = reservation.items.find((item) => item.type === 'base');
  const additionalItems = reservation.items.filter((item) => item.type !== 'base');

  // Render default state during SSR to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className="bg-white rounded-xl lg:rounded-tr-[60px] p-4 sm:p-6">
        <div className="flex flex-col items-start mb-4 sm:mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-4 flex items-center justify-start">
            <Image
              src="/reservation_icon.svg"
              alt="Reservation icon"
              width={80}
              height={80}
              className="w-full h-full"
            />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Twoja rezerwacja</h3>
          <div className="text-base sm:text-lg font-medium text-gray-700 mb-2">
            {BASE_PRICE.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
          </div>
          <div className="w-full h-px bg-gray-300 mb-3 sm:mb-4"></div>
          <Link href="#" className="text-[#03adf0] hover:underline text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            Podsumowanie kosztów
          </Link>
          <div className="text-xl sm:text-2xl font-bold text-[#03adf0] mb-4 sm:mb-6">
            {BASE_PRICE.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
          </div>
        </div>
        <button 
          onClick={handleNextClick}
          className="w-1/2 bg-[#03adf0] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-[#0288c7] transition-colors flex items-center justify-center gap-2 mt-4 sm:mt-6 text-sm sm:text-base"
        >
          przejdź dalej
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl lg:rounded-tr-[60px] p-4 sm:p-6">
      <div className="flex flex-col items-start mb-4 sm:mb-6">
        {/* Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-4 flex items-center justify-start">
          <Image
            src="/reservation_icon.svg"
            alt="Reservation icon"
            width={80}
            height={80}
            className="w-full h-full"
          />
        </div>
        
        {/* Title under icon */}
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Twoja rezerwacja</h3>
        
        {/* Base price */}
        {baseItem && (
          <div className="text-base sm:text-lg font-medium text-gray-700 mb-2">
            {baseItem.price.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
          </div>
        )}
        
        {/* Additional items (diet, accommodation, etc.) */}
        {additionalItems.length > 0 && (
          <div className="w-full mb-2">
            {additionalItems.map((item) => (
              <div
                key={item.id}
                className="text-sm text-gray-600 mb-1 flex items-center justify-between w-full"
              >
                <span>{item.name}</span>
                <span className="font-medium">
                  {item.price > 0 ? '+' : ''}{item.price.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* HR line - solid gray */}
        <div className="w-full h-px bg-gray-300 mb-3 sm:mb-4"></div>
        
        {/* Cost summary link */}
        <Link href="#" className="text-[#03adf0] hover:underline text-xs sm:text-sm font-medium mb-3 sm:mb-4">
          Podsumowanie kosztów
        </Link>
        
        {/* Total sum */}
        <div className="text-xl sm:text-2xl font-bold text-[#03adf0] mb-4 sm:mb-6">
          {reservation.totalPrice.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
        </div>
      </div>
      
      <button 
        onClick={handleNextClick}
        className="w-1/2 bg-[#03adf0] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-[#0288c7] transition-colors flex items-center justify-center gap-2 mt-4 sm:mt-6 text-sm sm:text-base"
      >
        {currentStep === TOTAL_STEPS ? 'Przejdź do płatności' : 'przejdź dalej'}
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

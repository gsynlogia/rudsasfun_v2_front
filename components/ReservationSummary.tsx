'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

import { useReservation } from '@/context/ReservationContext';
import type { StepNumber, ReservationItem } from '@/types/reservation';
import { loadStep5FormData, loadStep2FormData } from '@/utils/sessionStorage';

const DEFAULT_BASE_PRICE = 2200; // Fallback for SSR only
const TOTAL_STEPS = 5;

interface ReservationSummaryProps {
  currentStep?: StepNumber;
  onNext?: () => void;
  totalPrice?: number;
  depositAmount?: number;
  remainingAmount?: number;
}

/**
 * ReservationSummary Component
 * Displays reservation summary with dynamic pricing based on selected options
 * Button "przejdź dalej" navigates to next step or payment on last step
 */
export default function ReservationSummary({ currentStep, onNext, totalPrice: propTotalPrice, depositAmount: propDepositAmount, remainingAmount: propRemainingAmount }: ReservationSummaryProps = {}) {
  const { reservation } = useReservation();
  const [isMounted, setIsMounted] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<'full' | 'deposit'>('full');
  const router = useRouter();
  const pathname = usePathname();

  // Calculate payment amounts for Step 5
  // Use basePrice from reservation context if totalPrice is not available
  const totalPrice = propTotalPrice ?? reservation.totalPrice ?? reservation.basePrice ?? DEFAULT_BASE_PRICE;

  // Base deposit amount: 500 PLN
  const baseDepositAmount = 500;

  // Calculate protection prices (OASA and TARCZA) from reservation items
  const protectionItems = reservation.items.filter((item: ReservationItem) => item.type === 'protection');
  const protectionTotal = protectionItems.reduce((sum: number, item: ReservationItem) => {
    // Check if it's OASA or TARCZA protection
    const name = item.name.toLowerCase();
    if (name.includes('oaza') || name.includes('oasa')) {
      return sum + item.price; // OASA price (e.g., 120 PLN)
    } else if (name.includes('tarcza') || name.includes('shield')) {
      return sum + item.price; // TARCZA price (e.g., 80 PLN)
    }
    return sum;
  }, 0);

  // Deposit amount = base (500 PLN) + protection prices
  const depositAmountValue = baseDepositAmount + protectionTotal;

  // Monitor payment amount selection from Step5
  useEffect(() => {
    if (currentStep === 5) {
      const checkPaymentAmount = () => {
        const step5Data = loadStep5FormData();
        if (step5Data && step5Data.paymentAmount) {
          setPaymentAmount(step5Data.paymentAmount);
        }
      };

      // Check immediately
      checkPaymentAmount();

      // Check periodically for changes
      const interval = setInterval(checkPaymentAmount, 500);

      return () => clearInterval(interval);
    }
  }, [currentStep]);

  // Calculate amounts based on selected payment option
  const _depositAmount = propDepositAmount ?? depositAmountValue;
  const _remainingAmount = propRemainingAmount ?? (totalPrice - depositAmountValue);

  // For display: show deposit and remaining only if deposit is selected
  // When deposit is selected, show depositAmountValue (which includes protections)
  // When full payment is selected, show totalPrice
  const displayDepositAmount = paymentAmount === 'deposit' ? depositAmountValue : totalPrice;
  const displayRemainingAmount = paymentAmount === 'deposit' ? (totalPrice - depositAmountValue) : 0;

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle button click - navigate to next step or payment
  const handleNextClick = () => {
    // For Step 5, use payment handler from Step5 component
    if (currentStep === 5) {
      const { handleStep5Payment } = (window as any);
      if (handleStep5Payment && typeof handleStep5Payment === 'function') {
        handleStep5Payment();
        return;
      }
    }

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
  const baseItem = reservation.items.find((item: ReservationItem) => item.type === 'base');
  const transportItem = reservation.items.find((item: ReservationItem) => item.type === 'transport');
  const additionalItems = reservation.items.filter((item: ReservationItem) => item.type !== 'base' && item.type !== 'transport');
  
  // Load transport data from sessionStorage
  const step2Data = loadStep2FormData();
  const transportData = step2Data?.transportData;

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
            {totalPrice.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
          </div>
          <div className="w-full h-px bg-gray-300 mb-3 sm:mb-4"></div>
          <Link href="#" className="text-[#03adf0] hover:underline text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            Podsumowanie kosztów
          </Link>
          <div className="text-xl sm:text-2xl font-bold text-[#03adf0] mb-4 sm:mb-6">
            {totalPrice.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
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
            {additionalItems.map((item: ReservationItem) => (
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

        {/* Transport - special formatting */}
        {transportItem && (
          <div className="w-full mb-2">
            <div className="text-sm text-gray-600 mb-1 flex items-center justify-between w-full">
              <span>Transport:</span>
              <span className="font-medium">
                {transportItem.price > 0 ? '+' : ''}{transportItem.price.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
              </span>
            </div>
            {transportData && (
              <>
                <div className="text-sm text-gray-600 mb-1 ml-4">
                  Transport: <span className="font-bold uppercase">WYJAZD:</span> {
                    transportData.departureType === 'zbiorowy' && transportData.departureCity && transportData.departureCity.trim() !== '' && transportData.departureCity !== 'Nie wybrano'
                      ? transportData.departureCity 
                      : 'własny'
                  }
                </div>
                <div className="text-sm text-gray-600 mb-1 ml-4">
                  Transport: <span className="font-bold uppercase">POWRÓT:</span> {
                    transportData.returnType === 'zbiorowy' && transportData.returnCity && transportData.returnCity.trim() !== '' && transportData.returnCity !== 'Nie wybrano'
                      ? transportData.returnCity 
                      : 'własny'
                  }
                </div>
              </>
            )}
          </div>
        )}

        {/* HR line - solid gray */}
        <div className="w-full h-px bg-gray-300 mb-3 sm:mb-4"></div>

        {/* Cost summary link */}
        <Link href="#" className="text-[#03adf0] hover:underline text-xs sm:text-sm font-medium mb-3 sm:mb-4">
          Podsumowanie kosztów
        </Link>

        {/* Full cost summary - only show on Step 5 */}
        {currentStep === 5 && (
          <div className="w-full mb-3 space-y-2">
            <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Podsumowanie kosztów</h4>

            {/* All reservation items - exclude protections if deposit is selected (they'll be shown in deposit breakdown) */}
            <div className="space-y-1 mb-2">
              {reservation.items
                .filter((item: ReservationItem) => {
                  // If deposit is selected, hide protection items (they'll be shown in deposit breakdown)
                  if (paymentAmount === 'deposit' && item.type === 'protection') {
                    return false;
                  }
                  // Transport will be displayed separately with special formatting
                  if (item.type === 'transport') {
                    return false;
                  }
                  return true;
                })
                .map((item: ReservationItem) => {
                  // For promotions that don't reduce price, show original price but don't add to total
                  const isPromotionNotReducingPrice = item.type === 'promotion' && item.metadata?.doesNotReducePrice;
                  const displayPrice = isPromotionNotReducingPrice && item.metadata?.originalPrice !== undefined
                    ? item.metadata.originalPrice
                    : item.price;
                  
                  return (
                    <div
                      key={item.id}
                      className="text-xs sm:text-sm text-gray-600 flex items-center justify-between"
                    >
                      <span>{item.name}</span>
                      <span className="font-medium text-gray-900">
                        {isPromotionNotReducingPrice ? (
                          <span className="text-gray-500">
                            {displayPrice > 0 ? '+' : ''}{displayPrice.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                            <span className="text-xs ml-1">(nie obniża ceny)</span>
                          </span>
                        ) : (
                          <span>
                            {displayPrice > 0 ? '+' : ''}{displayPrice.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              
              {/* Transport - special formatting */}
              {transportItem && (
                <>
                  <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-between">
                    <span>Transport:</span>
                    <span className="font-medium text-gray-900">
                      {transportItem.price > 0 ? '+' : ''}{transportItem.price.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                    </span>
                  </div>
                  {transportData && (
                    <>
                      <div className="text-xs sm:text-sm text-gray-600 ml-4">
                        Transport: <span className="font-bold uppercase">WYJAZD:</span> {
                          transportData.departureType === 'zbiorowy' && transportData.departureCity && transportData.departureCity.trim() !== '' && transportData.departureCity !== 'Nie wybrano'
                            ? transportData.departureCity 
                            : 'własny'
                        }
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 ml-4">
                        Transport: <span className="font-bold uppercase">POWRÓT:</span> {
                          transportData.returnType === 'zbiorowy' && transportData.returnCity && transportData.returnCity.trim() !== '' && transportData.returnCity !== 'Nie wybrano'
                            ? transportData.returnCity 
                            : 'własny'
                        }
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="w-full h-px bg-gray-300 my-2"></div>

            {/* Total cost */}
            <div className="text-xs sm:text-sm text-gray-700 flex items-center justify-between font-semibold">
              <span>Koszt całkowity:</span>
              <span className="font-bold text-gray-900">
                {totalPrice.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
              </span>
            </div>

            {/* Deposit breakdown - only if deposit is selected */}
            {paymentAmount === 'deposit' && (
              <>
                <div className="w-full h-px bg-gray-300 my-2"></div>
                <div className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Zaliczka:</div>

                {/* Base deposit */}
                <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-between ml-2">
                  <span>Zaliczka:</span>
                  <span className="font-medium text-gray-900">
                    {baseDepositAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                  </span>
                </div>

                {/* Protection items breakdown */}
                {protectionItems                .map((item: ReservationItem) => {
                  const name = item.name.toLowerCase();
                  const isOasa = name.includes('oaza') || name.includes('oasa');
                  const isTarcza = name.includes('tarcza') || name.includes('shield');

                  if (isOasa || isTarcza) {
                    return (
                      <div
                        key={item.id}
                        className="text-xs sm:text-sm text-gray-600 flex items-center justify-between ml-2"
                      >
                        <span>{item.name}</span>
                        <span className="font-medium text-gray-900">
                          +{item.price.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Deposit total */}
                <div className="text-xs sm:text-sm text-gray-700 flex items-center justify-between font-semibold mt-1">
                  <span>Suma zaliczki:</span>
                  <span className="font-bold text-gray-900">
                    {displayDepositAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                  </span>
                </div>

                {/* Remaining amount */}
                <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-between mt-1">
                  <span>Pozostała kwota:</span>
                  <span className="font-medium text-gray-900">
                    {displayRemainingAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                  </span>
                </div>
              </>
            )}

            {/* Amount to pay */}
            <div className="w-full h-px bg-gray-300 my-2"></div>
            <div className="text-sm sm:text-base text-gray-900 flex items-center justify-between font-bold">
              <span>Do zapłaty:</span>
              <span className="text-[#03adf0]">
                {displayDepositAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
              </span>
            </div>
          </div>
        )}

        {/* Total sum - only show if not Step 5 (Step 5 shows it in cost summary) */}
        {currentStep !== 5 && (
          <div className="text-xl sm:text-2xl font-bold text-[#03adf0] mb-4 sm:mb-6">
            {totalPrice.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
          </div>
        )}
      </div>

      {/* Button */}
      <button
        onClick={handleNextClick}
        className="w-full bg-[#03adf0] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-[#0288c7] transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
      >
        {currentStep === TOTAL_STEPS ? 'Zapłać teraz' : 'przejdź dalej'}
        {currentStep !== TOTAL_STEPS && (
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>
    </div>
  );
}

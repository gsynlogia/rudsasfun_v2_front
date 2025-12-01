'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import DashedLine from './DashedLine';
import type { StepComponentProps } from '@/types/reservation';
import { 
  saveStep5FormData, 
  loadStep5FormData, 
  type Step5FormData,
  loadStep1FormData,
  loadStep2FormData,
  loadStep3FormData,
  loadReservationState
} from '@/utils/sessionStorage';
import { useReservation } from '@/context/ReservationContext';

/**
 * Step5 Component - Summary and Payment
 * Displays reservation summary and payment options
 */
export default function Step5({ onNext, onPrevious, disabled = false }: StepComponentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { reservation } = useReservation();
  
  // Initialize state from sessionStorage or defaults
  const getInitialState = (): Step5FormData => {
    const savedData = loadStep5FormData();
    if (savedData) {
      return savedData;
    }
    return {
      payNow: true,
      paymentMethod: 'online',
      paymentAmount: 'deposit',
    };
  };

  const [formData, setFormData] = useState<Step5FormData>(getInitialState);
  const [validationError, setValidationError] = useState<string>('');
  const validationAttemptedRef = useRef(false);

  // Load data from sessionStorage on mount
  useEffect(() => {
    const savedData = loadStep5FormData();
    if (savedData) {
      setFormData(savedData);
    }
  }, []);

  // Save data to sessionStorage whenever formData changes
  useEffect(() => {
    saveStep5FormData(formData);
  }, [formData]);

  // Validate payment options
  const validatePayment = (): boolean => {
    if (!formData.payNow) {
      return true; // No validation needed if pay now is unchecked
    }
    
    if (!formData.paymentMethod || formData.paymentMethod === '') {
      return false;
    }
    
    if (!formData.paymentAmount || formData.paymentAmount === '') {
      return false;
    }
    
    return true;
  };

  // Expose validation function for external use
  useEffect(() => {
    (window as any).validateStep5 = () => {
      const isValid = validatePayment();
      if (!isValid) {
        setValidationError('Proszę wybrać sposób płatności i wielkość wpłaty.');
        validationAttemptedRef.current = true;
      }
      return isValid;
    };

    return () => {
      delete (window as any).validateStep5;
    };
  }, [formData]);

  // Clear validation error when form is valid
  useEffect(() => {
    if (validatePayment() && validationError) {
      setValidationError('');
      validationAttemptedRef.current = false;
    }
  }, [formData.payNow, formData.paymentMethod, formData.paymentAmount]);

  // Load summary data from previous steps
  const step1Data = loadStep1FormData();
  const step2Data = loadStep2FormData();
  const step3Data = loadStep3FormData();
  const reservationState = loadReservationState();

  // Calculate payment amounts
  const totalPrice = reservation.totalPrice || reservationState?.totalPrice || 0;
  const depositAmount = Math.round(totalPrice * 0.6); // 60% deposit
  const remainingAmount = totalPrice - depositAmount;

  // Format price helper
  const formatPrice = (price: number): string => {
    return price.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Get transport type label
  const getTransportTypeLabel = (type: string): string => {
    if (type === 'zbiorowy') return 'Transport zbiorowy';
    if (type === 'wlasny') return 'Transport własny';
    return '';
  };

  // Get city label
  const getCityLabel = (cityValue: string): string => {
    const cities: Record<string, string> = {
      'warszawa': 'Warszawa',
      'krakow': 'Kraków',
      'gdansk': 'Gdańsk',
      'wroclaw': 'Wrocław',
      'poznan': 'Poznań',
    };
    return cities[cityValue] || cityValue;
  };

  // Get diet label
  const getDietLabel = (diet: string | null): string => {
    if (diet === 'standard') return 'Standardowa (0,00zł)';
    if (diet === 'vegetarian') return 'Wegetariańska (50,00zł)';
    return 'Standardowa (0,00zł)';
  };

  // Get gender label
  const getGenderLabel = (gender: string): string => {
    if (gender === 'male') return 'Mężczyzna / Male';
    if (gender === 'female') return 'Kobieta / Female';
    return gender;
  };

  // Get health status label
  const getHealthStatusLabel = (value: string): string => {
    if (value === 'yes' || value === 'tak') return 'Tak';
    if (value === 'no' || value === 'nie') return 'Nie';
    return value || 'Nie';
  };

  // Get addons list
  const getAddonsList = (): string[] => {
    if (!step2Data?.selectedAddons || step2Data.selectedAddons.length === 0) {
      return [];
    }
    
    // Get addon items from reservation
    const addonItems = reservation.items.filter(item => item.type === 'addon');
    
    return step2Data.selectedAddons.map(addonId => {
      // Find the reservation item for this addon
      const reservationItem = addonItems.find(item => item.id === `addon-${addonId}`);
      if (reservationItem) {
        return `${reservationItem.name} (${formatPrice(reservationItem.price)}zł)`;
      }
      
      // Fallback to default names if not found in reservation
      const addonNames: Record<string, string> = {
        'skuter': 'Skuter wodny',
        'banan': 'Banan wodny',
        'quady': 'Quady',
      };
      const name = addonNames[addonId] || addonId;
      return `${name} (0,00zł)`;
    });
  };

  // Get protection label
  const getProtectionLabel = (): string => {
    if (!step2Data?.selectedProtection) return '';
    
    // Get protection item from reservation
    const protectionItem = reservation.items.find(item => item.type === 'protection');
    if (protectionItem) {
      // Remove "Ochrona " prefix if present
      const name = protectionItem.name.replace(/^Ochrona /, '');
      return `${name} (${formatPrice(protectionItem.price)}zł)`;
    }
    
    // Fallback to default values
    const protections: Record<string, { name: string; price: number }> = {
      'tarcza': { name: 'Tarcza', price: 50 },
      'oaza': { name: 'Oaza', price: 75 },
      'forteca': { name: 'Forteca', price: 100 },
    };
    
    const protection = protections[step2Data.selectedProtection];
    if (protection) {
      return `${protection.name} (${formatPrice(protection.price)}zł)`;
    }
    return '';
  };

  // Get promotion label
  const getPromotionLabel = (): string => {
    if (!step2Data?.selectedPromotion) return '';
    
    // Get promotion item from reservation
    const promotionItem = reservation.items.find(item => item.type === 'promotion');
    if (promotionItem) {
      return `${promotionItem.name} (${formatPrice(promotionItem.price)}zł)`;
    }
    
    // Fallback to default values
    const promotions: Record<string, { name: string; price: number }> = {
      'rodzenstwo': { name: 'Rodzeństwo razem', price: -50 },
      'wczesna': { name: 'Wczesna rezerwacja', price: -100 },
      'grupa': { name: 'Grupa 5+ osób', price: -75 },
    };
    
    const promotion = promotions[step2Data.selectedPromotion];
    if (promotion) {
      return `${promotion.name} (${formatPrice(promotion.price)}zł)`;
    }
    return '';
  };

  // Get invoice delivery label
  const getInvoiceDeliveryLabel = (): string => {
    if (!step3Data?.deliveryType) return 'Wersja elektroniczna (0,00zł)';
    
    if (step3Data.deliveryType === 'paper') {
      return 'Wersja papierowa (30,00zł)';
    }
    return 'Wersja elektroniczna (0,00zł)';
  };

  // Handle pay now checkbox
  const handlePayNowChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, payNow: checked }));
    setValidationError('');
  };

  // Handle payment method change
  const handlePaymentMethodChange = (method: 'online' | 'blik') => {
    setFormData(prev => ({ ...prev, paymentMethod: method }));
    setValidationError('');
  };

  // Handle payment amount change
  const handlePaymentAmountChange = (amount: 'full' | 'deposit') => {
    setFormData(prev => ({ ...prev, paymentAmount: amount }));
    setValidationError('');
  };

  // Get first parent data (for summary)
  const firstParent = step1Data?.parents?.[0];
  const participant = step1Data?.participantData;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Block 1: Summary Card */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Podsumowanie rezerwacji
        </h2>
        <section className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
          {/* Segment 1: Personal Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Left: Parent Data */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Dane rodzica/opiekuna prawnego
              </h3>
              <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                {firstParent && (
                  <>
                    <div>{firstParent.firstName} {firstParent.lastName}</div>
                    <div>{firstParent.email}</div>
                    <div>{firstParent.phone} {firstParent.phoneNumber}</div>
                    <div>{firstParent.street}</div>
                    <div>{firstParent.postalCode} {firstParent.city}</div>
                  </>
                )}
              </div>
            </div>
            
            {/* Right: Participant Data */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Dane uczestnika
              </h3>
              <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                {participant && (
                  <>
                    <div>{participant.firstName} {participant.lastName}</div>
                    <div>{participant.age}</div>
                    <div>{getGenderLabel(participant.gender)}</div>
                    <div>{participant.city}</div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <DashedLine />
          
          {/* Segment 2: Health and Diet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 pt-4 sm:pt-6">
            {/* Left: Health Status */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Stan zdrowia uczestnika
              </h3>
              <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                {step1Data && (
                  <>
                    <div>Choroby przewlekłe: {getHealthStatusLabel(step1Data.healthQuestions?.chronicDiseases || '')}</div>
                    <div>Dysfunkcje: {getHealthStatusLabel(step1Data.healthQuestions?.dysfunctions || '')}</div>
                    <div>Leczenie psychiatryczne: {getHealthStatusLabel(step1Data.healthQuestions?.psychiatric || '')}</div>
                    {step1Data.additionalNotes && (
                      <div>Inne: {step1Data.additionalNotes}</div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Right: Diet */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Dieta uczestnika
              </h3>
              <div className="text-xs sm:text-sm text-gray-700">
                {getDietLabel(step1Data?.diet || null)}
              </div>
            </div>
          </div>
          
          <DashedLine />
          
          {/* Segment 3: Accommodation and Addons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 pt-4 sm:pt-6">
            {/* Left: Accommodation */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Wniosek o zakwaterowanie
              </h3>
              <div className="text-xs sm:text-sm text-gray-700">
                {step1Data?.accommodationRequest || 'Brak'}
              </div>
            </div>
            
            {/* Right: Addons */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Dodatki
              </h3>
              <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                {getAddonsList().length > 0 ? (
                  getAddonsList().map((addon, index) => (
                    <div key={index}>{addon}</div>
                  ))
                ) : (
                  <div>Brak</div>
                )}
              </div>
            </div>
          </div>
          
          <DashedLine />
          
          {/* Segment 4: Protection and Promotions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 pt-4 sm:pt-6">
            {/* Left: Protection */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Ochrony
              </h3>
              <div className="text-xs sm:text-sm text-gray-700">
                {getProtectionLabel() || 'Brak'}
              </div>
            </div>
            
            {/* Right: Promotions */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Promocje
              </h3>
              <div className="text-xs sm:text-sm text-gray-700">
                {getPromotionLabel() || 'Brak'}
              </div>
            </div>
          </div>
          
          <DashedLine />
          
          {/* Segment 5: Transport */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 pt-4 sm:pt-6">
            {/* Left: Departure Transport */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Transport do ośrodka
              </h3>
              <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                {step2Data?.transportData && (
                  <>
                    <div>{getTransportTypeLabel(step2Data.transportData.departureType)} (0,00zł)</div>
                    <div>{getCityLabel(step2Data.transportData.departureCity)}</div>
                    <div>
                      <a 
                        href="#" 
                        className="text-[#03adf0] underline hover:text-[#0288c7] transition-colors"
                        onClick={(e) => e.preventDefault()}
                      >
                        lista transportów &gt;
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Right: Return Transport */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Transport z ośrodka
              </h3>
              <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                {step2Data?.transportData && (
                  <>
                    <div>{getTransportTypeLabel(step2Data.transportData.returnType)} (0,00zł)</div>
                    <div>{getCityLabel(step2Data.transportData.returnCity)}</div>
                    <div>
                      <a 
                        href="#" 
                        className="text-[#03adf0] underline hover:text-[#0288c7] transition-colors"
                        onClick={(e) => e.preventDefault()}
                      >
                        lista transportów &gt;
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <DashedLine />
          
          {/* Segment 6: Invoice Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4 sm:pt-6">
            {/* Left: Invoice Data */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Dane do faktury
              </h3>
              <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                {step3Data && (
                  <>
                    {step3Data.invoiceType === 'private' && step3Data.privateData && (
                      <>
                        <div>{step3Data.privateData.firstName} {step3Data.privateData.lastName}</div>
                        {step3Data.privateData.nip && <div>{step3Data.privateData.nip}</div>}
                        <div>{step3Data.privateData.street}</div>
                        <div>{step3Data.privateData.postalCode} {step3Data.privateData.city}</div>
                      </>
                    )}
                    {step3Data.invoiceType === 'company' && step3Data.companyData && (
                      <>
                        <div>{step3Data.companyData.companyName}</div>
                        <div>{step3Data.companyData.nip}</div>
                        <div>{step3Data.companyData.street}</div>
                        <div>{step3Data.companyData.postalCode} {step3Data.companyData.city}</div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Right: Invoice Form */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Forma faktury
              </h3>
              <div className="text-xs sm:text-sm text-gray-700">
                {getInvoiceDeliveryLabel()}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Block 2: Payment Section */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Płatność
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Left: Payment Amounts */}
          <div className="space-y-2">
            <div className="text-sm sm:text-base text-gray-700">
              Koszt całkowity:{' '}
              <a 
                href="#" 
                className="text-[#03adf0] underline hover:text-[#0288c7] transition-colors font-semibold"
                onClick={(e) => e.preventDefault()}
              >
                {formatPrice(totalPrice)} zł
              </a>
            </div>
            <div className="text-sm sm:text-base text-gray-700">
              Zaliczka: {formatPrice(depositAmount)} zł
            </div>
            <div className="text-sm sm:text-base text-gray-700">
              Pozostała kwota: {formatPrice(remainingAmount)} zł
            </div>
          </div>
          
          {/* Right: Information */}
          <div className="flex items-start gap-2 sm:gap-3">
            <svg
              className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 16v-4M12 8h.01"
              />
            </svg>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Dokonując pełnej wpłaty od razu zyskujesz gwarancję niezmienności ceny oraz spokojną głowę (nie musisz pamiętać o kolejnej wpłacie)
            </p>
          </div>
        </div>
      </div>

      {/* Block 3: Pay Now Card */}
      <div>
        <section className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
          {/* Pay Now Checkbox */}
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <input
              type="checkbox"
              id="payNow"
              checked={formData.payNow}
              onChange={(e) => handlePayNowChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex-shrink-0"
            />
            <label
              htmlFor="payNow"
              className="text-sm sm:text-base font-semibold text-gray-900 cursor-pointer flex items-center gap-2"
            >
              Zapłać teraz
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </label>
          </div>
          
          <DashedLine />
          
          {/* Payment Options - Disabled when payNow is false */}
          <div className={`mt-4 sm:mt-6 ${!formData.payNow ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Section 1: Payment Method */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
                Wybierz sposób płatności
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {/* Online Payment */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <input
                      type="radio"
                      id="paymentOnline"
                      name="paymentMethod"
                      value="online"
                      checked={formData.paymentMethod === 'online'}
                      onChange={() => handlePaymentMethodChange('online')}
                      disabled={disabled || !formData.payNow}
                      className="w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <label
                      htmlFor="paymentOnline"
                      className="text-xs sm:text-sm text-gray-700 cursor-pointer"
                    >
                      Płatność online (bezpłatnie)
                    </label>
                  </div>
                  <div className="w-16 h-10 sm:w-20 sm:h-12 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">Pay</span>
                  </div>
                </div>
                
                {/* BLIK Payment */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <input
                      type="radio"
                      id="paymentBlik"
                      name="paymentMethod"
                      value="blik"
                      checked={formData.paymentMethod === 'blik'}
                      onChange={() => handlePaymentMethodChange('blik')}
                      disabled={disabled || !formData.payNow}
                      className="w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <label
                      htmlFor="paymentBlik"
                      className="text-xs sm:text-sm text-gray-700 cursor-pointer"
                    >
                      BLIK (bezpłatnie)
                    </label>
                  </div>
                  <div className="w-16 h-10 sm:w-20 sm:h-12 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">BLIK</span>
                  </div>
                </div>
              </div>
            </div>
            
            <DashedLine />
            
            {/* Section 2: Payment Amount */}
            <div className="mt-4 sm:mt-6">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
                Wybierz wielkość wpłaty
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {/* Full Payment */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="radio"
                    id="paymentFull"
                    name="paymentAmount"
                    value="full"
                    checked={formData.paymentAmount === 'full'}
                    onChange={() => handlePaymentAmountChange('full')}
                    disabled={disabled || !formData.payNow}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <label
                    htmlFor="paymentFull"
                    className="text-xs sm:text-sm text-gray-700 cursor-pointer"
                  >
                    Pełna wpłata
                  </label>
                </div>
                
                {/* Deposit Payment */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="radio"
                    id="paymentDeposit"
                    name="paymentAmount"
                    value="deposit"
                    checked={formData.paymentAmount === 'deposit'}
                    onChange={() => handlePaymentAmountChange('deposit')}
                    disabled={disabled || !formData.payNow}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <label
                    htmlFor="paymentDeposit"
                    className="text-xs sm:text-sm text-gray-700 cursor-pointer"
                  >
                    Zaliczka
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

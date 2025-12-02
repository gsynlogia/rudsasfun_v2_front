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
import { paymentService, type CreatePaymentRequest } from '@/lib/services/PaymentService';
import { reservationService, ReservationService } from '@/lib/services/ReservationService';
import { loadStep4FormData } from '@/utils/sessionStorage';

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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');

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
    
    if (!formData.paymentMethod) {
      return false;
    }
    
    if (!formData.paymentAmount) {
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

  // Helper function to get safe value or default
  const getValueOrNotSet = (value: string | null | undefined, defaultValue: string = 'Nie ustawiono'): string => {
    if (!value || value.trim() === '' || value === 'np. 00-000' || value === 'Miejscowość' || value === 'Adres e-mail' || value === 'Ulica i numer budynku/mieszkania' || value === 'Imię' || value === 'Nazwisko') {
      return defaultValue;
    }
    return value;
  };

  // Get transport type label
  const getTransportTypeLabel = (type: string | null | undefined): string => {
    if (!type || type.trim() === '') return 'Nie wybrano';
    if (type === 'zbiorowy') return 'Transport zbiorowy';
    if (type === 'wlasny') return 'Transport własny';
    return 'Nie wybrano';
  };

  // Get city label
  const getCityLabel = (cityValue: string | null | undefined): string => {
    if (!cityValue || cityValue.trim() === '') return 'Nie wybrano';
    const cities: Record<string, string> = {
      'warszawa': 'Warszawa',
      'krakow': 'Kraków',
      'gdansk': 'Gdańsk',
      'wroclaw': 'Wrocław',
      'poznan': 'Poznań',
    };
    return cities[cityValue] || getValueOrNotSet(cityValue, 'Nie wybrano');
  };

  // Get diet label
  const getDietLabel = (diet: string | null | undefined): string => {
    if (diet === 'standard') return 'Standardowa (0,00zł)';
    if (diet === 'vegetarian') return 'Wegetariańska (50,00zł)';
    return 'Nie wybrano';
  };

  // Get gender label
  const getGenderLabel = (gender: string | null | undefined): string => {
    if (!gender || gender.trim() === '') return 'Nie wybrano';
    if (gender === 'male') return 'Mężczyzna / Male';
    if (gender === 'female') return 'Kobieta / Female';
    return gender;
  };

  // Get health status label
  const getHealthStatusLabel = (value: string | null | undefined): string => {
    if (!value || value.trim() === '') return 'Nie';
    if (value === 'yes' || value === 'tak') return 'Tak';
    if (value === 'no' || value === 'nie') return 'Nie';
    return value;
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

  // Extract camp_id and property_id from URL
  const getCampIds = (): { campId: number | null; propertyId: number | null } => {
    const pathParts = pathname.split('/').filter(Boolean);
    const campIdIndex = pathParts.indexOf('camps');
    if (campIdIndex !== -1 && campIdIndex + 1 < pathParts.length) {
      const campId = parseInt(pathParts[campIdIndex + 1], 10);
      const propertyId = campIdIndex + 3 < pathParts.length 
        ? parseInt(pathParts[campIdIndex + 3], 10) 
        : null;
      return { 
        campId: !isNaN(campId) ? campId : null, 
        propertyId: propertyId && !isNaN(propertyId) ? propertyId : null 
      };
    }
    return { campId: null, propertyId: null };
  };

  // Handle payment processing
  const handlePayment = async () => {
    if (!formData.payNow) {
      return;
    }

    // Validate payment options
    if (!validatePayment()) {
      setValidationError('Proszę wybrać sposób płatności i wielkość wpłaty.');
      validationAttemptedRef.current = true;
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError('');
    setReservationError('');

    try {
      // Get camp IDs from URL
      const { campId, propertyId } = getCampIds();
      if (!campId || !propertyId) {
        throw new Error('Nie można odczytać ID obozu lub turnusu z URL');
      }

      // Load all form data
      const step1Data = loadStep1FormData();
      const step2Data = loadStep2FormData();
      const step3Data = loadStep3FormData();
      const step4Data = loadStep4FormData();

      if (!step1Data || !step2Data || !step3Data || !step4Data) {
        throw new Error('Brak danych formularza. Proszę wypełnić wszystkie kroki.');
      }

      // Create reservation first
      setIsCreatingReservation(true);
      const reservationRequest = ReservationService.prepareReservationRequest(
        step1Data,
        step2Data,
        step3Data,
        step4Data,
        campId,
        propertyId,
        totalPrice,
        depositAmount
      );

      const reservationResponse = await reservationService.createReservation(reservationRequest);
      setIsCreatingReservation(false);

      console.log('✅ Rezerwacja utworzona:', reservationResponse);

      // Get payment amount
      const paymentAmount = formData.paymentAmount === 'full' ? totalPrice : depositAmount;

      // Get payer email from step1 data
      const payerEmail = firstParent?.email || '';
      if (!payerEmail) {
        throw new Error('Brak adresu email płatnika');
      }

      // Get payer name - only if we have valid data
      let payerName: string | undefined = undefined;
      if (firstParent) {
        const firstName = getValueOrNotSet(firstParent.firstName, '');
        const lastName = getValueOrNotSet(firstParent.lastName, '');
        const fullName = `${firstName} ${lastName}`.trim();
        // Only set payer_name if it's not empty and not default values
        if (fullName && fullName !== 'Nie ustawiono Nie ustawiono' && fullName !== 'Nie ustawiono') {
          payerName = fullName;
        }
      }

      // Use reservation ID for order ID
      const orderId = `RES-${reservationResponse.id}`;

      // Prepare payment request
      const paymentRequest: CreatePaymentRequest = {
        amount: paymentAmount,
        description: `Rezerwacja obozu #${reservationResponse.id} - ${formData.paymentAmount === 'full' ? 'Pełna wpłata' : 'Zaliczka'}`,
        order_id: orderId,
        payer_email: payerEmail,
        payer_name: payerName,
        channel_id: formData.paymentMethod === 'blik' ? 64 : formData.paymentMethod === 'online' ? undefined : undefined,
        success_url: `${window.location.origin}/payment/success?reservation_id=${reservationResponse.id}`,
        error_url: `${window.location.origin}/payment/failure?reservation_id=${reservationResponse.id}`,
      };

      // Create payment
      const paymentResponse = await paymentService.createPayment(paymentRequest);

      // Redirect to payment URL if available
      if (paymentResponse.payment_url) {
        window.location.href = paymentResponse.payment_url;
      } else {
        throw new Error('Nie otrzymano URL płatności');
      }
    } catch (error) {
      console.error('Błąd podczas przetwarzania:', error);
      setIsCreatingReservation(false);
      
      if (error instanceof Error) {
        // Check if it's a reservation error
        if (error.message.includes('Błąd walidacji') || error.message.includes('Pole obowiązkowe')) {
          setReservationError(error.message);
        } else {
          setPaymentError(error.message);
        }
      } else {
        setPaymentError('Wystąpił błąd podczas przetwarzania');
      }
      setIsProcessingPayment(false);
    }
  };

  // Get first parent data (for summary) with safe defaults
  const firstParent = step1Data?.parents?.[0];
  const participant = step1Data?.participantData;
  
  // Helper to format phone number
  const formatPhone = (phone: string | undefined, phoneNumber: string | undefined): string => {
    const fullPhone = `${phone || ''} ${phoneNumber || ''}`.trim();
    if (!fullPhone || fullPhone === '+48' || fullPhone === '') return 'Nie ustawiono';
    return fullPhone;
  };

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
                {firstParent ? (
                  <>
                    <div>{getValueOrNotSet(firstParent.firstName)} {getValueOrNotSet(firstParent.lastName)}</div>
                    <div>{getValueOrNotSet(firstParent.email)}</div>
                    <div>{formatPhone(firstParent.phone, firstParent.phoneNumber)}</div>
                    <div>{getValueOrNotSet(firstParent.street)}</div>
                    <div>{getValueOrNotSet(firstParent.postalCode)} {getValueOrNotSet(firstParent.city)}</div>
                  </>
                ) : (
                  <div className="text-gray-500 italic">Nie ustawiono</div>
                )}
              </div>
            </div>
            
            {/* Right: Participant Data */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Dane uczestnika
              </h3>
              <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                {participant ? (
                  <>
                    <div>{getValueOrNotSet(participant.firstName)} {getValueOrNotSet(participant.lastName)}</div>
                    <div>{getValueOrNotSet(participant.age)}</div>
                    <div>{getGenderLabel(participant.gender)}</div>
                    <div>{getValueOrNotSet(participant.city)}</div>
                  </>
                ) : (
                  <div className="text-gray-500 italic">Nie ustawiono</div>
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
                {step1Data ? (
                  <>
                    <div>Choroby przewlekłe: {getHealthStatusLabel(step1Data.healthQuestions?.chronicDiseases)}</div>
                    <div>Dysfunkcje: {getHealthStatusLabel(step1Data.healthQuestions?.dysfunctions)}</div>
                    <div>Leczenie psychiatryczne: {getHealthStatusLabel(step1Data.healthQuestions?.psychiatric)}</div>
                    {step1Data.additionalNotes && step1Data.additionalNotes.trim() !== '' ? (
                      <div>Inne: {step1Data.additionalNotes}</div>
                    ) : null}
                  </>
                ) : (
                  <div className="text-gray-500 italic">Nie ustawiono</div>
                )}
              </div>
            </div>
            
            {/* Right: Diet */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Dieta uczestnika
              </h3>
              <div className="text-xs sm:text-sm text-gray-700">
                {step1Data ? getDietLabel(step1Data.diet) : 'Nie wybrano'}
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
                {step1Data?.accommodationRequest && step1Data.accommodationRequest.trim() !== '' 
                  ? step1Data.accommodationRequest 
                  : 'Nie ustawiono'}
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
                  <div className="text-gray-500 italic">Nie wybrano</div>
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
                {getProtectionLabel() || 'Nie wybrano'}
              </div>
            </div>
            
            {/* Right: Promotions */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Promocje
              </h3>
              <div className="text-xs sm:text-sm text-gray-700">
                {getPromotionLabel() || 'Nie wybrano'}
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
                {step2Data?.transportData ? (
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
                ) : (
                  <div className="text-gray-500 italic">Nie ustawiono</div>
                )}
              </div>
            </div>
            
            {/* Right: Return Transport */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Transport z ośrodka
              </h3>
              <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                {step2Data?.transportData ? (
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
                ) : (
                  <div className="text-gray-500 italic">Nie ustawiono</div>
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
                {step3Data ? (
                  <>
                    {step3Data.invoiceType === 'private' && step3Data.privateData ? (
                      <>
                        <div>{getValueOrNotSet(step3Data.privateData.firstName)} {getValueOrNotSet(step3Data.privateData.lastName)}</div>
                        {step3Data.privateData.nip && step3Data.privateData.nip.trim() !== '' && (
                          <div>{step3Data.privateData.nip}</div>
                        )}
                        <div>{getValueOrNotSet(step3Data.privateData.street)}</div>
                        <div>{getValueOrNotSet(step3Data.privateData.postalCode)} {getValueOrNotSet(step3Data.privateData.city)}</div>
                      </>
                    ) : step3Data.invoiceType === 'company' && step3Data.companyData ? (
                      <>
                        <div>{getValueOrNotSet(step3Data.companyData.companyName)}</div>
                        <div>{getValueOrNotSet(step3Data.companyData.nip)}</div>
                        <div>{getValueOrNotSet(step3Data.companyData.street)}</div>
                        <div>{getValueOrNotSet(step3Data.companyData.postalCode)} {getValueOrNotSet(step3Data.companyData.city)}</div>
                      </>
                    ) : (
                      <div className="text-gray-500 italic">Nie ustawiono</div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-500 italic">Nie ustawiono</div>
                )}
              </div>
            </div>
            
            {/* Right: Invoice Form */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                Forma faktury
              </h3>
              <div className="text-xs sm:text-sm text-gray-700">
                {step3Data ? getInvoiceDeliveryLabel() : 'Nie wybrano'}
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

          {/* Payment Error */}
          {reservationError && (
            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-sm text-red-700 font-semibold mb-1">Błąd walidacji rezerwacji:</p>
              <p className="text-sm text-red-700">{reservationError}</p>
            </div>
          )}
          {paymentError && (
            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-sm text-red-700">{paymentError}</p>
            </div>
          )}

          {/* Pay Now Button */}
          {formData.payNow && (
            <div className="mt-6">
              <button
                onClick={handlePayment}
                disabled={disabled || !formData.payNow || !validatePayment() || isProcessingPayment || isCreatingReservation}
                className="w-full sm:w-auto px-6 py-3 bg-[#03adf0] text-white font-semibold rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingReservation ? 'Tworzenie rezerwacji...' : isProcessingPayment ? 'Przetwarzanie płatności...' : 'Zapłać teraz'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

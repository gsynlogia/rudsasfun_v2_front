'use client';

import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import UniversalModal from '@/components/admin/UniversalModal';
import { useReservation } from '@/context/ReservationContext';
import { paymentService, type CreatePaymentRequest } from '@/lib/services/PaymentService';
import { reservationService, ReservationService } from '@/lib/services/ReservationService';
import type { StepComponentProps, ReservationItem } from '@/types/reservation';
import {
  defaultStep1FormData,
  defaultStep2FormData,
  defaultStep3FormData,
  defaultReservationState,
  withDefaults,
} from '@/types/stepData';
import {
  saveStep5FormData,
  loadStep5FormData,
  type Step5FormData,
  loadStep1FormData,
  loadStep2FormData,
  loadStep3FormData,
  loadReservationState,
  clearAllSessionData,
} from '@/utils/sessionStorage';
import { loadStep4FormData } from '@/utils/sessionStorage';

import DashedLine from './DashedLine';


/**
 * Step5 Component - Summary and Payment
 * Displays reservation summary and payment options
 */
export default function Step5({ onNext: _onNext, onPrevious: _onPrevious, disabled = false }: StepComponentProps) {
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
      payNow: true, // Keep for backward compatibility, but not used in UI
      paymentMethod: 'online',
      paymentAmount: 'full', // Default: Full payment
    };
  };

  const [formData, setFormData] = useState<Step5FormData>(getInitialState);
  const [validationError, setValidationError] = useState<string>('');
  const validationAttemptedRef = useRef(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);
  const [reservationError, setReservationError] = useState<string>('');
  const [showPaymentLaterModal, setShowPaymentLaterModal] = useState(false);
  const [createdReservationId, setCreatedReservationId] = useState<number | null>(null);
  const [_paymentInstallments, _setPaymentInstallments] = useState<'full' | '2' | '3'>('full');

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
    // Always require payment method selection
    if (!formData.paymentMethod) {
      return false;
    }

    // If online payment, require payment amount
    if (formData.paymentMethod === 'online' && !formData.paymentAmount) {
      return false;
    }

    // Transfer payment doesn't require amount selection
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

  // Load summary data from previous steps with defaults
  const step1DataRaw = loadStep1FormData();
  const step2DataRaw = loadStep2FormData();
  const step3DataRaw = loadStep3FormData();
  const reservationStateRaw = loadReservationState();

  const step1Data = withDefaults(step1DataRaw, defaultStep1FormData);
  const step2Data = withDefaults(step2DataRaw, defaultStep2FormData);
  const step3Data = withDefaults(step3DataRaw, defaultStep3FormData);
  const reservationState = withDefaults(reservationStateRaw, defaultReservationState);

  // Calculate payment amounts
  const totalPrice = reservation.totalPrice || reservationState.totalPrice || 0;

  // Base deposit amount: 600 PLN
  const baseDepositAmount = 600;

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

  // Deposit amount = base (600 PLN) + protection prices
  const depositAmount = baseDepositAmount + protectionTotal;
  const _remainingAmount = totalPrice - depositAmount;

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
  const _getTransportTypeLabel = (type: string | null | undefined): string => {
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

  // Get diet label from selectedDietId or reservation items
  const getDietLabel = (dietId: number | null | undefined): string => {
    if (!dietId) return 'Nie wybrano';

    // First, try to find diet in reservation items (for paid diets)
      const dietItem = reservation.items.find((item: ReservationItem) => item.type === 'diet');
    if (dietItem) {
      return `${dietItem.name} (${formatPrice(dietItem.price)}zł)`;
    }

    // If not in reservation items, it's likely a free diet (standard)
    // We could fetch from API, but for now return a generic label
    return 'Standardowa (0,00zł)';
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
    if (!step2Data.selectedAddons || step2Data.selectedAddons.length === 0) {
      return [];
    }

    // Get addon items from reservation
    const addonItems = reservation.items.filter((item: ReservationItem) => item.type === 'addon');

    return step2Data.selectedAddons.map(addonId => {
      // Find the reservation item for this addon
      const reservationItem = addonItems.find((item: ReservationItem) => item.id === `addon-${addonId}`);
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

  // Get protection labels (can be multiple)
  const getProtectionLabels = (): string[] => {
    if (!step2Data.selectedProtection) return [];

    // Get all protection items from reservation
    const protectionItems = reservation.items.filter((item: ReservationItem) => item.type === 'protection');
    if (protectionItems.length > 0) {
      return protectionItems.map((item: ReservationItem) => {
        const name = item.name.replace(/^Ochrona /, '');
        return `${name} (${formatPrice(item.price)}zł)`;
      });
    }

    // Fallback to step2Data
    const protections: Record<string, { name: string; price: number }> = {
      tarcza: { name: 'Tarcza', price: 50 },
      oaza: { name: 'Oaza', price: 100 },
    };

    const selectedProtections = Array.isArray(step2Data.selectedProtection)
      ? step2Data.selectedProtection
      : step2Data.selectedProtection ? [step2Data.selectedProtection] : [];

    return selectedProtections
      .map((id: string) => protections[id])
      .filter(Boolean)
      .map(p => `${p.name} (${formatPrice(p.price)}zł)`);
  };

  // Get promotion label
  const getPromotionLabel = (): string => {
    if (!step2Data.selectedPromotion) return '';

    // Get promotion item from reservation
    const promotionItem = reservation.items.find((item: ReservationItem) => item.type === 'promotion');
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
    if (!step3Data.deliveryType) return 'Wersja elektroniczna (0,00zł)';

    if (step3Data.deliveryType === 'paper') {
      return 'Wersja papierowa (30,00zł)';
    }
    return 'Wersja elektroniczna (0,00zł)';
  };

  // Handle pay now checkbox
  const _handlePayNowChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, payNow: checked }));
    setValidationError('');
  };

  // Handle payment method change
  const handlePaymentMethodChange = (method: 'online' | 'transfer') => {
    setFormData(prev => ({ ...prev, paymentMethod: method, payNow: method === 'online' }));
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
        propertyId: propertyId && !isNaN(propertyId) ? propertyId : null,
      };
    }
    return { campId: null, propertyId: null };
  };

  // Handle payment processing
  const handlePayment = async () => {
    // If transfer payment, create reservation without payment
    if (formData.paymentMethod === 'transfer') {
      await handleReservationWithoutPayment();
      return;
    }

    // If online payment, proceed with payment
    if (formData.paymentMethod !== 'online') {
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
        depositAmount,
      );

      const reservationResponse = await reservationService.createReservation(reservationRequest);
      setIsCreatingReservation(false);

      console.log('✅ Rezerwacja utworzona:', reservationResponse);

      // Get payment amount
      const paymentAmount = formData.paymentAmount === 'full' ? totalPrice : depositAmount;

      // ====================================================================
      // CRITICAL: ALWAYS use the FIRST parent (index 0) for payment data
      // The second parent (index 1) is completely excluded from payment
      // Second parent is optional and may not have all required data (e.g., email)
      // ====================================================================

      // Validate that we have parents data
      if (!step1Data.parents || !Array.isArray(step1Data.parents) || step1Data.parents.length === 0) {
        throw new Error('Brak danych opiekuna. Proszę wypełnić dane opiekuna w kroku 1.');
      }

      // ALWAYS use the FIRST parent (index 0) - never use second parent
      const firstParentForPayment = step1Data.parents[0];

      if (!firstParentForPayment) {
        throw new Error('Brak danych pierwszego opiekuna. Proszę wypełnić dane opiekuna w kroku 1.');
      }

      // Get payer email from FIRST parent only (never from second parent)
      const payerEmail = firstParentForPayment.email ? firstParentForPayment.email.trim() : '';

      // Validate email is not empty
      if (!payerEmail || payerEmail === '' || payerEmail === 'Adres e-mail') {
        throw new Error('Brak adresu email płatnika. Proszę podać adres email pierwszego opiekuna w kroku 1.');
      }

      // Validate email format (basic check)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payerEmail)) {
        throw new Error('Nieprawidłowy format adresu email płatnika. Proszę podać prawidłowy adres email pierwszego opiekuna.');
      }

      // Get payer name from FIRST parent only
      let payerName: string | undefined = undefined;
      const firstName = firstParentForPayment.firstName ? firstParentForPayment.firstName.trim() : '';
      const lastName = firstParentForPayment.lastName ? firstParentForPayment.lastName.trim() : '';

      if (firstName && lastName && firstName !== 'Imię' && lastName !== 'Nazwisko') {
        const fullName = `${firstName} ${lastName}`.trim();
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
        channel_id: formData.paymentMethod === 'online' ? undefined : undefined,
        success_url: `${window.location.origin}/payment/success?reservation_id=${reservationResponse.id}`,
        error_url: `${window.location.origin}/payment/failure?reservation_id=${reservationResponse.id}`,
      };

      // Create payment
      const paymentResponse = await paymentService.createPayment(paymentRequest);

      // Clear session storage after successful payment creation
      clearAllSessionData();

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
          // Instead of showing technical error, show payment data that was used
          try {
            const step1DataForError = loadStep1FormData();
            if (step1DataForError && step1DataForError.parents && step1DataForError.parents.length > 0) {
              // Show data from FIRST parent (used for payment)
              const firstParentForError = step1DataForError.parents[0];
              const payerEmailForError = firstParentForError?.email || 'BRAK';
              const payerFirstNameForError = firstParentForError?.firstName || 'BRAK';
              const payerLastNameForError = firstParentForError?.lastName || 'BRAK';
              const payerPhoneForError = `${firstParentForError?.phone || '+48'} ${firstParentForError?.phoneNumber || 'BRAK'}`.trim();

              // Also show all parents data that were sent to backend
              let allParentsInfo = '';
              step1DataForError.parents.forEach((parent, index) => {
                const parentEmail = (parent?.email || '').trim() || 'BRAK';
                const parentName = `${parent?.firstName || 'BRAK'} ${parent?.lastName || 'BRAK'}`.trim();
                allParentsInfo += `\nOpiekun ${index + 1}: ${parentName}, Email: ${parentEmail}`;
              });

              const paymentDataMessage = `Dane używane do płatności (z pierwszego opiekuna):\n` +
                `• Imię: ${payerFirstNameForError}\n` +
                `• Nazwisko: ${payerLastNameForError}\n` +
                `• Email: ${payerEmailForError}\n` +
                `• Telefon: ${payerPhoneForError}\n\n` +
                `Wszyscy opiekunowie wysłani do backendu:${allParentsInfo}\n\n` +
                `Błąd walidacji: ${error.message}`;

              setReservationError(paymentDataMessage);
            } else {
              setReservationError(`Brak danych pierwszego opiekuna. ${error.message}`);
            }
          } catch {
            // Fallback to original error if we can't load data
          setReservationError(error.message);
          }
        } else {
          setPaymentError(error.message);
        }
      } else {
        setPaymentError('Wystąpił błąd podczas przetwarzania');
      }
      setIsProcessingPayment(false);
    }
  };

  // Handle reservation creation without payment (pay later)
  const handleReservationWithoutPayment = async () => {
    setIsCreatingReservation(true);
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

      // Create reservation
      const reservationRequest = ReservationService.prepareReservationRequest(
        step1Data,
        step2Data,
        step3Data,
        step4Data,
        campId,
        propertyId,
        totalPrice,
        depositAmount,
      );

      const reservationResponse = await reservationService.createReservation(reservationRequest);
      setIsCreatingReservation(false);

      console.log('✅ Rezerwacja utworzona (płatność później):', reservationResponse);

      // Clear session storage
      clearAllSessionData();

      // Show modal and redirect
      setCreatedReservationId(reservationResponse.id);
      setShowPaymentLaterModal(true);
    } catch (error) {
      console.error('Błąd podczas tworzenia rezerwacji:', error);
      setIsCreatingReservation(false);

      if (error instanceof Error) {
        setReservationError(error.message);
      } else {
        setReservationError('Wystąpił błąd podczas tworzenia rezerwacji');
      }
    }
  };

  // Expose handlePayment function for ReservationSummary button
  useEffect(() => {
    (window as any).handleStep5Payment = handlePayment;

    return () => {
      delete (window as any).handleStep5Payment;
    };
  }, [formData, totalPrice, depositAmount]);


  // Get first parent data (for summary) with safe defaults
  interface ParentData {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneNumber: string;
    street: string;
    postalCode: string;
    city: string;
  }

  interface ParticipantData {
    firstName: string;
    lastName: string;
    age: string;
    gender: string;
    city: string;
    selectedParticipant: string;
  }

  const defaultParent: ParentData = {
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneNumber: '',
    street: '',
    postalCode: '',
    city: '',
  };

  const defaultParticipant: ParticipantData = {
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    city: '',
    selectedParticipant: '',
  };

  const firstParent: ParentData = (step1Data?.parents && step1Data.parents.length > 0)
    ? step1Data.parents[0]
    : defaultParent;
  const participant: ParticipantData = step1Data?.participantData || defaultParticipant;

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
                    <div>Choroby przewlekłe: {getHealthStatusLabel(step1Data.healthQuestions.chronicDiseases)}</div>
                    <div>Dysfunkcje: {getHealthStatusLabel(step1Data.healthQuestions.dysfunctions)}</div>
                    <div>Leczenie psychiatryczne: {getHealthStatusLabel(step1Data.healthQuestions.psychiatric)}</div>
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
                {step1Data ? getDietLabel(step1Data.selectedDietId) : 'Nie wybrano'}
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
                {step1Data.accommodationRequest && step1Data.accommodationRequest.trim() !== ''
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
                {getProtectionLabels().length > 0
                  ? getProtectionLabels().join(', ')
                  : 'Nie wybrano'}
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
                {step2Data.transportData ? (
                  <>
                    <div>Transport zbiórkowy do ośrodka</div>
                    <div>{getCityLabel(step2Data.transportData.departureCity)}</div>
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
                {step2Data.transportData ? (
                  <>
                    <div>Transport zbiórkowy z ośrodka</div>
                    <div>{getCityLabel(step2Data.transportData.returnCity)}</div>
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
            {/* Left: Invoice/Account Data */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                {step3Data.invoiceType === 'private' ? 'Dane do rachunku' : 'Dane do faktury'}
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

            {/* Right: Invoice Form - Only show for company */}
            {step3Data.invoiceType === 'company' && (
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                  Forma faktury
                </h3>
                <div className="text-xs sm:text-sm text-gray-700">
                  {step3Data ? getInvoiceDeliveryLabel() : 'Nie wybrano'}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Block 2: Payment Section */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Płatność
        </h2>
        <div className="mb-4 sm:mb-6">
          {/* Information */}
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
          {/* Section 0: Payment Data - ALWAYS from FIRST parent (index 0) */}
          <div className="mb-4 sm:mb-6 hidden">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
              Dane rodzica / opiekuna
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Imię *</label>
                <input
                  className="w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed border-gray-400"
                  type="text"
                  value={firstParent?.firstName || ''}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Nazwisko *</label>
                <input
                  className="w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed border-gray-400"
                  type="text"
                  value={firstParent?.lastName || ''}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Adres e-mail <span className="text-red-500">*</span></label>
                <input
                  className="w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed border-gray-400"
                  type="email"
                  value={firstParent?.email || ''}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Numer telefonu *</label>
                <div className="flex gap-2">
                  <select
                    className="px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled
                  >
                    <option value="+48">{firstParent?.phone || '+48'}</option>
                  </select>
                  <div className="flex-1">
                    <input
                      className="w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed border-gray-400"
                      type="tel"
                      value={firstParent?.phoneNumber || ''}
                      disabled
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Ulica i numer</label>
                <input
                  className="w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed border-gray-400"
                  type="text"
                  value={firstParent?.street || ''}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Kod pocztowy</label>
                <input
                  className="w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed border-gray-400"
                  type="text"
                  value={firstParent?.postalCode || ''}
                  disabled
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Miejscowość</label>
                <input
                  className="w-full px-3 sm:px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] disabled:bg-gray-100 disabled:cursor-not-allowed border-gray-400"
                  type="text"
                  value={firstParent?.city || ''}
                  disabled
                />
              </div>
            </div>
          </div>

          <DashedLine />

          {/* Section 1: Payment Method */}
          <div className="mb-4 sm:mb-6">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
              Wybierz sposób płatności
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {/* Online Payment (Tpay) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="radio"
                    id="paymentOnline"
                    name="paymentMethod"
                    value="online"
                    checked={formData.paymentMethod === 'online'}
                    onChange={() => handlePaymentMethodChange('online')}
                    disabled={disabled}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <label
                    htmlFor="paymentOnline"
                    className="text-xs sm:text-sm text-gray-700 cursor-pointer"
                  >
                    Płatność online (Tpay)
                  </label>
                </div>
                <div className="flex items-center justify-center flex-shrink-0" style={{ alignSelf: 'flex-start', marginTop: '-4px' }}>
                  <Image
                    src="/tpay-brand-logo-short.png"
                    alt="Tpay"
                    width={80}
                    height={48}
                    className="h-10 sm:h-12 w-auto object-contain"
                  />
                </div>
              </div>

              {/* Traditional Transfer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="radio"
                    id="paymentTransfer"
                    name="paymentMethod"
                    value="transfer"
                    checked={formData.paymentMethod === 'transfer'}
                    onChange={() => handlePaymentMethodChange('transfer')}
                    disabled={disabled}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <label
                    htmlFor="paymentTransfer"
                    className="text-xs sm:text-sm text-gray-700 cursor-pointer"
                  >
                    Przelew tradycyjny
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DashedLine />

          {/* Section 2: Payment Amount - Only shown for online payment */}
          {formData.paymentMethod === 'online' && (
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
                    disabled={disabled}
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
                    disabled={disabled}
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
          )}

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
              <pre className="text-sm text-red-700 whitespace-pre-wrap font-sans">{reservationError}</pre>
            </div>
          )}
          {paymentError && (
            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-sm text-red-700">{paymentError}</p>
            </div>
          )}

          {/* Payment Button */}
          <div className="mt-6">
            <button
              onClick={handlePayment}
              disabled={disabled || !validatePayment() || isProcessingPayment || isCreatingReservation}
              className="w-full sm:w-auto px-6 py-3 bg-[#03adf0] text-white font-semibold rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingReservation
                ? 'Tworzenie rezerwacji...'
                : isProcessingPayment
                  ? 'Przetwarzanie płatności...'
                  : formData.paymentMethod === 'transfer'
                    ? 'Przejdź dalej'
                    : 'Zapłać teraz'}
            </button>
          </div>
        </section>
      </div>

      {/* Payment Later Modal */}
      <UniversalModal
        isOpen={showPaymentLaterModal}
        onClose={() => {
          setShowPaymentLaterModal(false);
          if (createdReservationId) {
            router.push(`/profil/aktualne-rezerwacje?reservation_id=${createdReservationId}`);
          } else {
            router.push('/profil/aktualne-rezerwacje');
          }
        }}
        title="Rezerwacja utworzona"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Twoja rezerwacja została utworzona pomyślnie.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <p className="text-sm text-blue-800 font-semibold mb-2">
              Masz 3 dni na dokonanie płatności
            </p>
            <p className="text-sm text-blue-700">
              Proszę dokonać płatności w ciągu 3 dni od daty utworzenia rezerwacji,
              w przeciwnym razie rezerwacja może zostać anulowana.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowPaymentLaterModal(false);
                if (createdReservationId) {
                  router.push(`/profil/aktualne-rezerwacje?reservation_id=${createdReservationId}`);
                } else {
                  router.push('/profil/aktualne-rezerwacje');
                }
              }}
              className="px-6 py-2 bg-[#03adf0] text-white font-medium rounded-lg hover:bg-[#0288c7] transition-colors"
            >
              Przejdź do rezerwacji
            </button>
          </div>
        </div>
      </UniversalModal>
    </div>
  );
}

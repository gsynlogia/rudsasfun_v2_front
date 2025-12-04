'use client';

import { MapPin, User, Calendar, Home, Utensils, Gift, Users, Heart, FileText, Mail, Phone } from 'lucide-react';
import DashedLine from '../DashedLine';
import { ReservationResponse } from '@/lib/services/ReservationService';
import { paymentService, PaymentResponse, CreatePaymentRequest } from '@/lib/services/PaymentService';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdditionalServicesTiles from './AdditionalServicesTiles';

interface ReservationMainProps {
  reservation: ReservationResponse;
  isDetailsExpanded: boolean;
  onToggleDetails: () => void;
}

/**
 * ReservationMain Component
 * Left part of reservation card with main details
 */
export default function ReservationMain({ reservation, isDetailsExpanded, onToggleDetails }: ReservationMainProps) {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const [paymentInstallments, setPaymentInstallments] = useState<'full' | '2' | '3'>('full');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Format date helper
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Brak danych';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'Brak danych';
    }
  };

  // Format date range
  const formatDateRange = (start: string | null | undefined, end: string | null | undefined): string => {
    if (!start || !end) return 'Brak danych';
    return `${formatDate(start)} – ${formatDate(end)}`;
  };

  // Load payments for this reservation
  useEffect(() => {
    const loadPayments = async () => {
      try {
        setLoadingPayments(true);
        const allPayments = await paymentService.listPayments(0, 1000);
        // Filter payments for this reservation (order_id format: "RES-{id}" or just "{id}")
        const reservationPayments = allPayments.filter(p => {
          const orderId = p.order_id || '';
          // Match "RES-{id}" format or just "{id}"
          return orderId === `RES-${reservation.id}` || orderId === String(reservation.id);
        });
        setPayments(reservationPayments);
        
        // Calculate total paid amount from successful payments
        const totalPaid = reservationPayments
          .filter(p => p.status === 'paid' || p.status === 'success')
          .reduce((sum, p) => {
            // Use paid_amount if available (from webhook), otherwise use amount
            return sum + (p.paid_amount || p.amount || 0);
          }, 0);
        
        setPaidAmount(totalPaid);
        setIsFullyPaid(totalPaid >= reservation.total_price);
      } catch (error) {
        console.error('Error loading payments:', error);
      } finally {
        setLoadingPayments(false);
      }
    };

    if (isDetailsExpanded) {
      loadPayments();
    }
  }, [reservation.id, reservation.total_price, isDetailsExpanded]);

  // Get participant name
  const participantName = reservation.participant_first_name && reservation.participant_last_name
    ? `${reservation.participant_first_name} ${reservation.participant_last_name}`
    : 'Brak danych';

  // Get age
  const age = reservation.participant_age ? `${reservation.participant_age} lat` : 'Brak danych';

  // Get gender
  const gender = reservation.participant_gender || 'Brak danych';

  // Get city
  const city = reservation.participant_city || reservation.property_city || 'Brak danych';

  // Get camp name
  const campName = reservation.camp_name || 'Brak danych';

  // Get turnus name (property name)
  const turnusName = reservation.property_name || 'Brak danych';

  // Get dates
  const dates = formatDateRange(reservation.property_start_date, reservation.property_end_date);

  // Get center/city
  const center = reservation.property_city || 'Brak danych';

  // Get transport info
  const departureType = reservation.departure_type === 'zbiorowy' ? 'Transport zbiorowy' : 'Transport własny';
  const departureCity = reservation.departure_city || '';
  const returnType = reservation.return_type === 'zbiorowy' ? 'Transport zbiorowy' : 'Transport własny';
  const returnCity = reservation.return_city || '';

  // Get diet name (prefer diet_name, fallback to diet ID)
  const diet = reservation.diet_name || (reservation.diet ? `Dieta ID: ${reservation.diet}` : 'Brak danych');

  // Get promotion/source name (prefer source_name, fallback to selected_source)
  const promotion = reservation.source_name || reservation.selected_source || 'Brak promocji';

  // Get accommodation
  const accommodation = reservation.accommodation_request || 'Brak danych';

  // Get health info (from health_questions if available in backend)
  // For now, we'll show accommodation_request as health info placeholder
  const healthInfo = reservation.accommodation_request || 'Brak danych';

  // Map status
  const statusMap: Record<string, string> = {
    'pending': 'Zarezerwowana',
    'confirmed': 'Potwierdzona',
    'cancelled': 'Anulowana',
    'completed': 'Zakończona',
  };
  const status = statusMap[reservation.status] || reservation.status;
  const statusColor = reservation.status === 'cancelled' ? 'red' : reservation.status === 'completed' ? 'gray' : 'green';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
            {participantName}
          </h3>
          <span className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 ${
            statusColor === 'green' ? 'bg-green-50 text-green-700' :
            statusColor === 'red' ? 'bg-red-50 text-red-700' :
            'bg-gray-50 text-gray-700'
          } text-[10px] sm:text-xs font-medium rounded-full w-fit`}>
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
              statusColor === 'green' ? 'bg-green-500' :
              statusColor === 'red' ? 'bg-red-500' :
              'bg-gray-500'
            }`} />
            {status}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <User className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{age}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <User className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{gender}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{city}</span>
          </div>
        </div>
      </div>

      {/* Parents/Guardians Section */}
      {reservation.parents_data && reservation.parents_data.length > 0 && (
        <>
          <DashedLine />
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
              Opiekunowie/Rodzice
            </h4>
            <div className="space-y-3 sm:space-y-4">
              {reservation.parents_data.map((parent, index) => (
                <div key={parent.id || index} className="bg-gray-50 rounded-lg p-2 sm:p-3">
                  <div className="text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-2">
                    {parent.firstName} {parent.lastName}
                  </div>
                  <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                    {parent.email && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{parent.email}</span>
                      </div>
                    )}
                    {(parent.phoneNumber || parent.phone) && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{parent.phone || '+48'} {parent.phoneNumber}</span>
                      </div>
                    )}
                    {parent.street && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{parent.street}, {parent.postalCode} {parent.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <DashedLine />

      {/* Camp Details */}
      <div>
        <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
          {campName}
        </h4>
        <div className="text-xs sm:text-sm text-gray-600 space-y-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>Termin: {dates}</span>
          </div>
        </div>
      </div>

      <DashedLine />

      {/* Transport Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Transport to resort */}
        <div>
          <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
            Transport do ośrodka
          </h5>
          <div className="text-xs sm:text-sm text-gray-700 space-y-1">
            <div>{departureType}</div>
            {departureCity && <div>{departureCity}</div>}
          </div>
        </div>

        {/* Transport from resort */}
        <div>
          <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
            Transport z ośrodka
          </h5>
          <div className="text-xs sm:text-sm text-gray-700 space-y-1">
            <div>{returnType}</div>
            {returnCity && <div>{returnCity}</div>}
          </div>
        </div>
      </div>

      {/* Collapsible Details Section */}
      {isDetailsExpanded && (
        <>
          <DashedLine />

          {/* Diet and Promotion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Dieta</h5>
              <div className="text-xs sm:text-sm text-gray-700">{diet}</div>
            </div>
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Promocja</h5>
              <div className="text-xs sm:text-sm text-gray-700">{promotion}</div>
            </div>
          </div>

          <DashedLine />

          {/* Accommodation and Health */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Accommodation */}
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Zakwaterowanie</h5>
              <p className="text-xs sm:text-sm text-gray-700">
                {accommodation}
              </p>
            </div>

            {/* Health Status */}
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Opieka zdrowotna</h5>
              <div className="text-xs sm:text-sm text-gray-700">
                {healthInfo}
              </div>
            </div>
          </div>

          <DashedLine />

          {/* Additional Services Tiles */}
          <AdditionalServicesTiles
            selectedAddons={reservation.selected_addons || []}
            selectedProtection={reservation.selected_protection || []}
            reservation={reservation}
          />

          <DashedLine />

          {/* Total Cost and Actions */}
          <div>
            <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Koszt całkowity</h5>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
              {reservation.total_price.toFixed(2)} zł
            </div>
            {!isFullyPaid && (
              <div className="text-xs sm:text-sm mb-3 sm:mb-4">
                Suma wpłat: <span className="font-semibold">{paidAmount.toFixed(2)} zł</span>
                <br />
                Pozostało do zapłaty:{' '}
                <span className="text-[#03adf0] font-semibold">
                  {(reservation.total_price - paidAmount).toFixed(2)} zł
                </span>
              </div>
            )}
            {isFullyPaid && (
              <div className="text-xs sm:text-sm text-green-600 mb-3 sm:mb-4 font-semibold">
                ✅ Rezerwacja w pełni opłacona
              </div>
            )}
            {!isFullyPaid && (
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* Payment Installments Options */}
                <div className="space-y-2 sm:space-y-3">
                  <h6 className="text-xs sm:text-sm font-semibold text-gray-700">Wybierz sposób płatności:</h6>
                  <div className="space-y-2">
                    {/* Full Payment */}
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`installmentFull-${reservation.id}`}
                        name={`paymentInstallments-${reservation.id}`}
                        value="full"
                        checked={paymentInstallments === 'full'}
                        onChange={() => setPaymentInstallments('full')}
                        className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer"
                      />
                      <label
                        htmlFor={`installmentFull-${reservation.id}`}
                        className="text-xs sm:text-sm text-gray-700 cursor-pointer"
                      >
                        Pełna wpłata ({reservation.total_price.toFixed(2)} zł)
                      </label>
                    </div>
                    
                    {/* 2 Equal Installments */}
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`installment2-${reservation.id}`}
                        name={`paymentInstallments-${reservation.id}`}
                        value="2"
                        checked={paymentInstallments === '2'}
                        onChange={() => setPaymentInstallments('2')}
                        className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer"
                      />
                      <label
                        htmlFor={`installment2-${reservation.id}`}
                        className="text-xs sm:text-sm text-gray-700 cursor-pointer"
                      >
                        Płatność w 2 równych ratach (po {(reservation.total_price / 2).toFixed(2)} zł)
                      </label>
                    </div>
                    
                    {/* 3 Equal Installments */}
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`installment3-${reservation.id}`}
                        name={`paymentInstallments-${reservation.id}`}
                        value="3"
                        checked={paymentInstallments === '3'}
                        onChange={() => setPaymentInstallments('3')}
                        className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer"
                      />
                      <label
                        htmlFor={`installment3-${reservation.id}`}
                        className="text-xs sm:text-sm text-gray-700 cursor-pointer"
                      >
                        Płatność w 3 równych ratach (po {(reservation.total_price / 3).toFixed(2)} zł)
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Pay Button */}
                <button 
                  onClick={async () => {
                    if (isProcessingPayment) return;
                    
                    setIsProcessingPayment(true);
                    try {
                      // Get payment amount based on selected installments
                      let paymentAmount = reservation.total_price;
                      if (paymentInstallments === '2') {
                        paymentAmount = reservation.total_price / 2;
                      } else if (paymentInstallments === '3') {
                        paymentAmount = reservation.total_price / 3;
                      }
                      
                      // Get payer data from reservation
                      const firstParent = reservation.parents_data && reservation.parents_data.length > 0 
                        ? reservation.parents_data[0] 
                        : null;
                      
                      if (!firstParent || !firstParent.email) {
                        throw new Error('Brak danych płatnika (email) w rezerwacji');
                      }
                      
                      const payerEmail = firstParent.email;
                      const payerName = firstParent.first_name && firstParent.last_name
                        ? `${firstParent.first_name} ${firstParent.last_name}`.trim()
                        : undefined;
                      
                      // Create order ID
                      const orderId = `RES-${reservation.id}-${Date.now()}`;
                      
                      // Prepare payment request
                      const paymentRequest: CreatePaymentRequest = {
                        amount: paymentAmount,
                        description: `Rezerwacja obozu #${reservation.id} - ${paymentInstallments === 'full' ? 'Pełna wpłata' : paymentInstallments === '2' ? 'Rata 1/2' : 'Rata 1/3'}`,
                        order_id: orderId,
                        payer_email: payerEmail,
                        payer_name: payerName,
                        success_url: `${window.location.origin}/payment/success?reservation_id=${reservation.id}`,
                        error_url: `${window.location.origin}/payment/failure?reservation_id=${reservation.id}`,
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
                      console.error('Błąd podczas tworzenia płatności:', error);
                      alert(error instanceof Error ? error.message : 'Wystąpił błąd podczas tworzenia płatności');
                      setIsProcessingPayment(false);
                    }
                  }}
                  disabled={isProcessingPayment}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#03adf0] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingPayment ? 'Przetwarzanie...' : 'zapłać'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Toggle Details Button */}
      <div className={`text-center ${isDetailsExpanded ? 'pt-3 sm:pt-4' : ''}`}>
        <button 
          onClick={onToggleDetails}
          className="text-xs sm:text-sm text-[#03adf0] hover:text-[#0288c7] flex items-center gap-1 mx-auto transition-colors"
        >
          {isDetailsExpanded ? 'ukryj szczegóły' : 'pokaż szczegóły'}
          <svg 
            className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${isDetailsExpanded ? '' : 'rotate-180'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

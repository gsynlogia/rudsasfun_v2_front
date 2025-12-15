'use client';

import { MapPin, User, Calendar, Mail, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { contractService } from '@/lib/services/ContractService';
import { paymentService, PaymentResponse, CreatePaymentRequest } from '@/lib/services/PaymentService';
import { qualificationCardService, QualificationCardResponse } from '@/lib/services/QualificationCardService';
import { reservationService, ReservationResponse } from '@/lib/services/ReservationService';
import { getApiBaseUrlRuntime } from '@/utils/api-config';

import DashedLine from '../DashedLine';


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
  const _router = useRouter();
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [_loadingPayments, _setLoadingPayments] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const [paymentInstallments, setPaymentInstallments] = useState<'full' | '2' | '3' | null>(() => {
    // Initialize from reservation.payment_plan if available
    return (reservation.payment_plan as 'full' | '2' | '3') || null;
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [_contract, _setContract] = useState<any>(null);
  const [_qualificationCard, _setQualificationCard] = useState<QualificationCardResponse | null>(null);
  const [_loadingContract, _setLoadingContract] = useState(false);
  const [_loadingCard, _setLoadingCard] = useState(false);
  const [_downloadingContract, _setDownloadingContract] = useState(false);
  const [_downloadingCard, _setDownloadingCard] = useState(false);
  const [onlinePaymentsEnabled, setOnlinePaymentsEnabled] = useState<boolean>(true);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [loadingOnlinePaymentsStatus, setLoadingOnlinePaymentsStatus] = useState(true);

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

  // Load online payments status and bank account data
  useEffect(() => {
    const loadOnlinePaymentsStatus = async () => {
      try {
        setLoadingOnlinePaymentsStatus(true);
        const API_BASE_URL = getApiBaseUrlRuntime();
        const response = await fetch(`${API_BASE_URL}/api/system-settings/online-payments/status`);
        if (response.ok) {
          const data = await response.json();
          setOnlinePaymentsEnabled(data.enabled);
          
          // If online payments are disabled, load bank account data
          if (!data.enabled) {
            try {
              const bankResponse = await fetch(`${API_BASE_URL}/api/bank-accounts/active`);
              if (bankResponse.ok) {
                const bankData = await bankResponse.json();
                setBankAccount(bankData);
              }
            } catch (err) {
              console.error('Error loading bank account:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error loading online payments status:', err);
      } finally {
        setLoadingOnlinePaymentsStatus(false);
      }
    };
    loadOnlinePaymentsStatus();
  }, []);

  // Load payments for this reservation
  useEffect(() => {
    const loadPayments = async () => {
      try {
        _setLoadingPayments(true);
        const allPayments = await paymentService.listPayments(0, 1000);
        // Filter payments for this reservation (order_id format: "RES-{id}" or just "{id}" or "RES-{id}-{timestamp}")
        // Use the same logic as PaymentsManagement.tsx for consistency
        const reservationPayments = allPayments.filter(p => {
          const orderId = p.order_id || '';
          // Check if order_id matches reservation.id (with or without "RES-" prefix, or with timestamp)
          // Format: "RES-{id}" or "RES-{id}-{timestamp}" or just "{id}"
          if (orderId === String(reservation.id)) return true;
          if (orderId === `RES-${reservation.id}`) return true;
          // For format "RES-{id}-{timestamp}", extract the id part
          const match = orderId.match(/^RES-(\d+)(?:-|$)/);
          if (match && parseInt(match[1], 10) === reservation.id) return true;
          return false;
        });
        setPayments(reservationPayments);

        // Include payments with status 'success' or 'pending' if they have amount set
        // For pending payments, we use 'amount' as the paid amount (assuming payment was made)
        // For success payments, we use 'paid_amount' if available, otherwise 'amount'
        // Use the same logic as PaymentsManagement.tsx for consistency
        const successfulPayments = reservationPayments.filter(p => {
          // Include success payments
          if (p.status === 'success') return true;
          // Include pending payments that have an amount (payment was created)
          if (p.status === 'pending' && p.amount && p.amount > 0) return true;
          return false;
        });

        // Calculate actual paid amount from database
        // Priority: paid_amount (from webhook) > amount (from payment creation)
        // Use the same logic as PaymentsManagement.tsx for consistency
        const actualPaidAmount = successfulPayments.reduce((sum, p) => {
          // If paid_amount is set (from webhook), use it
          if (p.paid_amount !== null && p.paid_amount !== undefined && p.paid_amount > 0) {
            return sum + p.paid_amount;
          }
          // Otherwise, use amount (payment was created but webhook didn't update it yet)
          return sum + (p.amount || 0);
        }, 0);

        // Use actual paid amount from database (this is the source of truth for payments)
        const totalAmount = reservation.total_price || 0;
        const paidAmount = Math.min(actualPaidAmount, totalAmount);

        setPaidAmount(paidAmount);
        setIsFullyPaid(paidAmount >= totalAmount);

        // Update payment installments from reservation.payment_plan if available
        if (reservation.payment_plan && (reservation.payment_plan === 'full' || reservation.payment_plan === '2' || reservation.payment_plan === '3')) {
          setPaymentInstallments(reservation.payment_plan as 'full' | '2' | '3');
        }
      } catch (error) {
        console.error('Error loading payments:', error);
      } finally {
        _setLoadingPayments(false);
      }
    };

    if (isDetailsExpanded) {
      loadPayments();
      loadDocuments();
    }
  }, [reservation.id, reservation.total_price, isDetailsExpanded]);

  // Load contract and qualification card
  const loadDocuments = async () => {
    try {
      _setLoadingContract(true);
      _setLoadingCard(true);

      // Load contract
      try {
        const contracts = await contractService.listMyContracts();
        const contractData = contracts.find(c => c.reservation_id === reservation.id);
        _setContract(contractData || null);
      } catch (error) {
        console.error('Error loading contract:', error);
        _setContract(null);
      } finally {
        _setLoadingContract(false);
      }

      // Load qualification card
      try {
        const card = await qualificationCardService.getQualificationCard(reservation.id);
        _setQualificationCard(card);
      } catch (error) {
        console.error('Error loading qualification card:', error);
        _setQualificationCard(null);
      } finally {
        _setLoadingCard(false);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const _handleDownloadContract = async () => {
    try {
      _setDownloadingContract(true);
      await contractService.downloadContract(reservation.id);

      // Show important information about contract signing
      alert('WAŻNE:\n\n• Masz 2 dni na wgranie podpisanej umowy do systemu.\n• Możesz podpisać umowę odręcznie lub podpisem zaufanym.\n• MUSISZ odesłać PODPISANĄ umowę.');

      // Reload contract status after download
      await loadDocuments();
    } catch (error: any) {
      console.error('Error downloading contract:', error);
      alert(error.message || 'Nie udało się pobrać umowy. Spróbuj ponownie.');
    } finally {
      _setDownloadingContract(false);
    }
  };

  const _handleDownloadQualificationCard = async () => {
    try {
      _setDownloadingCard(true);
      await qualificationCardService.downloadQualificationCard(reservation.id);

      // Show important information about qualification card
      const hasSecondParent = reservation.parents_data && Array.isArray(reservation.parents_data) && reservation.parents_data.length > 1;
      alert(`WAŻNE INFORMACJE O KARCIE KWALIFIKACYJNEJ:\n\n` +
            `• Karta jest uzupełniona na podstawie rezerwacji.\n` +
            `• MUSISZ uzupełnić pozostałe dane: PESEL (jeśli nie został podany) oraz informacje o chorobach/zdrowiu.\n` +
            `• MUSISZ odesłać PODPISANĄ kartę kwalifikacyjną.\n` +
            `• Masz 2 dni na wgranie podpisanej karty do systemu.\n` +
            `• Możesz podpisać kartę odręcznie lub podpisem zaufanym.\n${
            hasSecondParent ? '• W karcie muszą być dane obojga rodziców/opiekunów.\n' : ''}`);

      // Reload card status after download
      await loadDocuments();
    } catch (error: any) {
      console.error('Error downloading qualification card:', error);
      alert(error.message || 'Nie udało się pobrać karty kwalifikacyjnej. Spróbuj ponownie.');
    } finally {
      _setDownloadingCard(false);
    }
  };

  // Get participant name
  const participantName = reservation.participant_first_name && reservation.participant_last_name
    ? `${reservation.participant_first_name} ${reservation.participant_last_name}`
    : 'Brak danych';

  // Format reservation number (e.g., REZ-2025-003)
  const formatReservationNumber = (reservationId: number, createdAt: string) => {
    const year = new Date(createdAt).getFullYear();
    const paddedId = String(reservationId).padStart(3, '0');
    return `REZ-${year}-${paddedId}`;
  };

  const reservationNumber = formatReservationNumber(reservation.id, reservation.created_at);

  // Get age
  const age = reservation.participant_age ? `${reservation.participant_age} lat` : 'Brak danych';

  // Get gender
  const gender = reservation.participant_gender || 'Brak danych';

  // Get city
  const city = reservation.participant_city || reservation.property_city || 'Brak danych';

  // Get camp name
  const campName = reservation.camp_name || 'Brak danych';

  // Get turnus name (property name)
  const _turnusName = reservation.property_name || 'Brak danych';

  // Get dates
  const dates = formatDateRange(reservation.property_start_date, reservation.property_end_date);

  // Get center/city
  const _center = reservation.property_city || 'Brak danych';

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
          <div className="flex items-center gap-2 sm:gap-3">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
              {participantName}
            </h3>
            <span className="text-xs sm:text-sm text-gray-500 font-medium">
              ({reservationNumber})
            </span>
          </div>
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
          {reservation.property_city && (
            <span className="text-xs sm:text-sm font-normal text-gray-600 ml-2">
              - {reservation.property_city}
            </span>
          )}
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
            onReservationUpdate={async (updatedReservation) => {
              // Reload reservation data to reflect changes
              try {
                const refreshedReservation = await reservationService.getReservation(reservation.id);
                // Force re-render by updating parent state if needed
                // For now, we'll reload the page to show updated data
                window.location.reload();
              } catch (error) {
                console.error('Error refreshing reservation:', error);
                // Still reload to show changes
                window.location.reload();
              }
            }}
          />

          <DashedLine />

          {/* Total Cost and Actions */}
          <div>
            <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Koszt całkowity</h5>

            {/* Detailed Payment Breakdown */}
            {!isFullyPaid && (
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Całkowity koszt:</span>
                  <span className="font-semibold text-gray-900">{reservation.total_price.toFixed(2)} PLN</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Całkowite wpływy:</span>
                  <span className="font-semibold text-gray-900">{paidAmount.toFixed(2)} PLN</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-700 font-medium">Pozostała kwota do zapłaty:</span>
                  <span className="font-bold text-[#03adf0]">{(reservation.total_price - paidAmount).toFixed(2)} PLN</span>
                </div>
              </div>
            )}

            {isFullyPaid && (
              <div className="text-xs sm:text-sm text-green-600 mb-3 sm:mb-4 font-semibold">
                ✅ Rezerwacja w pełni opłacona
              </div>
            )}

            {!isFullyPaid && (
              <>
                {/* Show online payment options only if online payments are enabled */}
                {onlinePaymentsEnabled && !loadingOnlinePaymentsStatus && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {/* Payment Installments Options - Left Side */}
                    <div className="space-y-2 sm:space-y-3">
                      <h6 className="text-xs sm:text-sm font-semibold text-gray-700">Wybierz sposób płatności:</h6>
                  <div className="space-y-2">
                    {/* Calculate remaining amount - disable other options if payment_plan is already set in database */}
                    {(() => {
                      const remainingAmount = reservation.total_price - paidAmount;
                      // Check if payment_plan is already saved in database
                      const savedPaymentPlan = reservation.payment_plan;
                      const isPlanLocked = !!savedPaymentPlan; // If payment_plan exists, lock other options

                      return (
                        <>
                          {/* Full Payment - disabled if payment_plan is '2' or '3' */}
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id={`installmentFull-${reservation.id}`}
                              name={`paymentInstallments-${reservation.id}`}
                              value="full"
                              checked={paymentInstallments === 'full'}
                              onChange={() => {
                                // Only update local state if plan is not locked
                                if (!isPlanLocked) {
                                  setPaymentInstallments('full');
                                }
                              }}
                              disabled={isPlanLocked && savedPaymentPlan !== 'full'}
                              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <label
                              htmlFor={`installmentFull-${reservation.id}`}
                              className={`text-xs sm:text-sm ${isPlanLocked && savedPaymentPlan !== 'full' ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}
                            >
                              Pełna płatność ({remainingAmount.toFixed(2)} zł)
                            </label>
                          </div>

                          {/* 2 Equal Installments - disabled if payment_plan is 'full' or '3' */}
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id={`installment2-${reservation.id}`}
                              name={`paymentInstallments-${reservation.id}`}
                              value="2"
                              checked={paymentInstallments === '2'}
                              onChange={() => {
                                // Only update local state if plan is not locked
                                if (!isPlanLocked) {
                                  setPaymentInstallments('2');
                                }
                              }}
                              disabled={isPlanLocked && savedPaymentPlan !== '2'}
                              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <label
                              htmlFor={`installment2-${reservation.id}`}
                              className={`text-xs sm:text-sm ${isPlanLocked && savedPaymentPlan !== '2' ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}
                            >
                              Płatność w dwóch ratach (po {(remainingAmount / 2).toFixed(2)} zł)
                            </label>
                          </div>

                          {/* 3 Equal Installments - disabled if payment_plan is 'full' or '2' */}
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id={`installment3-${reservation.id}`}
                              name={`paymentInstallments-${reservation.id}`}
                              value="3"
                              checked={paymentInstallments === '3'}
                              onChange={() => {
                                // Only update local state if plan is not locked
                                if (!isPlanLocked) {
                                  setPaymentInstallments('3');
                                }
                              }}
                              disabled={isPlanLocked && savedPaymentPlan !== '3'}
                              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <label
                              htmlFor={`installment3-${reservation.id}`}
                              className={`text-xs sm:text-sm ${isPlanLocked && savedPaymentPlan !== '3' ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}
                            >
                              Płatność w trzech ratach (po {(remainingAmount / 3).toFixed(2)} zł)
                            </label>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Pay Button - Right Side - only show if payment method is selected */}
                {paymentInstallments && (
                  <div className="flex items-end">
                    <button
                      onClick={async () => {
                        if (isProcessingPayment) return;

                        if (!paymentInstallments) {
                          alert('Proszę wybrać sposób płatności');
                          return;
                        }

                        setIsProcessingPayment(true);
                        try {
                          // Save payment plan to database BEFORE creating payment
                          await reservationService.updatePaymentPlan(reservation.id, paymentInstallments);

                          // Calculate remaining amount
                          const remainingAmount = reservation.total_price - paidAmount;

                          // Get payment amount based on selected installments and remaining amount
                          let paymentAmount = remainingAmount;
                          if (paymentInstallments === '2') {
                            paymentAmount = remainingAmount / 2;
                          } else if (paymentInstallments === '3') {
                            paymentAmount = remainingAmount / 3;
                          }

                          // Get payer data from reservation
                          const firstParent = reservation.parents_data && reservation.parents_data.length > 0
                            ? reservation.parents_data[0]
                            : null;

                          if (!firstParent || !firstParent.email) {
                            throw new Error('Brak danych płatnika (email) w rezerwacji');
                          }

                          const payerEmail = firstParent.email;
                          const payerName = firstParent.firstName && firstParent.lastName
                            ? `${firstParent.firstName} ${firstParent.lastName}`.trim()
                            : undefined;

                          // Create order ID
                          const orderId = `RES-${reservation.id}-${Date.now()}`;

                          // Determine installment number for description
                          let installmentDesc = '';
                          if (paymentInstallments === 'full') {
                            installmentDesc = 'Pełna płatność';
                          } else if (paymentInstallments === '2') {
                            // Count how many installment payments were made for this reservation
                            const installmentPayments = payments.filter(p =>
                              (p.status === 'paid' || p.status === 'success') &&
                              (p.description?.includes('Rata') || p.description?.includes('rata')),
                            );
                            const installmentNumber = installmentPayments.length + 1;
                            installmentDesc = `Rata ${installmentNumber}/2`;
                          } else if (paymentInstallments === '3') {
                            // Count how many installment payments were made for this reservation
                            const installmentPayments = payments.filter(p =>
                              (p.status === 'paid' || p.status === 'success') &&
                              (p.description?.includes('Rata') || p.description?.includes('rata')),
                            );
                            const installmentNumber = installmentPayments.length + 1;
                            installmentDesc = `Rata ${installmentNumber}/3`;
                          }

                          // Prepare payment request
                          const paymentRequest: CreatePaymentRequest = {
                            amount: paymentAmount,
                            description: `Rezerwacja obozu #${reservation.id} - ${installmentDesc}`,
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
                      disabled={isProcessingPayment || !paymentInstallments}
                      className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-[#03adf0] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessingPayment ? (
                        'Przetwarzanie...'
                      ) : (
                        (() => {
                          const remainingAmount = reservation.total_price - paidAmount;
                          let paymentAmount = remainingAmount;
                          if (paymentInstallments === '2') {
                            paymentAmount = remainingAmount / 2;
                          } else if (paymentInstallments === '3') {
                            paymentAmount = remainingAmount / 3;
                          }
                          return `zapłać ${paymentAmount.toFixed(2)} zł`;
                        })()
                      )}
                    </button>
                  </div>
                )}
              </div>
                )}

                {/* Show traditional transfer section only if online payments are disabled */}
                {!onlinePaymentsEnabled && !loadingOnlinePaymentsStatus && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 sm:p-6 rounded-lg">
                    <h6 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
                      Płatność przelewem tradycyjnym
                    </h6>
                    
                    {/* Calculate deposit: 500 zł + protections */}
                    {(() => {
                      const baseDeposit = 500;
                      // Calculate protection prices from reservation
                      let protectionTotal = 0;
                      if (reservation.selected_protection) {
                        const selectedProtections = Array.isArray(reservation.selected_protection)
                          ? reservation.selected_protection
                          : typeof reservation.selected_protection === 'string'
                            ? JSON.parse(reservation.selected_protection || '[]')
                            : [];
                        
                        // Protection prices: TARCZA = 110, OAZA = 80 (hardcoded for now)
                        selectedProtections.forEach((prot: string) => {
                          if (prot.includes('tarcza') || prot.includes('shield') || prot === 'protection-1') {
                            protectionTotal += 110;
                          } else if (prot.includes('oaza') || prot.includes('oasa') || prot === 'protection-2') {
                            protectionTotal += 80;
                          }
                        });
                      }
                      const totalDeposit = baseDeposit + protectionTotal;
                      
                      return (
                        <div className="space-y-3 sm:space-y-4">
                          <div className="bg-white p-3 sm:p-4 rounded border border-blue-200">
                            <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Zaliczka do wpłaty:</p>
                            <div className="space-y-1 text-xs sm:text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Zaliczka podstawowa:</span>
                                <span className="font-medium text-gray-900">{baseDeposit.toFixed(2)} zł</span>
                              </div>
                              {protectionTotal > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Ochrony:</span>
                                  <span className="font-medium text-gray-900">+{protectionTotal.toFixed(2)} zł</span>
                                </div>
                              )}
                              <div className="flex justify-between pt-2 border-t border-gray-200">
                                <span className="font-semibold text-gray-900">Razem zaliczka:</span>
                                <span className="font-bold text-[#03adf0]">{totalDeposit.toFixed(2)} zł</span>
                              </div>
                            </div>
                          </div>
                          
                          {bankAccount && (
                            <div className="bg-white p-3 sm:p-4 rounded border border-blue-200">
                              <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Dane do przelewu:</p>
                              <div className="space-y-1.5 text-xs sm:text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">Odbiorca:</span>
                                  <span className="ml-2 text-gray-900">{bankAccount.account_holder}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Numer konta:</span>
                                  <span className="ml-2 text-gray-900 font-mono">{bankAccount.account_number}</span>
                                </div>
                                {bankAccount.bank_name && (
                                  <div>
                                    <span className="font-medium text-gray-700">Bank:</span>
                                    <span className="ml-2 text-gray-900">{bankAccount.bank_name}</span>
                                  </div>
                                )}
                                {bankAccount.address && (
                                  <div>
                                    <span className="font-medium text-gray-700">Adres:</span>
                                    <span className="ml-2 text-gray-900">{bankAccount.address}</span>
                                  </div>
                                )}
                                {bankAccount.transfer_title_template && (
                                  <div className="pt-2 border-t border-gray-200">
                                    <span className="font-medium text-gray-700">Tytuł przelewu:</span>
                                    <p className="mt-1 text-gray-900 italic">{bankAccount.transfer_title_template}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>

          <DashedLine />
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

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';


import { useToast } from '@/components/ToastContainer';
import { reservationService, type ReservationResponse } from '@/lib/services/ReservationService';

import ReservationCard from './ReservationCard';

/**
 * CurrentReservations Component
 * Main component displaying current reservations list
 */
export default function CurrentReservations() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showSuccess, showWarning, showError } = useToast();

  // Check for payment status in query params
  useEffect(() => {
    const paymentStatus = searchParams?.get('payment');
    const reservationId = searchParams?.get('reservation_id');

    if (paymentStatus === 'success') {
      showSuccess('Płatność została pomyślnie zarezerwowana. Twoja rezerwacja jest teraz aktywna.', 8000);
      // Remove query params from URL without reload
      router.replace('/profil/aktualne-rezerwacje', { scroll: false });
    } else if (paymentStatus === 'failed') {
      showError('Płatność nie powiodła się. Proszę spróbować ponownie.', 8000);
      router.replace('/profil/aktualne-rezerwacje', { scroll: false });
    } else if (paymentStatus === 'pending') {
      showWarning('Płatność jest w trakcie przetwarzania. Sprawdzimy status i powiadomimy Cię.', 8000);
      router.replace('/profil/aktualne-rezerwacje', { scroll: false });
    }
  }, [searchParams, router, showSuccess, showWarning, showError]);

  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractsEnsured, setContractsEnsured] = useState(false);

  // Load user's reservations from API
  useEffect(() => {
    const loadReservations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await reservationService.getMyReservations(0, 100);

        // Map backend data to frontend format
        const mappedReservations = data.map((reservation: ReservationResponse) => {
          // Format dates - use property start_date and end_date if available
          let startDate: Date | null = null;
          let endDate: Date | null = null;
          let daysCount = 10; // Default

          // Try to parse property dates
          if (reservation.property_start_date) {
            const parsedStart = new Date(reservation.property_start_date);
            if (!isNaN(parsedStart.getTime())) {
              startDate = parsedStart;
            }
          }
          if (reservation.property_end_date) {
            const parsedEnd = new Date(reservation.property_end_date);
            if (!isNaN(parsedEnd.getTime())) {
              endDate = parsedEnd;
            }
          }

          // Calculate days count if both dates are valid
          if (startDate && endDate) {
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day
          }

          // Fallback: if no dates from property, use created_at as approximate
          if (!startDate && reservation.created_at) {
            const createdDate = new Date(reservation.created_at);
            if (!isNaN(createdDate.getTime())) {
              startDate = createdDate;
              endDate = new Date(startDate.getTime() + 9 * 24 * 60 * 60 * 1000); // Assume 10 days
            }
          }

          let datesStr = 'Brak dat';
          if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const formatDate = (date: Date) => {
              if (isNaN(date.getTime())) {
                return '??.??.????';
              }
              const day = date.getDate().toString().padStart(2, '0');
              const month = (date.getMonth() + 1).toString().padStart(2, '0');
              const year = date.getFullYear();
              return `${day}.${month}.${year}`;
            };
            datesStr = `${formatDate(startDate)} – ${formatDate(endDate)} (${daysCount} dni)`;
          }

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

          // Get resort
          const resort = reservation.property_name ? `Ośrodek: ${reservation.property_name}` : 'Brak danych';

          // Map status
          const statusMap: Record<string, string> = {
            'pending': 'Zarezerwowana',
            'confirmed': 'Potwierdzona',
            'cancelled': 'Anulowana',
            'completed': 'Zakończona',
          };
          const status = statusMap[reservation.status] || reservation.status;

          // Get parents/guardians data
          const parentsData = reservation.parents_data || [];

          // Return full reservation data
          return reservation;
        });

        // Filter: Only show current/upcoming reservations
        // - Not cancelled
        // - Not completed
        // - End date is in the future or today (camp hasn't ended yet)
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Set to start of day for comparison

        const currentReservations = data.filter((reservation) => {
          // Exclude cancelled reservations
          if (reservation.status === 'Anulowana' || reservation.status === 'cancelled') {
            return false;
          }

          // Exclude completed reservations
          if (reservation.status === 'Zakończona' || reservation.status === 'completed') {
            return false;
          }

          // Check end date - if available, only show if end date is today or in the future
          if (reservation.property_end_date) {
            const endDate = new Date(reservation.property_end_date);
            endDate.setHours(0, 0, 0, 0);
            // If end date is in the past, it's a past reservation
            if (endDate < now) {
              return false;
            }
          }

          return true;
        });

        // Sort by created_at descending (newest first)
        const sortedReservations = currentReservations.sort((a, b) => {
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return 0;
        });

        setReservations(sortedReservations);
      } catch (err) {
        console.error('Error loading reservations:', err);
        setError(err instanceof Error ? err.message : 'Nie udało się załadować rezerwacji');
        setReservations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadReservations();
  }, []);

  // Auto-generate contracts for loaded reservations (one pass; force generate per rezerwacja)
  useEffect(() => {
    const ensureContracts = async () => {
      if (contractsEnsured || reservations.length === 0) return;
      const { contractService } = await import('@/lib/services/ContractService');
      try {
        for (const res of reservations) {
          try {
            await contractService.generateContract(res.id);
          } catch (e) {
            console.warn('Auto-generation contract failed for reservation', res.id, e);
          }
        }
      } finally {
        setContractsEnsured(true);
      }
    };

    ensureContracts();
  }, [reservations, contractsEnsured]);

  return (
    <div>
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
        Aktualne rezerwacje
      </h2>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">
          Ładowanie rezerwacji...
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          {error}
        </div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Brak aktualnych rezerwacji
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {reservations.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} />
          ))}
        </div>
      )}
    </div>
  );
}
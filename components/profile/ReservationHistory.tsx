'use client';

import { useEffect, useState } from 'react';
import ReservationCard from './ReservationCard';
import { reservationService, type ReservationResponse } from '@/lib/services/ReservationService';

interface Reservation {
  id: string;
  participantName: string;
  status: string;
  age: string;
  gender: string;
  city: string;
  campName: string;
  dates: string;
  resort: string;
  parentsData?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneNumber: string;
    street: string;
    postalCode: string;
    city: string;
  }>;
}

/**
 * ReservationHistory Component
 * Displays completed/past reservations and cancelled reservations
 */
export default function ReservationHistory() {
  const [reservations, setReservations] = useState<ReservationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user's reservations from API
  useEffect(() => {
    const loadReservations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await reservationService.getMyReservations(0, 100);
        
        // Filter and process reservations for history view
        const processedReservations = data.map((reservation: ReservationResponse) => {
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
          
          // Return original reservation data (ReservationResponse)
          return reservation;
        });
        
        // Filter: Only show past/completed/cancelled reservations
        // - Cancelled reservations (always in history)
        // - Completed reservations (always in history)
        // - End date is in the past (camp has ended)
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Set to start of day for comparison
        
        const historyReservations = processedReservations.filter((reservation: ReservationResponse) => {
          // Include cancelled reservations
          if (reservation.status === 'cancelled') {
            return true;
          }
          
          // Include completed reservations
          if (reservation.status === 'completed') {
            return true;
          }
          
          // Check end date - if available, only show if end date is in the past
          if (reservation.property_end_date) {
            const endDate = new Date(reservation.property_end_date);
            endDate.setHours(0, 0, 0, 0);
            // If end date is in the past, it's a past reservation
            if (endDate < now) {
              return true;
            }
          }
          
          return false;
        });
        
        // Sort by created_at descending (newest first)
        const sortedReservations = historyReservations.sort((a, b) => {
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return 0;
        });
        
        setReservations(sortedReservations);
      } catch (err) {
        console.error('Error loading reservation history:', err);
        setError(err instanceof Error ? err.message : 'Nie udało się załadować historii rezerwacji');
        setReservations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadReservations();
  }, []);

  return (
    <div>
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
        Historia rezerwacji
      </h2>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">
          Ładowanie historii rezerwacji...
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          {error}
        </div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Brak historii rezerwacji
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




'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { reservationService, ReservationResponse } from '@/lib/services/ReservationService';
import ReservationMain from '@/components/profile/ReservationMain';
import ReservationSidebar from '@/components/profile/ReservationSidebar';

/**
 * Reservation Detail Page
 * Route: /profil/aktualne-rezerwacje/[id]
 * Displays a single reservation with all details expanded
 */
export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reservationNumber = params.id as string; // e.g., "REZ-2025-016"

  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get all user's reservations
        const reservations = await reservationService.getMyReservations(0, 100);

        // Find reservation by number
        const formatReservationNumber = (reservationId: number, createdAt: string) => {
          const year = new Date(createdAt).getFullYear();
          const paddedId = String(reservationId).padStart(3, '0');
          return `REZ-${year}-${paddedId}`;
        };

        const foundReservation = reservations.find((r: ReservationResponse) => {
          const rNumber = formatReservationNumber(r.id, r.created_at);
          return rNumber === reservationNumber;
        });

        if (!foundReservation) {
          setError('Rezerwacja nie została znaleziona');
          return;
        }

        setReservation(foundReservation);
      } catch (err) {
        console.error('Error fetching reservation:', err);
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania rezerwacji');
      } finally {
        setIsLoading(false);
      }
    };

    if (reservationNumber) {
      fetchReservation();
    }
  }, [reservationNumber]);

  // Dummy toggle function (not used, but required by ReservationMain)
  const handleToggleDetails = () => {
    router.push('/profil/aktualne-rezerwacje');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
          <div className="text-gray-500">Ładowanie rezerwacji...</div>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded max-w-md">
          <p className="text-sm text-red-700">{error || 'Rezerwacja nie została znaleziona'}</p>
          <button
            onClick={() => router.push('/profil/aktualne-rezerwacje')}
            className="mt-4 text-sm text-[#03adf0] hover:text-[#0288c7]"
          >
            ← Wróć do listy rezerwacji
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/profil/aktualne-rezerwacje')}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Wróć do listy rezerwacji</span>
        </button>

        {/* Reservation Card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Left: Main Content */}
            <div className="flex-1 p-3 sm:p-4 md:p-6">
              <ReservationMain
                reservation={reservation}
                isDetailsExpanded={true}
                onToggleDetails={handleToggleDetails}
              />
            </div>

            {/* Right: Sidebar */}
            <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 p-3 sm:p-4 md:p-6 bg-gray-50">
              <ReservationSidebar
                reservationId={String(reservation.id)}
                reservation={reservation}
                isDetailsExpanded={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


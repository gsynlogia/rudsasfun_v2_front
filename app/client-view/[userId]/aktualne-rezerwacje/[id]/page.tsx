'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import ReservationMain from '@/components/profile/ReservationMain';
import ReservationSidebar from '@/components/profile/ReservationSidebar';
import { reservationService, ReservationResponse } from '@/lib/services/ReservationService';

/**
 * Client View - Reservation Detail Page
 * Route: /client-view/[userId]/aktualne-rezerwacje/[id]
 * Admin viewing client's single reservation with all details expanded
 */
export default function ClientViewReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId ? parseInt(params.userId as string, 10) : undefined;
  const reservationNumber = params?.id ? String(params.id) : ''; // e.g., "REZ-2025-016"
  const basePath = userId ? `/client-view/${userId}` : '/profil';

  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get user's reservations (with view_as_user_id for admin)
        const reservations = await reservationService.getMyReservations(0, 100, userId);

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

    if (reservationNumber && userId) {
      fetchReservation();
    }
  }, [reservationNumber, userId]);

  // Dummy toggle function (not used, but required by ReservationMain)
  const handleToggleDetails = () => {
    router.push(`${basePath}/aktualne-rezerwacje`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mb-4"></div>
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
            onClick={() => router.push(`${basePath}/aktualne-rezerwacje`)}
            className="mt-4 text-sm text-amber-600 hover:text-amber-700"
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
          onClick={() => router.push(`${basePath}/aktualne-rezerwacje`)}
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
                basePath={basePath}
                onReservationUpdate={(updatedReservation) => {
                  setReservation(updatedReservation);
                }}
              />
            </div>

            {/* Right: Sidebar */}
            <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 p-3 sm:p-4 md:p-6 bg-gray-50">
              <ReservationSidebar
                reservationId={String(reservation.id)}
                reservation={reservation}
                isDetailsExpanded={true}
                basePath={basePath}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

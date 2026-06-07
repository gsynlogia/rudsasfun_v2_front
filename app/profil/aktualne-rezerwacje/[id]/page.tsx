'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useReservationPaymentHeader } from '@/contexts/ReservationPaymentHeaderContext';
import ReservationMain from '@/components/profile/ReservationMain';
import ReservationSidebar from '@/components/profile/ReservationSidebar';
import { reservationService, ReservationResponse } from '@/lib/services/ReservationService';

/**
 * Reservation Detail Page
 * Route: /profil/aktualne-rezerwacje/[id]
 * Displays a single reservation with all details expanded
 */
export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paymentHeaderCtx = useReservationPaymentHeader();
  const reservationNumber = params?.id ? String(params.id) : ''; // e.g., "REZ-2025-016"

  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use by-number for full cost breakdown (base_price, addons_data, diet_price, transport_price, etc.)
        const isRezFormat = /^REZ-\d{4}-\d+$/i.test(reservationNumber);
        if (isRezFormat) {
          const fullReservation = await reservationService.getReservationByNumber(reservationNumber);
          setReservation(fullReservation);
          return;
        }

        // Fallback: list + find by formatted number (e.g. numeric id in URL)
        const reservations = await reservationService.getMyReservations(0, 100);
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

  useEffect(() => {
    const isRez = /^REZ-\d{4}-\d+$/i.test(reservationNumber);
    if (isRez && reservationNumber) {
      paymentHeaderCtx?.setPaymentHeader({
        totalPrice: 0,
        totalPaid: 0,
        paymentStatus: 'unpaid',
        loading: true,
      });
    }
    return () => {
      paymentHeaderCtx?.setPaymentHeader(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationNumber]);

  useEffect(() => {
    if (!reservation) return;
    const total = Number(reservation.total_price) || 0;
    paymentHeaderCtx?.setPaymentHeader({
      totalPrice: total,
      totalPaid: 0,
      paymentStatus: 'unpaid',
      loading: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation?.id]);

  // Dummy toggle function (not used, but required by ReservationMain)
  const handleToggleDetails = () => {
    router.push('/profil/aktualne-rezerwacje');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
          <div className="mb-4 h-5 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 p-3 sm:p-4 md:p-6 space-y-4">
                <div className="h-7 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                <div className="flex gap-4 mt-4">
                  <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-4 w-full max-w-md bg-gray-200 rounded animate-pulse mt-6" />
                <div className="h-4 w-full max-w-sm bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 p-3 sm:p-4 md:p-6 bg-gray-50 space-y-3">
                <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse mt-4" />
              </div>
            </div>
          </div>
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
        <button
          onClick={() => router.push('/profil/aktualne-rezerwacje')}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Wróć do listy rezerwacji</span>
        </button>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 p-3 sm:p-4 md:p-6">
              <ReservationMain
                reservation={reservation}
                isDetailsExpanded={true}
                onToggleDetails={handleToggleDetails}
                onReservationUpdate={(updatedReservation) => setReservation(updatedReservation)}
              />
            </div>
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
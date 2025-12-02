'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReservationCard from './ReservationCard';
import { useToast } from '@/components/ToastContainer';

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
    const paymentStatus = searchParams.get('payment');
    const reservationId = searchParams.get('reservation_id');

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

  // TODO: Load reservations from API/sessionStorage
  const reservations = [
    {
      id: '1',
      participantName: 'Franciszek Kowalski',
      status: 'Zarezerwowana',
      age: '14 lat',
      gender: 'Mężczyzna / Male',
      city: 'Gdańsk',
      campName: 'Laserowy Paintball',
      dates: '12.07 – 21.07.2022 (10 dni)',
      resort: 'Ośrodek: Beaver',
    },
    {
      id: '2',
      participantName: 'Katarzyna Guzik',
      status: 'Zarezerwowana',
      age: '12 lat',
      gender: 'Kobieta / Female',
      city: 'Warszawa',
      campName: 'Laserowy Paintball',
      dates: '12.07 – 21.07.2022 (10 dni)',
      resort: 'Ośrodek: Beaver',
    },
  ];

  return (
    <div>
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
        Aktualne rezerwacje
      </h2>

      <div className="space-y-4 sm:space-y-6">
        {reservations.map((reservation) => (
          <ReservationCard key={reservation.id} reservation={reservation} />
        ))}
      </div>
    </div>
  );
}


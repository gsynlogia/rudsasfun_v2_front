'use client';

import { useParams } from 'next/navigation';
import { Suspense } from 'react';

import CurrentReservations from '@/components/profile/CurrentReservations';

/**
 * Client View - Aktualne Rezerwacje
 * Admin viewing client's current reservations
 */
export default function ClientViewCurrentReservationsPage() {
  const params = useParams();
  const userId = params?.userId ? parseInt(params.userId as string, 10) : undefined;

  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <CurrentReservations viewAsUserId={userId} />
    </Suspense>
  );
}
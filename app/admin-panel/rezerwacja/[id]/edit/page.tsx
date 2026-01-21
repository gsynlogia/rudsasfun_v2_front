'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Redirect from /admin-panel/rezerwacja/[id]/edit to /admin-panel/rezerwacja/[id]/edit/1/step
 */
export default function EditReservationRedirect() {
  const params = useParams();
  const router = useRouter();
  const reservationNumber = typeof params?.id === 'string'
    ? params.id
    : Array.isArray(params?.id)
      ? params.id[0]
      : '';

  useEffect(() => {
    if (!reservationNumber) return;
    router.replace(`/admin-panel/rezerwacja/${reservationNumber}/edit/1/step`);
  }, [reservationNumber, router]);

  return null;
}
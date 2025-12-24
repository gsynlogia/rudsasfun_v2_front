'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Redirect from /admin-panel/rezerwacja/[id]/edit to /admin-panel/rezerwacja/[id]/edit/1/step
 */
export default function EditReservationRedirect() {
  const params = useParams();
  const router = useRouter();
  const reservationNumber = params.id as string;

  useEffect(() => {
    router.replace(`/admin-panel/rezerwacja/${reservationNumber}/edit/1/step`);
  }, [reservationNumber, router]);

  return null;
}

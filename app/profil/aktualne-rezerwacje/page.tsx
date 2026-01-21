import { Suspense } from 'react';

import CurrentReservations from '@/components/profile/CurrentReservations';
import NotificationsStrip from '@/components/profile/NotificationsStrip';

/**
 * Current Reservations Page
 * Main view for user's current reservations
 */
export default function CurrentReservationsPage() {
  return (
    <>
      <NotificationsStrip />
      <Suspense fallback={<div>Ładowanie...</div>}>
        <CurrentReservations />
      </Suspense>
    </>
  );
}
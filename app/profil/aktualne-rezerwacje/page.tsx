import NotificationsStrip from '@/components/profile/NotificationsStrip';
import CurrentReservations from '@/components/profile/CurrentReservations';

/**
 * Current Reservations Page
 * Main view for user's current reservations
 */
export default function CurrentReservationsPage() {
  return (
    <>
      <NotificationsStrip />
      <CurrentReservations />
    </>
  );
}


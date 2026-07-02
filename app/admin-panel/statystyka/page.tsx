import { redirect } from 'next/navigation';

/**
 * /admin-panel/statystyka → przekierowanie na domyślną statystykę (obecności).
 * Gdy dojdą kolejne rodzaje statystyk, „statystyka-obecnosci" pozostaje domyślną podstroną.
 */
export default function StatystykaIndexPage() {
  redirect('/admin-panel/statystyka/statystyka-obecnosci');
}

import { redirect } from 'next/navigation';

/**
 * /admin-panel/transports → przekierowanie na domyślną zakładkę „Listy transportowe"
 * (zakładki są prawdziwymi ścieżkami URL — rozkaz Pana). Zakładka „Zarządzanie transportem"
 * pod /admin-panel/transports/zarzadzanie-transportami (tylko pełny admin).
 */
export default function TransportsIndexPage() {
  redirect('/admin-panel/transports/listy-transportowe');
}

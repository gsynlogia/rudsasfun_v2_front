/**
 * Funkcje formatujące dla strony szczegółów rezerwacji.
 *
 * TD-027: formatDateTime przeniesione do lib/utils/dateFormatters.ts (formatDateTimeNumeric).
 * Re-eksport zachowuje istniejący import path dla wstecznej kompatybilności (eliminacja
 * 3 duplikatów logiki formatDateTime w AneksPreview, DocumentVersionsList, formatters.ts).
 */
export { formatDateTimeNumeric as formatDateTime } from '@/lib/utils/dateFormatters';

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Brak danych';
  try {
    return new Date(dateString).toLocaleDateString('pl-PL');
  } catch {
    return 'Brak danych';
  }
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0.00 PLN';
  return `${amount.toFixed(2)} PLN`;
}
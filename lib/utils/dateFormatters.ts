/**
 * Date formatters — DRY helpers dla 3 wariantów formatowania timestamp w UI (TD-027).
 *
 * Wcześniej 3 osobne implementacje formatDateTime w:
 * - components/admin/AneksPreview.tsx (long+short, fallback "—")
 * - components/admin/DocumentVersionsList.tsx (short+short, fallback iso)
 * - app/admin-panel/rezerwacja/[id]/_reservation-detail/formatters.ts (numeric, Warsaw tz, fallback "Brak danych")
 *
 * Wszystkie pure functions — testowalne bez DOM/Next/auth/DB.
 * Każda obsługuje null/undefined/invalid iso bez throw (try/catch + sensible fallback).
 *
 * Strefa czasowa: 'Europe/Warsaw' (CLAUDE.md sekcja i18n — baza UTC, UI Warsaw).
 */

/**
 * Format numeryczny: "24.05.2026, 23:19" (day/month/year, hour/minute z timeZone Warsaw).
 * Używane: panel admin rezerwacji (signed_at, accepted_at), historia płatności.
 * Fallback: "Brak danych" (null/undefined/empty) lub raw iso (invalid).
 */
export function formatDateTimeNumeric(dateString: string | null | undefined): string {
  if (!dateString) return 'Brak danych';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      timeZone: 'Europe/Warsaw',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format długi: "24 maja 2026, 23:19" (dateStyle:long + timeStyle:short).
 * Używane: AneksPreview (nagłówek + admin_user_name + sporządzono).
 * Fallback: "—" (null/undefined/empty) lub raw iso (invalid).
 */
export function formatDateTimeLong(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

/**
 * Format krótki: "24.05.2026, 23:19" (dateStyle:short + timeStyle:short).
 * Używane: DocumentVersionsList (kafelki wersji dokumentów).
 * Fallback: raw iso (brak guard dla null — patrz formatDateTimeShortSafe poniżej).
 */
export function formatDateTimeShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

/**
 * Defensive wariant formatDateTimeShort z guard'em na null/undefined.
 * Używany gdzie iso może być undefined (np. payload aneksu signedAt).
 */
export function formatDateTimeShortSafe(iso: string | null | undefined): string {
  if (!iso) return '—';
  return formatDateTimeShort(iso);
}

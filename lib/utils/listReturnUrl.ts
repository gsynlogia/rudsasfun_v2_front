/**
 * BUG 001/002 (Ania Sąsiadek 2026-06-19): budowa URL powrotu (returnTo) dla tabeli rezerwacji/płatności.
 * MUSI brać AKTUALNY adres (window.location.search), bo filtry/wyszukiwarka ustawiane przez UI idą do URL
 * przez window.history.replaceState — co NIE odświeża hooka useSearchParams (stale). Branie z hooka gubiło
 * wyszukiwarkę i filtry przy powrocie ze szczegółów (wstecz przeglądarki i przyciskiem systemowym).
 * Pure (bez React/DOM) — testowalne w izolacji.
 */
export function buildListReturnUrl(
  currentSearch: string,
  pathname: string,
  sortColumn?: string | null,
  sortDir?: string | null,
): string {
  const params = new URLSearchParams(currentSearch || '');
  if (sortColumn) {
    params.set('sort_by', sortColumn);
    params.set('sort_dir', sortDir || 'desc');
  }
  const qs = params.toString();
  return (pathname || '/admin-panel') + (qs ? `?${qs}` : '');
}

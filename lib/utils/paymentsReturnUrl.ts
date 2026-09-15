/**
 * Buduje URL do szczegółów płatności rezerwacji z ZACHOWANYM parametrem `returnTo`.
 *
 * BUG „wyszukiwarka nie zapamiętuje nazwiska" (Trello): pod-strony wpłaty/faktury wracały do
 * szczegółów płatności bez `returnTo`, a szczegóły wchodziły w te pod-strony też bez niego.
 * Efekt: po dodaniu/edycji wpłaty przycisk „wstecz" na szczegółach gubił returnTo i wracał na
 * listę bez filtrów/wyszukiwarki (nazwisko „uciekało"). Ten helper przewleka returnTo przez cały
 * łańcuch: lista → szczegóły → wpłata/faktura → szczegóły → lista.
 *
 * Pure (bez React/DOM) — spójne z buildListReturnUrl.
 */
export function buildPaymentsDetailUrl(
  reservationNumber: string,
  returnTo?: string | null,
): string {
  const suffix = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
  return `/admin-panel/rezerwacja/${reservationNumber}/payments${suffix}`;
}

/**
 * Sufiks `?returnTo=...` (lub pusty) do doklejenia do URL pod-strony wpłaty/faktury,
 * gdy szczegóły płatności nawigują w głąb. Dzięki temu pod-strona zna adres powrotu na listę.
 */
export function returnToQuerySuffix(returnTo?: string | null): string {
  return returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
}
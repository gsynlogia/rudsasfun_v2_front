/**
 * Karta 193 (Trello): zgodność transportu „tam = powrót" — czy uczestnik jedzie na obóz i wraca
 * z tego samego miejsca/rodzaju. Pure function (testowalna bez DOM), wzór jak computeReservationStatusLabel.
 *
 * Zgodny  — oba kierunki własne, ALBO oba zbiorowe z tego samego miasta.
 * Różny   — rodzaje/miasta się różnią (np. tam zbiorowy z Warszawy, powrót własny).
 * „-"     — brak danych transportu.
 */
export function computeTransportMatch(r: {
  departure_type?: string | null;
  departure_city?: string | null;
  return_type?: string | null;
  return_city?: string | null;
}): string {
  const dType = (r.departure_type ?? '').trim().toLowerCase();
  const rType = (r.return_type ?? '').trim().toLowerCase();
  if (!dType && !rType) return '-';
  const dCity = (r.departure_city ?? '').trim().toLowerCase();
  const rCity = (r.return_city ?? '').trim().toLowerCase();
  if (dType === rType && (dType === 'wlasny' || dCity === rCity)) return 'Zgodny';
  return 'Różny';
}

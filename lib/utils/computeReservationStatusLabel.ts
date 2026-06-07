/**
 * Wylicza wyświetlany badge statusu rezerwacji w panelu klienta.
 *
 * Bug ESu7i2lt (Trello #209) — DOKŁADNY zakres karty:
 *   "Status powinien być:
 *    1) po podpisaniu przez klienta 'Oczekuje na weryfikację',
 *    2) po zatwierdzeniu przez admina 'Zweryfikowano'"
 *
 * TYLKO te 2 nowe wartości wprowadzamy. Wszystko inne (rejected, brak dokumentów,
 * inne lifecycle statusy) → fallback do `RAW_STATUS_LABELS` (jak przed fixem).
 *
 * Pola `contract_status` / `qualification_card_status` w `ReservationResponse`
 * są aktualizowane przez backend (signed_documents.py:574 + /api/reservations/my:1274).
 * Wartości: 'approved' | 'in_verification' | 'rejected' | 'pending' | null.
 *
 * Reguła agregacji (TYLKO dla status='pending'):
 *   - oba 'approved'                 → "Zweryfikowano"            (zielony)
 *   - którykolwiek 'in_verification' → "Oczekuje na weryfikację"  (zielony, w toku)
 *   - inne (rejected/null/pending)   → fallback "Zarezerwowana — oczekuje na dokumenty"
 *
 * Dla `status` innego niż 'pending' (confirmed/cancelled/completed) stan dokumentów
 * jest ignorowany — lifecycle ma pierwszeństwo.
 */

export interface ComputeReservationStatusInput {
  status: string;
  contract_status?: string | null;
  qualification_card_status?: string | null;
}

export type ReservationStatusColor = 'green' | 'red' | 'yellow' | 'gray';

export interface ReservationStatusLabel {
  text: string;
  color: ReservationStatusColor;
}

// Karta #209 — 3-stage flow z konsystentnymi kolorami (user explicit 2026-05-24:
// "jak jest Oczekuje na dokumenty to powinien by takim samym pomarańczowym jak ta kropka koło Umowy a nie na zielono"):
//   "Oczekuje na dokumenty"     → yellow (akcja klienta: podpisz)         — jak kropka sidebar gdy doc nie podpisany
//   "Oczekuje na weryfikację"   → yellow (akcja admin: zatwierdź/odrzuć)  — jak kropka sidebar gdy doc in_verification
//   "Zweryfikowano"             → green  (gotowe)                          — jak kropka sidebar gdy doc approved
const RAW_STATUS_LABELS: Record<string, ReservationStatusLabel> = {
  pending: { text: 'Oczekuje na dokumenty', color: 'yellow' },
  confirmed: { text: 'Potwierdzona — dokumenty zatwierdzone', color: 'green' },
  cancelled: { text: 'Anulowana', color: 'red' },
  completed: { text: 'Zakończona', color: 'gray' },
};

const FALLBACK: ReservationStatusLabel = { text: 'Nieznany status', color: 'gray' };

export function computeReservationStatusLabel(
  input: ComputeReservationStatusInput,
): ReservationStatusLabel {
  const { status, contract_status, qualification_card_status } = input;

  // Karta #209 wymaga DOKŁADNIE 2 nowych badge'y — tylko dla 'pending' (oryginalny
  // domyślny status rezerwacji który nigdy się nie aktualizuje).
  if (status === 'pending') {
    if (contract_status === 'approved' && qualification_card_status === 'approved') {
      return { text: 'Zweryfikowano', color: 'green' };
    }
    if (contract_status === 'in_verification' || qualification_card_status === 'in_verification') {
      // Pomarańczowy/żółty — analogicznie do kropki sidebar dla doc w trakcie weryfikacji.
      return { text: 'Oczekuje na weryfikację', color: 'yellow' };
    }
    // 'rejected', null, 'pending', inne — fallback "Oczekuje na dokumenty" (yellow).
  }

  return RAW_STATUS_LABELS[status] ?? FALLBACK;
}

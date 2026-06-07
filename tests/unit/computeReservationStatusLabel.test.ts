/**
 * Unit test helpera `computeReservationStatusLabel` — bug ESu7i2lt (Trello #209).
 *
 * Pure logic test bez DB, bez Next runtime, bez auth — zgodnie z krytyczną zasadą
 * CLAUDE.md "dekorator-pattern dla testowalności": helper to czysta funkcja
 * w `lib/utils/`, wywoływana bezpośrednio z testu.
 *
 * Komplement do test backend integracyjnego `_test_209.py` (8/8 PASS) który
 * portuje TĘ SAMĄ logikę w Pythonie i sprawdza przeciwko realnej bazie.
 * Tutaj testujemy TypeScript source — łapie literówki/regresje w helperze
 * których port Python by przeoczył.
 */
import { computeReservationStatusLabel } from '../../lib/utils/computeReservationStatusLabel';

describe('computeReservationStatusLabel', () => {
  describe('reservation.status = pending (główny scenariusz bug #209)', () => {
    it('oba approved → Zweryfikowano (green)', () => {
      expect(computeReservationStatusLabel({
        status: 'pending', contract_status: 'approved', qualification_card_status: 'approved',
      })).toEqual({ text: 'Zweryfikowano', color: 'green' });
    });

    it('contract in_verification, KK approved → Oczekuje na weryfikację (green)', () => {
      expect(computeReservationStatusLabel({
        status: 'pending', contract_status: 'in_verification', qualification_card_status: 'approved',
      })).toEqual({ text: 'Oczekuje na weryfikację', color: 'yellow' });
    });

    it('contract approved, KK in_verification → Oczekuje na weryfikację (green)', () => {
      expect(computeReservationStatusLabel({
        status: 'pending', contract_status: 'approved', qualification_card_status: 'in_verification',
      })).toEqual({ text: 'Oczekuje na weryfikację', color: 'yellow' });
    });

    it('oba in_verification (świeży podpis klienta) → Oczekuje na weryfikację (green)', () => {
      expect(computeReservationStatusLabel({
        status: 'pending', contract_status: 'in_verification', qualification_card_status: 'in_verification',
      })).toEqual({ text: 'Oczekuje na weryfikację', color: 'yellow' });
    });

    it('contract rejected, KK approved → fallback (karta #209 nie definiuje badge dla rejected)', () => {
      // Scope karty #209: TYLKO 'Zweryfikowano' (oba approved) + 'Oczekuje na weryfikację' (któryś in_verification).
      // Dla rejected zachowujemy status quo (fallback) — to NIE jest w zakresie #209.
      expect(computeReservationStatusLabel({
        status: 'pending', contract_status: 'rejected', qualification_card_status: 'approved',
      })).toEqual({ text: 'Oczekuje na dokumenty', color: 'yellow' });
    });

    it('KK rejected, contract in_verification → "Oczekuje na weryfikację" (in_verification ma pierwszeństwo nad rejected)', () => {
      // in_verification jest aktywnym stanem — informujemy klienta że trwa proces.
      // rejected dla drugiego dokumentu wymaga osobnej obsługi (poza #209).
      expect(computeReservationStatusLabel({
        status: 'pending', contract_status: 'in_verification', qualification_card_status: 'rejected',
      })).toEqual({ text: 'Oczekuje na weryfikację', color: 'yellow' });
    });

    it('oba rejected → fallback (poza #209)', () => {
      expect(computeReservationStatusLabel({
        status: 'pending', contract_status: 'rejected', qualification_card_status: 'rejected',
      })).toEqual({ text: 'Oczekuje na dokumenty', color: 'yellow' });
    });

    it('oba null (brak dokumentów) → fallback Zarezerwowana — oczekuje na dokumenty (green)', () => {
      expect(computeReservationStatusLabel({
        status: 'pending', contract_status: null, qualification_card_status: null,
      })).toEqual({ text: 'Oczekuje na dokumenty', color: 'yellow' });
    });

    it('oba undefined (pole nie wysłane przez API) → fallback (green)', () => {
      expect(computeReservationStatusLabel({
        status: 'pending',
      })).toEqual({ text: 'Oczekuje na dokumenty', color: 'yellow' });
    });

    it('contract pending (nieaktywne), KK null → fallback (green)', () => {
      expect(computeReservationStatusLabel({
        status: 'pending', contract_status: 'pending', qualification_card_status: null,
      })).toEqual({ text: 'Oczekuje na dokumenty', color: 'yellow' });
    });

    it('contract approved, KK null → fallback (oczekiwany pełen approved set)', () => {
      // świadoma decyzja: TYLKO gdy oba == 'approved' badge "Zweryfikowano".
      // jeśli KK null — fallback do "oczekuje na dokumenty".
      expect(computeReservationStatusLabel({
        status: 'pending', contract_status: 'approved', qualification_card_status: null,
      })).toEqual({ text: 'Oczekuje na dokumenty', color: 'yellow' });
    });
  });

  describe('reservation.status inne niż pending (lifecycle decyzja ma pierwszeństwo)', () => {
    it('confirmed + dokumenty rejected → Potwierdzona (ignorujemy dokumenty)', () => {
      // confirmed = świadoma decyzja admin/system → badge confirmed, dokumenty pomijane.
      expect(computeReservationStatusLabel({
        status: 'confirmed', contract_status: 'rejected', qualification_card_status: 'rejected',
      })).toEqual({ text: 'Potwierdzona — dokumenty zatwierdzone', color: 'green' });
    });

    it('cancelled → Anulowana (red)', () => {
      expect(computeReservationStatusLabel({
        status: 'cancelled', contract_status: 'approved', qualification_card_status: 'approved',
      })).toEqual({ text: 'Anulowana', color: 'red' });
    });

    it('completed → Zakończona (gray)', () => {
      expect(computeReservationStatusLabel({
        status: 'completed', contract_status: 'approved', qualification_card_status: 'approved',
      })).toEqual({ text: 'Zakończona', color: 'gray' });
    });

    it('unknown status (np. archived) → fallback Nieznany status (gray)', () => {
      expect(computeReservationStatusLabel({
        status: 'archived' as string,
      })).toEqual({ text: 'Nieznany status', color: 'gray' });
    });
  });
});

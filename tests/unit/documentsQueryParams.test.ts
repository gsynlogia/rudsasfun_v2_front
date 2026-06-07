/**
 * Unit test pure helpera `getDocumentsScopeParams` — Zadanie 2 (Ania 2026-06-01).
 *
 * Wymaganie: DOKUMENTY domyślnie pokazuje WSZYSTKIE rezerwacje; checkbox „Ukryj zatwierdzone"
 * (hideApproved=true) dopiero włącza `exclude_effective_reminders`. Tryb 'effective' bez zmian.
 */
import { getDocumentsScopeParams } from '../../lib/utils/documentsQueryParams';

describe('getDocumentsScopeParams', () => {
  describe('mode = active (dział DOKUMENTY)', () => {
    it('domyślnie (hideApproved=false) → BRAK exclude_effective_reminders (pokaż wszystkie)', () => {
      const p = getDocumentsScopeParams('active', { hideApproved: false });
      expect(p.exclude_effective_reminders).toBeUndefined();
    });

    it('bez opcji → też BRAK exclude (domyślnie wszystkie)', () => {
      const p = getDocumentsScopeParams('active');
      expect(p.exclude_effective_reminders).toBeUndefined();
    });

    it('hideApproved=true → exclude_effective_reminders=true (ukryj zatwierdzone)', () => {
      const p = getDocumentsScopeParams('active', { hideApproved: true });
      expect(p.exclude_effective_reminders).toBe('true');
    });

    it('active nigdy nie ustawia only_effective_reminders', () => {
      expect(getDocumentsScopeParams('active', { hideApproved: true }).only_effective_reminders).toBeUndefined();
      expect(getDocumentsScopeParams('active', { hideApproved: false }).only_effective_reminders).toBeUndefined();
    });
  });

  describe('mode = effective (Skuteczne powiadomienia) — bez zmian', () => {
    it('ustawia only_effective_reminders=true', () => {
      expect(getDocumentsScopeParams('effective').only_effective_reminders).toBe('true');
    });

    it('effectiveShowOrganic=true → dorzuca effective_show_organic', () => {
      expect(getDocumentsScopeParams('effective', { effectiveShowOrganic: true }).effective_show_organic).toBe('true');
    });

    it('nigdy nie ustawia exclude_effective_reminders', () => {
      expect(getDocumentsScopeParams('effective').exclude_effective_reminders).toBeUndefined();
    });
  });
});

/// <reference types="@testing-library/jest-dom" />
/**
 * TDD — karta Trello 004: umowa w panelu klienta „wiersz Promocje pusty mimo wyboru V2".
 *
 * Helper pure function buduje { name, amount } z promotion_v2_snapshot fetchowanego
 * w ContractForm (endpoint /api/v2/reservations/{id}/promotion-v2). Bez niego mapping
 * legacy (promotion_name/promotion_price) zwraca pusty string dla rezerwacji V2.
 *
 * Logika:
 * - promotion_v2_snapshot.nazwa + applied_promotion_discount > 0 → { name, amount: -applied }
 * - promotion_v2_snapshot.nazwa + applied_promotion_discount == 0 → { name, amount: null }
 *   (np. „Obozy na maxa" — deklaratywna promocja bez kwoty)
 * - brak snapshot / brak nazwa → null (fallback do legacy promotion_name w ContractForm)
 */
import { buildContractPromotionRow, ContractPromotionV2Snapshot } from '@/lib/buildContractPromotionRow';

describe('buildContractPromotionRow — karta 004', () => {
  it('snapshot V2 z nazwą i kwotą: { name, amount: -X }', () => {
    const snap: ContractPromotionV2Snapshot = {
      promotion_v2_id: 1,
      promotion_v2_snapshot: { nazwa: 'Rodzeństwo razem', opis: 'Dwoje dzieci' },
      applied_promotion_discount: 100,
    };
    expect(buildContractPromotionRow(snap)).toEqual({ name: 'Rodzeństwo razem', amount: -100 });
  });

  it('snapshot V2 z kwotą obciętą o 50% przez kod: widoczna zmniejszona kwota', () => {
    const snap: ContractPromotionV2Snapshot = {
      promotion_v2_id: 1,
      promotion_v2_snapshot: { nazwa: 'Rodzeństwo razem', reduced_by_code_50pct: true },
      applied_promotion_discount: 50,
    };
    expect(buildContractPromotionRow(snap)).toEqual({ name: 'Rodzeństwo razem', amount: -50 });
  });

  it('snapshot V2 z nazwą ale bez kwoty (deklaratywna): { name, amount: null }', () => {
    const snap: ContractPromotionV2Snapshot = {
      promotion_v2_id: 2,
      promotion_v2_snapshot: { nazwa: 'Obozy na maxa' },
      applied_promotion_discount: 0,
    };
    expect(buildContractPromotionRow(snap)).toEqual({ name: 'Obozy na maxa', amount: null });
  });

  it('brak promotion_v2_id: null', () => {
    const snap: ContractPromotionV2Snapshot = {
      promotion_v2_id: null,
      promotion_v2_snapshot: null,
      applied_promotion_discount: 0,
    };
    expect(buildContractPromotionRow(snap)).toBeNull();
  });

  it('brak snapshot (promo_code_only): null', () => {
    const snap: ContractPromotionV2Snapshot = {
      promotion_v2_id: null,
      promotion_v2_snapshot: null,
      applied_promotion_discount: 0,
    };
    expect(buildContractPromotionRow(snap)).toBeNull();
  });

  it('snapshot bez nazwy (inconsistent): null', () => {
    const snap: ContractPromotionV2Snapshot = {
      promotion_v2_id: 3,
      promotion_v2_snapshot: { opis: 'bez nazwy' },
      applied_promotion_discount: 0,
    };
    expect(buildContractPromotionRow(snap)).toBeNull();
  });

  it('null snapshot (argument): null', () => {
    expect(buildContractPromotionRow(null)).toBeNull();
  });

  it('nazwa z białymi znakami: trim', () => {
    const snap: ContractPromotionV2Snapshot = {
      promotion_v2_id: 4,
      promotion_v2_snapshot: { nazwa: '  Duża rodzina  ' },
      applied_promotion_discount: 150,
    };
    expect(buildContractPromotionRow(snap)).toEqual({ name: 'Duża rodzina', amount: -150 });
  });
});

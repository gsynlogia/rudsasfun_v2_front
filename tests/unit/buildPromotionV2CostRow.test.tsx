/// <reference types="@testing-library/jest-dom" />
/**
 * TDD — karta Trello 002: wiersz promocji V2 w „Szczegóły kosztów" panelu klienta
 * (ReservationMain.tsx). Helper pure function buduje { label, amount?, infoOnly? }
 * z PromotionV2Snapshot, analogicznie do buildPromoCodeCostRow (karta 006+007)
 * i buildContractPromotionRow (karta 004).
 */
import {
  buildPromotionV2CostRow,
} from '@/lib/buildPromotionV2CostRow';
import { PromotionV2Snapshot } from '@/lib/buildPromoCodeCostRow';

const EMPTY_SNAPSHOT: PromotionV2Snapshot = {
  promotion_system_version: 'v2',
  promotion_v2_id: null,
  promotion_v2_snapshot: null,
  promotion_v2_custom_values: null,
  promo_code_id: null,
  promo_code_snapshot: null,
  applied_promotion_discount: 0,
  applied_promo_code_discount: 0,
  total_price: 2900,
};

describe('buildPromotionV2CostRow — karta 002', () => {
  it('promocja z kwotą: wiersz z kwotą ujemną', () => {
    const row = buildPromotionV2CostRow({
      ...EMPTY_SNAPSHOT,
      promotion_v2_id: 7,
      promotion_v2_snapshot: { nazwa: 'Rodzeństwo razem' },
      applied_promotion_discount: 100,
    });
    expect(row).toEqual({ label: 'Promocja "Rodzeństwo razem"', amount: -100 });
  });

  it('promocja deklaratywna (kwota 0): infoOnly bez kwoty', () => {
    const row = buildPromotionV2CostRow({
      ...EMPTY_SNAPSHOT,
      promotion_v2_id: 8,
      promotion_v2_snapshot: { nazwa: 'Obozy na maxa' },
      applied_promotion_discount: 0,
    });
    expect(row).toEqual({ label: 'Promocja "Obozy na maxa"', infoOnly: true });
  });

  it('promocja obcięta o 50% przez kod: kwota wciąż widoczna (już po obcięciu)', () => {
    const row = buildPromotionV2CostRow({
      ...EMPTY_SNAPSHOT,
      promotion_v2_id: 7,
      promotion_v2_snapshot: { nazwa: 'Rodzeństwo razem', reduced_by_code_50pct: true },
      applied_promotion_discount: 50,
    });
    expect(row).toEqual({ label: 'Promocja "Rodzeństwo razem"', amount: -50 });
  });

  it('brak promotion_v2_id: null (legacy fallback)', () => {
    expect(buildPromotionV2CostRow(EMPTY_SNAPSHOT)).toBeNull();
  });

  it('null snapshot: null', () => {
    expect(buildPromotionV2CostRow(null)).toBeNull();
  });

  it('legacy (version != v2): null', () => {
    const row = buildPromotionV2CostRow({
      ...EMPTY_SNAPSHOT,
      promotion_system_version: 'legacy',
      promotion_v2_id: 9,
      promotion_v2_snapshot: { nazwa: 'Stara promocja' },
      applied_promotion_discount: 50,
    });
    expect(row).toBeNull();
  });

  it('brak nazwy w snapshot: null', () => {
    const row = buildPromotionV2CostRow({
      ...EMPTY_SNAPSHOT,
      promotion_v2_id: 10,
      promotion_v2_snapshot: { nazwa: '' },
      applied_promotion_discount: 80,
    });
    expect(row).toBeNull();
  });

  it('snapshot bez obiektu promotion_v2_snapshot (inconsistent): null', () => {
    const row = buildPromotionV2CostRow({
      ...EMPTY_SNAPSHOT,
      promotion_v2_id: 11,
      promotion_v2_snapshot: null,
      applied_promotion_discount: 100,
    });
    expect(row).toBeNull();
  });

  it('whitespace nazwa: null (po trim pusta)', () => {
    const row = buildPromotionV2CostRow({
      ...EMPTY_SNAPSHOT,
      promotion_v2_id: 12,
      promotion_v2_snapshot: { nazwa: '   ' },
      applied_promotion_discount: 80,
    });
    expect(row).toBeNull();
  });
});

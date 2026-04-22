/// <reference types="@testing-library/jest-dom" />
/**
 * TDD — karty Trello 006 + 007: wiersz kodu rabatowego w tabeli „Szczegóły kosztów"
 * w profilu klienta (ReservationMain.tsx). Helper pure function buduje { label, amount, infoOnly }
 * z PromotionV2Snapshot (analogicznie do buildRabat z karty 003).
 *
 * Scenariusze:
 * - obniza_cene: „Kod rabatowy XXX" + amount = -applied_discount (liczba ujemna)
 * - nie_obniza_ceny (bon): „Kod rabatowy XXX — {opis}" + infoOnly: true (wyświetla myślnik)
 * - atrakcja: „Kod rabatowy XXX (atrakcja) — {opis}" + infoOnly: true
 * - gadzet: „Kod rabatowy XXX (gadżet) — {opis}" + infoOnly: true
 * - brak kodu: null
 */
import { buildPromoCodeCostRow, PromotionV2Snapshot } from '@/lib/buildPromoCodeCostRow';

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

describe('buildPromoCodeCostRow — karty 006+007', () => {
  it('obniza_cene: wiersz z kwotą ujemną + opis w etykiecie', () => {
    const row = buildPromoCodeCostRow({
      ...EMPTY_SNAPSHOT,
      promo_code_id: 42,
      promo_code_snapshot: { kod: 'LATO2026', kategoria: 'obniza_cene', opis: 'Rabat 100 zł' },
      applied_promo_code_discount: 100,
    });
    expect(row).toEqual({ label: 'Kod rabatowy LATO2026 — Rabat 100 zł', amount: -100 });
  });

  it('obniza_cene bez opisu: sama nazwa kodu + kwota', () => {
    const row = buildPromoCodeCostRow({
      ...EMPTY_SNAPSHOT,
      promo_code_id: 49,
      promo_code_snapshot: { kod: 'LATO2026', kategoria: 'obniza_cene', opis: '' },
      applied_promo_code_discount: 80,
    });
    expect(row).toEqual({ label: 'Kod rabatowy LATO2026', amount: -80 });
  });

  it('nie_obniza_ceny (bon): infoOnly + opis w etykiecie', () => {
    const row = buildPromoCodeCostRow({
      ...EMPTY_SNAPSHOT,
      promo_code_id: 43,
      promo_code_snapshot: {
        kod: 'GOLDRABAT2026',
        kategoria: 'nie_obniza_ceny',
        opis: '120 zł do wykorzystania w sklepiku Radsas Fun',
      },
      applied_promo_code_discount: 0,
    });
    expect(row).toEqual({
      label: 'Kod rabatowy GOLDRABAT2026 — 120 zł do wykorzystania w sklepiku Radsas Fun',
      infoOnly: true,
    });
  });

  it('atrakcja: infoOnly + prefix (atrakcja) + opis', () => {
    const row = buildPromoCodeCostRow({
      ...EMPTY_SNAPSHOT,
      promo_code_id: 44,
      promo_code_snapshot: {
        kod: 'SKUTER2026',
        kategoria: 'atrakcja',
        opis: 'Przejażdżka skuterem wodnym',
      },
      applied_promo_code_discount: 0,
    });
    expect(row).toEqual({
      label: 'Kod rabatowy SKUTER2026 (atrakcja) — Przejażdżka skuterem wodnym',
      infoOnly: true,
    });
  });

  it('gadzet: infoOnly + prefix (gadżet) + opis', () => {
    const row = buildPromoCodeCostRow({
      ...EMPTY_SNAPSHOT,
      promo_code_id: 45,
      promo_code_snapshot: {
        kod: 'KOSZULKA2026',
        kategoria: 'gadzet',
        opis: 'Koszulka obozowa',
      },
      applied_promo_code_discount: 0,
    });
    expect(row).toEqual({
      label: 'Kod rabatowy KOSZULKA2026 (gadżet) — Koszulka obozowa',
      infoOnly: true,
    });
  });

  it('brak kodu (promo_code_id=null): null', () => {
    expect(buildPromoCodeCostRow(EMPTY_SNAPSHOT)).toBeNull();
  });

  it('legacy (version != v2): null', () => {
    const row = buildPromoCodeCostRow({
      ...EMPTY_SNAPSHOT,
      promotion_system_version: 'legacy',
      promo_code_id: 46,
      promo_code_snapshot: { kod: 'OLD', kategoria: 'obniza_cene', opis: '' },
    });
    expect(row).toBeNull();
  });

  it('brak opisu: fallback — sama kategoria bez em dash', () => {
    const row = buildPromoCodeCostRow({
      ...EMPTY_SNAPSHOT,
      promo_code_id: 47,
      promo_code_snapshot: { kod: 'BON_NO_DESC', kategoria: 'nie_obniza_ceny', opis: '' },
    });
    expect(row).toEqual({ label: 'Kod rabatowy BON_NO_DESC', infoOnly: true });
  });

  it('snapshot bez promo_code_snapshot (inconsistent): null', () => {
    const row = buildPromoCodeCostRow({
      ...EMPTY_SNAPSHOT,
      promo_code_id: 48,
      promo_code_snapshot: null,
    });
    expect(row).toBeNull();
  });
});

/**
 * TDD test dla helpera `computeConflictModalLabels` (karta Trello 002).
 *
 * Modal konfliktu „KOD nie łączy się z PROMOCJĄ" w Step 2 musi pokazać realne kwoty
 * DLA OBYDWU opcji, żeby klient mógł wybrać korzystniejszą:
 * - Promocja: fallback do `pendingPromotionId` gdy user dopiero wybiera promocję
 *   (dotąd było `selectedPromotionId` → gdy null, UI pokazywał -0 zł).
 * - Kod: gdy kategoria != 'obniza_cene' (bon/atrakcja/gadżet), zamiast „-0 zł"
 *   pokaż opis kodu (np. bon 120 zł do sklepiku).
 */
import { computeConflictModalLabels } from '@/components/step2/promotionConflictLabels';

const PROMOTIONS = [
  { id: 1, nazwa: 'Rodzeństwo razem', applied_discount: 70, kwota7: 50, kwota10: 70 },
  { id: 2, nazwa: 'Obozy na maxa', applied_discount: 140, kwota7: 100, kwota10: 140 },
];

describe('computeConflictModalLabels', () => {
  it('scenariusz B: user wpisał kod, dopiero wybiera promocję → pendingPromotionId daje kwotę promocji', () => {
    const { promotionLabel, codeLabel } = computeConflictModalLabels({
      selectedPromotionId: null,
      pendingPromotionId: 2, // user właśnie wybrał „Obozy na maxa"
      promotions: PROMOTIONS,
      pendingKod: { valid: true, kategoria: 'obniza_cene', discount: 80, opis: 'kod' },
      codeResult: null,
    });
    expect(promotionLabel).toMatch(/-140 zł/);
    expect(codeLabel).toMatch(/-80 zł/);
  });

  it('scenariusz A: kod kategoria != obniza_cene → zamiast -0 zł pokaż opis', () => {
    const { codeLabel } = computeConflictModalLabels({
      selectedPromotionId: 1,
      pendingPromotionId: null,
      promotions: PROMOTIONS,
      pendingKod: {
        valid: true, kategoria: 'gadzet', discount: 0, opis: '2 kubki Radsas Fun',
      },
      codeResult: null,
    });
    expect(codeLabel).not.toMatch(/-0 zł/);
    expect(codeLabel).toMatch(/2 kubki Radsas Fun/);
  });

  it('scenariusz A (bon): kategoria nie_obniza_ceny z opisem → pokaż opis w etykiecie', () => {
    const { codeLabel } = computeConflictModalLabels({
      selectedPromotionId: 1,
      pendingPromotionId: null,
      promotions: PROMOTIONS,
      pendingKod: {
        valid: true, kategoria: 'nie_obniza_ceny', discount: 0, opis: '120 zł w sklepiku',
      },
      codeResult: null,
    });
    expect(codeLabel).not.toMatch(/-0 zł/);
    expect(codeLabel).toMatch(/120 zł w sklepiku/);
  });

  it('happy path: obie promocja i kod obniza_cene mają kwoty', () => {
    const { promotionLabel, codeLabel } = computeConflictModalLabels({
      selectedPromotionId: 1,
      pendingPromotionId: null,
      promotions: PROMOTIONS,
      pendingKod: { valid: true, kategoria: 'obniza_cene', discount: 50 },
      codeResult: null,
    });
    expect(promotionLabel).toMatch(/-70 zł/);
    expect(codeLabel).toMatch(/-50 zł/);
  });

  it('fallback: gdy pendingKod null (hipotetyczny render bez danych), używa codeResult', () => {
    const { codeLabel } = computeConflictModalLabels({
      selectedPromotionId: 1,
      pendingPromotionId: null,
      promotions: PROMOTIONS,
      pendingKod: null,
      codeResult: { valid: true, kategoria: 'obniza_cene', discount: 30 },
    });
    expect(codeLabel).toMatch(/-30 zł/);
  });

  it('brak promocji i kodu → „-0 zł" dla obu (graceful)', () => {
    const { promotionLabel, codeLabel } = computeConflictModalLabels({
      selectedPromotionId: null,
      pendingPromotionId: null,
      promotions: PROMOTIONS,
      pendingKod: null,
      codeResult: null,
    });
    expect(promotionLabel).toMatch(/-0 zł/);
    expect(codeLabel).toMatch(/-0 zł/);
  });
});

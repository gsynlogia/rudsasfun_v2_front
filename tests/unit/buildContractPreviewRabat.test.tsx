/// <reference types="@testing-library/jest-dom" />
/**
 * TDD — karta Trello 003 (etap 2/3): buildContractFormDataFromSteps buduje pole `rabat`
 * z Step2FormData.promoCodeResult (sessionStorage).
 *
 * Step 4 Podgląd umowy nie ma reservationId — ContractForm nie fetchuje snapshotu.
 * Pole rabat MUSI przyjść z preview'u, żeby wiersz „Rabat:" się renderował
 * (warunkowy render `{rabatRow && ...}` w ContractForm).
 *
 * Logika label/amount jest identyczna z ContractForm.tsx:142-171 (dla kategorii kodu).
 */
import { buildContractFormDataFromSteps } from '@/lib/buildContractPreviewFromSteps';

// Minimalne fixture — tylko to co relevantne dla rabatu; buildContract obsługuje braki.
const makeStep2 = (promoCodeResult: any) => ({
  selectedDiets: [],
  selectedAddons: [],
  selectedProtection: [],
  selectedPromotion: null,
  selectedSource: null,
  promotionJustification: null,
  promotionV2Id: null,
  promotionV2CustomValues: null,
  promoCodeId: promoCodeResult?.promo_code_id ?? null,
  promoCodeResult,
  transportData: {
    departureType: 'wlasny',
    departureCity: '',
    returnType: 'wlasny',
    returnCity: '',
    differentCities: false,
  },
  inneText: null,
} as any);

describe('buildContractFormDataFromSteps — pole rabat (karta 003)', () => {
  it('nie ma kodu (promoCodeResult null) → rabat = undefined', () => {
    const data = buildContractFormDataFromSteps(null, makeStep2(null), null, null);
    expect(data.rabat).toBeUndefined();
  });

  it('kategoria obniza_cene + valid → rabat.label z kodem, amount = -discount', () => {
    const data = buildContractFormDataFromSteps(
      null,
      makeStep2({
        valid: true, type: 'prawidlowy', kod: 'LATO2026', kategoria: 'obniza_cene',
        discount: 100, message: '', message_color: 'green', promo_code_id: 5,
      }),
      null, null,
    );
    expect(data.rabat).toBeDefined();
    expect(data.rabat!.label).toMatch(/LATO2026/);
    expect(data.rabat!.amount).toBe(-100);
  });

  it('kategoria nie_obniza_ceny + opis → rabat.label zawiera opis, amount = null', () => {
    const data = buildContractFormDataFromSteps(
      null,
      makeStep2({
        valid: true, type: 'prawidlowy', kod: 'BON120', kategoria: 'nie_obniza_ceny',
        opis: '120 zł w sklepiku Radsas',
        discount: 0, message: '', message_color: 'green', promo_code_id: 7,
      }),
      null, null,
    );
    expect(data.rabat).toBeDefined();
    expect(data.rabat!.label).toMatch(/BON120/);
    expect(data.rabat!.label).toMatch(/120 zł w sklepiku/);
    expect(data.rabat!.amount).toBeNull();
  });

  it('kategoria atrakcja → rabat.label zawiera słowo „atrakcja", amount = null', () => {
    const data = buildContractFormDataFromSteps(
      null,
      makeStep2({
        valid: true, type: 'prawidlowy', kod: 'SKUTER', kategoria: 'atrakcja',
        opis: 'darmowy skuter wodny',
        discount: 0, message: '', message_color: 'green', promo_code_id: 8,
      }),
      null, null,
    );
    expect(data.rabat).toBeDefined();
    expect(data.rabat!.label).toMatch(/SKUTER/);
    expect(data.rabat!.label.toLowerCase()).toMatch(/atrakcj/);
    expect(data.rabat!.amount).toBeNull();
  });

  it('kategoria gadzet → rabat.label zawiera słowo „gadżet", amount = null', () => {
    const data = buildContractFormDataFromSteps(
      null,
      makeStep2({
        valid: true, type: 'prawidlowy', kod: '2KOTY', kategoria: 'gadzet',
        opis: '2 kubki Radsas Fun',
        discount: 0, message: '', message_color: 'green', promo_code_id: 11,
      }),
      null, null,
    );
    expect(data.rabat).toBeDefined();
    expect(data.rabat!.label).toMatch(/2KOTY/);
    expect(data.rabat!.label.toLowerCase()).toMatch(/gadżet/);
    expect(data.rabat!.amount).toBeNull();
  });

  it('edge case: kategoria obniza_cene + discount=0 → amount = null (nie pokazuj „-0 zł")', () => {
    const data = buildContractFormDataFromSteps(
      null,
      makeStep2({
        valid: true, type: 'prawidlowy', kod: 'ZERO', kategoria: 'obniza_cene',
        discount: 0, message: '', message_color: 'green', promo_code_id: 99,
      }),
      null, null,
    );
    expect(data.rabat).toBeDefined();
    expect(data.rabat!.amount).toBeNull();
  });

  it('promoCodeResult.valid = false → rabat = undefined (nieprawidłowy kod nie powinien wpaść do umowy)', () => {
    const data = buildContractFormDataFromSteps(
      null,
      makeStep2({
        valid: false, type: 'nieprawidlowy', kod: 'XXX',
        discount: 0, message: 'Kod nieprawidłowy.', message_color: 'red',
      }),
      null, null,
    );
    expect(data.rabat).toBeUndefined();
  });
});

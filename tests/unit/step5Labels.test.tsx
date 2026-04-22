/// <reference types="@testing-library/jest-dom" />
/**
 * TDD — karta Trello 008: Step 5 body „Promocje: Nie wybrano" pomimo że sidebar OK.
 *
 * Bug: [Step5.tsx:451-472 getPromotionLabel] ma guard `if (!step2Data.selectedPromotion) return '';`
 * na pierwszej linii. Dla rezerwacji V2 `selectedPromotion` (legacy) jest puste, więc funkcja
 * wychodzi z pustym stringiem zanim sprawdzi `reservation.items` (gdzie V2 promocja JEST
 * dodana przez addReservationItem z type='promotion').
 *
 * Poprawka: priorytet reservation.items (V2 + legacy oba tam są) > legacy hardcoded map.
 * Plus osobny helper dla kodu rabatowego (wiersz 2 w sekcji „Promocje").
 */
import {
  buildStep5PromotionLabel,
  buildStep5PromoCodeLabel,
  Step5PromoCodeResult,
} from '@/lib/step5Labels';

describe('buildStep5PromotionLabel — karta 008', () => {
  it('V2 z item typu promotion: zwraca name z item', () => {
    const items = [
      { id: 'base', name: 'Cena podstawowa', price: 2000, type: 'base' as const },
      { id: 'promotion-v2-1', name: 'Promocja "Rodzeństwo razem"', price: -100, type: 'promotion' as const },
    ];
    expect(buildStep5PromotionLabel(items, '')).toBe('Promocja "Rodzeństwo razem"');
  });

  it('legacy: selectedPromotion="rodzenstwo" + brak item → fallback do hardcoded nazwy', () => {
    expect(buildStep5PromotionLabel([], 'rodzenstwo')).toBe('Rodzeństwo razem');
    expect(buildStep5PromotionLabel([], 'wczesna')).toBe('Wczesna rezerwacja');
    expect(buildStep5PromotionLabel([], 'grupa')).toBe('Grupa 5+ osób');
  });

  it('V2 priorytet nad legacy: item wygrywa z selectedPromotion', () => {
    const items = [
      { id: 'promotion-v2-3', name: 'Promocja "Duża rodzina"', price: -200, type: 'promotion' as const },
    ];
    expect(buildStep5PromotionLabel(items, 'rodzenstwo')).toBe('Promocja "Duża rodzina"');
  });

  it('brak promocji (pusty items + pusty legacy): pusty string', () => {
    expect(buildStep5PromotionLabel([], '')).toBe('');
  });

  it('legacy nieznany klucz: pusty string', () => {
    expect(buildStep5PromotionLabel([], 'nieznana')).toBe('');
  });
});

describe('buildStep5PromoCodeLabel — karta 008', () => {
  it('obniza_cene: „Kod rabatowy KOD — opis (-X zł)"', () => {
    const r: Step5PromoCodeResult = {
      valid: true,
      kod: 'LATO2026',
      kategoria: 'obniza_cene',
      opis: 'Rabat 100 zł',
      discount: 100,
    };
    expect(buildStep5PromoCodeLabel(r)).toBe('Kod rabatowy LATO2026 — Rabat 100 zł (-100,00 zł)');
  });

  it('obniza_cene bez opisu: „Kod rabatowy KOD (-X zł)"', () => {
    const r: Step5PromoCodeResult = {
      valid: true,
      kod: 'LATO2026',
      kategoria: 'obniza_cene',
      opis: '',
      discount: 80,
    };
    expect(buildStep5PromoCodeLabel(r)).toBe('Kod rabatowy LATO2026 (-80,00 zł)');
  });

  it('nie_obniza_ceny (bon): „Kod rabatowy KOD — opis"', () => {
    const r: Step5PromoCodeResult = {
      valid: true,
      kod: 'GOLDRABAT2026',
      kategoria: 'nie_obniza_ceny',
      opis: '120 zł do wykorzystania w sklepiku',
    };
    expect(buildStep5PromoCodeLabel(r)).toBe('Kod rabatowy GOLDRABAT2026 — 120 zł do wykorzystania w sklepiku');
  });

  it('atrakcja: „Kod rabatowy KOD (atrakcja) — opis"', () => {
    const r: Step5PromoCodeResult = {
      valid: true,
      kod: 'SKUTER2026',
      kategoria: 'atrakcja',
      opis: 'Przejażdżka skuterem wodnym',
    };
    expect(buildStep5PromoCodeLabel(r)).toBe('Kod rabatowy SKUTER2026 (atrakcja) — Przejażdżka skuterem wodnym');
  });

  it('gadzet: „Kod rabatowy KOD (gadżet) — opis"', () => {
    const r: Step5PromoCodeResult = {
      valid: true,
      kod: 'KOSZULKA2026',
      kategoria: 'gadzet',
      opis: 'Koszulka obozowa',
    };
    expect(buildStep5PromoCodeLabel(r)).toBe('Kod rabatowy KOSZULKA2026 (gadżet) — Koszulka obozowa');
  });

  it('kod niewalidny: null', () => {
    const r: Step5PromoCodeResult = {
      valid: false,
      kod: 'BAD',
      kategoria: 'obniza_cene',
    };
    expect(buildStep5PromoCodeLabel(r)).toBeNull();
  });

  it('brak kodu (null result): null', () => {
    expect(buildStep5PromoCodeLabel(null)).toBeNull();
  });

  it('pusty kod: null', () => {
    expect(buildStep5PromoCodeLabel({ valid: true, kod: '', kategoria: 'obniza_cene' })).toBeNull();
  });
});

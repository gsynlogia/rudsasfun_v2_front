/**
 * Helper liczący etykiety przycisków w modalu konfliktu „KOD nie łączy się z PROMOCJĄ"
 * (Step 2, karta Trello 002). Wydzielony z komponentu dla testów jednostkowych.
 *
 * Kluczowe reguły:
 * - Promocja: preferuj `selectedPromotionId`, fallback do `pendingPromotionId` — gdy user
 *   wpisał kod PRZED wyborem promocji, modal i tak musi pokazać kwotę promocji którą właśnie
 *   wybiera (bez tego fallbacku pokazywało „-0 zł" bo selectedPromotionId był null).
 * - Kod: dla kategorii 'obniza_cene' etykieta ma kwotę w zł; dla pozostałych kategorii
 *   (bon/atrakcja/gadzet) kwota = 0 jest poprawna technicznie ale myląca — zamiast tego
 *   pokazujemy opis kodu (np. „120 zł w sklepiku").
 */

export interface PromotionLite {
  id: number;
  nazwa?: string;
  applied_discount?: number | null;
  kwota7?: number | null;
  kwota10?: number | null;
}

export interface CodeValidationLite {
  valid?: boolean;
  kategoria?: 'obniza_cene' | 'nie_obniza_ceny' | 'atrakcja' | 'gadzet';
  discount?: number;
  opis?: string;
}

export interface ConflictModalInputs {
  selectedPromotionId: number | null;
  pendingPromotionId: number | null;
  promotions: PromotionLite[];
  pendingKod: CodeValidationLite | null;
  codeResult: CodeValidationLite | null;
}

export interface ConflictModalLabels {
  promotionLabel: string;
  codeLabel: string;
}

export function computeConflictModalLabels(inputs: ConflictModalInputs): ConflictModalLabels {
  const previewPromoId = inputs.selectedPromotionId ?? inputs.pendingPromotionId;
  const previewPromo = inputs.promotions.find((p) => p.id === previewPromoId) || null;
  const promotionDiscount = previewPromo
    ? (previewPromo.applied_discount ?? previewPromo.kwota7 ?? 0)
    : 0;

  const previewKod = inputs.pendingKod || inputs.codeResult;
  const codeDiscount = previewKod?.discount || 0;
  const codeIsMonetary = previewKod?.kategoria === 'obniza_cene';

  const promotionLabel = `✓ Wybieram PROMOCJĘ -${promotionDiscount} zł`;

  let codeLabel: string;
  if (!previewKod || codeIsMonetary) {
    codeLabel = `🏷 Wybieram KOD RABATOWY -${codeDiscount} zł`;
  } else {
    codeLabel = `🏷 Wybieram KOD RABATOWY: ${previewKod.opis || previewKod.kategoria}`;
  }

  return { promotionLabel, codeLabel };
}

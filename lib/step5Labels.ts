import type { ReservationItem } from '@/types/reservationItem';

export interface Step5PromoCodeResult {
  valid: boolean;
  kod: string;
  kategoria?: 'obniza_cene' | 'nie_obniza_ceny' | 'atrakcja' | 'gadzet';
  opis?: string;
  discount?: number;
}

const LEGACY_PROMOTIONS: Record<string, string> = {
  rodzenstwo: 'Rodzeństwo razem',
  wczesna: 'Wczesna rezerwacja',
  grupa: 'Grupa 5+ osób',
};

export function buildStep5PromotionLabel(
  reservationItems: ReservationItem[],
  legacySelectedPromotion: string,
): string {
  const promotionItem = reservationItems.find((item) => item.type === 'promotion');
  if (promotionItem) return promotionItem.name;
  if (legacySelectedPromotion && LEGACY_PROMOTIONS[legacySelectedPromotion]) {
    return LEGACY_PROMOTIONS[legacySelectedPromotion];
  }
  return '';
}

function formatPlnAmount(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} zł`;
}

export function buildStep5PromoCodeLabel(result: Step5PromoCodeResult | null): string | null {
  if (!result || !result.valid || !result.kod) return null;
  const opis = (result.opis ?? '').trim();
  const suffix = opis ? ` — ${opis}` : '';

  switch (result.kategoria) {
    case 'obniza_cene': {
      const discount = Math.abs(result.discount ?? 0);
      return `Kod rabatowy ${result.kod}${suffix} (-${formatPlnAmount(discount)})`;
    }
    case 'atrakcja':
      return `Kod rabatowy ${result.kod} (atrakcja)${suffix}`;
    case 'gadzet':
      return `Kod rabatowy ${result.kod} (gadżet)${suffix}`;
    case 'nie_obniza_ceny':
    default:
      return `Kod rabatowy ${result.kod}${suffix}`;
  }
}

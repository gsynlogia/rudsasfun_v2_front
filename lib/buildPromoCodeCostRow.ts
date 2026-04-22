export interface PromotionV2Snapshot {
  promotion_system_version: string;
  promotion_v2_id: number | null;
  promotion_v2_snapshot: {
    nazwa?: string;
    opis?: string;
    applied_discount?: number;
    reduced_by_code_50pct?: boolean;
  } | null;
  promotion_v2_custom_values: Record<string, string | number | boolean> | null;
  promo_code_id: number | null;
  promo_code_snapshot: {
    kod?: string;
    kategoria?: 'obniza_cene' | 'nie_obniza_ceny' | 'atrakcja' | 'gadzet';
    opis?: string;
    applied_discount?: number;
    promocja_mode?: 'laczy' | 'nie_laczy' | 'obniza_promocje_50';
  } | null;
  applied_promotion_discount: number;
  applied_promo_code_discount: number;
  total_price: number;
}

export interface PromoCodeCostRow {
  label: string;
  amount?: number;
  infoOnly?: boolean;
}

export function buildPromoCodeCostRow(snapshot: PromotionV2Snapshot | null): PromoCodeCostRow | null {
  if (!snapshot) return null;
  if (snapshot.promotion_system_version !== 'v2') return null;
  if (!snapshot.promo_code_id) return null;
  const code = snapshot.promo_code_snapshot;
  if (!code || !code.kod) return null;

  const kod = code.kod;
  const opis = (code.opis ?? '').trim();
  const suffix = opis ? ` — ${opis}` : '';

  switch (code.kategoria) {
    case 'obniza_cene':
      return { label: `Kod rabatowy ${kod}${suffix}`, amount: -Math.abs(snapshot.applied_promo_code_discount) };
    case 'atrakcja':
      return { label: `Kod rabatowy ${kod} (atrakcja)${suffix}`, infoOnly: true };
    case 'gadzet':
      return { label: `Kod rabatowy ${kod} (gadżet)${suffix}`, infoOnly: true };
    case 'nie_obniza_ceny':
    default:
      return { label: `Kod rabatowy ${kod}${suffix}`, infoOnly: true };
  }
}

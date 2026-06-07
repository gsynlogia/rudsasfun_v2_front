import { PromotionV2Snapshot } from './buildPromoCodeCostRow';

export interface PromotionV2CostRow {
  label: string;
  amount?: number;
  infoOnly?: boolean;
}

export function buildPromotionV2CostRow(
  snapshot: PromotionV2Snapshot | null,
): PromotionV2CostRow | null {
  if (!snapshot) return null;
  if (snapshot.promotion_system_version !== 'v2') return null;
  if (!snapshot.promotion_v2_id) return null;
  const nazwa = (snapshot.promotion_v2_snapshot?.nazwa ?? '').trim();
  if (!nazwa) return null;
  const applied = snapshot.applied_promotion_discount ?? 0;
  if (applied > 0) {
    return { label: `Promocja "${nazwa}"`, amount: -applied };
  }
  return { label: `Promocja "${nazwa}"`, infoOnly: true };
}

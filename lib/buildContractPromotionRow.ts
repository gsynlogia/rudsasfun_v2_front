export interface ContractPromotionV2Snapshot {
  promotion_v2_id: number | null;
  promotion_v2_snapshot: {
    nazwa?: string;
    opis?: string;
    applied_discount?: number;
    reduced_by_code_50pct?: boolean;
  } | null;
  applied_promotion_discount: number;
}

export interface ContractPromotionRow {
  name: string;
  amount: number | null;
}

export function buildContractPromotionRow(
  snapshot: ContractPromotionV2Snapshot | null,
): ContractPromotionRow | null {
  if (!snapshot || !snapshot.promotion_v2_id) return null;
  const nazwa = (snapshot.promotion_v2_snapshot?.nazwa ?? '').trim();
  if (!nazwa) return null;
  const applied = snapshot.applied_promotion_discount ?? 0;
  return { name: nazwa, amount: applied > 0 ? -applied : null };
}

import type { ReservationResponse } from '@/lib/services/ReservationService';

import { buildPromoCodeCostRow, PromotionV2Snapshot } from './buildPromoCodeCostRow';
import { buildPromotionV2CostRow } from './buildPromotionV2CostRow';

/**
 * Jeden wiersz podziału kosztów rezerwacji (etykieta + kwota lub „tylko informacyjnie").
 */
export interface CostRow {
  label: string;
  amount?: number;
  infoOnly?: boolean;
}

/**
 * Buduje wiersze „Szczegóły kosztów" rezerwacji (cena podstawowa, dieta, dodatki, ochrony,
 * transport, promocja v2/legacy, kod rabatowy). Pure — wspólne dla podsumowania w aktualnej
 * rezerwacji (ReservationMain) ORAZ sekcji „Płatności i Faktury" (Trello: pokazać ten sam podział).
 *
 * `promoV2Snapshot` pobierany osobno z GET /api/v2/reservations/{id}/promotion-v2 (może być null).
 * Zwraca [] gdy nie ma czego pokazać.
 */
export function buildReservationCostRows(
  reservation: ReservationResponse,
  promoV2Snapshot: PromotionV2Snapshot | null,
): CostRow[] {
  const hasBase = (reservation.base_price ?? 0) > 0;
  const hasDiet = !!reservation.diet_name && (reservation.diet_price ?? 0) !== 0;
  const hasAddons = !!reservation.addons_data && reservation.addons_data.length > 0;
  const hasProtection =
    !!reservation.selected_protection &&
    reservation.selected_protection.length > 0 &&
    !!reservation.protection_names &&
    !!reservation.protection_prices;
  const hasTransport = (reservation.transport_price ?? 0) > 0;
  const hasLegacyPromotion = !!reservation.promotion_name;
  const promotionV2Row = buildPromotionV2CostRow(promoV2Snapshot);
  const promoCodeRow = buildPromoCodeCostRow(promoV2Snapshot);

  const showBreakdown =
    hasBase || hasDiet || hasAddons || hasProtection || hasTransport || hasLegacyPromotion || !!promotionV2Row || !!promoCodeRow;
  if (!showBreakdown) return [];

  const rows: CostRow[] = [];

  if (hasBase) {
    rows.push({ label: 'Cena podstawowa', amount: reservation.base_price! });
  }
  if (hasDiet) {
    rows.push({ label: reservation.diet_name!, amount: reservation.diet_price ?? 0 });
  }
  if (hasAddons) {
    for (const addon of reservation.addons_data!) {
      rows.push({ label: addon.name, amount: addon.price });
    }
  }
  if (hasProtection) {
    for (const id of reservation.selected_protection!) {
      const name = reservation.protection_names![id] ?? reservation.protection_names![String(id)];
      if (!name) continue;
      const price = reservation.protection_prices![name.toLowerCase()] ?? 0;
      rows.push({ label: name, amount: price });
    }
  }
  if (hasTransport) {
    const dep =
      reservation.departure_type === 'wlasny' ? 'Własny transport' : (reservation.departure_city ?? '');
    const ret =
      reservation.return_type === 'wlasny' ? 'Własny transport' : (reservation.return_city ?? '');
    rows.push({ label: `Transport (WYJAZD: ${dep} / POWRÓT: ${ret})`, amount: reservation.transport_price! });
  }
  if (promotionV2Row) {
    rows.push(promotionV2Row);
  } else if (hasLegacyPromotion) {
    if (reservation.promotion_does_not_reduce_price) {
      rows.push({ label: `${reservation.promotion_name} – nie obniża ceny`, infoOnly: true });
    } else if ((reservation.promotion_price ?? 0) !== 0) {
      rows.push({ label: reservation.promotion_name!, amount: -Math.abs(reservation.promotion_price ?? 0) });
    } else {
      rows.push({ label: reservation.promotion_name!, infoOnly: true });
    }
  }
  if (promoCodeRow) {
    rows.push(promoCodeRow);
  }

  return rows;
}

/**
 * Formatowanie kwoty wiersza podziału: dodatnie z „+", ujemne bez.
 */
export function formatCostRowAmount(amount: number): string {
  if (amount >= 0) return `+${amount.toFixed(2)} zł`;
  return `${amount.toFixed(2)} zł`;
}
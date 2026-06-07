'use client';

import { useEffect, useState } from 'react';
import { Tag, Gift, Star } from 'lucide-react';

import LegacyPromotionBanner from '@/components/promotion/LegacyPromotionBanner';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Snapshot {
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
  // Bug Trello vS5tDGy3 — info o legacy promocji (gdy rezerwacja jest z systemu v1).
  // Panel klienta pokazuje to READ-ONLY (bez przycisków akcji — kasowanie tylko z admin panel).
  legacy_kind?: 'promotion' | 'promo_code' | 'fm_deprecated' | null;
  legacy_name?: string | null;
  legacy_amount?: number | null;
  legacy_v2_equivalent_id?: number | null;
  legacy_deprecated_reason?: string | null;
}

interface Props {
  reservationId: number;
  authToken?: string | null;
}

export default function PromotionV2Snapshot({ reservationId, authToken }: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/v2/reservations/${reservationId}/promotion-v2`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setSnapshot(data);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [reservationId, authToken]);

  if (loading) return null;
  if (!snapshot) return null;

  // Bug Trello vS5tDGy3 — render legacy banner gdy rezerwacja v1.
  // Jeśli oba światy puste (nie v2 i bez legacy) — nic nie renderujemy (jak dotychczas).
  const hasV2 = snapshot.promotion_system_version === 'v2' && (snapshot.promotion_v2_id || snapshot.promo_code_id);
  const hasLegacy = !!snapshot.legacy_kind;
  if (!hasV2 && !hasLegacy) return null;

  const promo = snapshot.promotion_v2_snapshot;
  const code = snapshot.promo_code_snapshot;

  const kategoriaIcon = {
    obniza_cene: <Tag className="w-5 h-5" />,
    nie_obniza_ceny: <Gift className="w-5 h-5" />,
    atrakcja: <Star className="w-5 h-5" />,
    gadzet: <Gift className="w-5 h-5" />,
  };
  const kategoriaLabel = {
    obniza_cene: 'Kod obniża cenę',
    nie_obniza_ceny: 'Bon',
    atrakcja: 'Darmowa atrakcja',
    gadzet: 'Darmowy gadżet',
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-green-50 border border-blue-200 rounded-xl p-5 space-y-4">
      <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
        <Tag className="w-5 h-5 text-[#00adee]" /> Promocje i Rabaty
      </h3>

      {/* Bug vS5tDGy3 — banner legacy READ-ONLY (panel klienta, bez akcji) */}
      {hasLegacy && snapshot.legacy_kind && snapshot.legacy_name && (
        <LegacyPromotionBanner
          kind={snapshot.legacy_kind}
          name={snapshot.legacy_name}
          amount={snapshot.legacy_amount ?? null}
          deprecatedReason={snapshot.legacy_deprecated_reason}
          readOnly
        />
      )}

      {promo && snapshot.promotion_v2_id && (
        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{promo.nazwa}</p>
              {promo.opis && <p className="text-sm text-gray-600">{promo.opis}</p>}
              {promo.reduced_by_code_50pct && (
                <p className="text-xs text-orange-600 mt-1 italic">Obniżona o 50% przez kod rabatowy</p>
              )}
              {snapshot.promotion_v2_custom_values && Object.keys(snapshot.promotion_v2_custom_values).length > 0 && (
                <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                  {Object.entries(snapshot.promotion_v2_custom_values).map(([k, v]) => (
                    <p key={k}><span className="font-medium">{k}:</span> {String(v)}</p>
                  ))}
                </div>
              )}
            </div>
            <p className="text-lg font-bold text-[#00adee] whitespace-nowrap">-{snapshot.applied_promotion_discount.toFixed(2)} zł</p>
          </div>
        </div>
      )}

      {code && snapshot.promo_code_id && (
        <div className="bg-white rounded-lg p-4 border border-green-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-600">{kategoriaIcon[code.kategoria || 'obniza_cene']}</span>
                <span className="font-mono font-semibold text-gray-800">{code.kod}</span>
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">{kategoriaLabel[code.kategoria || 'obniza_cene']}</span>
              </div>
              {code.opis && <p className="text-sm text-gray-600 mt-1">{code.opis}</p>}
            </div>
            {code.kategoria === 'obniza_cene' && (
              <p className="text-lg font-bold text-green-600 whitespace-nowrap">-{snapshot.applied_promo_code_discount.toFixed(2)} zł</p>
            )}
          </div>
        </div>
      )}

      {/* Sekcja "Razem po rabatach" tylko gdy mamy v2 (dla legacy total_price w innej sekcji) */}
      {hasV2 && (
        <div className="flex items-center justify-between pt-2 border-t border-blue-200">
          <span className="text-sm font-medium text-gray-700">Razem po rabatach:</span>
          <span className="text-xl font-bold text-gray-800">{snapshot.total_price.toFixed(2)} zł</span>
        </div>
      )}
    </div>
  );
}

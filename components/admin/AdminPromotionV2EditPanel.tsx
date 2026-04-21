'use client';

/**
 * AdminPromotionV2EditPanel (karta Trello 001) — panel admina pozwalający ustawić/zmienić/usunąć
 * promocję V2 i kod rabatowy w konkretnej rezerwacji przez PATCH /api/v2/reservations/{id}/promotion-v2.
 *
 * Backend po zapisie automatycznie wystawi aneks (annex_service), jeśli umowa ma status 'accepted'
 * i snapshot przed/po się różnią — panel jedynie triggeruje zmianę; aneks + email informacyjny
 * powstają niezależnie.
 */
import { useEffect, useMemo, useState } from 'react';

interface PromotionV2 {
  id: number;
  nazwa: string;
  kwota7: number | null;
  kwota10: number | null;
  wymaga_uzasadnienia?: boolean;
  custom_fields?: Array<{ id?: number; label: string; field_type: string; required?: boolean; help_text?: string | null; placeholder?: string | null }>;
}

interface PromoCodeLite {
  id: number;
  kod: string;
  kategoria: 'obniza_cene' | 'nie_obniza_ceny' | 'atrakcja' | 'gadzet';
  kwota7?: number | null;
  kwota10?: number | null;
  promocja_mode: 'laczy' | 'nie_laczy' | 'obniza_promocje_50';
  status: string;
}

interface Props {
  reservationId: number;
  authToken: string | null;
  currentPromotionId: number | null;
  currentPromoCodeId: number | null;
  onSaved?: () => void;
}

export default function AdminPromotionV2EditPanel({
  reservationId, authToken, currentPromotionId, currentPromoCodeId, onSaved,
}: Props) {
  const [promotions, setPromotions] = useState<PromotionV2[]>([]);
  const [codes, setCodes] = useState<PromoCodeLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotionId, setPromotionId] = useState<number | null>(currentPromotionId);
  const [promoCodeId, setPromoCodeId] = useState<number | null>(currentPromoCodeId);
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || '';
  const authHeader: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [resPromos, resCodes] = await Promise.all([
          fetch(`${API}/api/v2/promotions/`, { headers: authHeader }),
          fetch(`${API}/api/v2/promo-codes/`, { headers: authHeader }),
        ]);
        if (!resPromos.ok) throw new Error(`Promocje: ${resPromos.status}`);
        if (!resCodes.ok) throw new Error(`Kody: ${resCodes.status}`);
        const [listPromos, listCodes] = await Promise.all([resPromos.json(), resCodes.json()]);
        if (cancelled) return;
        setPromotions(Array.isArray(listPromos) ? listPromos : []);
        setCodes(Array.isArray(listCodes) ? listCodes : []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Nie udało się pobrać listy promocji/kodów');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [API, authToken]);

  const selectedPromo = useMemo(
    () => promotions.find((p) => p.id === promotionId) || null,
    [promotions, promotionId],
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v2/reservations/${reservationId}/promotion-v2`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          promotion_v2_id: promotionId,
          promo_code_id: promoCodeId,
          custom_values: Object.keys(customValues).length > 0 ? customValues : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Błąd zapisu (${res.status})`);
      }
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać zmiany');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Ładowanie listy promocji i kodów…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">
        Edycja promocji i kodu rabatowego
      </h3>
      <p className="text-xs text-gray-600 mb-3">
        Zmiana wystawia automatycznie aneks do umowy (gdy umowa podpisana) i informacyjny email do klienta.
      </p>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Promocja</span>
          <select
            aria-label="Promocja"
            value={promotionId ?? ''}
            onChange={(e) => {
              setPromotionId(e.target.value ? parseInt(e.target.value, 10) : null);
              setCustomValues({});
            }}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">— brak —</option>
            {promotions.map((p) => (
              <option key={p.id} value={p.id}>{p.nazwa}</option>
            ))}
          </select>
        </label>

        {selectedPromo?.wymaga_uzasadnienia && (selectedPromo.custom_fields || []).length > 0 && (
          <div className="border border-yellow-200 rounded-md p-3 bg-yellow-50 space-y-3">
            {(selectedPromo.custom_fields || []).map((f) => (
              <label key={f.id || f.label} className="block">
                <span className="text-xs font-medium text-gray-700">
                  {f.label}{f.required && <span className="text-red-500"> *</span>}
                </span>
                {f.field_type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={!!customValues[f.label]}
                    onChange={(e) => setCustomValues({ ...customValues, [f.label]: e.target.checked })}
                    className="mt-1"
                  />
                ) : (
                  <input
                    type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                    value={String(customValues[f.label] ?? '')}
                    onChange={(e) => setCustomValues({ ...customValues, [f.label]: e.target.value })}
                    placeholder={f.placeholder || ''}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                )}
              </label>
            ))}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Kod rabatowy</span>
          <select
            aria-label="Kod rabatowy"
            value={promoCodeId ?? ''}
            onChange={(e) => setPromoCodeId(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">— brak —</option>
            {codes.filter((c) => c.status === 'aktywny').map((c) => (
              <option key={c.id} value={c.id}>
                {c.kod} [{c.kategoria}]
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#03adf0] text-white rounded-md text-sm font-medium hover:bg-[#0288c7] disabled:opacity-50"
          >
            {saving ? 'Zapisywanie…' : 'Zapisz zmianę'}
          </button>
          <button
            type="button"
            onClick={() => {
              setPromotionId(null);
              setPromoCodeId(null);
              setCustomValues({});
            }}
            className="px-4 py-2 bg-white text-gray-700 rounded-md text-sm border border-gray-300 hover:bg-gray-50"
          >
            Wyczyść wybór
          </button>
        </div>
      </div>
    </div>
  );
}

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
  // Tekst wpisany / wybrany w polu kodu (datalist). Pusty = brak kodu. Nieznany = walidacja przy zapisie.
  const [codeInput, setCodeInput] = useState<string>('');
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

  // Inicjalizacja pola kodu po załadowaniu listy kodów (jeśli rezerwacja już ma kod, pokaż go).
  useEffect(() => {
    if (currentPromoCodeId && codes.length > 0) {
      const match = codes.find((c) => c.id === currentPromoCodeId);
      if (match) setCodeInput(match.kod);
    }
  }, [currentPromoCodeId, codes]);

  const selectedPromo = useMemo(
    () => promotions.find((p) => p.id === promotionId) || null,
    [promotions, promotionId],
  );

  // Walidacja pola kodu: pusty = brak kodu (OK); wpisany tekst musi pasować do znanego kodu (case-insensitive).
  const resolveCodeIdFromInput = (): { id: number | null; error: string | null } => {
    const trimmed = codeInput.trim();
    if (!trimmed) return { id: null, error: null };
    const match = codes.find((c) => c.kod.toLowerCase() === trimmed.toLowerCase());
    if (!match) return { id: null, error: `Nieznany kod rabatowy: "${trimmed}"` };
    return { id: match.id, error: null };
  };

  const handleSave = async () => {
    const codeResolve = resolveCodeIdFromInput();
    if (codeResolve.error) {
      setError(codeResolve.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v2/reservations/${reservationId}/promotion-v2`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          promotion_v2_id: promotionId,
          promo_code_id: codeResolve.id,
          custom_values: Object.keys(customValues).length > 0 ? customValues : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Błąd zapisu (${res.status})`);
      }
      setPromoCodeId(codeResolve.id);
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
          <span className="block text-sm font-medium text-gray-700 mb-1">Promocja</span>
          <select
            aria-label="Promocja"
            value={promotionId ?? ''}
            onChange={(e) => {
              setPromotionId(e.target.value ? parseInt(e.target.value, 10) : null);
              setCustomValues({});
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#00adee] focus:ring-2 focus:ring-[#00adee]/20"
          >
            <option value="">— brak —</option>
            {promotions.map((p) => (
              <option key={p.id} value={p.id}>{p.nazwa}</option>
            ))}
          </select>
        </label>

        {selectedPromo?.wymaga_uzasadnienia && (selectedPromo.custom_fields || []).length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg border border-[#00adee]/20 space-y-3">
            {(selectedPromo.custom_fields || []).map((f) => (
              <label key={f.id || f.label} className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">
                  {f.label}{f.required && <span className="text-red-500"> *</span>}
                </span>
                {f.field_type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={!!customValues[f.label]}
                    onChange={(e) => setCustomValues({ ...customValues, [f.label]: e.target.checked })}
                    className="w-4 h-4 text-[#00adee] border-gray-300 rounded"
                  />
                ) : (
                  <input
                    type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                    value={String(customValues[f.label] ?? '')}
                    onChange={(e) => setCustomValues({ ...customValues, [f.label]: e.target.value })}
                    placeholder={f.placeholder || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#00adee]"
                  />
                )}
              </label>
            ))}
          </div>
        )}

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Kod rabatowy</span>
          <input
            aria-label="Kod rabatowy"
            list={`admin-promo-codes-${reservationId}`}
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="— brak / wpisz lub wybierz z listy —"
            autoComplete="off"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:border-green-600"
          />
          <datalist id={`admin-promo-codes-${reservationId}`}>
            {codes.filter((c) => c.status === 'aktywny').map((c) => (
              <option key={c.id} value={c.kod}>
                {c.kod} [{c.kategoria}]
              </option>
            ))}
          </datalist>
          <p className="text-xs text-gray-500 mt-1 italic">
            Pole puste = brak kodu. Wpisuj, żeby filtrować listę aktywnych kodów.
          </p>
        </label>

        {error && <p className="text-xs mt-2 text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#00adee] text-white rounded-md hover:bg-[#0099d6] text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? 'Zapisywanie…' : 'Zapisz zmianę'}
          </button>
          <button
            type="button"
            onClick={() => {
              setPromotionId(null);
              setPromoCodeId(null);
              setCodeInput('');
              setCustomValues({});
              setError(null);
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
          >
            Wyczyść wybór
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import type { PromotionV2, PromoCode } from '@/components/admin/PromotionsV2Dashboard';

interface ValidationResponse {
  valid: boolean;
  type: 'prawidlowy' | 'nieprawidlowy' | 'nie_laczy_z_promocja';
  kod: string;
  kategoria?: PromoCode['kategoria'];
  opis?: string;
  discount?: number;
  promocja_mode?: PromoCode['promocja_mode'];
  message: string;
  message_color: 'green' | 'red';
  requires_conflict_modal?: boolean;
  promo_code_id?: number;
}

export interface PromotionAndCodeSelection {
  promotion_v2_id: number | null;
  promotion_v2_custom_values: Record<string, string | number | boolean> | null;
  promo_code_id: number | null;
  promo_code_result: ValidationResponse | null;
  // Uproszczone pola do wyświetlenia w sidebar "Twoja rezerwacja" (task 0002 §16.A4).
  // Wyliczenie kwota7/kwota10 zgodne z days_count turnusu w §16.A6.
  promotion_v2_name: string | null;
  promotion_v2_discount: number;
}

interface Props {
  propertyId: number;
  userEmail?: string | null;
  initial?: Partial<PromotionAndCodeSelection>;
  onChange: (selection: PromotionAndCodeSelection) => void;
  apiBaseUrl?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function PromotionsAndRabatySection({ propertyId, userEmail, initial, onChange }: Props) {
  const [promotions, setPromotions] = useState<PromotionV2[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(true);
  const [selectedPromotionId, setSelectedPromotionId] = useState<number | null>(initial?.promotion_v2_id ?? null);
  const [customValues, setCustomValues] = useState<Record<string, string | number | boolean>>(
    (initial?.promotion_v2_custom_values as Record<string, string | number | boolean>) || {}
  );

  const [kodInput, setKodInput] = useState('');
  const [codeResult, setCodeResult] = useState<ValidationResponse | null>(initial?.promo_code_result ?? null);
  const [pendingKod, setPendingKod] = useState<ValidationResponse | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingPromos(true);
      try {
        // §16.A6 — property_id pozwala backendowi wyliczyć applied_discount zgodne z days_count turnusu
        const url = `${API}/api/v2/promotions/available/list${propertyId ? `?property_id=${propertyId}` : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        setPromotions(Array.isArray(data) ? data : []);
      } finally {
        setLoadingPromos(false);
      }
    })();
  }, [propertyId]);

  // Auto-fill kod z query param ?promo_code=X (Faza 7e — auto-fill link)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paramKod = params.get('promo_code');
    if (paramKod && !codeResult) {
      setKodInput(paramKod.toUpperCase());
      setTimeout(() => validateCode(paramKod), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const promo = promotions.find((p) => p.id === selectedPromotionId) || null;
    // §16.A6 — preferuj applied_discount (zgodne z days_count turnusu) z backendu,
    // fallback do kwota7 gdy lista pobrana bez property_id (np. w teście)
    const discount = promo ? (promo.applied_discount ?? promo.kwota7 ?? 0) : 0;
    onChange({
      promotion_v2_id: selectedPromotionId,
      promotion_v2_custom_values: Object.keys(customValues).length > 0 ? customValues : null,
      promo_code_id: codeResult?.promo_code_id ?? null,
      promo_code_result: codeResult,
      promotion_v2_name: promo?.nazwa ?? null,
      promotion_v2_discount: discount,
    });
  }, [selectedPromotionId, customValues, codeResult, onChange, promotions]);

  const selectedPromo = promotions.find((p) => p.id === selectedPromotionId);

  const handlePromotionChange = (newId: number | null) => {
    // Jeśli jest aktywny kod z promocja_mode='nie_laczy' i wybieramy promocję → pokaż modal
    if (newId && codeResult && codeResult.valid && codeResult.promocja_mode === 'nie_laczy') {
      setPendingKod(codeResult);
      // Tymczasowo nie ustawiaj — czekaj na decyzję w modalu
      setPendingPromotionId(newId);
      return;
    }
    setSelectedPromotionId(newId);
    setCustomValues({});
  };

  const [pendingPromotionId, setPendingPromotionId] = useState<number | null>(null);

  const validateCode = async (rawKod?: string) => {
    const kodToValidate = (rawKod ?? kodInput).trim();
    if (!kodToValidate) return;
    setValidating(true);
    try {
      const res = await fetch(`${API}/api/v2/promo-codes/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kod: kodToValidate,
          property_id: propertyId,
          user_email: userEmail || null,
          has_promotion: !!selectedPromotionId,
          promotion_v2_id: selectedPromotionId,
        }),
      });
      const result: ValidationResponse = await res.json();
      if (result.requires_conflict_modal) {
        setPendingKod(result);
      } else if (result.valid) {
        setCodeResult(result);
      } else {
        setCodeResult(result); // nieprawidlowy — pokaż komunikat ale nie zapisuj jako aktywny
      }
    } catch {
      setCodeResult({
        valid: false, type: 'nieprawidlowy', kod: kodToValidate,
        message: 'Błąd walidacji. Spróbuj ponownie.', message_color: 'red',
      });
    } finally {
      setValidating(false);
    }
  };

  const removeCode = () => {
    setCodeResult(null);
    setKodInput('');
  };

  // Modal rozstrzygnięcie konfliktu
  const resolveConflict = (choice: 'promotion' | 'code') => {
    if (!pendingKod) return;
    if (choice === 'code') {
      setSelectedPromotionId(null);
      setCustomValues({});
      setCodeResult(pendingKod);
      setPendingPromotionId(null);
    } else {
      // Wybiera promocję — usuń kod, ewentualnie ustaw pending promotion
      setCodeResult(null);
      setKodInput('');
      if (pendingPromotionId) {
        setSelectedPromotionId(pendingPromotionId);
        setCustomValues({});
        setPendingPromotionId(null);
      }
    }
    setPendingKod(null);
  };

  // §16.A6 — applied_discount z backendu (per days_count); fallback kwota7 tylko gdy lista bez property_id
  const promotionDiscount = selectedPromo ? (selectedPromo.applied_discount ?? selectedPromo.kwota7 ?? 0) : 0;
  const codeDiscount = codeResult?.discount || 0;

  // P0-4: wystaw globalny walidator — Step2.validateStep2 używa go, żeby zablokować
  // przejście gdy promocja wymaga uzasadnienia a wymagane pola są puste.
  useEffect(() => {
    const isValid = (): boolean => {
      if (!selectedPromo) return true;
      if (!selectedPromo.wymaga_uzasadnienia) return true;
      const requiredFields = (selectedPromo.custom_fields || []).filter((f) => f.required);
      return requiredFields.every((f) => {
        const v = customValues[f.label];
        if (f.field_type === 'checkbox') return v === true;
        if (v === undefined || v === null) return false;
        return typeof v === 'string' ? v.trim().length > 0 : true;
      });
    };
    (window as any).validatePromotionsAndRabaty = isValid;
    return () => {
      delete (window as any).validatePromotionsAndRabaty;
    };
  }, [selectedPromo, customValues]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Promocje i Rabaty</h3>

      {loadingPromos ? (
        <div className="text-sm text-gray-500">Ładowanie promocji…</div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Wybierz promocję, która Ci przysługuje</label>
            <select
              value={selectedPromotionId ?? ''}
              onChange={(e) => handlePromotionChange(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#00adee]"
            >
              <option value="">Brak promocji</option>
              {promotions.map((p) => {
                // §16.A6 — etykieta opcji używa applied_discount (dla bieżącego turnusu) jeśli dostępne
                const kwota = p.applied_discount ?? p.kwota7;
                return (
                  <option key={p.id} value={p.id}>
                    {p.nazwa}{kwota ? ` -${kwota} zł` : ''}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-gray-500 mt-2">Promocje nie łączą się. Możesz wybrać tylko jedną promocję.</p>
          </div>

          {selectedPromo && selectedPromo.wymaga_uzasadnienia && selectedPromo.custom_fields.length > 0 && (
            <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50 space-y-4">
              {selectedPromo.custom_fields.map((f) => (
                <div key={f.id || f.label}>
                  {f.help_text && <p className="text-sm text-gray-600 mb-2">{f.help_text}</p>}
                  {f.field_type === 'checkbox' ? (
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!customValues[f.label]}
                        onChange={(e) => setCustomValues({ ...customValues, [f.label]: e.target.checked })}
                        required={f.required}
                        className="w-4 h-4 mt-0.5 text-[#00adee] rounded"
                      />
                      <span className="text-sm text-gray-700">{f.label}{f.required && <span className="text-red-500"> *</span>}</span>
                    </label>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        {f.label}{f.required && <span className="text-red-500"> *</span>}
                      </label>
                      <input
                        type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                        value={String(customValues[f.label] ?? '')}
                        onChange={(e) => setCustomValues({ ...customValues, [f.label]: e.target.value })}
                        placeholder={f.placeholder || ''}
                        required={f.required}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#00adee]"
                      />
                      {f.required && !customValues[f.label] && <p className="text-xs text-red-600 mt-1">To pole jest wymagane</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Kod rabatowy</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={kodInput}
                onChange={(e) => setKodInput(e.target.value.toUpperCase())}
                placeholder="Wpisz kod rabatowy"
                disabled={!!codeResult?.valid}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#00adee] disabled:bg-gray-100 font-mono"
              />
              {codeResult?.valid ? (
                <button onClick={removeCode} className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-medium whitespace-nowrap">
                  Usuń kod
                </button>
              ) : (
                <button onClick={() => validateCode()} disabled={validating || !kodInput}
                  className="px-6 py-2 bg-[#00adee] text-white rounded-md hover:bg-[#0099d6] font-medium whitespace-nowrap disabled:opacity-50">
                  {validating ? '…' : 'Zatwierdź'}
                </button>
              )}
            </div>
            {codeResult && (
              <p className={`text-sm font-medium mt-2 ${codeResult.message_color === 'green' ? 'text-green-600' : 'text-red-600'}`}>
                {codeResult.message}
              </p>
            )}
          </div>
        </div>
      )}

      {pendingKod && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white to-red-50/30 rounded-2xl shadow-2xl border-2 border-red-200 max-w-lg w-full p-8 relative">
            <button onClick={() => setPendingKod(null)} className="absolute top-4 right-4 text-gray-400 hover:text-red-600">×</button>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg text-white text-3xl">!</div>
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-3 text-center">Wybrany KOD nie łączy się z PROMOCJĄ</h2>
            <p className="text-center text-gray-600 mb-8 text-sm">Wybierz korzystniejszą dla siebie opcję:</p>
            <div className="space-y-3">
              <button onClick={() => resolveConflict('promotion')} className="w-full py-3 px-6 bg-gradient-to-r from-[#00adee] to-[#0099d6] text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition">
                ✓ Wybieram PROMOCJĘ -{promotionDiscount} zł
              </button>
              <button onClick={() => resolveConflict('code')} className="w-full py-3 px-6 bg-white text-gray-800 border-2 border-[#00adee] rounded-xl font-bold shadow hover:scale-[1.02] transition">
                🏷 Wybieram KOD RABATOWY -{codeDiscount} zł
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

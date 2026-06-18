'use client';

/**
 * AdminPromotionV2EditPanel (karta Trello 001 + vS5tDGy3 + QMrhckg3) — panel admina pozwalający
 * ustawić/zmienić/usunąć promocję V2 i kod rabatowy w konkretnej rezerwacji.
 *
 * 3 tryby renderowania zależnie od `snap.legacy_kind`:
 *  - brak legacy (v2 lub legacy bez selected_promotion) → standardowy panel V2 (selektor + input)
 *  - legacy_kind='promotion' → banner NAD selektorem "Promocja: Duża Rodzina -100 zł (stary system)"
 *  - legacy_kind='promo_code' → banner NAD inputem "Kod rabatowy: Bon Platynowy 160 zł (stary system)"
 *  - legacy_kind='fm_deprecated' → banner NAD selektorem "First Minute (wycofana) -170 zł"
 * W każdym trybie legacy: czerwony przycisk "Usuń starą promocję" (DELETE /legacy-promotion).
 *
 * Backend po zapisie automatycznie wystawi aneks (annex_service) jeśli umowa accepted + diff.
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

import { useToast } from '@/components/ToastContainer';
import LegacyPromotionBanner from '@/components/promotion/LegacyPromotionBanner';
import { authenticatedFetch } from '@/lib/utils/api';

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
  onSaved?: () => void;
}

// Bug vS5tDGy3 + QMrhckg3 — pola legacy zwracane przez backend /promotion-v2 endpoint.
// Wypełniane przez resolve_legacy_promotion() gdy rezerwacja używa starego systemu.
interface LegacyPromoInfo {
  legacy_kind: 'promotion' | 'promo_code' | 'fm_deprecated' | null;
  legacy_name: string | null;
  legacy_amount: number | null;
  legacy_v2_equivalent_id: number | null;
  legacy_deprecated_reason: string | null;
}

export default function AdminPromotionV2EditPanel({
  reservationId, onSaved,
}: Props) {
  const [promotions, setPromotions] = useState<PromotionV2[]>([]);
  const [codes, setCodes] = useState<PromoCodeLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotionId, setPromotionId] = useState<number | null>(null);
  // Aktualny kod rabatowy przypisany do rezerwacji (odczytany ze snapshotu). Nieużywany przy zapisie — handleSave resolves id ze `codeInput`.
  const [, setCurrentPromoCodeId] = useState<number | null>(null);
  // Tekst wpisany / wybrany w polu kodu (datalist). Pusty = brak kodu. Nieznany = walidacja przy zapisie.
  const [codeInput, setCodeInput] = useState<string>('');
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bug vS5tDGy3 — info o starej (legacy) promocji widoczne nad selektorem/inputem
  const [legacyInfo, setLegacyInfo] = useState<LegacyPromoInfo>({
    legacy_kind: null,
    legacy_name: null,
    legacy_amount: null,
    legacy_v2_equivalent_id: null,
    legacy_deprecated_reason: null,
  });
  const [confirmDeleteLegacy, setConfirmDeleteLegacy] = useState(false);
  const [deletingLegacy, setDeletingLegacy] = useState(false);

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // Równolegle: listy słownikowe + snapshot bieżącego stanu rezerwacji.
        const [resPromos, resCodes, resSnap] = await Promise.all([
          authenticatedFetch('/api/v2/promotions/'),
          authenticatedFetch('/api/v2/promo-codes/'),
          authenticatedFetch(`/api/v2/reservations/${reservationId}/promotion-v2`),
        ]);
        if (!resPromos.ok) throw new Error(`Promocje: ${resPromos.status}`);
        if (!resCodes.ok) throw new Error(`Kody: ${resCodes.status}`);
        const [listPromos, listCodes] = await Promise.all([resPromos.json(), resCodes.json()]);
        const snap = resSnap.ok ? await resSnap.json() : null;
        if (cancelled) return;
        setPromotions(Array.isArray(listPromos) ? listPromos : []);
        setCodes(Array.isArray(listCodes) ? listCodes : []);
        if (snap) {
          setPromotionId(snap.promotion_v2_id ?? null);
          setCurrentPromoCodeId(snap.promo_code_id ?? null);
          // Custom values (np. checkbox „Deklaracja dwóch obozów") zapisane przy promocji wymagającej uzasadnienia.
          if (snap.promotion_v2_custom_values && typeof snap.promotion_v2_custom_values === 'object') {
            setCustomValues(snap.promotion_v2_custom_values);
          }
          // kod — preferuj snapshot.promo_code_snapshot.kod (mamy kod bez potrzeby dopasowania do listy),
          // fallback do dopasowania po id w liście kodów.
          const snapKod = snap.promo_code_snapshot?.kod;
          if (snapKod) {
            setCodeInput(snapKod);
          } else if (snap.promo_code_id) {
            const match = (Array.isArray(listCodes) ? listCodes : []).find((c: PromoCodeLite) => c.id === snap.promo_code_id);
            if (match) setCodeInput(match.kod);
          }
          // Bug vS5tDGy3 — info o legacy promocji do bannera
          setLegacyInfo({
            legacy_kind: snap.legacy_kind ?? null,
            legacy_name: snap.legacy_name ?? null,
            legacy_amount: snap.legacy_amount ?? null,
            legacy_v2_equivalent_id: snap.legacy_v2_equivalent_id ?? null,
            legacy_deprecated_reason: snap.legacy_deprecated_reason ?? null,
          });
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Nie udało się pobrać listy promocji/kodów');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reservationId]);

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
      showError(codeResolve.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`/api/v2/reservations/${reservationId}/promotion-v2`, {
        method: 'PATCH',
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
      setCurrentPromoCodeId(codeResolve.id);
      showSuccess('Zmiana promocji/kodu zapisana');
      onSaved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nie udało się zapisać zmiany';
      setError(msg);
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Bug vS5tDGy3 — kasowanie legacy promocji przez DELETE /legacy-promotion.
  // Backend: czysci selected_promotion=NULL, audit do system_events, recalc total_price, opcjonalny aneks.
  // Po sukcesie: odśwież snapshot (legacyInfo wyzeruje się) + powiadom rodzica (refetch danych rezerwacji).
  const handleDeleteLegacy = async () => {
    setDeletingLegacy(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`/api/v2/reservations/${reservationId}/legacy-promotion`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Błąd kasowania (${res.status})`);
      }
      const snap = await res.json();
      // Wyzeruj legacy info — od tej chwili nie pokazujemy bannera
      setLegacyInfo({
        legacy_kind: snap.legacy_kind ?? null,
        legacy_name: snap.legacy_name ?? null,
        legacy_amount: snap.legacy_amount ?? null,
        legacy_v2_equivalent_id: snap.legacy_v2_equivalent_id ?? null,
        legacy_deprecated_reason: snap.legacy_deprecated_reason ?? null,
      });
      setConfirmDeleteLegacy(false);
      showSuccess('Stara promocja została usunięta. Cena rezerwacji została przeliczona.');
      onSaved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nie udało się skasować starej promocji';
      setError(msg);
      showError(msg);
    } finally {
      setDeletingLegacy(false);
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
        {/* Bug vS5tDGy3 — banner legacy NAD selektorem (typu 'promotion' lub 'fm_deprecated') */}
        {(legacyInfo.legacy_kind === 'promotion' || legacyInfo.legacy_kind === 'fm_deprecated') && (
          <LegacyPromotionBanner
            kind={legacyInfo.legacy_kind}
            name={legacyInfo.legacy_name || ''}
            amount={legacyInfo.legacy_amount}
            deprecatedReason={legacyInfo.legacy_deprecated_reason}
            onDeleteClick={() => setConfirmDeleteLegacy(true)}
            deletingInProgress={deletingLegacy}
          />
        )}

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

        {/* Bug vS5tDGy3 — banner legacy NAD inputem (typu 'promo_code' = Bony) */}
        {legacyInfo.legacy_kind === 'promo_code' && (
          <LegacyPromotionBanner
            kind="promo_code"
            name={legacyInfo.legacy_name || ''}
            amount={legacyInfo.legacy_amount}
            onDeleteClick={() => setConfirmDeleteLegacy(true)}
            deletingInProgress={deletingLegacy}
          />
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
              setCurrentPromoCodeId(null);
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

      {/* Bug vS5tDGy3 — confirm modal dla kasowania legacy promocji/kodu */}
      {confirmDeleteLegacy && (
        <div
          data-testid="confirm-delete-legacy-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteLegacy(false); }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Usunąć starą promocję?</h4>
                <p className="text-sm text-gray-700 mt-2">
                  Usuwasz: <span className="font-bold">{legacyInfo.legacy_name}</span>
                  {legacyInfo.legacy_amount !== null && (
                    <span className="ml-1">
                      ({legacyInfo.legacy_amount >= 0 ? '+' : ''}{legacyInfo.legacy_amount.toFixed(2)} zł)
                    </span>
                  )}.
                </p>
                <ul className="text-xs text-gray-600 mt-3 space-y-1 list-disc pl-4">
                  <li>Cena rezerwacji zostanie automatycznie przeliczona bez tej promocji.</li>
                  <li>Akcja zostanie zapisana w historii (audit log).</li>
                  <li>Jeśli umowa jest podpisana — wystawimy aneks i wyślemy informację do klienta.</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteLegacy(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleDeleteLegacy}
                disabled={deletingLegacy}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                {deletingLegacy ? 'Kasowanie…' : 'Tak, usuń'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

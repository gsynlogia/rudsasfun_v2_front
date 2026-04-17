'use client';

import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';

import { authenticatedApiCall } from '@/utils/api-auth';

interface Snapshot {
  admin_promo_code_override?: string | null;
  admin_code_discount_override?: number | null;
}

interface Props {
  reservationId: number;
  /** Callback wywoływany po udanym zapisie — rodzic odświeża resztę (np. total_price) */
  onSaved?: () => void;
}

/**
 * §16.C2 — admin per-reservation override kodu rabatowego.
 * Sam fetchuje aktualne overridy z `/api/v2/reservations/{id}/promotion-v2`,
 * zmienia je przez `PATCH /api/v2/reservations/{id}/admin-override`.
 *
 * Backend nadpisuje `applied_promo_code_discount` i rekalkuluje total_price.
 * Null w obu polach = usunięcie overridu (wracają wartości ze snapshotu kodu).
 */
export default function AdminPromoCodeOverridePanel({ reservationId, onSaved }: Props) {
  const [kod, setKod] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [hasOverride, setHasOverride] = useState(false);

  const loadSnapshot = async () => {
    try {
      const snap = await authenticatedApiCall<Snapshot>(`/api/v2/reservations/${reservationId}/promotion-v2`);
      setKod(snap.admin_promo_code_override || '');
      setDiscount(
        snap.admin_code_discount_override !== null && snap.admin_code_discount_override !== undefined
          ? String(snap.admin_code_discount_override)
          : '',
      );
      setHasOverride(!!(snap.admin_promo_code_override || (snap.admin_code_discount_override !== null && snap.admin_code_discount_override !== undefined)));
    } catch {
      // brak snapshotu dla legacy — komponent w ogóle zostaje wyrenderowany ale z pustymi polami
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    loadSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body = {
        admin_promo_code_override: kod.trim() ? kod.trim().toUpperCase() : null,
        admin_code_discount_override: discount.trim() ? parseFloat(discount) : null,
      };
      await authenticatedApiCall(`/api/v2/reservations/${reservationId}/admin-override`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setMessage({ type: 'ok', text: 'Zapisano. Cena rezerwacji została przeliczona.' });
      await loadSnapshot();
      onSaved?.();
    } catch (e: unknown) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Błąd zapisu' });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await authenticatedApiCall(`/api/v2/reservations/${reservationId}/admin-override`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_promo_code_override: null, admin_code_discount_override: null }),
      });
      setKod('');
      setDiscount('');
      setHasOverride(false);
      setMessage({ type: 'ok', text: 'Override wyczyszczony. Cena przeliczona.' });
      onSaved?.();
    } catch (e: unknown) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Błąd zapisu' });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Rabat (override admina)</h3>
      <p className="text-xs text-gray-500 mb-3">
        Wpisz kod rabatowy i/lub kwotę, aby nadpisać wartość rabatu wyłącznie dla tej rezerwacji. Nie zmienia globalnych ustawień kodu.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Kod rabatowy (override)</label>
          <input
            type="text"
            value={kod}
            onChange={(e) => setKod(e.target.value.toUpperCase())}
            placeholder="np. 2KOTY"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:border-green-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Kwota rabatu (override, PLN)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="np. 120"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-green-600"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Zapisywanie…' : 'Zapisz override'}
        </button>
        {hasOverride && (
          <button
            onClick={handleClear}
            disabled={saving}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
          >
            <X className="w-4 h-4" /> Wyczyść
          </button>
        )}
      </div>

      {message && (
        <p className={`text-xs mt-2 ${message.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

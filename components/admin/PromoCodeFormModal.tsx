'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

import { authenticatedApiCall } from '@/utils/api-auth';
import type { PromoCode, PromoCodeTargets } from './PromotionsV2Dashboard';

interface Props {
  code: PromoCode | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function PromoCodeFormModal({ code, onClose, onSaved }: Props) {
  const isEdit = !!code;
  const [kod, setKod] = useState('');
  const [opis, setOpis] = useState('');
  const [kategoria, setKategoria] = useState<PromoCode['kategoria']>('obniza_cene');
  const [kwota7, setKwota7] = useState<number | null>(0);
  const [kwota10, setKwota10] = useState<number | null>(0);
  const [dataRozpoczecia, setDataRozpoczecia] = useState('');
  const [godzinaRozpoczecia, setGodzinaRozpoczecia] = useState('00:00');
  const [dataWygasniecia, setDataWygasniecia] = useState('');
  const [godzinaWygasniecia, setGodzinaWygasniecia] = useState('23:59');
  const [promocjaMode, setPromocjaMode] = useState<PromoCode['promocja_mode']>('laczy');
  const [targets, setTargets] = useState<PromoCodeTargets>({ camp_ids: [], property_ids: [], tag_values: [], emails: [] });
  const [emailsRaw, setEmailsRaw] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      setKod(code.kod);
      setOpis(code.opis);
      setKategoria(code.kategoria);
      setKwota7(code.kwota7 ?? null);
      setKwota10(code.kwota10 ?? null);
      setDataRozpoczecia(code.data_rozpoczecia);
      setGodzinaRozpoczecia(code.godzina_rozpoczecia);
      setDataWygasniecia(code.data_wygasniecia);
      setGodzinaWygasniecia(code.godzina_wygasniecia);
      setPromocjaMode(code.promocja_mode);
      setTargets(code.targets);
      setEmailsRaw(code.targets.emails.join('\n'));
    }
  }, [code]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const emailsParsed = emailsRaw.split('\n').map((e) => e.trim()).filter(Boolean);
      const body = {
        kod,
        opis,
        kategoria,
        kwota7: kategoria === 'obniza_cene' ? kwota7 : (kwota7 || null),
        kwota10: kategoria === 'obniza_cene' ? kwota10 : (kwota10 || null),
        data_rozpoczecia: dataRozpoczecia,
        godzina_rozpoczecia: godzinaRozpoczecia,
        data_wygasniecia: dataWygasniecia,
        godzina_wygasniecia: godzinaWygasniecia,
        promocja_mode: promocjaMode,
        targets: { ...targets, emails: emailsParsed },
      };
      if (isEdit) {
        await authenticatedApiCall(`/api/v2/promo-codes/${code!.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await authenticatedApiCall('/api/v2/promo-codes/', {
          method: 'POST',
          body: JSON.stringify({ ...body, status: 'aktywny' }),
        });
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-green-50 border-b-2 border-green-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">{isEdit ? 'Edytuj kod rabatowy' : 'Dodaj nowy kod rabatowy'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kod rabatowy</label>
            <input type="text" value={kod} onChange={(e) => setKod(e.target.value.toUpperCase())} placeholder="np. LATO2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-green-600 font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opis kodu</label>
            <textarea value={opis} onChange={(e) => setOpis(e.target.value)} placeholder="Opisz zastosowanie kodu..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[60px]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategoria</label>
            <select value={kategoria} onChange={(e) => setKategoria(e.target.value as PromoCode['kategoria'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="obniza_cene">Obniża cenę</option>
              <option value="nie_obniza_ceny">Bon (nie obniża ceny)</option>
              <option value="atrakcja">Atrakcja</option>
              <option value="gadzet">Gadżet</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {kategoria === 'obniza_cene' ? 'Upust 7 dni (PLN)' : 'Wartość (7 dni) — opcja'}
              </label>
              <input type="number" min="0" value={kwota7 ?? ''} onChange={(e) => setKwota7(e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {kategoria === 'obniza_cene' ? 'Upust 10 dni (PLN)' : 'Wartość (10 dni) — opcja'}
              </label>
              <input type="number" min="0" value={kwota10 ?? ''} onChange={(e) => setKwota10(e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data rozpoczęcia</label>
              <input type="date" value={dataRozpoczecia} onChange={(e) => setDataRozpoczecia(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Godzina rozpoczęcia</label>
              <input type="time" value={godzinaRozpoczecia} onChange={(e) => setGodzinaRozpoczecia(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data wygaśnięcia</label>
              <input type="date" value={dataWygasniecia} onChange={(e) => setDataWygasniecia(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Godzina wygaśnięcia</label>
              <input type="time" value={godzinaWygasniecia} onChange={(e) => setGodzinaWygasniecia(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Relacja z promocjami (wybierz jedną opcję) *</label>
            <div className="space-y-2">
              {[
                { value: 'laczy', label: 'Kod łączy się z promocjami' },
                { value: 'nie_laczy', label: 'Kod nie łączy się z promocjami' },
                { value: 'obniza_promocje_50', label: 'Kod obniża wartość promocji o 50%' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="promocjaMode" value={opt.value} checked={promocjaMode === opt.value}
                    onChange={() => setPromocjaMode(opt.value as PromoCode['promocja_mode'])}
                    className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emaile uprawnionych użytkowników (jedna linia = jeden email)</label>
            <textarea value={emailsRaw} onChange={(e) => setEmailsRaw(e.target.value)} placeholder="pusta = wszyscy klienci"
              className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[60px] font-mono text-sm" />
          </div>
          <details className="text-sm text-gray-600">
            <summary className="cursor-pointer font-medium">Ograniczenia: ośrodki / turnusy / tematy (zaawansowane)</summary>
            <div className="mt-2 space-y-2 pl-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">IDs obozów (camp_id, po przecinku)</label>
                <input type="text" value={targets.camp_ids.join(',')} onChange={(e) => setTargets({ ...targets, camp_ids: e.target.value.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)) })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">IDs turnusów (property_id, po przecinku)</label>
                <input type="text" value={targets.property_ids.join(',')} onChange={(e) => setTargets({ ...targets, property_ids: e.target.value.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)) })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tagi tematów (po przecinku)</label>
                <input type="text" value={targets.tag_values.join(',')} onChange={(e) => setTargets({ ...targets, tag_values: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
              </div>
              <p className="text-xs text-gray-500 italic">Pusta lista = brak ograniczeń dla tej kategorii.</p>
            </div>
          </details>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium">Anuluj</button>
          <button onClick={handleSave} disabled={saving || !kod || !opis || !dataRozpoczecia || !dataWygasniecia}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}

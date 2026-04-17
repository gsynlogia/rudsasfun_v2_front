'use client';

import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';

import { authenticatedApiCall } from '@/utils/api-auth';
import MultiSelectModal, { type MultiSelectOption } from './MultiSelectModal';
import type { PromoCode, PromoCodeTargets } from './PromotionsV2Dashboard';

interface Props {
  code: PromoCode | null;
  onClose: () => void;
  onSaved: () => void;
}

interface TargetOptions {
  camps: { id: number; name: string }[];
  properties: { id: number; camp_id: number; label: string; tag: string | null }[];
  tags: string[];
  emails: string[];
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [options, setOptions] = useState<TargetOptions | null>(null);
  const [openModal, setOpenModal] = useState<null | 'camps' | 'properties' | 'tags' | 'emails'>(null);

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
    }
  }, [code]);

  useEffect(() => {
    (async () => {
      try {
        const data = await authenticatedApiCall<TargetOptions>('/api/v2/promo-codes/targets/options');
        setOptions(data);
      } catch {
        setOptions({ camps: [], properties: [], tags: [], emails: [] });
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
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
        targets,
      };
      if (isEdit) {
        await authenticatedApiCall(`/api/v2/promo-codes/${code!.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await authenticatedApiCall('/api/v2/promo-codes/', { method: 'POST', body: JSON.stringify({ ...body, status: 'aktywny' }) });
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const campOptions: MultiSelectOption[] = (options?.camps || []).map((c) => ({ value: c.id, label: c.name }));
  const propertyOptions: MultiSelectOption[] = (options?.properties || []).map((p) => ({
    value: p.id,
    label: p.label,
    meta: p.tag ? `Temat: ${p.tag}` : undefined,
  }));
  const tagOptions: MultiSelectOption[] = (options?.tags || []).map((t) => ({ value: t, label: t }));
  const emailOptions: MultiSelectOption[] = (options?.emails || []).map((e) => ({ value: e, label: e }));

  // Pokazuj wybrane jako "chipsy" pod przyciskiem
  const renderChips = (kind: 'camps' | 'properties' | 'tags' | 'emails') => {
    const items: { value: string | number; label: string }[] = [];
    if (kind === 'camps') {
      targets.camp_ids.forEach((id) => {
        const c = options?.camps.find((x) => x.id === id);
        items.push({ value: id, label: c ? c.name : `#${id}` });
      });
    } else if (kind === 'properties') {
      targets.property_ids.forEach((id) => {
        const p = options?.properties.find((x) => x.id === id);
        items.push({ value: id, label: p ? p.label : `#${id}` });
      });
    } else if (kind === 'tags') {
      targets.tag_values.forEach((v) => items.push({ value: v, label: v }));
    } else {
      targets.emails.forEach((e) => items.push({ value: e, label: e }));
    }
    if (items.length === 0) return <p className="text-xs text-gray-400 italic mt-2">Brak ograniczeń — dostępne dla wszystkich</p>;
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {items.map((it) => (
          <span key={it.value} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">
            {it.label}
            <button
              onClick={() => {
                if (kind === 'camps') setTargets({ ...targets, camp_ids: targets.camp_ids.filter((x) => x !== it.value) });
                else if (kind === 'properties') setTargets({ ...targets, property_ids: targets.property_ids.filter((x) => x !== it.value) });
                else if (kind === 'tags') setTargets({ ...targets, tag_values: targets.tag_values.filter((x) => x !== it.value) });
                else setTargets({ ...targets, emails: targets.emails.filter((x) => x !== it.value) });
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-green-50 border-b-2 border-green-600 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              {isEdit ? <><Save className="w-5 h-5 text-green-600" /> Edytuj kod rabatowy</> : <><Plus className="w-5 h-5 text-green-600" /> Dodaj nowy kod rabatowy</>}
            </h2>
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

            {/* === 4 przyciski targetowania === */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Ograniczenia do ośrodków</label>
              <button type="button" onClick={() => setOpenModal('camps')}
                className="w-full mt-1 px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Wybierz ośrodki
              </button>
              {renderChips('camps')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ograniczenia do terminów</label>
              <button type="button" onClick={() => setOpenModal('properties')}
                className="w-full mt-1 px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Wybierz terminy
              </button>
              {renderChips('properties')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ograniczenia do tematów</label>
              <button type="button" onClick={() => setOpenModal('tags')}
                className="w-full mt-1 px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Wybierz tematy
              </button>
              {renderChips('tags')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ograniczenia do użytkowników (email)</label>
              <button type="button" onClick={() => setOpenModal('emails')}
                className="w-full mt-1 px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Wybierz użytkowników
              </button>
              {renderChips('emails')}
            </div>

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

      {openModal === 'camps' && (
        <MultiSelectModal title="Wybierz ośrodki" options={campOptions} selected={targets.camp_ids}
          onClose={() => setOpenModal(null)}
          onSave={(sel) => { setTargets({ ...targets, camp_ids: sel.map((v) => Number(v)) }); setOpenModal(null); }}
          searchPlaceholder="Szukaj ośrodka…" />
      )}
      {openModal === 'properties' && (
        <MultiSelectModal title="Wybierz terminy (turnusy)" options={propertyOptions} selected={targets.property_ids}
          onClose={() => setOpenModal(null)}
          onSave={(sel) => { setTargets({ ...targets, property_ids: sel.map((v) => Number(v)) }); setOpenModal(null); }}
          searchPlaceholder="Szukaj po mieście, okresie, temacie…" />
      )}
      {openModal === 'tags' && (
        <MultiSelectModal title="Wybierz tematy" options={tagOptions} selected={targets.tag_values}
          onClose={() => setOpenModal(null)}
          onSave={(sel) => { setTargets({ ...targets, tag_values: sel.map((v) => String(v)) }); setOpenModal(null); }}
          allowManualAdd searchPlaceholder="Szukaj tematu…" />
      )}
      {openModal === 'emails' && (
        <MultiSelectModal title="Wybierz użytkowników (email)" options={emailOptions} selected={targets.emails}
          onClose={() => setOpenModal(null)}
          onSave={(sel) => { setTargets({ ...targets, emails: sel.map((v) => String(v)) }); setOpenModal(null); }}
          allowManualAdd searchPlaceholder="Szukaj emaila…" />
      )}
    </>
  );
}

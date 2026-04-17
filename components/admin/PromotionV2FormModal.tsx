'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';

import { authenticatedApiCall } from '@/utils/api-auth';
import type { PromotionV2, PromotionV2CustomField } from './PromotionsV2Dashboard';

interface Props {
  promotion: PromotionV2 | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function PromotionV2FormModal({ promotion, onClose, onSaved }: Props) {
  const isEdit = !!promotion;
  const [nazwa, setNazwa] = useState('');
  const [opis, setOpis] = useState('');
  const [kwota7, setKwota7] = useState(0);
  const [kwota10, setKwota10] = useState(0);
  const [wymagaUzasadnienia, setWymagaUzasadnienia] = useState(false);
  const [dataStartu, setDataStartu] = useState('');
  const [godzinaStartu, setGodzinaStartu] = useState('00:00');
  const [dataWygasniecia, setDataWygasniecia] = useState('');
  const [godzinaWygasniecia, setGodzinaWygasniecia] = useState('23:59');
  const [customFields, setCustomFields] = useState<PromotionV2CustomField[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (promotion) {
      setNazwa(promotion.nazwa);
      setOpis(promotion.opis || '');
      setKwota7(promotion.kwota7);
      setKwota10(promotion.kwota10);
      setWymagaUzasadnienia(promotion.wymaga_uzasadnienia);
      setDataStartu(promotion.data_startu || '');
      setGodzinaStartu(promotion.godzina_startu || '00:00');
      setDataWygasniecia(promotion.data_wygasniecia || '');
      setGodzinaWygasniecia(promotion.godzina_wygasniecia || '23:59');
      setCustomFields(promotion.custom_fields);
    }
  }, [promotion]);

  const addField = () => {
    setCustomFields([...customFields, { label: '', field_type: 'text', required: true, field_order: customFields.length }]);
  };
  const updateField = (idx: number, patch: Partial<PromotionV2CustomField>) => {
    setCustomFields(customFields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };
  const removeField = (idx: number) => setCustomFields(customFields.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        nazwa,
        opis: opis || null,
        kwota7,
        kwota10,
        wymaga_uzasadnienia: wymagaUzasadnienia,
        data_startu: dataStartu || null,
        godzina_startu: dataStartu ? godzinaStartu : null,
        data_wygasniecia: dataWygasniecia || null,
        godzina_wygasniecia: dataWygasniecia ? godzinaWygasniecia : null,
        custom_fields: customFields.map((f, i) => ({ ...f, field_order: i })),
      };
      if (isEdit) {
        await authenticatedApiCall(`/api/v2/promotions/${promotion!.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await authenticatedApiCall('/api/v2/promotions/', {
          method: 'POST',
          body: JSON.stringify({ ...body, status: 'aktywna' }),
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-blue-50 border-b-2 border-[#00adee] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">{isEdit ? 'Edytuj promocję' : 'Dodaj nową promocję'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa promocji</label>
            <input type="text" value={nazwa} onChange={(e) => setNazwa(e.target.value)} placeholder="np. FIRST MINUTE"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#00adee] focus:ring-2 focus:ring-[#00adee]/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opis promocji</label>
            <textarea value={opis} onChange={(e) => setOpis(e.target.value)} placeholder="Opisz warunki promocji..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#00adee] min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upust 7 dni (PLN)</label>
              <input type="number" step="10" min="0" value={kwota7} onChange={(e) => setKwota7(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#00adee]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upust 10 dni (PLN)</label>
              <input type="number" step="10" min="0" value={kwota10} onChange={(e) => setKwota10(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#00adee]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data startu (opcjonalnie)</label>
              <input type="date" value={dataStartu} onChange={(e) => setDataStartu(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Godzina startu</label>
              <input type="time" value={godzinaStartu} onChange={(e) => setGodzinaStartu(e.target.value)} disabled={!dataStartu}
                className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data wygaśnięcia (opcjonalnie)</label>
              <input type="date" value={dataWygasniecia} onChange={(e) => setDataWygasniecia(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Godzina wygaśnięcia</label>
              <input type="time" value={godzinaWygasniecia} onChange={(e) => setGodzinaWygasniecia(e.target.value)} disabled={!dataWygasniecia}
                className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={wymagaUzasadnienia} onChange={(e) => setWymagaUzasadnienia(e.target.checked)}
              className="w-4 h-4 text-[#00adee] border-gray-300 rounded" />
            <span className="text-sm text-gray-700">Wymaga dodatkowej czynności od użytkownika</span>
          </label>
          {wymagaUzasadnienia && (
            <div className="bg-blue-50 p-4 rounded-lg border border-[#00adee]/20 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Pola formularza dla użytkownika</label>
                <button type="button" onClick={addField} className="px-3 py-1.5 bg-[#00adee] text-white rounded-md hover:bg-[#0099d6] text-sm flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Dodaj pole
                </button>
              </div>
              {customFields.length === 0 && <p className="text-sm text-gray-500 text-center py-2">Kliknij „Dodaj pole" aby utworzyć pole formularza</p>}
              {customFields.map((f, i) => (
                <div key={i} className="p-3 bg-white rounded border border-gray-200 flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <input type="text" value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} placeholder="Etykieta pola"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
                    <div className="flex gap-2">
                      <select value={f.field_type} onChange={(e) => updateField(i, { field_type: e.target.value as 'text' | 'number' | 'date' | 'checkbox' })}
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm">
                        <option value="text">Pole tekstowe</option>
                        <option value="number">Pole liczbowe</option>
                        <option value="date">Pole daty</option>
                        <option value="checkbox">Checkbox (deklaracja)</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-gray-600">
                        <input type="checkbox" checked={f.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                        wymagane
                      </label>
                    </div>
                    {f.field_type === 'checkbox' && (
                      <input type="text" value={f.help_text || ''} onChange={(e) => updateField(i, { help_text: e.target.value })}
                        placeholder="Tekst pomocniczy (opcja)" className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
                    )}
                  </div>
                  <button type="button" onClick={() => removeField(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium">Anuluj</button>
          <button onClick={handleSave} disabled={saving || !nazwa} className="px-4 py-2 bg-[#00adee] text-white rounded-md hover:bg-[#0099d6] text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}

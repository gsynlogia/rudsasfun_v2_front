'use client';

import { useState, useEffect } from 'react';
import { Plus, Tag, Eye, EyeOff, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

import { authenticatedApiCall } from '@/utils/api-auth';
import PromotionV2FormModal from './PromotionV2FormModal';
import PromoCodeFormModal from './PromoCodeFormModal';

export interface PromotionV2CustomField {
  id?: number;
  label: string;
  field_type: 'text' | 'number' | 'date' | 'checkbox';
  required: boolean;
  field_order: number;
  placeholder?: string | null;
  help_text?: string | null;
}

export interface PromotionV2 {
  id: number;
  nazwa: string;
  opis?: string | null;
  kwota7: number;
  kwota10: number;
  status: 'aktywna' | 'ukryta';
  wymaga_uzasadnienia: boolean;
  data_startu?: string | null;
  godzina_startu?: string | null;
  data_wygasniecia?: string | null;
  godzina_wygasniecia?: string | null;
  custom_fields: PromotionV2CustomField[];
  // §16.A6 — wypełniane tylko w `/available/list?property_id=X` (kwota dla konkretnego turnusu)
  applied_discount?: number | null;
}

export interface PromoCodeTargets {
  camp_ids: number[];
  property_ids: number[];
  tag_values: string[];
  emails: string[];
}

export interface PromoCode {
  id: number;
  kod: string;
  opis: string;
  kategoria: 'obniza_cene' | 'nie_obniza_ceny' | 'atrakcja' | 'gadzet';
  kwota7?: number | null;
  kwota10?: number | null;
  data_rozpoczecia: string;
  godzina_rozpoczecia: string;
  data_wygasniecia: string;
  godzina_wygasniecia: string;
  status: 'aktywny' | 'nieaktywny';
  promocja_mode: 'laczy' | 'nie_laczy' | 'obniza_promocje_50';
  targets: PromoCodeTargets;
}

const PROMOCJA_MODE_LABEL: Record<string, { label: string; color: string }> = {
  laczy: { label: 'Łączy z promocjami', color: 'bg-green-100 text-green-700' },
  nie_laczy: { label: 'Nie łączy z promocjami', color: 'bg-red-100 text-red-700' },
  obniza_promocje_50: { label: 'Obniża promocję o 50%', color: 'bg-orange-100 text-orange-700' },
};

const KATEGORIA_LABEL: Record<string, string> = {
  obniza_cene: 'Obniża cenę',
  nie_obniza_ceny: 'Bon',
  atrakcja: 'Atrakcja',
  gadzet: 'Gadżet',
};

export default function PromotionsV2Dashboard() {
  const [promotions, setPromotions] = useState<PromotionV2[]>([]);
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionV2 | null>(null);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [expandedCodeId, setExpandedCodeId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [promos, kods] = await Promise.all([
        authenticatedApiCall<PromotionV2[]>('/api/v2/promotions/'),
        authenticatedApiCall<PromoCode[]>('/api/v2/promo-codes/'),
      ]);
      setPromotions(promos);
      setCodes(kods);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Błąd ładowania';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePromotionStatus = async (id: number) => {
    try {
      await authenticatedApiCall(`/api/v2/promotions/${id}/status`, { method: 'PATCH' });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Błąd');
    }
  };

  const deletePromotion = async (id: number) => {
    if (!confirm('Usunąć promocję? Jeśli była używana w rezerwacjach, zamiast usunięcia ukryj ją.')) return;
    try {
      await authenticatedApiCall(`/api/v2/promotions/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Błąd');
    }
  };

  const toggleCodeStatus = async (id: number) => {
    try {
      await authenticatedApiCall(`/api/v2/promo-codes/${id}/status`, { method: 'PATCH' });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Błąd');
    }
  };

  const deleteCode = async (id: number) => {
    if (!confirm('Usunąć kod? Jeśli był używany w rezerwacjach, zamiast usunięcia dezaktywuj go.')) return;
    try {
      await authenticatedApiCall(`/api/v2/promo-codes/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Błąd');
    }
  };

  if (loading) return <div className="p-6">Ładowanie…</div>;

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Zarządzanie promocjami i rabatami</h1>
            <p className="text-sm text-gray-500 mt-1">Twórz i zarządzaj promocjami standardowymi oraz kodami rabatowymi</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEWA KOLUMNA — Promocje standardowe (NIEBIESKI AKCENT) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#00adee]" />
                <h2 className="text-lg font-semibold text-gray-800">Promocje standardowe</h2>
              </div>
              <button
                onClick={() => { setEditingPromotion(null); setPromotionModalOpen(true); }}
                className="px-3 py-2 bg-[#00adee] text-white rounded-md hover:bg-[#0099d6] text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Dodaj
              </button>
            </div>
            <div className="space-y-3">
              {promotions.length === 0 && <div className="text-gray-400 text-sm italic py-4">Brak promocji. Kliknij „Dodaj" aby utworzyć.</div>}
              {promotions.map((p) => (
                <div key={p.id} className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-800">{p.nazwa}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'aktywna' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {p.status === 'aktywna' ? 'Aktywna' : 'Ukryta'}
                        </span>
                      </div>
                      {p.opis && <p className="text-sm text-gray-600 mb-2">{p.opis}</p>}
                      <div className="text-sm text-gray-700 flex gap-4">
                        <span><span className="font-medium">7 dni:</span> -{p.kwota7} zł</span>
                        <span><span className="font-medium">10 dni:</span> -{p.kwota10} zł</span>
                      </div>
                      {p.wymaga_uzasadnienia && p.custom_fields.length > 0 && (
                        <div className="text-xs text-gray-500 mt-2">
                          Wymaga {p.custom_fields.length} pól: {p.custom_fields.map((f) => f.label).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => togglePromotionStatus(p.id)} className="p-2 text-gray-600 hover:bg-gray-100 rounded" title={p.status === 'aktywna' ? 'Ukryj' : 'Pokaż'}>
                        {p.status === 'aktywna' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => { setEditingPromotion(p); setPromotionModalOpen(true); }} className="p-2 text-[#00adee] hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => deletePromotion(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PRAWA KOLUMNA — Kody rabatowe (ZIELONY AKCENT) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-800">Kody rabatowe</h2>
              </div>
              <button
                onClick={() => { setEditingCode(null); setCodeModalOpen(true); }}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Dodaj
              </button>
            </div>
            <div className="space-y-3">
              {codes.length === 0 && <div className="text-gray-400 text-sm italic py-4">Brak kodów. Kliknij „Dodaj" aby utworzyć.</div>}
              {codes.map((c) => {
                const mode = PROMOCJA_MODE_LABEL[c.promocja_mode];
                const expanded = expandedCodeId === c.id;
                return (
                  <div key={c.id} className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-mono font-semibold text-gray-800">{c.kod}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'aktywny' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {c.status === 'aktywny' ? 'Aktywny' : 'Nieaktywny'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            {KATEGORIA_LABEL[c.kategoria]}
                          </span>
                        </div>
                        {c.opis && <p className="text-sm text-gray-600 mb-2">{c.opis}</p>}
                        {c.kategoria === 'obniza_cene' && (
                          <div className="text-sm text-gray-700 flex gap-4">
                            <span><span className="font-medium">7 dni:</span> -{c.kwota7} zł</span>
                            <span><span className="font-medium">10 dni:</span> -{c.kwota10} zł</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs ${mode.color}`}>{mode.label}</span>
                          <span className="text-xs text-gray-500">{c.data_rozpoczecia} – {c.data_wygasniecia}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setExpandedCodeId(expanded ? null : c.id)} className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <button onClick={() => toggleCodeStatus(c.id)} className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                          {c.status === 'aktywny' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button onClick={() => { setEditingCode(c); setCodeModalOpen(true); }} className="p-2 text-green-600 hover:bg-green-50 rounded"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => deleteCode(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    {expanded && (
                      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="font-semibold text-gray-600">Ośrodki:</span>
                          <div className="mt-1">{c.targets.camp_ids.length === 0 ? <span className="text-gray-400">Wszystkie</span> : c.targets.camp_ids.map((id) => <span key={id} className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded mr-1">#{id}</span>)}</div>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Turnusy:</span>
                          <div className="mt-1">{c.targets.property_ids.length === 0 ? <span className="text-gray-400">Wszystkie</span> : c.targets.property_ids.map((id) => <span key={id} className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded mr-1">#{id}</span>)}</div>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Tematy (tagi):</span>
                          <div className="mt-1">{c.targets.tag_values.length === 0 ? <span className="text-gray-400">Wszystkie</span> : c.targets.tag_values.map((t) => <span key={t} className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded mr-1">{t}</span>)}</div>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Użytkownicy:</span>
                          <div className="mt-1">{c.targets.emails.length === 0 ? <span className="text-gray-400">Wszyscy</span> : <span className="text-gray-700">{c.targets.emails.length} emaili</span>}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {promotionModalOpen && (
        <PromotionV2FormModal
          promotion={editingPromotion}
          onClose={() => setPromotionModalOpen(false)}
          onSaved={async () => { setPromotionModalOpen(false); await load(); }}
        />
      )}
      {codeModalOpen && (
        <PromoCodeFormModal
          code={editingCode}
          onClose={() => setCodeModalOpen(false)}
          onSaved={async () => { setCodeModalOpen(false); await load(); }}
        />
      )}
    </div>
  );
}

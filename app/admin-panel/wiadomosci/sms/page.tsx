'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, FileText, Search } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { useToast } from '@/components/ToastContainer';
import { authService } from '@/lib/services/AuthService';
import { API_BASE_URL } from '@/utils/api-config';

type SendMode = 'guardians_1' | 'guardians_2' | 'guardians_both' | 'individual' | 'by_turnus';

interface TurnusOption {
  id: number;
  camp_id: number;
  camp_name: string | null;
  period: string;
  city: string;
  start_date: string | null;
  end_date: string | null;
  tag: string | null;
}

interface SmsTemplateOption {
  id: number;
  name: string;
  body: string;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = authService.getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}

export default function SmsPage() {
  const { showSuccess, showError } = useToast();
  const [sendMode, setSendMode] = useState<SendMode>('guardians_1');
  const [guardianFilter, setGuardianFilter] = useState<'1' | '2' | 'both'>('1');
  const [individualPhones, setIndividualPhones] = useState('');
  const [turnusId, setTurnusId] = useState<number | ''>('');
  const [turnusGuardianFilter, setTurnusGuardianFilter] = useState<'1' | '2' | 'both'>('1');
  const [message, setMessage] = useState('');
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [templates, setTemplates] = useState<SmsTemplateOption[]>([]);
  const [turnuses, setTurnuses] = useState<TurnusOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const loadTemplates = useCallback(async () => {
    const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/sms/templates`);
    if (res.ok) {
      const data = await res.json();
      setTemplates(data);
    }
  }, []);

  const loadTurnuses = useCallback(async () => {
    const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/sms/turnuses`);
    if (res.ok) {
      const data = await res.json();
      setTurnuses(data);
      if (data.length && turnusId === '') setTurnusId(data[0].id);
    }
  }, [turnusId]);

  useEffect(() => {
    loadTemplates();
    loadTurnuses();
  }, [loadTemplates, loadTurnuses]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/admin/sms/search-phones?q=${encodeURIComponent(searchQuery)}&limit=50`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.phones || []);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (templateId && templates.length) {
      const t = templates.find((x) => x.id === templateId);
      if (t) setMessage(t.body);
    }
  }, [templateId, templates]);

  const addPhoneToIndividual = (phone: string) => {
    const current = individualPhones.split('\n').filter(Boolean);
    if (!current.includes(phone)) {
      setIndividualPhones([...current, phone].join('\n'));
    }
  };

  const handleSend = async () => {
    const msg = message.trim();
    if (!msg) {
      showError('Wpisz treść wiadomości.');
      return;
    }

    setSending(true);
    try {
      if (sendMode === 'individual') {
        const phones = individualPhones.split('\n').map((p) => p.trim()).filter(Boolean);
        if (!phones.length) {
          showError('Dodaj co najmniej jeden numer w wysyłce indywidualnej.');
          setSending(false);
          return;
        }
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/sms/send/individual`, {
          method: 'POST',
          body: JSON.stringify({ phones, message: msg }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showError(data.detail || 'Błąd wysyłki SMS.');
          setSending(false);
          return;
        }
        showSuccess(`Wysłano: ${data.sent_count}, błędów: ${data.failed_count}.`);
      } else if (sendMode === 'by_turnus') {
        const tid = turnusId === '' ? (turnuses[0]?.id ?? 0) : turnusId;
        if (!tid) {
          showError('Wybierz turnus.');
          setSending(false);
          return;
        }
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/sms/send/by-turnus`, {
          method: 'POST',
          body: JSON.stringify({
            turnus_property_id: tid,
            guardian_filter: turnusGuardianFilter,
            message: msg,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showError(data.detail || 'Błąd wysyłki SMS.');
          setSending(false);
          return;
        }
        showSuccess(`Wysłano: ${data.sent_count}, błędów: ${data.failed_count}.`);
      } else {
        const filter = sendMode === 'guardians_1' ? '1' : sendMode === 'guardians_2' ? '2' : 'both';
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/sms/send/guardians`, {
          method: 'POST',
          body: JSON.stringify({ guardian_filter: filter, message: msg }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showError(data.detail || 'Błąd wysyłki SMS.');
          setSending(false);
          return;
        }
        showSuccess(`Wysłano: ${data.sent_count}, błędów: ${data.failed_count}.`);
      }
    } catch (e) {
      showError('Błąd połączenia z serwerem.');
    }
    setSending(false);
  };

  return (
    <SectionGuard section="cms">
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-[#03adf0]" />
              Wiadomości SMS
            </h1>
            <div className="flex gap-2">
              <Link
                href="/admin-panel/wiadomosci/sms/szablony"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Szablony SMS
              </Link>
              <Link
                href="/admin-panel/wiadomosci/sms/logi"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Logi SMS
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lewa kolumna: wyszukiwarka numerów */}
            <div className="lg:col-span-1 space-y-2">
              <label className="block text-sm font-medium text-gray-700">Wyszukiwarka numerów</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Wpisz numer lub fragment..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-[#03adf0]"
                />
              </div>
              {searchResults.length > 0 && (
                <ul className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white">
                  {searchResults.map((phone) => (
                    <li key={phone}>
                      <button
                        type="button"
                        onClick={() => addPhoneToIndividual(phone)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                      >
                        {phone}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Środkowa i prawa: tryb wysyłki + treść */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">Tryb wysyłki</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { mode: 'guardians_1' as const, label: 'Wszyscy opiekunowie 1' },
                    { mode: 'guardians_2' as const, label: 'Wszyscy opiekunowie 2' },
                    { mode: 'guardians_both' as const, label: 'Wszyscy opiekunowie 1 i 2' },
                    { mode: 'individual' as const, label: 'Indywidualnie (lista numerów)' },
                    { mode: 'by_turnus' as const, label: 'Po turnusie' },
                  ].map(({ mode, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSendMode(mode)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        sendMode === mode
                          ? 'bg-[#03adf0] text-white border-[#03adf0]'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {sendMode === 'by_turnus' && (
                <div className="flex flex-wrap gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turnus</label>
                    <select
                      value={turnusId === '' ? '' : turnusId}
                      onChange={(e) => setTurnusId(e.target.value ? Number(e.target.value) : '')}
                      className="border border-gray-300 rounded-lg px-3 py-2 min-w-[200px]"
                    >
                      {turnuses.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.camp_name || 'Obozy'} – {t.city} {t.start_date}–{t.end_date}
                          {t.tag ? ` (${t.tag})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opiekunowie</label>
                    <select
                      value={turnusGuardianFilter}
                      onChange={(e) => setTurnusGuardianFilter(e.target.value as '1' | '2' | 'both')}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="1">Opiekun 1</option>
                      <option value="2">Opiekun 2</option>
                      <option value="both">Oboje</option>
                    </select>
                  </div>
                </div>
              )}

              {sendMode === 'individual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numery (jeden pod drugim)
                  </label>
                  <textarea
                    value={individualPhones}
                    onChange={(e) => setIndividualPhones(e.target.value)}
                    rows={4}
                    placeholder="48xxxxxxxxx&#10;+48 123 456 789"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Szablon (opcjonalnie)</label>
                <select
                  value={templateId === '' ? '' : templateId}
                  onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : '')}
                  className="border border-gray-300 rounded-lg px-3 py-2 mb-2 w-full max-w-md"
                >
                  <option value="">— Wybierz szablon —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Treść wiadomości</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Treść SMS..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="px-6 py-2 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] disabled:opacity-50 transition-colors"
              >
                {sending ? 'Wysyłanie…' : 'Wyślij SMS'}
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}

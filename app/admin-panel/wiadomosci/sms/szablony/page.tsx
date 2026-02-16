'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, FileText, Plus } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { useToast } from '@/components/ToastContainer';
import { authService } from '@/lib/services/AuthService';
import { API_BASE_URL } from '@/utils/api-config';

interface SmsTemplateOption {
  id: number;
  name: string;
  body: string;
  created_at: string;
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

export default function SmsSzablonyPage() {
  const { showSuccess, showError } = useToast();
  const [templates, setTemplates] = useState<SmsTemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/sms/templates`);
    if (res.ok) {
      const data = await res.json();
      setTemplates(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const b = body.trim();
    if (!n || !b) {
      showError('Wpisz nazwę i treść szablonu.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/sms/templates`, {
        method: 'POST',
        body: JSON.stringify({ name: n, body: b }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showError(err.detail || 'Błąd zapisu szablonu.');
        setSaving(false);
        return;
      }
      showSuccess('Szablon utworzony.');
      setName('');
      setBody('');
      loadTemplates();
    } catch {
      showError('Błąd połączenia.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno usunąć ten szablon?')) return;
    const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/sms/templates/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      showSuccess('Szablon usunięty.');
      loadTemplates();
    } else {
      showError('Nie udało się usunąć szablonu.');
    }
  };

  return (
    <SectionGuard section="cms">
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-8 h-8 text-[#03adf0]" />
              Szablony SMS
            </h1>
            <Link
              href="/admin-panel/wiadomosci/sms"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Powrót do wysyłki SMS
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Utwórz szablon
              </h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="np. Przypomnienie o płatności"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Treść</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Treść wiadomości SMS..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#03adf0] text-white rounded-lg hover:bg-[#0288c7] disabled:opacity-50"
                >
                  {saving ? 'Zapisywanie…' : 'Zapisz szablon'}
                </button>
              </form>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Lista szablonów</h2>
              {loading ? (
                <p className="text-gray-500">Ładowanie…</p>
              ) : templates.length === 0 ? (
                <p className="text-gray-500">Brak szablonów.</p>
              ) : (
                <ul className="space-y-3">
                  {templates.map((t) => (
                    <li
                      key={t.id}
                      className="border border-gray-200 rounded-lg p-4 flex justify-between items-start gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800">{t.name}</p>
                        <p className="text-sm text-gray-600 mt-1 truncate" title={t.body}>
                          {t.body.slice(0, 80)}
                          {t.body.length > 80 ? '…' : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        className="text-red-600 hover:text-red-800 text-sm whitespace-nowrap"
                      >
                        Usuń
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}

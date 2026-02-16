'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { authService } from '@/lib/services/AuthService';
import { API_BASE_URL } from '@/utils/api-config';

interface SmsLogItem {
  id: number;
  reservation_id: number | null;
  guardian_index: number | null;
  phone: string;
  message_text: string;
  status: string;
  failure_reason: string | null;
  smsapi_id: string | null;
  sent_at: string | null;
  created_at: string;
  is_outside_contacts: number;
  turnus_property_id: number | null;
  retry_count: number;
  next_retry_at: string | null;
  email_sent_at: string | null;
}

interface LogsResponse {
  items: SmsLogItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

function formatDate(s: string | null): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return d.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return s;
  }
}

async function fetchWithAuth(url: string) {
  const token = authService.getToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res;
}

export default function SmsLogiPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterGuardian, setFilterGuardian] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    if (search.trim()) params.set('search', search.trim());
    if (filterStatus && filterStatus !== 'all') params.set('filter_status', filterStatus);
    if (filterPhone.trim()) params.set('filter_phone', filterPhone.trim());
    if (filterGuardian && filterGuardian !== 'all') params.set('filter_guardian', filterGuardian);
    const res = await fetchWithAuth(
      `${API_BASE_URL}/api/admin/sms/logs?${params.toString()}`
    );
    if (res.ok) {
      const json: LogsResponse = await res.json();
      setData(json);
    } else {
      setData(null);
    }
    setLoading(false);
  }, [page, pageSize, search, filterStatus, filterPhone, filterGuardian]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <SectionGuard section="cms">
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-8 h-8 text-[#03adf0]" />
              Logi SMS
            </h1>
            <Link
              href="/admin-panel/wiadomosci/sms"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Powrót do wysyłki SMS
            </Link>
          </div>

          <div className="mb-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Szukaj</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Numer, treść..."
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-48"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                <option value="all">Wszystkie</option>
                <option value="sent">Wysłane</option>
                <option value="failed">Niewysłane</option>
                <option value="pending">Oczekujące</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Numer</label>
              <input
                type="text"
                value={filterPhone}
                onChange={(e) => setFilterPhone(e.target.value)}
                placeholder="Fragment numeru"
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Opiekun</label>
              <select
                value={filterGuardian}
                onChange={(e) => setFilterGuardian(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                <option value="all">Wszyscy</option>
                <option value="1">Opiekun 1</option>
                <option value="2">Opiekun 2</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Na stronę</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => loadLogs()}
              className="px-3 py-1.5 bg-[#03adf0] text-white rounded text-sm hover:bg-[#0288c7]"
            >
              Filtruj
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500">Ładowanie…</p>
          ) : data ? (
            <>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Data</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Numer</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Treść (skrót)</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Powód błędu</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Spoza bazy</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.items.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-gray-600">{formatDate(row.created_at)}</td>
                        <td className="px-3 py-2 font-mono">{row.phone}</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              row.status === 'sent'
                                ? 'text-green-600'
                                : row.status === 'failed'
                                  ? 'text-red-600'
                                  : 'text-amber-600'
                            }
                          >
                            {row.status === 'sent' ? 'Wysłany' : row.status === 'failed' ? 'Niewysłany' : 'Oczekuje'}
                          </span>
                        </td>
                        <td className="px-3 py-2 max-w-[200px] truncate" title={row.message_text}>
                          {row.message_text.slice(0, 50)}
                          {row.message_text.length > 50 ? '…' : ''}
                        </td>
                        <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate" title={row.failure_reason || ''}>
                          {row.failure_reason || '—'}
                        </td>
                        <td className="px-3 py-2">{row.is_outside_contacts ? 'Tak' : 'Nie'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Razem: {data.total} | strona {data.page} z {data.total_pages || 1}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(data.total_pages || 1, p + 1))}
                    disabled={page >= (data.total_pages || 1)}
                    className="p-2 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-500">Brak danych lub błąd ładowania.</p>
          )}
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}

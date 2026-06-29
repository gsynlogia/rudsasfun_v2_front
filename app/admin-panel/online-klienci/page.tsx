'use client';

import { Users, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { authenticatedFetch } from '@/lib/utils/api';

interface OnlineClient {
  id: number;
  email: string | null;
  login: string;
  last_seen_at: string | null;
  seconds_ago: number | null;
}
interface OnlineResponse {
  count: number;
  online_window_seconds: number;
  clients: OnlineClient[];
}

function formatAgo(s: number | null): string {
  if (s == null) return '—';
  if (s < 60) return `${s} s temu`;
  const m = Math.floor(s / 60);
  return `${m} min temu`;
}

export default function OnlineClientsPage() {
  const [data, setData] = useState<OnlineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await authenticatedFetch('/api/admin/online-clients');
      if (res.status === 403) {
        setError('Brak dostępu — funkcja widoczna tylko dla administratorów.');
        setData(null);
        return;
      }
      if (!res.ok) throw new Error('blad');
      setError(null);
      setData(await res.json());
    } catch {
      setError('Nie udało się pobrać listy klientów online.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // auto-odświeżanie co 30 s
    return () => clearInterval(t);
  }, [load]);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#03adf0]" />
            Klienci online{data ? <span className="text-[#03adf0]"> ({data.count})</span> : ''}
          </h1>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Odśwież
          </button>
        </div>

        {loading && !data ? <p className="text-gray-500">Ładowanie…</p> : null}
        {error ? (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {data && !error ? (
          data.count === 0 ? (
            <p className="text-gray-500">Brak klientów online w tej chwili.</p>
          ) : (
            <div className="bg-white border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Klient (e-mail)</th>
                    <th className="text-left px-4 py-3 font-medium">Ostatni sygnał</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clients.map((c) => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                          {c.email || c.login}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatAgo(c.seconds_ago)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {data ? (
          <p className="mt-3 text-xs text-gray-400">
            Okno online: {data.online_window_seconds} s · auto-odświeżanie co 30 s
          </p>
        ) : null}
      </div>
    </AdminLayout>
  );
}

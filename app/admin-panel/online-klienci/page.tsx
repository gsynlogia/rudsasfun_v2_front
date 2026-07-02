'use client';

import { Users, UserCog, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { authenticatedFetch } from '@/lib/utils/api';

interface OnlinePerson {
  id: number;
  email: string | null;
  login: string;
  last_seen_at: string | null;
  seconds_ago: number | null;
}
interface OnlineClientsResponse {
  count: number;
  online_window_seconds: number;
  clients: OnlinePerson[];
}
interface OnlineStaffResponse {
  count: number;
  online_window_seconds: number;
  staff: OnlinePerson[];
}

function formatAgo(s: number | null): string {
  if (s == null) return '—';
  if (s < 60) return `${s} s temu`;
  const m = Math.floor(s / 60);
  return `${m} min temu`;
}

/** Tabela osób online — wspólna dla klientów i pracowników (rozróżnienie: tytuł + kolor + etykieta kolumny). */
function OnlineList({
  title,
  icon,
  colorClass,
  count,
  people,
  emptyText,
  personLabel,
}: {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  count: number | null;
  people: OnlinePerson[];
  emptyText: string;
  personLabel: string;
}) {
  return (
    <div className="bg-white border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
        {icon}
        <h2 className="text-base font-semibold text-gray-800">
          {title}
          {count !== null ? <span className={colorClass}> ({count})</span> : ''}
        </h2>
      </div>
      {count === 0 ? (
        <p className="text-gray-500 px-4 py-6 text-sm">{emptyText}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">{personLabel}</th>
              <th className="text-left px-4 py-3 font-medium">Ostatni sygnał</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                    {p.email || p.login}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{formatAgo(p.seconds_ago)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function OnlinePage() {
  const [clients, setClients] = useState<OnlineClientsResponse | null>(null);
  const [staff, setStaff] = useState<OnlineStaffResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [rc, rs] = await Promise.all([
        authenticatedFetch('/api/admin/online-clients'),
        authenticatedFetch('/api/admin/online-staff'),
      ]);
      if (rc.status === 403 || rs.status === 403) {
        setError('Brak dostępu — funkcja widoczna tylko dla administratorów.');
        setClients(null);
        setStaff(null);
        return;
      }
      if (!rc.ok || !rs.ok) throw new Error('blad');
      setError(null);
      setClients(await rc.json());
      setStaff(await rs.json());
    } catch {
      setError('Nie udało się pobrać listy osób online.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // auto-odświeżanie co 30 s
    return () => clearInterval(t);
  }, [load]);

  const windowSeconds = clients?.online_window_seconds ?? staff?.online_window_seconds ?? null;

  return (
    <AdminLayout>
      <AdminPageHeader title="Klienci online">
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Odśwież
        </button>
      </AdminPageHeader>
      <div className="p-4 sm:p-6">
        {loading && !clients && !staff ? <p className="text-gray-500">Ładowanie…</p> : null}
        {error ? (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {!error ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* LEWA: Klienci online */}
            <OnlineList
              title="Klienci online"
              icon={<Users className="w-5 h-5 text-[#03adf0]" />}
              colorClass="text-[#03adf0]"
              count={clients?.count ?? null}
              people={clients?.clients ?? []}
              emptyText="Brak klientów online w tej chwili."
              personLabel="Klient (e-mail)"
            />
            {/* PRAWA: Pracownicy online */}
            <OnlineList
              title="Pracownicy online"
              icon={<UserCog className="w-5 h-5 text-emerald-600" />}
              colorClass="text-emerald-600"
              count={staff?.count ?? null}
              people={staff?.staff ?? []}
              emptyText="Brak pracowników online w tej chwili."
              personLabel="Pracownik (login/e-mail)"
            />
          </div>
        ) : null}

        {windowSeconds !== null && !error ? (
          <p className="mt-3 text-xs text-gray-400">
            Okno online: {windowSeconds} s · auto-odświeżanie co 30 s
          </p>
        ) : null}
      </div>
    </AdminLayout>
  );
}

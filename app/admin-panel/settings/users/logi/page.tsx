'use client';

import { ArrowLeft, ChevronLeft, ChevronRight, X as XIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import AdminLayout from '@/components/admin/AdminLayout';
import { authService } from '@/lib/services/AuthService';
import { authenticatedApiCall } from '@/utils/api-auth';

const PAGE_SIZE = 10;

interface AuthLogItem {
  id: number;
  user_id: number | null;
  event_type: string;
  auth_method: string | null;
  is_first_login: boolean;
  email_used: string | null;
  ip_address: string | null;
  event_category: string | null;
  magic_link_token: string | null;
  details: string | null;
  created_at: string | null;
}

interface Filters {
  id: string;
  user_id: string;
  event_type: string;
  event_category: string;
  auth_method: string;
  is_first_login: string;
  email_used: string;
  ip_address: string;
  magic_link_token: string;
  details: string;
}

const defaultFilters: Filters = {
  id: '',
  user_id: '',
  event_type: '',
  event_category: '',
  auth_method: '',
  is_first_login: '',
  email_used: '',
  ip_address: '',
  magic_link_token: '',
  details: '',
};

export default function SettingsUsersLogiPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filtersDebounced, setFiltersDebounced] = useState<Filters>(defaultFilters);
  const [data, setData] = useState<{ items: AuthLogItem[]; total: number }>({ items: [], total: 0 });

  useEffect(() => {
    const check = async () => {
      if (!authService.isAuthenticated()) {
        router.push('/admin-panel/login');
        return;
      }
      const user = await authService.verifyToken();
      if (!user) {
        router.push('/admin-panel/login');
        return;
      }
      const isAdmin = user.id === 0 || user.user_type === 'admin' || (user.groups && user.groups.includes('admin'));
      if (!isAdmin) {
        router.push('/admin-panel/settings');
        return;
      }
      setAuthorized(true);
    };
    check();
  }, [router]);

  // Debounce filters (400 ms) then reset to page 1 and update filtersDebounced
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltersDebounced(filters);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [filters]);

  const fetchLogs = useCallback(async (currentPage: number, f: Filters) => {
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String((currentPage - 1) * PAGE_SIZE));
    if (f.id.trim() !== '') {
      const n = parseInt(f.id.trim(), 10);
      if (!Number.isNaN(n)) params.set('id_eq', String(n));
    }
    if (f.user_id.trim() !== '') {
      const n = parseInt(f.user_id.trim(), 10);
      if (!Number.isNaN(n)) params.set('user_id_eq', String(n));
    }
    if (f.event_type.trim() !== '') params.set('event_type', f.event_type.trim());
    if (f.event_category.trim() !== '') params.set('event_category', f.event_category.trim());
    if (f.auth_method.trim() !== '') params.set('auth_method', f.auth_method.trim());
    if (f.is_first_login === 'true' || f.is_first_login === 'false') params.set('is_first_login', f.is_first_login);
    if (f.email_used.trim() !== '') params.set('email_used', f.email_used.trim());
    if (f.ip_address.trim() !== '') params.set('ip_address', f.ip_address.trim());
    if (f.magic_link_token.trim() !== '') params.set('magic_link_token', f.magic_link_token.trim());
    if (f.details.trim() !== '') params.set('details', f.details.trim());
    const res = await authenticatedApiCall<{ items: AuthLogItem[]; total: number }>(
      `/api/admin-settings/auth-logs?${params.toString()}`
    );
    return res || { items: [], total: 0 };
  }, []);

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    setLoading(true);
    fetchLogs(page, filtersDebounced)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData({ items: [], total: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [authorized, page, filtersDebounced, fetchLogs]);

  const formatDate = (s: string | null) => {
    if (!s) return '–';
    try {
      const d = new Date(s);
      return d.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'medium' });
    } catch {
      return s;
    }
  };

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');
  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setFiltersDebounced(defaultFilters);
    setPage(1);
  };

  if (!authorized && !loading) return null;

  return (
    <AdminLayout>
      <div className="w-full flex flex-col min-h-0">
        <div className="mb-4">
          <Link
            href="/admin-panel/settings/users"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-2"
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Powrót do użytkowników</span>
          </Link>
        </div>

        {/* Pasek jak na /admin-panel: ciemny + pomarańczowy Wyczyść gdy są filtry */}
        <div className="flex-shrink-0 bg-slate-800 shadow-md p-3 sticky top-0 z-20">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-white whitespace-nowrap">Logi</h1>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-1.5 bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors text-sm flex items-center gap-1.5"
              >
                <XIcon className="w-3.5 h-3.5" />
                Wyczyść
              </button>
            )}
            <span className="ml-auto text-xs text-slate-300 whitespace-nowrap">
              Znaleziono: <strong className="text-white">{data.total}</strong> | Na stronie: <strong className="text-white">{PAGE_SIZE}</strong>
            </span>
          </div>
        </div>

        {/* Tabela – ten sam wygląd co /admin-panel (bg-white shadow mt-2, divide-y, thead bg-gray-50) */}
        <div className="bg-white shadow mt-2 flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
              <p className="mt-4 text-sm text-gray-600">Ładowanie...</p>
            </div>
          ) : (
            <div className="overflow-x-scroll overflow-y-visible w-full" style={{ overflowX: 'scroll' }}>
              <table className="min-w-full divide-y divide-gray-200 w-full min-w-max">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data i czas</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">user_id</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">event_type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">event_category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">auth_method</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">is_first_login</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">email_used</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ip_address</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">magic_link_token</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">details</th>
                  </tr>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-2 py-1"><input type="text" placeholder="szukaj" value={filters.id} onChange={(e) => updateFilter('id', e.target.value)} className="w-full min-w-[4rem] px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#03adf0]" /></th>
                    <th className="px-2 py-1" />
                    <th className="px-2 py-1"><input type="text" placeholder="szukaj" value={filters.user_id} onChange={(e) => updateFilter('user_id', e.target.value)} className="w-full min-w-[4rem] px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#03adf0]" /></th>
                    <th className="px-2 py-1"><input type="text" placeholder="szukaj" value={filters.event_type} onChange={(e) => updateFilter('event_type', e.target.value)} className="w-full min-w-[6rem] px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#03adf0]" /></th>
                    <th className="px-2 py-1"><input type="text" placeholder="szukaj" value={filters.event_category} onChange={(e) => updateFilter('event_category', e.target.value)} className="w-full min-w-[6rem] px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#03adf0]" /></th>
                    <th className="px-2 py-1"><input type="text" placeholder="szukaj" value={filters.auth_method} onChange={(e) => updateFilter('auth_method', e.target.value)} className="w-full min-w-[5rem] px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#03adf0]" /></th>
                    <th className="px-2 py-1">
                      <select value={filters.is_first_login} onChange={(e) => updateFilter('is_first_login', e.target.value)} className="w-full min-w-[4rem] px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#03adf0] bg-white">
                        <option value="">–</option>
                        <option value="true">Tak</option>
                        <option value="false">Nie</option>
                      </select>
                    </th>
                    <th className="px-2 py-1"><input type="text" placeholder="szukaj" value={filters.email_used} onChange={(e) => updateFilter('email_used', e.target.value)} className="w-full min-w-[8rem] px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#03adf0]" /></th>
                    <th className="px-2 py-1"><input type="text" placeholder="szukaj" value={filters.ip_address} onChange={(e) => updateFilter('ip_address', e.target.value)} className="w-full min-w-[6rem] px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#03adf0]" /></th>
                    <th className="px-2 py-1"><input type="text" placeholder="szukaj" value={filters.magic_link_token} onChange={(e) => updateFilter('magic_link_token', e.target.value)} className="w-full min-w-[6rem] px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#03adf0]" /></th>
                    <th className="px-2 py-1"><input type="text" placeholder="szukaj" value={filters.details} onChange={(e) => updateFilter('details', e.target.value)} className="w-full min-w-[8rem] px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#03adf0]" /></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.items.length === 0 ? (
                    <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-600">Brak wpisów (zmień filtry lub stronę)</td></tr>
                  ) : (
                    data.items.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 text-sm text-gray-900">{row.id}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">{formatDate(row.created_at)}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{row.user_id ?? '–'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.event_type}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{row.event_category ?? '–'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{row.auth_method ?? '–'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{row.is_first_login ? 'Tak' : 'Nie'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{row.email_used ?? '–'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{row.ip_address ?? '–'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 max-w-[8rem] truncate" title={row.magic_link_token ?? undefined}>{row.magic_link_token ?? '–'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate" title={row.details ?? undefined}>{row.details ?? '–'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {!loading && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
            <p className="text-sm text-gray-600">
              Strona <strong>{page}</strong> z <strong>{totalPages}</strong> · Łącznie <strong>{data.total}</strong> wpisów
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-700 px-2">Strona {page}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

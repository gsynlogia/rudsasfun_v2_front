'use client';

import { ArrowLeft, ChevronLeft, ChevronRight, Lock, X as XIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import AdminLayout from '@/components/admin/AdminLayout';
import { authService } from '@/lib/services/AuthService';
import { authenticatedApiCall } from '@/utils/api-auth';
import { useToast } from '@/components/ToastContainer';

const PAGE_SIZE = 15;

const TYPE_OPTIONS = [
  { value: 'with_token' as const, label: 'Z tokenem' },
  { value: 'without_token' as const, label: 'Bez tokenu' },
  { value: 'reservations_but_never_logged_in' as const, label: 'Mają rezerwacje, nigdy się nie logowali' },
] as const;

type FilterTypeValue = typeof TYPE_OPTIONS[number]['value'];

interface UserNoResItem {
  id: number;
  email: string | null;
  login: string;
  user_type: string;
  is_active: boolean;
  user_created_at: string | null;
  has_token: boolean;
  magic_link_expires: string | null;
  total_reservations: number;
  created_by_email?: string | null;
  created_by_login?: string | null;
}

function interpretacja(row: UserNoResItem): string {
  if (row.total_reservations > 0) {
    return 'Ma rezerwacje; nigdy się nie zalogował – rezerwację założył ktoś inny.';
  }
  if (row.has_token) {
    return 'Prawdopodobnie nie otrzymał maila / nie kliknął w link – token nadal aktywny.';
  }
  return 'Zalogował się (kliknął w link), nie złożył rezerwacji.';
}

function getRowColor(row: UserNoResItem): 'orange' | 'blue' | 'red' | 'default' {
  if (row.total_reservations > 0) return 'orange';
  if (row.has_token && row.total_reservations === 0) return 'red';
  if (!row.has_token && row.total_reservations === 0) return 'blue';
  return 'default';
}

function SettingsUsersNoReservationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const typeFromUrl = useMemo(() => {
    const t = searchParams?.get('type');
    if (!t) return null;
    return t.split(',').filter((x): x is FilterTypeValue =>
      TYPE_OPTIONS.some((o) => o.value === x)
    );
  }, [searchParams]);

  const defaultTypes: FilterTypeValue[] = TYPE_OPTIONS.map((o) => o.value);
  const [selectedTypes, setSelectedTypes] = useState<FilterTypeValue[]>(defaultTypes);
  const [emailSearch, setEmailSearch] = useState('');
  const [emailDebounced, setEmailDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: UserNoResItem[]; total: number }>({ items: [], total: 0 });

  const [passwordModalUser, setPasswordModalUser] = useState<UserNoResItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const t = typeFromUrl;
    if (t !== null && t.length > 0) {
      setSelectedTypes(t);
    }
  }, [typeFromUrl]);

  useEffect(() => {
    const p = searchParams?.get('page');
    const n = p ? parseInt(p, 10) : NaN;
    if (!Number.isNaN(n) && n >= 1) setPage(n);
  }, [searchParams]);

  useEffect(() => {
    const e = searchParams?.get('email');
    if (e != null) {
      const val = typeof e === 'string' ? e : '';
      setEmailSearch(val);
      setEmailDebounced(val);
    }
  }, [searchParams]);

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

  useEffect(() => {
    const t = setTimeout(() => {
      setEmailDebounced(emailSearch.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [emailSearch]);

  const updateUrl = useCallback(
    (updates: { type?: FilterTypeValue[]; page?: number; email?: string }) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (updates.type !== undefined) {
        if (updates.type.length === 0 || updates.type.length === TYPE_OPTIONS.length) {
          params.delete('type');
        } else {
          params.set('type', updates.type.join(','));
        }
      }
      if (updates.page !== undefined) {
        if (updates.page <= 1) params.delete('page');
        else params.set('page', String(updates.page));
      }
      if (updates.email !== undefined) {
        if (!updates.email) params.delete('email');
        else params.set('email', updates.email);
      }
      const q = params.toString();
      router.replace(q ? `?${q}` : window.location.pathname, { scroll: false });
    },
    [router, searchParams]
  );

  const fetchData = useCallback(
    async (currentPage: number, types: FilterTypeValue[], email: string) => {
      const params = new URLSearchParams();
      if (types.length > 0 && types.length < TYPE_OPTIONS.length) {
        types.forEach((t) => params.append('type', t));
      }
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String((currentPage - 1) * PAGE_SIZE));
      if (email) params.set('email', email);
      const res = await authenticatedApiCall<{ items: UserNoResItem[]; total: number }>(
        `/api/admin-settings/users-no-reservations?${params.toString()}`
      );
      return res || { items: [], total: 0 };
    },
    []
  );

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    const types = selectedTypes.length === 0 ? defaultTypes : selectedTypes;
    setLoading(true);
    fetchData(page, types, emailDebounced)
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
  }, [authorized, page, selectedTypes, emailDebounced, fetchData]);

  const formatDate = (s: string | null) => {
    if (!s) return '–';
    try {
      return new Date(s).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return s;
    }
  };

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const hasTypeFilter = selectedTypes.length > 0 && selectedTypes.length < TYPE_OPTIONS.length;
  const hasEmailFilter = emailDebounced !== '';
  const hasActiveFilters = hasTypeFilter || hasEmailFilter;

  const handleClearFilters = () => {
    setEmailSearch('');
    setEmailDebounced('');
    setSelectedTypes(defaultTypes);
    setPage(1);
    updateUrl({ type: defaultTypes, page: 1, email: '' });
  };

  const toggleType = (value: FilterTypeValue) => {
    const next = selectedTypes.includes(value)
      ? selectedTypes.filter((t) => t !== value)
      : [...selectedTypes, value];
    setSelectedTypes(next);
    setPage(1);
    updateUrl({ type: next, page: 1 });
  };

  const selectAllTypes = () => {
    setSelectedTypes(defaultTypes);
    setPage(1);
    updateUrl({ type: defaultTypes, page: 1 });
  };

  const setPageAndUrl = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setPage(next);
    updateUrl({ page: next });
  };

  const openPasswordModal = (row: UserNoResItem) => {
    setPasswordModalUser(row);
    setNewPassword('');
    setNewPasswordConfirm('');
    setPasswordError(null);
  };

  const closePasswordModal = () => {
    setPasswordModalUser(null);
    setPasswordError(null);
  };

  const validatePasswordForm = (): boolean => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Hasło musi mieć co najmniej 6 znaków.');
      return false;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError('Hasło i powtórzenie muszą być identyczne.');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const submitPassword = useCallback(async () => {
    if (!passwordModalUser || !validatePasswordForm()) return;
    setPasswordSubmitting(true);
    setPasswordError(null);
    try {
      await authenticatedApiCall<{ message: string }>(
        `/api/auth/users/${passwordModalUser.id}/password`,
        {
          method: 'PATCH',
          body: JSON.stringify({ password: newPassword }),
        }
      );
      closePasswordModal();
      showSuccess('Hasło zostało zmienione.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nie udało się zmienić hasła.';
      setPasswordError(msg);
      showError(msg);
    } finally {
      setPasswordSubmitting(false);
    }
  }, [passwordModalUser, newPassword, newPasswordConfirm, showSuccess, showError]);

  const hasOrange = data.items.some((row) => row.total_reservations > 0);
  const hasBlue = data.items.some((row) => !row.has_token && row.total_reservations === 0);
  const hasRed = data.items.some((row) => row.has_token && row.total_reservations === 0);

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

        <div className="flex-shrink-0 bg-slate-800 shadow-md p-3 sticky top-0 z-20">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-bold text-white whitespace-nowrap">Użytkownicy bez rezerwacji</h1>

            {/* Multi-select typów – wybrane jako tagi */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-300 text-sm">Typ:</span>
              {TYPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(opt.value)}
                    onChange={() => toggleType(opt.value)}
                    className="rounded border-slate-500 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-white text-sm">{opt.label}</span>
                </label>
              ))}
              <button
                type="button"
                onClick={selectAllTypes}
                className="text-xs text-slate-400 hover:text-white"
              >
                Wszyscy
              </button>
            </div>

            <input
              type="text"
              placeholder="Szukaj po e-mailu..."
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              onBlur={() => updateUrl({ email: emailSearch.trim() || undefined })}
              className="px-3 py-1.5 bg-slate-700 text-white border border-slate-600 rounded text-sm min-w-[12rem] placeholder-slate-400 focus:ring-2 focus:ring-orange-500"
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-1.5 bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors text-sm flex items-center gap-1.5"
              >
                <XIcon className="w-3.5 h-3.5" />
                Wyczyść filtry
              </button>
            )}

            <span className="ml-auto text-xs text-slate-300 whitespace-nowrap">
              Znaleziono: <strong className="text-white">{data.total}</strong> | Na stronie: <strong className="text-white">{PAGE_SIZE}</strong>
            </span>
          </div>
        </div>

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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rezerwacje</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data utworzenia</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interpretacja</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Przez kogo założono (e-mail)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-600">
                        Brak użytkowników spełniających kryteria
                      </td>
                    </tr>
                  ) : (
                    data.items.map((row) => {
                      const color = getRowColor(row);
                      const rowClass =
                        color === 'orange'
                          ? 'bg-orange-50 hover:bg-orange-100 transition-colors'
                          : color === 'blue'
                            ? 'bg-blue-50 hover:bg-blue-100 transition-colors'
                            : color === 'red'
                              ? 'bg-red-50 hover:bg-red-100 transition-colors'
                              : 'hover:bg-gray-50 transition-colors';
                      return (
                        <tr key={row.id} className={rowClass}>
                          <td className="px-4 py-2 text-sm text-gray-900">{row.id}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{row.email ?? '–'}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{row.total_reservations}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{row.login}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">{formatDate(row.user_created_at)}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{row.has_token ? 'Tak' : 'Nie'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 max-w-xs" title={interpretacja(row)}>
                            {interpretacja(row)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600" title={row.created_by_login ?? undefined}>
                            {row.created_by_email ?? row.created_by_login ?? 'brak'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <button
                              type="button"
                              onClick={() => openPasswordModal(row)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 hover:bg-gray-200 transition-colors"
                              title="Zmień lub ustaw hasło użytkownika"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              Zmień hasło
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: zmiana hasła użytkownika */}
        {passwordModalUser && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
            onClick={passwordSubmitting ? undefined : closePasswordModal}
          >
            <div
              className="bg-white shadow-2xl max-w-md w-full p-6"
              style={{ borderRadius: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-1">Zmień hasło użytkownika</h3>
              <p className="text-sm text-gray-600 mb-4">
                {passwordModalUser.email ?? passwordModalUser.login} (ID: {passwordModalUser.id})
              </p>
              {passwordError && (
                <p className="text-sm text-red-600 mb-3" role="alert">
                  {passwordError}
                </p>
              )}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nowe hasło (min. 6 znaków)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 text-gray-900"
                  autoComplete="new-password"
                  disabled={passwordSubmitting}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Powtórz hasło
                </label>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 text-gray-900"
                  autoComplete="new-password"
                  disabled={passwordSubmitting}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={passwordSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={submitPassword}
                  disabled={passwordSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-800 border-2 border-slate-800 hover:bg-slate-700 disabled:opacity-50"
                >
                  {passwordSubmitting ? 'Zapisywanie…' : 'Zapisz hasło'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Opisy kolorów */}
        {!loading && (hasOrange || hasBlue || hasRed) && (
          <div className="mt-3 space-y-2">
            {hasRed && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                <strong>Rekordy na czerwono:</strong> brak logowania i rezerwacji, nigdy nie kliknęli w link (token nadal aktywny).
              </p>
            )}
            {hasBlue && (
              <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                <strong>Rekordy na niebiesko:</strong> użytkownik raczej się zalogował, ale nie ma rezerwacji.
              </p>
            )}
            {hasOrange && (
              <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded px-3 py-2 space-y-1">
                <p><strong>Rekordy na pomarańczowo:</strong> użytkownik ma rezerwacje, lecz nigdy się nie zalogował – rezerwację założył ktoś inny.</p>
                <p>Kolumna <strong>Przez kogo założono (e-mail)</strong>: e-mail drugiego opiekuna z rezerwacji (rezerwacja przypisana do tego użytkownika) – prawdopodobnie ta osoba założyła rezerwację. Gdy w rezerwacji jest tylko jeden opiekun lub brak dopasowania, wyświetlane jest „brak”.</p>
              </div>
            )}
          </div>
        )}

        {!loading && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
            <p className="text-sm text-gray-600">
              Strona <strong>{page}</strong> z <strong>{totalPages}</strong> · Łącznie <strong>{data.total}</strong> użytkowników
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPageAndUrl(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-700 px-2">Strona {page}</span>
              <button
                type="button"
                onClick={() => setPageAndUrl(Math.min(totalPages, page + 1))}
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

export default function SettingsUsersNoReservationsPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
        </div>
      </AdminLayout>
    }>
      <SettingsUsersNoReservationsContent />
    </Suspense>
  );
}

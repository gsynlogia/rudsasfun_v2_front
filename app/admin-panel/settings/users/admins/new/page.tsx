'use client';

import { ArrowLeft, Eye, EyeOff, Shield, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { useToast } from '@/components/ToastContainer';
import { authenticatedApiCall } from '@/utils/api-auth';

interface Group {
  id: number;
  name: string;
  description: string | null;
}

/**
 * Admin Panel - New Admin User Page
 * Route: /admin-panel/settings/users/admins/new
 *
 * Create new system administrator user
 */
export default function NewAdminUserPage() {
  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';
  const { showSuccess, showError } = useToast();

  // Form state
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Settings
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // Form state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setGroupsLoading(true);
      const groupsData = await authenticatedApiCall<Group[]>(`${API_BASE_URL}/api/admin-users/groups/all`);
      setGroups(groupsData);
    } catch (err) {
      console.error('Error loading groups:', err);
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!login || !password) {
      setError('Login i hasło są wymagane');
      return;
    }

    setLoading(true);

    try {
      // Create user
      const newUser = await authenticatedApiCall<{ id: number }>(
        `${API_BASE_URL}/api/admin-users`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            login,
            email: email || null,
            password,
            is_superadmin: isSuperadmin,
            group_ids: groupIds,
          }),
        },
      );

      // Create settings for the new user
      await authenticatedApiCall(
        `${API_BASE_URL}/api/admin-users/${newUser.id}/settings`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items_per_page: itemsPerPage,
          }),
        },
      );

      showSuccess(`Użytkownik ${login} został utworzony`);
      router.push('/admin-panel/settings/users/admins');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Błąd podczas tworzenia użytkownika';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupToggle = (groupId: number) => {
    if (groupIds.includes(groupId)) {
      setGroupIds(groupIds.filter(id => id !== groupId));
    } else {
      setGroupIds([...groupIds, groupId]);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-2xl">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link
            href="/admin-panel/settings/users/admins"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Powrót do użytkowników systemu</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Nowy użytkownik systemu</h1>
          <p className="text-gray-600 text-sm">Utwórz nowe konto administratora lub operatora panelu</p>
        </div>

        {/* Form */}
        <div className="bg-white shadow p-6" style={{ borderRadius: 0 }}>
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4" style={{ borderRadius: 0 }}>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Login */}
            <div>
              <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-2">
                Login *
              </label>
              <input
                id="login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                style={{ borderRadius: 0 }}
                placeholder="Wprowadź login"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                style={{ borderRadius: 0 }}
                placeholder="Wprowadź adres email (opcjonalnie)"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Hasło *
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 pr-10 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  style={{ borderRadius: 0 }}
                  placeholder="Wprowadź hasło"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Superadmin Checkbox */}
            <div className="border border-gray-200 p-4" style={{ borderRadius: 0 }}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSuperadmin}
                  onChange={(e) => setIsSuperadmin(e.target.checked)}
                  className="w-5 h-5 text-orange-500 border-gray-300 focus:ring-orange-500"
                  style={{ cursor: 'pointer' }}
                  disabled={loading}
                />
                <div className="flex items-center gap-2">
                  <Shield size={20} className="text-orange-500" />
                  <span className="text-sm font-medium text-gray-900">Superadmin</span>
                </div>
              </label>
              <p className="mt-2 text-xs text-gray-500 ml-8">
                Superadmin ma pełne uprawnienia do wszystkich sekcji panelu administracyjnego, niezależnie od przypisanych grup.
              </p>
            </div>

            {/* Interface Settings */}
            <div className="border border-gray-200 p-4" style={{ borderRadius: 0 }}>
              <div className="flex items-center gap-2 mb-4">
                <Settings size={20} className="text-[#03adf0]" />
                <span className="text-sm font-medium text-gray-900">Ustawienia interfejsu</span>
              </div>

              <div>
                <label htmlFor="itemsPerPage" className="block text-sm font-medium text-gray-700 mb-2">
                  Ilość pozycji w tabelach
                </label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent bg-white"
                  style={{ borderRadius: 0 }}
                  disabled={loading}
                >
                  <option value={10}>10 pozycji</option>
                  <option value={20}>20 pozycji</option>
                  <option value={30}>30 pozycji</option>
                  <option value={50}>50 pozycji</option>
                  <option value={100}>100 pozycji</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Domyślna ilość wyników na stronę w tabelach Rezerwacji i Płatności
                </p>
              </div>
            </div>

            {/* Groups Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grupy
              </label>
              <div className="border border-gray-300 p-4" style={{ borderRadius: 0 }}>
                {groupsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#03adf0]"></div>
                    <span className="ml-2 text-sm text-gray-500">Ładowanie grup...</span>
                  </div>
                ) : groups.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">Brak dostępnych grup</p>
                ) : (
                  <div className="space-y-3">
                    {groups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-start gap-3 p-2 hover:bg-gray-50 cursor-pointer"
                        style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={groupIds.includes(group.id)}
                          onChange={() => handleGroupToggle(group.id)}
                          className="w-4 h-4 mt-0.5 text-[#03adf0] border-gray-300 focus:ring-[#03adf0]"
                          style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                          disabled={loading}
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{group.name}</span>
                          {group.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{group.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Grupy określają uprawnienia użytkownika do poszczególnych sekcji panelu.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Link
                href="/admin-panel/settings/users/admins"
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-center hover:bg-gray-50 transition-colors"
                style={{ borderRadius: 0, cursor: 'pointer' }}
              >
                Anuluj
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Tworzenie...' : 'Utwórz użytkownika'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
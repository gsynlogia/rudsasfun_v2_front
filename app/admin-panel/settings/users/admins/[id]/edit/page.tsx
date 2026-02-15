'use client';

import { ArrowLeft, Eye, EyeOff, Shield, Settings, CloudUpload, CloudDownload, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { useToast } from '@/components/ToastContainer';
import { authenticatedApiCall } from '@/utils/api-auth';

interface Group {
  id: number;
  name: string;
  description: string | null;
}

interface AdminUser {
  id: number;
  login: string;
  email: string | null;
  is_active: boolean;
  is_superadmin: boolean;
  groups: string[];
}

interface AdminUserSettings {
  items_per_page: number;
  payments_columns_config: string | null;
  reservations_columns_config: string | null;
  excel_decimal_dot?: boolean;
}

// LocalStorage keys for column configurations (must match keys in PaymentsManagement.tsx and ReservationsTable.tsx)
const PAYMENTS_STORAGE_KEY = 'payments_list_columns';
const RESERVATIONS_STORAGE_KEY = 'reservations_list_columns';

/**
 * Admin Panel - Edit Admin User Page
 * Route: /admin-panel/settings/users/admins/[id]/edit
 *
 * Edit existing system administrator user
 */
export default function EditAdminUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';
  const { showSuccess, showError } = useToast();

  // User data
  const [user, setUser] = useState<AdminUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Form state
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Settings state
  const [userSettings, setUserSettings] = useState<AdminUserSettings>({
    items_per_page: 10,
    payments_columns_config: null,
    reservations_columns_config: null,
    excel_decimal_dot: false,
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // Form state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user, groups and settings on mount
  useEffect(() => {
    if (userId) {
      loadUser();
      loadGroups();
      loadUserSettings();
    }
  }, [userId]);

  const loadUser = async () => {
    try {
      setUserLoading(true);
      const response = await authenticatedApiCall<{ users: AdminUser[] }>(`${API_BASE_URL}/api/admin-users`);
      const foundUser = response.users.find(u => u.id === parseInt(userId));
      
      if (foundUser) {
        setUser(foundUser);
        setLogin(foundUser.login);
        setEmail(foundUser.email || '');
        setIsActive(foundUser.is_active);
        setIsSuperadmin(foundUser.is_superadmin);
      } else {
        setError('Użytkownik nie został znaleziony');
      }
    } catch (err) {
      console.error('Error loading user:', err);
      setError('Błąd podczas ładowania użytkownika');
    } finally {
      setUserLoading(false);
    }
  };

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

  const loadUserSettings = async () => {
    try {
      setSettingsLoading(true);
      const settings = await authenticatedApiCall<AdminUserSettings>(
        `${API_BASE_URL}/api/admin-users/${userId}/settings`
      );
      setUserSettings(settings);
    } catch (err) {
      console.error('Error loading user settings:', err);
      // Keep defaults on error
    } finally {
      setSettingsLoading(false);
    }
  };

  // Set group IDs when both user and groups are loaded
  useEffect(() => {
    if (user && groups.length > 0) {
      const userGroupIds: number[] = [];
      for (const groupName of user.groups) {
        const group = groups.find(g => g.name === groupName);
        if (group) {
          userGroupIds.push(group.id);
        }
      }
      setGroupIds(userGroupIds);
    }
  }, [user, groups]);

  // Sync current localStorage settings to cloud
  const syncToCloud = async () => {
    setSyncStatus('syncing');
    try {
      // Get current localStorage settings
      const paymentsConfig = localStorage.getItem(PAYMENTS_STORAGE_KEY);
      const reservationsConfig = localStorage.getItem(RESERVATIONS_STORAGE_KEY);
      
      const syncData = {
        items_per_page: userSettings.items_per_page,
        payments_columns_config: paymentsConfig,
        reservations_columns_config: reservationsConfig,
        excel_decimal_dot: userSettings.excel_decimal_dot === true,
      };

      await authenticatedApiCall(
        `${API_BASE_URL}/api/admin-users/${userId}/settings/sync-to-cloud`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncData),
        }
      );
      
      // Also save items_per_page to localStorage for immediate use in other components
      localStorage.setItem('admin_items_per_page', userSettings.items_per_page.toString());
      
      // Update local state
      setUserSettings(prev => ({
        ...prev,
        payments_columns_config: paymentsConfig,
        reservations_columns_config: reservationsConfig,
      }));
      
      setSyncStatus('success');
      showSuccess('Ustawienia zostały zapisane do chmury');
      
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      setSyncStatus('error');
      showError('Nie udało się zapisać ustawień do chmury');
      console.error('Error syncing to cloud:', err);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  // Sync settings from cloud to localStorage
  const syncFromCloud = async () => {
    setSyncStatus('syncing');
    try {
      const settings = await authenticatedApiCall<AdminUserSettings>(
        `${API_BASE_URL}/api/admin-users/${userId}/settings`
      );
      
      // Apply settings to localStorage
      if (settings.payments_columns_config) {
        localStorage.setItem(PAYMENTS_STORAGE_KEY, settings.payments_columns_config);
      }
      if (settings.reservations_columns_config) {
        localStorage.setItem(RESERVATIONS_STORAGE_KEY, settings.reservations_columns_config);
      }
      // Save items_per_page to localStorage for immediate use
      if (settings.items_per_page) {
        localStorage.setItem('admin_items_per_page', settings.items_per_page.toString());
      }
      if (typeof (settings as { excel_decimal_dot?: boolean }).excel_decimal_dot !== 'undefined') {
        localStorage.setItem('admin_excel_decimal_dot', (settings as { excel_decimal_dot?: boolean }).excel_decimal_dot ? '1' : '0');
      }
      
      setUserSettings(settings);
      setSyncStatus('success');
      showSuccess('Ustawienia zostały pobrane z chmury i zastosowane w przeglądarce');
      
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      setSyncStatus('error');
      showError('Nie udało się pobrać ustawień z chmury');
      console.error('Error syncing from cloud:', err);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);

    try {
      // Update user
      const updateData: Record<string, unknown> = {
        email: email || null,
        is_active: isActive,
        is_superadmin: isSuperadmin,
        group_ids: groupIds,
      };
      
      // Only include password if it was changed
      if (password) {
        updateData.password = password;
      }

      await authenticatedApiCall(
        `${API_BASE_URL}/api/admin-users/${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );

      // Update settings
      await authenticatedApiCall(
        `${API_BASE_URL}/api/admin-users/${userId}/settings`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items_per_page: userSettings.items_per_page,
            excel_decimal_dot: userSettings.excel_decimal_dot === true,
          }),
        }
      );

      // Also save to localStorage for immediate use in other components
      localStorage.setItem('admin_items_per_page', userSettings.items_per_page.toString());
      localStorage.setItem('admin_excel_decimal_dot', userSettings.excel_decimal_dot === true ? '1' : '0');

      showSuccess(`Użytkownik ${login} został zaktualizowany`);
      router.push('/admin-panel/settings/users/admins');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Błąd podczas aktualizacji użytkownika';
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

  // Loading state
  if (userLoading) {
    return (
      <AdminLayout>
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
            <span className="ml-3 text-gray-600">Ładowanie użytkownika...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Error state - user not found
  if (!user) {
    return (
      <AdminLayout>
        <div className="w-full max-w-2xl">
          <div className="mb-6">
            <Link
              href="/admin-panel/settings/users/admins"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
              style={{ cursor: 'pointer' }}
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Powrót do użytkowników systemu</span>
            </Link>
          </div>
          <div className="bg-red-50 border-l-4 border-red-400 p-4" style={{ borderRadius: 0 }}>
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600" />
              <p className="text-sm text-red-700">Użytkownik nie został znaleziony</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Edytuj użytkownika: {login}</h1>
          <p className="text-gray-600 text-sm">Zmień ustawienia konta administratora</p>
        </div>

        {/* Form */}
        <div className="bg-white shadow p-6" style={{ borderRadius: 0 }}>
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4" style={{ borderRadius: 0 }}>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Login (disabled) */}
            <div>
              <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-2">
                Login
              </label>
              <input
                id="login"
                type="text"
                value={login}
                disabled
                className="w-full px-4 py-2 border border-gray-300 bg-gray-100 text-gray-500"
                style={{ borderRadius: 0 }}
              />
              <p className="mt-1 text-xs text-gray-500">Login nie może być zmieniony</p>
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
                Nowe hasło
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                  style={{ borderRadius: 0 }}
                  placeholder="Pozostaw puste, aby nie zmieniać"
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
              <p className="mt-1 text-xs text-gray-500">Pozostaw puste, aby zachować obecne hasło</p>
            </div>

            {/* Active Checkbox */}
            <div className="border border-gray-200 p-4" style={{ borderRadius: 0 }}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 text-green-500 border-gray-300 focus:ring-green-500"
                  style={{ cursor: 'pointer' }}
                  disabled={loading}
                />
                <span className="text-sm font-medium text-gray-900">Konto aktywne</span>
              </label>
              <p className="mt-2 text-xs text-gray-500 ml-8">
                Nieaktywne konto nie może się zalogować do panelu.
              </p>
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
              
              {settingsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#03adf0]"></div>
                  <span className="ml-2 text-sm text-gray-500">Ładowanie ustawień...</span>
                </div>
              ) : (
                <>
                  {/* Items per page */}
                  <div className="mb-4">
                    <label htmlFor="itemsPerPage" className="block text-sm font-medium text-gray-700 mb-2">
                      Ilość pozycji w tabelach
                    </label>
                    <select
                      id="itemsPerPage"
                      value={userSettings.items_per_page}
                      onChange={(e) => setUserSettings({ ...userSettings, items_per_page: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent bg-white"
                      style={{ borderRadius: 0 }}
                      disabled={loading}
                    >
                      <option value={5}>5 pozycji</option>
                      <option value={10}>10 pozycji</option>
                      <option value={15}>15 pozycji</option>
                      <option value={20}>20 pozycji</option>
                      <option value={25}>25 pozycji</option>
                      <option value={50}>50 pozycji</option>
                      <option value={100}>100 pozycji</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Domyślna ilość wyników na stronę w tabelach Rezerwacji i Płatności
                    </p>
                  </div>

                  {/* Excel export: decimal separator */}
                  <div className="mb-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userSettings.excel_decimal_dot === false}
                        onChange={(e) => setUserSettings({ ...userSettings, excel_decimal_dot: !e.target.checked })}
                        className="w-5 h-5 text-[#03adf0] border-gray-300 focus:ring-[#03adf0]"
                        style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                        disabled={loading}
                      />
                      <span className="text-sm font-medium text-gray-900">W eksporcie Excel używaj przecinków zamiast kropek</span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500 ml-8">
                      Np. 1,50 zamiast 1.50 — liczby w Excelu z dwoma miejscami po przecinku
                    </p>
                  </div>

                  {/* Cloud sync section */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Synchronizacja konfiguracji kolumn</p>
                    <p className="text-xs text-gray-500 mb-3">
                      Zapisz lub pobierz konfigurację kolumn tabel (widoczność, kolejność, filtry) między przeglądarką a bazą danych.
                    </p>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={syncToCloud}
                        disabled={syncStatus === 'syncing' || loading}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-[#03adf0] text-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-colors disabled:opacity-50"
                        style={{ borderRadius: 0, cursor: syncStatus === 'syncing' || loading ? 'not-allowed' : 'pointer' }}
                      >
                        {syncStatus === 'syncing' ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : syncStatus === 'success' ? (
                          <Check size={16} />
                        ) : (
                          <CloudUpload size={16} />
                        )}
                        <span>Zapisz do chmury</span>
                      </button>
                      <button
                        type="button"
                        onClick={syncFromCloud}
                        disabled={syncStatus === 'syncing' || loading}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        style={{ borderRadius: 0, cursor: syncStatus === 'syncing' || loading ? 'not-allowed' : 'pointer' }}
                      >
                        {syncStatus === 'syncing' ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : (
                          <CloudDownload size={16} />
                        )}
                        <span>Pobierz z chmury</span>
                      </button>
                    </div>
                    
                    {/* Saved configs info */}
                    {(userSettings.payments_columns_config || userSettings.reservations_columns_config) && (
                      <div className="mt-3 p-2 bg-gray-50 border border-gray-200" style={{ borderRadius: 0 }}>
                        <p className="text-xs text-gray-600 font-medium">Zapisane konfiguracje w bazie:</p>
                        <ul className="text-xs text-gray-500 mt-1">
                          {userSettings.payments_columns_config && (
                            <li>• Tabela płatności</li>
                          )}
                          {userSettings.reservations_columns_config && (
                            <li>• Tabela rezerwacji</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
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
                {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}

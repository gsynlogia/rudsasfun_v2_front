'use client';

import { Settings as SettingsIcon, Users, UserCog, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { authService } from '@/lib/services/AuthService';
import { authenticatedApiCall } from '@/utils/api-auth';
import { getApiBaseUrlRuntime } from '@/utils/api-config';

/**
 * Admin Panel - Settings Page
 * Route: /admin-panel/settings
 *
 * Settings page with three buttons side by side: General, Users, Groups
 */
export default function SettingsPage() {
  const pathname = usePathname();
  const [isUserZero, setIsUserZero] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (authService.isAuthenticated()) {
        const user = await authService.verifyToken();
        if (user && user.id === 0) {
          setIsUserZero(true);
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const sections = [
    {
      id: 'general',
      href: '/admin-panel/settings',
      label: 'Ogólne',
      icon: SettingsIcon,
    },
    {
      id: 'users',
      href: '/admin-panel/settings/users',
      label: 'Użytkownicy',
      icon: Users,
    },
    {
      id: 'groups',
      href: '/admin-panel/settings/groups',
      label: 'Grupy',
      icon: UserCog,
    },
  ];

  // Add super functions section only for user ID 0
  if (!loading && isUserZero) {
    sections.push({
      id: 'super-functions',
      href: '/admin-panel/settings/super-functions',
      label: 'Super funkcje',
      icon: Sparkles,
    });
  }

  return (
    <SectionGuard section="settings">
      <AdminLayout>
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Ustawienia</h1>
          <p className="text-sm text-gray-600">Zarządzaj ustawieniami systemu</p>
        </div>

        {/* Three Buttons Side by Side */}
        <div className="flex gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = pathname === section.href;

            return (
              <Link
                key={section.id}
                href={section.href}
                className={`
                  flex-1 flex items-center justify-center gap-3 px-6 py-8 bg-white rounded-lg shadow transition-colors
                  ${isActive
                    ? 'bg-[#E0F2FF] border-2 border-[#03adf0]'
                    : 'hover:bg-gray-50 border-2 border-transparent'
                  }
                `}
                style={{
                  borderRadius: 0,
                  cursor: 'pointer',
                }}
              >
                <Icon
                  size={24}
                  style={{
                    strokeWidth: 2,
                    color: isActive ? '#03adf0' : '#6B7280',
                  }}
                />
                <span className="text-lg font-medium" style={{ color: isActive ? '#03adf0' : '#6B7280' }}>
                  {section.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Online Payments Toggle - Only show on general settings page */}
        {pathname === '/admin-panel/settings' && (
          <>
            <OnlinePaymentsToggle />
            <BankAccountSettings />
          </>
        )}
      </div>
    </AdminLayout>
    </SectionGuard>
  );
}

/**
 * Online Payments Toggle Component
 * Allows admin to enable/disable online payments
 */
function OnlinePaymentsToggle() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = getApiBaseUrlRuntime();
      const data = await authenticatedApiCall<{ enabled: boolean }>(
        `${API_BASE_URL}/api/system-settings/online-payments/status`,
      );
      setEnabled(data.enabled);
    } catch (err) {
      setError('Błąd podczas ładowania statusu płatności online');
      console.error('Error loading online payments status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      setSaving(true);
      setError('');
      const newStatus = !enabled;
      const API_BASE_URL = getApiBaseUrlRuntime();

      await authenticatedApiCall<{ enabled: boolean }>(
        `${API_BASE_URL}/api/system-settings/online-payments/status`,
        {
          method: 'PUT',
          body: JSON.stringify({ enabled: newStatus }),
        },
      );

      setEnabled(newStatus);
    } catch (err: any) {
      setError(err.message || 'Błąd podczas aktualizacji statusu płatności online');
      console.error('Error updating online payments status:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 p-4 bg-white rounded-lg shadow">
        <p className="text-sm text-gray-600">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 sm:p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
            Płatności online
          </h3>
          <p className="text-sm text-gray-600">
            {enabled
              ? 'Płatności online (Tpay) są włączone. Użytkownicy mogą płacić online w kroku 5.'
              : 'Płatności online (Tpay) są wyłączone. Użytkownicy będą mogli tylko wybrać przelew tradycyjny i przejść bez płatności.'
            }
          </p>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`
            ml-4 px-4 py-2 rounded-lg font-medium text-sm transition-colors
            ${enabled
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
            }
            ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {saving ? 'Zapisywanie...' : enabled ? 'Włączone' : 'Wyłączone'}
        </button>
      </div>
    </div>
  );
}

/**
 * Bank Account Settings Component
 * Allows admin to manage bank account details for traditional transfer payments
 */
function BankAccountSettings() {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    account_holder: '',
    account_number: '',
    bank_name: '',
    address: '',
    transfer_title_template: '',
  });

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = getApiBaseUrlRuntime();
      const accounts = await authenticatedApiCall<Array<{
        id: number;
        account_holder: string;
        account_number: string;
        bank_name: string | null;
        address: string | null;
        transfer_title_template: string | null;
        is_active: number;
      }>>(`${API_BASE_URL}/api/bank-accounts/?active_only=false`);

      // Get first active account or first account if no active
      const activeAccount = accounts.find(a => a.is_active === 1) || accounts[0];
      if (activeAccount) {
        setAccount(activeAccount);
        setFormData({
          account_holder: activeAccount.account_holder || '',
          account_number: activeAccount.account_number || '',
          bank_name: activeAccount.bank_name || '',
          address: activeAccount.address || '',
          transfer_title_template: activeAccount.transfer_title_template || '',
        });
      }
    } catch (err) {
      setError('Błąd podczas ładowania danych konta bankowego');
      console.error('Error loading bank account:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const API_BASE_URL = getApiBaseUrlRuntime();

      if (account) {
        // Update existing account
        await authenticatedApiCall(
          `${API_BASE_URL}/api/bank-accounts/${account.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(formData),
          },
        );
      } else {
        // Create new account
        await authenticatedApiCall(
          `${API_BASE_URL}/api/bank-accounts/`,
          {
            method: 'POST',
            body: JSON.stringify({
              ...formData,
              is_active: 1,
            }),
          },
        );
      }

      setIsEditing(false);
      await loadAccount();
    } catch (err: any) {
      setError(err.message || 'Błąd podczas zapisywania danych konta bankowego');
      console.error('Error saving bank account:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 p-4 bg-white rounded-lg shadow">
        <p className="text-sm text-gray-600">Ładowanie danych konta bankowego...</p>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 sm:p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
            Dane do przelewu tradycyjnego
          </h3>
          <p className="text-sm text-gray-600">
            Te dane będą wyświetlane użytkownikom gdy płatności online są wyłączone
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-[#03adf0] text-white text-sm font-medium rounded-lg hover:bg-[#0288c7] transition-colors"
          >
            Edytuj
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nazwa odbiorcy
            </label>
            <input
              type="text"
              value={formData.account_holder}
              onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
              placeholder="np. Radsas Fun Radosław Sąsiadek"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numer konta
            </label>
            <input
              type="text"
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
              placeholder="np. 80 1160 2202 0000 0001 3648 0110"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nazwa banku
            </label>
            <input
              type="text"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
              placeholder="np. Bank Millennium"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adres
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
              placeholder="np. ul.Pilotów 19F/8, 80-460 Gdańsk"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Szablon tytułu przelewu
            </label>
            <input
              type="text"
              value={formData.transfer_title_template}
              onChange={(e) => setFormData({ ...formData, transfer_title_template: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
              placeholder="np. nazwa kolonii/obozu, termin, imię i nazwisko uczestnika, nr tel. wpłacającego"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                if (account) {
                  setFormData({
                    account_holder: account.account_holder || '',
                    account_number: account.account_number || '',
                    bank_name: account.bank_name || '',
                    address: account.address || '',
                    transfer_title_template: account.transfer_title_template || '',
                  });
                }
              }}
              disabled={saving}
              className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anuluj
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-gray-700">Nazwa odbiorcy:</span>
            <span className="ml-2 text-gray-900">{account?.account_holder || 'Brak danych'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Numer konta:</span>
            <span className="ml-2 text-gray-900">{account?.account_number || 'Brak danych'}</span>
          </div>
          {account?.bank_name && (
            <div>
              <span className="font-medium text-gray-700">Bank:</span>
              <span className="ml-2 text-gray-900">{account.bank_name}</span>
            </div>
          )}
          {account?.address && (
            <div>
              <span className="font-medium text-gray-700">Adres:</span>
              <span className="ml-2 text-gray-900">{account.address}</span>
            </div>
          )}
          {account?.transfer_title_template && (
            <div>
              <span className="font-medium text-gray-700">Szablon tytułu:</span>
              <span className="ml-2 text-gray-900">{account.transfer_title_template}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
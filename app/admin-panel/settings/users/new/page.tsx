'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { authenticatedApiCall } from '@/utils/api-auth';

interface Group {
  id: number;
  name: string;
  description: string | null;
}

/**
 * Admin Panel - Add User Page
 * Route: /admin-panel/settings/users/new
 *
 * Separate page for adding new user with group assignment
 */
export default function AddUserPage() {
  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';

  const [formData, setFormData] = useState({
    login: '',
    password: '',
    groupIds: [] as number[],
  });
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const groupsData = await authenticatedApiCall<Group[]>(`${API_BASE_URL}/api/groups`);
      setGroups(groupsData);
    } catch (err) {
      console.error('Error loading groups:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Create new user
      const newUser = await authenticatedApiCall<{id: number}>(
        `${API_BASE_URL}/api/auth/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            login: formData.login,
            password: formData.password,
          }),
        },
      );

      // Assign user to selected groups
      if (formData.groupIds.length > 0) {
        for (const groupId of formData.groupIds) {
          try {
            await authenticatedApiCall(
              `${API_BASE_URL}/api/groups/${groupId}/users`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  user_ids: [newUser.id],
                }),
              },
            );
          } catch (err) {
            console.error(`Error assigning user to group ${groupId}:`, err);
          }
        }
      }

      // Redirect back to users page
      router.push('/admin-panel/settings/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas dodawania użytkownika');
    } finally {
      setLoading(false);
    }
  };


  return (
    <AdminLayout>
      <div className="w-full">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link
            href="/admin-panel/settings/users"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Powrót do użytkowników</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Dodaj użytkownika</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Add User Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-2">
                Login <span className="text-red-500">*</span>
              </label>
              <input
                id="login"
                type="text"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                required
                minLength={3}
                maxLength={50}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                style={{ borderRadius: 0 }}
                placeholder="Wprowadź login"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Hasło <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                style={{ borderRadius: 0 }}
                placeholder="Wprowadź hasło (min. 6 znaków)"
                disabled={loading}
              />
            </div>

            {/* Groups Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grupy
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-300 p-3" style={{ borderRadius: 0 }}>
                {groups.length === 0 ? (
                  <p className="text-sm text-gray-500">Brak dostępnych grup</p>
                ) : (
                  groups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.groupIds.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, groupIds: [...formData.groupIds, group.id] });
                          } else {
                            setFormData({ ...formData, groupIds: formData.groupIds.filter(id => id !== group.id) });
                          }
                        }}
                        disabled={loading}
                        className="w-4 h-4 text-[#03adf0] border-gray-300 rounded focus:ring-[#03adf0]"
                        style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                      />
                      <span className="text-sm text-gray-900">{group.name}</span>
                      {group.description && (
                        <span className="text-xs text-gray-500">({group.description})</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Link
                href="/admin-panel/settings/users"
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-center"
                style={{ borderRadius: 0, cursor: 'pointer' }}
              >
                Anuluj
              </Link>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0, cursor: loading ? 'not-allowed' : 'pointer' }}
                disabled={loading}
              >
                {loading ? 'Dodawanie...' : 'Dodaj użytkownika'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}


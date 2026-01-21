'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { authenticatedApiCall } from '@/utils/api-auth';

interface Group {
  id: number;
  name: string;
  description: string | null;
}

interface GroupWithUsers extends Group {
  users: Array<{
    id: number;
    login: string;
    created_at: string | null;
  }>;
  permissions?: string[]; // List of section names
}

interface User {
  id: number;
  login: string;
  groups: string[];
}

/**
 * Admin Panel - Edit Group Page
 * Route: /admin-panel/settings/groups/[id]/edit
 *
 * Separate page for editing group and assigning users
 */
export default function EditGroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = typeof params?.id === 'string'
    ? parseInt(params.id, 10)
    : Array.isArray(params?.id)
      ? parseInt(params.id[0], 10)
      : NaN;
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDefaultGroup, setIsDefaultGroup] = useState(false);

  const defaultGroups = ['admin', 'client', 'moderator'];

  useEffect(() => {
    loadAvailableSections();
    loadGroupData();
    loadUsers();
  }, [groupId]);

  const loadAvailableSections = async () => {
    try {
      const sectionsData = await authenticatedApiCall<{ sections: string[]; section_labels: { [key: string]: string } }>(
        `${API_BASE_URL}/api/groups/available-sections`,
      );
      if (sectionsData && sectionsData.section_labels) {
        setAvailableSections(sectionsData.section_labels);
      } else {
        // Fallback if API doesn't return section_labels
        setAvailableSections({
          'reservations': 'Rezerwacje',
          'camps': 'Obozy',
          'payments': 'Płatności',
          'transports': 'Transport',
        });
      }
    } catch (err) {
      console.error('Error loading available sections:', err);
      // Fallback on error
      setAvailableSections({
        'reservations': 'Rezerwacje',
        'camps': 'Obozy',
        'payments': 'Płatności',
        'transports': 'Transport',
      });
    }
  };

  const loadGroupData = async () => {
    try {
      setLoading(true);
      const groupWithUsers = await authenticatedApiCall<GroupWithUsers>(`${API_BASE_URL}/api/groups/${groupId}`);

      setFormData({
        name: groupWithUsers.name,
        description: groupWithUsers.description || '',
      });

      setSelectedUserIds(groupWithUsers.users.map(u => u.id));
      setSelectedSections(groupWithUsers.permissions || []);
      setIsDefaultGroup(defaultGroups.includes(groupWithUsers.name.toLowerCase()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować grupy');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await authenticatedApiCall<User[]>(`${API_BASE_URL}/api/auth/users`);
      setAllUsers(usersData);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Update group
      await authenticatedApiCall(
        `${API_BASE_URL}/api/groups/${groupId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
          }),
        },
      );

      // Update user assignments - remove from all groups first, then add to selected
      const allGroups = await authenticatedApiCall<Group[]>(`${API_BASE_URL}/api/groups`);
      for (const group of allGroups) {
        if (group.id === groupId) continue; // Skip current group

        for (const userId of selectedUserIds) {
          try {
            await authenticatedApiCall(
              `${API_BASE_URL}/api/groups/${group.id}/users/${userId}`,
              { method: 'DELETE' },
            ).catch(() => {}); // Ignore errors if user not in group
          } catch (err) {
            // Ignore
          }
        }
      }

      // Assign users to this group
      if (selectedUserIds.length > 0) {
        await authenticatedApiCall(
          `${API_BASE_URL}/api/groups/${groupId}/users`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_ids: selectedUserIds,
            }),
          },
        );
      } else {
        // Remove all users from group if none selected
        const currentGroup = await authenticatedApiCall<GroupWithUsers>(`${API_BASE_URL}/api/groups/${groupId}`);
        for (const user of currentGroup.users) {
          try {
            await authenticatedApiCall(
              `${API_BASE_URL}/api/groups/${groupId}/users/${user.id}`,
              { method: 'DELETE' },
            ).catch(() => {});
          } catch (err) {
            // Ignore
          }
        }
      }

      // Update group permissions
      await authenticatedApiCall(
        `${API_BASE_URL}/api/groups/${groupId}/permissions`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sections: selectedSections,
          }),
        },
      );

      // Redirect back to groups page
      router.push('/admin-panel/settings/groups');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania grupy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="w-full">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
            <p className="mt-4 text-sm text-gray-600">Ładowanie grupy...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="w-full">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link
            href="/admin-panel/settings/groups"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Powrót do grup</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Edytuj grupę</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Edit Group Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nazwa grupy <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                minLength={1}
                maxLength={50}
                disabled={isDefaultGroup || saving}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent disabled:bg-gray-100"
                style={{ borderRadius: 0 }}
                placeholder="Wprowadź nazwę grupy"
              />
              {isDefaultGroup && (
                <p className="mt-1 text-xs text-gray-500">Nazwa domyślnej grupy nie może być zmieniona</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Opis
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                maxLength={255}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                style={{ borderRadius: 0 }}
                placeholder="Wprowadź opis grupy (opcjonalnie)"
                disabled={saving}
              />
            </div>

            {/* Section Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dostęp do sekcji systemu
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Zaznacz sekcje, do których użytkownicy w tej grupie będą mieli dostęp
              </p>
              {Object.keys(availableSections).length === 0 ? (
                <div className="border border-gray-300 p-4 text-center text-gray-500" style={{ borderRadius: 0 }}>
                  <p className="text-sm">Ładowanie dostępnych sekcji...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-gray-300 p-4" style={{ borderRadius: 0 }}>
                  {Object.entries(availableSections).map(([sectionKey, sectionLabel]) => (
                    <label
                      key={sectionKey}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSections.includes(sectionKey)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSections([...selectedSections, sectionKey]);
                          } else {
                            setSelectedSections(selectedSections.filter(s => s !== sectionKey));
                          }
                        }}
                        disabled={saving}
                        className="w-4 h-4 text-[#03adf0] border-gray-300 rounded focus:ring-[#03adf0]"
                        style={{ cursor: saving ? 'not-allowed' : 'pointer' }}
                      />
                      <span className="text-sm text-gray-900">{sectionLabel}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Users Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Użytkownicy w grupie
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-300 p-3" style={{ borderRadius: 0 }}>
                {allUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">Brak dostępnych użytkowników</p>
                ) : (
                  allUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds([...selectedUserIds, user.id]);
                          } else {
                            setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                          }
                        }}
                        disabled={saving}
                        className="w-4 h-4 text-[#03adf0] border-gray-300 rounded focus:ring-[#03adf0]"
                        style={{ cursor: saving ? 'not-allowed' : 'pointer' }}
                      />
                      <span className="text-sm text-gray-900">{user.login}</span>
                      {user.groups && user.groups.length > 0 && (
                        <span className="text-xs text-gray-500">({user.groups.join(', ')})</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Link
                href="/admin-panel/settings/groups"
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-center"
                style={{ borderRadius: 0, cursor: 'pointer' }}
              >
                Anuluj
              </Link>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0, cursor: saving ? 'not-allowed' : 'pointer' }}
                disabled={saving}
              >
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
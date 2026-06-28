'use client';

import { ArrowLeft, ChevronDown } from 'lucide-react';
import { ACL_LEVEL_LABELS_PL } from '@/lib/hooks/usePermission';
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
  // ACL: poziom per sekcja (0=brak,10=odczyt,20=+tworzenie,30=+edycja,40=+miękkie kas.,50=+twarde kas.)
  const [sectionLevels, setSectionLevels] = useState<Record<string, number>>({});
  const [availableSections, setAvailableSections] = useState<{ [key: string]: string }>({});
  const [availableLevels, setAvailableLevels] = useState<{ value: number; label: string }[]>([]);
  const [sectionCaps, setSectionCaps] = useState<Record<string, { soft_delete: boolean; hard_delete: boolean }>>({});
  // Które sekcje rozwinięte (accordion). Klik nagłówka rozwija checkboxy uprawnień.
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Przełącz uprawnienie (checkbox kumulatywny): poziomy są narastające (wyższy zawiera niższe).
  // Zaznaczenie poziomu V → poziom=V (V i niższe zaznaczone). Odznaczenie V → poziom=najwyższy poniżej V.
  const toggleLevel = (section: string, value: number, allowedValues: number[]) => {
    setSectionLevels((prev) => {
      const current = prev[section] ?? 0;
      let next: number;
      if (current >= value) {
        const below = allowedValues.filter((v) => v < value);
        next = below.length ? Math.max(...below) : 0;
      } else {
        next = value;
      }
      return { ...prev, [section]: next };
    });
  };
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
      const sectionsData = await authenticatedApiCall<{
        sections: string[];
        section_labels: { [key: string]: string };
        capabilities?: Record<string, { soft_delete: boolean; hard_delete: boolean }>;
        levels?: { value: number; label: string }[];
      }>(
        `${API_BASE_URL}/api/groups/available-sections`,
      );
      if (sectionsData && sectionsData.section_labels) {
        setAvailableSections(sectionsData.section_labels);
        if (sectionsData.capabilities) setSectionCaps(sectionsData.capabilities);
        if (sectionsData.levels) setAvailableLevels(sectionsData.levels);
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
      // Poziomy ACL per sekcja z dedykowanego endpointu (zwraca [{section, level}])
      try {
        const perms = await authenticatedApiCall<{ section: string; level: number }[]>(
          `${API_BASE_URL}/api/groups/${groupId}/permissions`,
        );
        const map: Record<string, number> = {};
        (perms || []).forEach((p) => { map[p.section] = p.level; });
        setSectionLevels(map);
      } catch {
        setSectionLevels({});
      }
      setIsDefaultGroup(defaultGroups.includes(groupWithUsers.name.toLowerCase()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować grupy');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Endpoint /api/auth/users zwraca UserListResponse {items, total} — obsłuż też listę (wstecznie).
      const usersData = await authenticatedApiCall<{ items: User[]; total: number } | User[]>(
        `${API_BASE_URL}/api/auth/users`,
      );
      setAllUsers(Array.isArray(usersData) ? usersData : (usersData?.items ?? []));
    } catch (err) {
      console.error('Error loading users:', err);
      setAllUsers([]);
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
          } catch {
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
          } catch {
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
            permissions: Object.entries(sectionLevels)
              .filter(([, level]) => level > 0)
              .map(([section, level]) => ({ section, level })),
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
                Ustaw poziom dostępu dla każdej sekcji. Poziomy są kumulatywne (wyższy zawiera niższe).
                „Brak dostępu" = sekcja niewidoczna. Konto „tylko do odczytu" = wszędzie „Odczyt".
              </p>
              {Object.keys(availableSections).length === 0 ? (
                <div className="border border-gray-300 p-4 text-center text-gray-500" style={{ borderRadius: 0 }}>
                  <p className="text-sm">Ładowanie dostępnych sekcji...</p>
                </div>
              ) : (
                <div className="border border-gray-300" style={{ borderRadius: 0 }}>
                  {Object.entries(availableSections).map(([sectionKey, sectionLabel]) => {
                    const caps = sectionCaps[sectionKey] || { soft_delete: true, hard_delete: true };
                    // Uprawnienia jako checkboxy (kumulatywne). Miękkie/twarde kasowanie tylko gdzie sekcja je wspiera.
                    const permDefs = [
                      { value: 10, label: 'Odczyt' },
                      { value: 20, label: 'Tworzenie' },
                      { value: 30, label: 'Edycja' },
                      ...(caps.soft_delete ? [{ value: 40, label: 'Kasowanie miękkie' }] : []),
                      ...(caps.hard_delete ? [{ value: 50, label: 'Kasowanie twarde' }] : []),
                    ];
                    const allowedValues = permDefs.map((p) => p.value);
                    const lvl = sectionLevels[sectionKey] ?? 0;
                    const open = expandedSections[sectionKey] ?? false;
                    const summary = lvl === 0 ? 'Brak dostępu' : (ACL_LEVEL_LABELS_PL[lvl] || `Poziom ${lvl}`);
                    return (
                      <div key={sectionKey} className="border-b border-gray-200 last:border-b-0">
                        {/* Nagłówek sekcji — klik rozwija checkboxy. Obok: aktualny poziom (w locie). */}
                        <button
                          type="button"
                          onClick={() => setExpandedSections({ ...expandedSections, [sectionKey]: !open })}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="flex items-center gap-2">
                            <ChevronDown
                              size={16}
                              style={{ transition: 'transform .15s', transform: open ? 'none' : 'rotate(-90deg)' }}
                            />
                            <span className="text-sm font-medium text-gray-900">{sectionLabel}</span>
                          </span>
                          <span className={lvl === 0 ? 'text-xs text-gray-400' : 'text-xs text-[#03adf0] font-medium'}>
                            {summary}
                          </span>
                        </button>
                        {open && (
                          <div className="px-4 pb-3 pt-1 bg-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {permDefs.map((p) => (
                              <label
                                key={p.value}
                                className="flex items-center gap-2 text-sm text-gray-800"
                                style={{ cursor: saving ? 'not-allowed' : 'pointer' }}
                              >
                                <input
                                  type="checkbox"
                                  checked={lvl >= p.value}
                                  disabled={saving}
                                  onChange={() => toggleLevel(sectionKey, p.value, allowedValues)}
                                  className="w-4 h-4 text-[#03adf0] border-gray-300 focus:ring-[#03adf0]"
                                  style={{ borderRadius: 0, cursor: saving ? 'not-allowed' : 'pointer' }}
                                />
                                <span>{p.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
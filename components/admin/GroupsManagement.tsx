'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { UserCog, Search, Edit, Trash2, Plus, X } from 'lucide-react';
import { authenticatedApiCall } from '@/utils/api-auth';

interface Group {
  id: number;
  name: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_count: number;
}

interface GroupWithUsers extends Group {
  users: Array<{
    id: number;
    login: string;
    role: string;
    created_at: string | null;
  }>;
}


/**
 * Groups Management Component
 * Displays groups in a table format with ability to create, edit, delete, and assign users
 */
export default function GroupsManagement() {
  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';

  // State for groups data
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for search
  const [searchQuery, setSearchQuery] = useState('');

  // Default groups that cannot be deleted
  const defaultGroups = ['admin', 'client', 'moderator'];

  // Load groups from API
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const groupsData = await authenticatedApiCall<Group[]>(`${API_BASE_URL}/api/groups`);
      setGroups(groupsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować grup');
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };


  // Filtered groups
  const filteredGroups = useMemo(() => {
    return groups.filter(group => {
      return group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [groups, searchQuery]);

  // Handle create group - redirect to new page
  const handleCreateGroup = () => {
    router.push('/admin-panel/settings/groups/new');
  };

  // Handle edit group - redirect to edit page
  const handleEditGroup = (group: Group) => {
    router.push(`/admin-panel/settings/groups/${group.id}/edit`);
  };

  // Handle delete group
  const handleDeleteClick = (group: Group) => {
    setGroupToDelete(group);
    setDeleteModalOpen(true);
  };

  // Handle assign users - redirect to edit page
  const handleAssignUsersClick = (group: Group) => {
    router.push(`/admin-panel/settings/groups/${group.id}/edit`);
  };


  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;

    setIsDeleting(true);
    try {
      await authenticatedApiCall(
        `${API_BASE_URL}/api/groups/${groupToDelete.id}`,
        {
          method: 'DELETE',
        }
      );

      // Reload groups and close modal
      await loadGroups();
      setDeleteModalOpen(false);
      setGroupToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania grupy');
      setDeleteModalOpen(false);
      setGroupToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };


  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Check if group is default
  const isDefaultGroup = (groupName: string) => {
    return defaultGroups.includes(groupName.toLowerCase());
  };

  return (
    <div className="w-full">
      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow mb-4 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Szukaj grupy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                style={{ borderRadius: 0 }}
              />
            </div>
          </div>

          {/* Add Group Button */}
          <button
            onClick={handleCreateGroup}
            className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-colors"
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            <Plus size={18} />
            <span>Dodaj grupę</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
          <p className="mt-4 text-sm text-gray-600">Ładowanie grup...</p>
        </div>
      ) : (
        <>
          {/* Groups Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ borderRadius: 0 }}>
                      Nazwa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ borderRadius: 0 }}>
                      Opis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ borderRadius: 0 }}>
                      Liczba użytkowników
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ borderRadius: 0 }}>
                      Data utworzenia
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ borderRadius: 0 }}>
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        {searchQuery ? 'Brak grup spełniających kryteria' : 'Brak grup'}
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((group) => (
                      <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{group.name}</span>
                            {isDefaultGroup(group.name) && (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                                Domyślna
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{group.description || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{group.user_count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(group.created_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAssignUsersClick(group)}
                              className="text-[#03adf0] hover:text-[#0288c7] transition-colors"
                              title="Przypisz użytkowników"
                              style={{ cursor: 'pointer' }}
                            >
                              <UserCog size={18} />
                            </button>
                            <button
                              onClick={() => handleEditGroup(group)}
                              className="text-[#03adf0] hover:text-[#0288c7] transition-colors"
                              title="Edytuj grupę"
                              style={{ cursor: 'pointer' }}
                            >
                              <Edit size={18} />
                            </button>
                            {!isDefaultGroup(group.name) && (
                              <button
                                onClick={() => handleDeleteClick(group)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Usuń grupę"
                                style={{ cursor: 'pointer' }}
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Wyświetlono {filteredGroups.length} z {groups.length} grup
          </div>
        </>
      )}


      {/* Delete Confirmation Modal */}
      {deleteModalOpen && groupToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md" style={{ borderRadius: 0 }}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Potwierdź usunięcie</h2>
            <p className="text-gray-700 mb-6">
              Czy na pewno chcesz usunąć grupę <strong>{groupToDelete.name}</strong>?
              <br />
              <span className="text-sm text-gray-500">Ta operacja jest nieodwracalna.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setGroupToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                style={{ borderRadius: 0, cursor: 'pointer' }}
                disabled={isDeleting}
              >
                Anuluj
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0, cursor: isDeleting ? 'not-allowed' : 'pointer' }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Usuwanie...' : 'Usuń'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


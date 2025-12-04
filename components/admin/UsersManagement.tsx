'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, Edit, Trash2, Plus, X, Check } from 'lucide-react';
import { authenticatedApiCall } from '@/utils/api-auth';

interface User {
  id: number;
  login: string;
  groups: string[];
  created_at: string | null;
  updated_at: string | null;
}

interface UserFormData {
  login: string;
  password: string;
  groupIds: number[];
}

interface Group {
  id: number;
  name: string;
  description: string | null;
}

/**
 * Users Management Component
 * Displays users in a table format with ability to create, edit groups, and delete
 */
export default function UsersManagement() {
  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';

  // State for users data
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for user form
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    login: '',
    password: '',
    groupIds: [],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // State for groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [userGroups, setUserGroups] = useState<number[]>([]); // Groups assigned to user being edited

  // State for delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for search
  const [searchQuery, setSearchQuery] = useState('');

  // Load users and groups from API
  useEffect(() => {
    loadUsers();
    loadGroups();
  }, []);

  // Reload users when returning from add user page
  useEffect(() => {
    const handleFocus = () => {
      loadUsers();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadGroups = async () => {
    try {
      const groupsData = await authenticatedApiCall<Group[]>(`${API_BASE_URL}/api/groups`);
      setGroups(groupsData);
    } catch (err) {
      console.error('Error loading groups:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await authenticatedApiCall<User[]>(`${API_BASE_URL}/api/auth/users`);
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować użytkowników');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.login.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [users, searchQuery]);

  // Handle create user - redirect to new page
  const handleCreateUser = () => {
    router.push('/admin-panel/settings/users/new');
  };

  // Handle edit user (groups only)
  const handleEditUser = async (user: User) => {
    setEditingUser(user);
    
    // Load user's groups from all groups
    let userGroupIds: number[] = [];
    try {
      const allGroups = await authenticatedApiCall<Group[]>(`${API_BASE_URL}/api/groups`);
      // Check which groups contain this user
      for (const group of allGroups) {
        try {
          const groupWithUsers = await authenticatedApiCall<{users: Array<{id: number}>}>(`${API_BASE_URL}/api/groups/${group.id}`);
          if (groupWithUsers.users && groupWithUsers.users.some((u: {id: number}) => u.id === user.id)) {
            userGroupIds.push(group.id);
          }
        } catch (err) {
          // Group might not have users endpoint working, skip
          continue;
        }
      }
    } catch (err) {
      console.error('Error loading user groups:', err);
    }
    
    setFormData({
      login: user.login,
      password: '', // Don't show password
      groupIds: userGroupIds,
    });
    setUserGroups(userGroupIds);
    setFormError(null);
    setShowUserForm(true);
  };

  // Handle delete user
  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  // Handle form submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      if (editingUser) {
        // Update user groups - remove from all groups first, then add to selected
        const allGroups = await authenticatedApiCall<Group[]>(`${API_BASE_URL}/api/groups`);
        for (const group of allGroups) {
          try {
            // Try to remove user from group (will fail silently if not in group)
            await authenticatedApiCall(
              `${API_BASE_URL}/api/groups/${group.id}/users/${editingUser.id}`,
              { method: 'DELETE' }
            ).catch(() => {}); // Ignore errors if user not in group
          } catch (err) {
            // Ignore
          }
        }
        
        // Add user to selected groups
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
                  user_ids: [editingUser.id],
                }),
              }
            );
          } catch (err) {
            console.error(`Error assigning user to group ${groupId}:`, err);
          }
        }
      }

      // Reload users and close form
      await loadUsers();
      setShowUserForm(false);
      setEditingUser(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Błąd podczas zapisywania użytkownika');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await authenticatedApiCall(
        `${API_BASE_URL}/api/auth/users/${userToDelete.id}`,
        {
          method: 'DELETE',
        }
      );

      // Reload users and close modal
      await loadUsers();
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania użytkownika');
      setDeleteModalOpen(false);
      setUserToDelete(null);
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
                placeholder="Szukaj użytkownika..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                style={{ borderRadius: 0 }}
              />
            </div>
          </div>

          {/* Add User Button */}
          <button
            onClick={handleCreateUser}
            className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-colors"
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            <Plus size={18} />
            <span>Dodaj użytkownika</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
          <p className="mt-4 text-sm text-gray-600">Ładowanie użytkowników...</p>
        </div>
      ) : (
        <>
          {/* Users Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ borderRadius: 0 }}>
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ borderRadius: 0 }}>
                      Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ borderRadius: 0 }}>
                      Grupy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ borderRadius: 0 }}>
                      Data utworzenia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ borderRadius: 0 }}>
                      Ostatnia aktualizacja
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ borderRadius: 0 }}>
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        {searchQuery ? 'Brak użytkowników spełniających kryteria' : 'Brak użytkowników'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.login}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {user.groups && user.groups.length > 0 ? (
                              user.groups.map((group) => (
                                <span key={group} className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                                  {group}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">Brak grup</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.created_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.updated_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-[#03adf0] hover:text-[#0288c7] transition-colors"
                              title="Edytuj grupy"
                              style={{ cursor: 'pointer' }}
                            >
                              <Edit size={18} />
                            </button>
                            {user.id !== 0 && ( // Don't allow deleting system admin (id=0)
                              <button
                                onClick={() => handleDeleteClick(user)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Usuń użytkownika"
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
            Wyświetlono {filteredUsers.length} z {users.length} użytkowników
          </div>
        </>
      )}

      {/* User Edit Modal (only for editing, not creating) */}
      {showUserForm && editingUser && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => {
            if (!formLoading) {
              setShowUserForm(false);
              setEditingUser(null);
              setFormError(null);
            }
          }}
        >
          <div
            className="bg-white shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Edytuj użytkownika
              </h2>
              <button
                onClick={() => {
                  setShowUserForm(false);
                  setEditingUser(null);
                  setFormError(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                style={{ cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <p className="text-sm text-red-700">{formError}</p>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-2">
                  Login
                </label>
                <input
                  id="login"
                  type="text"
                  value={formData.login}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 bg-gray-100"
                  style={{ borderRadius: 0 }}
                />
                <p className="mt-1 text-xs text-gray-500">Login nie może być zmieniony</p>
              </div>

              {/* Groups Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grupy
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 p-3" style={{ borderRadius: 0 }}>
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
                          className="w-4 h-4 text-[#03adf0] border-gray-300 rounded focus:ring-[#03adf0]"
                          style={{ cursor: 'pointer' }}
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
                <button
                  type="button"
                  onClick={() => {
                    setShowUserForm(false);
                    setEditingUser(null);
                    setFormError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ borderRadius: 0, cursor: 'pointer' }}
                  disabled={formLoading}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderRadius: 0, cursor: formLoading ? 'not-allowed' : 'pointer' }}
                  disabled={formLoading}
                >
                  {formLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Animations CSS */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && userToDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => {
            if (!isDeleting) {
              setDeleteModalOpen(false);
              setUserToDelete(null);
            }
          }}
        >
          <div
            className="bg-white shadow-2xl max-w-md w-full animate-scaleIn"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Potwierdź usunięcie</h2>
            <p className="text-gray-700 mb-6">
              Czy na pewno chcesz usunąć użytkownika <strong>{userToDelete.login}</strong>?
              <br />
              <span className="text-sm text-gray-500">Ta operacja jest nieodwracalna.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setUserToDelete(null);
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
        </div>
      )}
    </div>
  );
}


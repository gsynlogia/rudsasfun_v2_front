'use client';

import { Search, Edit, Trash2, Plus, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

import { useToast } from '@/components/ToastContainer';
import { authenticatedApiCall } from '@/utils/api-auth';

interface AdminUser {
  id: number;
  login: string;
  email: string | null;
  is_active: boolean;
  is_superadmin: boolean;
  groups: string[];
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Admin Users Management Component
 * Displays admin users (admin_users table) in a table format with CRUD operations
 */
export default function AdminUsersManagement() {
  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';
  const { showSuccess, showError } = useToast();

  // State for users data
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for search
  const [searchQuery, setSearchQuery] = useState('');

  // Load users from API
  useEffect(() => {
    loadUsers();
  }, []);

  // Reload users when returning from add/edit user page
  useEffect(() => {
    const handleFocus = () => {
      loadUsers();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedApiCall<{ users: AdminUser[], total: number }>(`${API_BASE_URL}/api/admin-users`);
      setUsers(response.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować użytkowników');
      console.error('Error loading admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.login.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [users, searchQuery]);

  // Handle create user - redirect to new page
  const handleCreateUser = () => {
    router.push('/admin-panel/settings/users/admins/new');
  };

  // Handle edit user - redirect to edit page
  const handleEditUser = (user: AdminUser) => {
    router.push(`/admin-panel/settings/users/admins/${user.id}/edit`);
  };

  // Handle delete user
  const handleDeleteClick = (user: AdminUser) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await authenticatedApiCall(
        `${API_BASE_URL}/api/admin-users/${userToDelete.id}`,
        { method: 'DELETE' }
      );

      showSuccess(`Użytkownik ${userToDelete.login} został usunięty`);
      
      // Reload users and close modal
      await loadUsers();
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Błąd podczas usuwania użytkownika';
      showError(errorMsg);
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
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4" style={{ borderRadius: 0 }}>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white shadow mb-4 p-4" style={{ borderRadius: 0 }}>
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
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
        <div className="bg-white shadow p-12 text-center" style={{ borderRadius: 0 }}>
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
          <p className="mt-4 text-sm text-gray-600">Ładowanie użytkowników...</p>
        </div>
      ) : (
        <>
          {/* Users Table */}
          <div className="bg-white shadow overflow-hidden" style={{ borderRadius: 0 }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grupy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ostatnie logowanie
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        {searchQuery ? 'Brak użytkowników spełniających kryteria' : 'Brak użytkowników systemu'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{user.login}</span>
                            {user.is_superadmin && (
                              <span title="Superadmin">
                                <ShieldCheck size={16} className="text-orange-500" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className={`px-2 py-1 text-xs font-medium ${
                              user.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}
                            style={{ borderRadius: 0 }}
                          >
                            {user.is_active ? 'Aktywny' : 'Nieaktywny'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {user.groups && user.groups.length > 0 ? (
                              user.groups.map((group) => (
                                <span 
                                  key={group} 
                                  className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800"
                                  style={{ borderRadius: 0 }}
                                >
                                  {group}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">Brak grup</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.last_login_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-[#03adf0] hover:text-[#0288c7] transition-colors"
                              title="Edytuj"
                              style={{ cursor: 'pointer' }}
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Usuń użytkownika"
                              style={{ cursor: 'pointer' }}
                            >
                              <Trash2 size={18} />
                            </button>
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

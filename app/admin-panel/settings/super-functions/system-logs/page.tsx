'use client';

import { ArrowLeft, Search, Calendar, User, Activity, Eye, Edit, Trash2, Plus, LogIn, LogOut, ChevronLeft, ChevronRight, X, Filter } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useCallback, Suspense } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { authService } from '@/lib/services/AuthService';

// Sample data - hardcoded for now
const SAMPLE_LOGS = [
  {
    id: 1,
    timestamp: '2026-01-26T18:45:32',
    user_id: 1,
    user_name: 'Jan Kowalski',
    user_email: 'jan.kowalski@example.com',
    action: 'edit',
    category: 'reservation',
    target_id: 505,
    target_name: 'REZ-2026-505',
    description: 'Edycja rezerwacji - zmiana danych uczestnika',
    details: { field: 'participant_last_name', old_value: 'Nowak', new_value: 'Kowalski' },
    ip_address: '192.168.1.105',
  },
  {
    id: 2,
    timestamp: '2026-01-26T18:30:15',
    user_id: 2,
    user_name: 'Anna Nowak',
    user_email: 'anna.nowak@example.com',
    action: 'view',
    category: 'reservation',
    target_id: 504,
    target_name: 'REZ-2026-504',
    description: 'Wyświetlenie szczegółów rezerwacji',
    details: null,
    ip_address: '192.168.1.110',
  },
  {
    id: 3,
    timestamp: '2026-01-26T18:15:00',
    user_id: 1,
    user_name: 'Jan Kowalski',
    user_email: 'jan.kowalski@example.com',
    action: 'create',
    category: 'payment',
    target_id: 1250,
    target_name: 'Wpłata #1250',
    description: 'Dodanie nowej wpłaty manualnej',
    details: { amount: 500, reservation_id: 505 },
    ip_address: '192.168.1.105',
  },
  {
    id: 4,
    timestamp: '2026-01-26T17:55:22',
    user_id: 3,
    user_name: 'Piotr Wiśniewski',
    user_email: 'piotr.wisniewski@example.com',
    action: 'delete',
    category: 'payment',
    target_id: 1248,
    target_name: 'Wpłata #1248',
    description: 'Usunięcie wpłaty manualnej',
    details: { amount: 200, reason: 'Błędna wpłata' },
    ip_address: '192.168.1.115',
  },
  {
    id: 5,
    timestamp: '2026-01-26T17:30:00',
    user_id: 2,
    user_name: 'Anna Nowak',
    user_email: 'anna.nowak@example.com',
    action: 'login',
    category: 'auth',
    target_id: null,
    target_name: null,
    description: 'Logowanie do panelu administracyjnego',
    details: { method: 'magic_link' },
    ip_address: '192.168.1.110',
  },
  {
    id: 6,
    timestamp: '2026-01-26T17:00:45',
    user_id: 1,
    user_name: 'Jan Kowalski',
    user_email: 'jan.kowalski@example.com',
    action: 'edit',
    category: 'camp',
    target_id: 7,
    target_name: 'Przygodowa Dz.',
    description: 'Edycja obozu - zmiana opisu',
    details: { field: 'description' },
    ip_address: '192.168.1.105',
  },
  {
    id: 7,
    timestamp: '2026-01-26T16:45:12',
    user_id: 4,
    user_name: 'Maria Kowalczyk',
    user_email: 'maria.kowalczyk@example.com',
    action: 'view',
    category: 'contract',
    target_id: 505,
    target_name: 'Umowa REZ-2026-505',
    description: 'Wyświetlenie umowy',
    details: null,
    ip_address: '192.168.1.120',
  },
  {
    id: 8,
    timestamp: '2026-01-26T16:30:00',
    user_id: 1,
    user_name: 'Jan Kowalski',
    user_email: 'jan.kowalski@example.com',
    action: 'edit',
    category: 'turnus',
    target_id: 22,
    target_name: 'B2 - lato BEAVER',
    description: 'Edycja turnusu - zmiana liczby miejsc',
    details: { field: 'max_participants', old_value: 30, new_value: 35 },
    ip_address: '192.168.1.105',
  },
  {
    id: 9,
    timestamp: '2026-01-26T16:15:33',
    user_id: 3,
    user_name: 'Piotr Wiśniewski',
    user_email: 'piotr.wisniewski@example.com',
    action: 'logout',
    category: 'auth',
    target_id: null,
    target_name: null,
    description: 'Wylogowanie z panelu administracyjnego',
    details: null,
    ip_address: '192.168.1.115',
  },
  {
    id: 10,
    timestamp: '2026-01-26T15:50:00',
    user_id: 2,
    user_name: 'Anna Nowak',
    user_email: 'anna.nowak@example.com',
    action: 'create',
    category: 'reservation',
    target_id: 506,
    target_name: 'REZ-2026-506',
    description: 'Utworzenie nowej rezerwacji (przez panel)',
    details: { camp_id: 4, property_id: 84 },
    ip_address: '192.168.1.110',
  },
  {
    id: 11,
    timestamp: '2026-01-26T15:30:15',
    user_id: 1,
    user_name: 'Jan Kowalski',
    user_email: 'jan.kowalski@example.com',
    action: 'edit',
    category: 'user',
    target_id: 15,
    target_name: 'Użytkownik #15',
    description: 'Zmiana uprawnień użytkownika',
    details: { field: 'role', old_value: 'user', new_value: 'admin' },
    ip_address: '192.168.1.105',
  },
  {
    id: 12,
    timestamp: '2026-01-26T15:00:00',
    user_id: 4,
    user_name: 'Maria Kowalczyk',
    user_email: 'maria.kowalczyk@example.com',
    action: 'view',
    category: 'report',
    target_id: null,
    target_name: 'Raport płatności',
    description: 'Wyświetlenie raportu płatności',
    details: { date_from: '2026-01-01', date_to: '2026-01-26' },
    ip_address: '192.168.1.120',
  },
];

interface LogEntry {
  id: number;
  timestamp: string;
  user_id: number | null;
  user_name: string;
  user_email: string;
  action: string;
  category: string;
  target_id: number | null;
  target_name: string | null;
  description: string;
  details: Record<string, unknown> | null;
  ip_address: string;
}

interface SearchFilters {
  search: string;
  action: string;
  category: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
}

// Action icon and color mapping
const getActionIcon = (action: string) => {
  switch (action) {
    case 'view': return <Eye className="w-4 h-4" />;
    case 'edit': return <Edit className="w-4 h-4" />;
    case 'create': return <Plus className="w-4 h-4" />;
    case 'delete': return <Trash2 className="w-4 h-4" />;
    case 'login': return <LogIn className="w-4 h-4" />;
    case 'logout': return <LogOut className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'view': return 'bg-blue-100 text-blue-800';
    case 'edit': return 'bg-yellow-100 text-yellow-800';
    case 'create': return 'bg-green-100 text-green-800';
    case 'delete': return 'bg-red-100 text-red-800';
    case 'login': return 'bg-emerald-100 text-emerald-800';
    case 'logout': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case 'view': return 'Podgląd';
    case 'edit': return 'Edycja';
    case 'create': return 'Utworzenie';
    case 'delete': return 'Usunięcie';
    case 'login': return 'Logowanie';
    case 'logout': return 'Wylogowanie';
    default: return action;
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'reservation': return 'Rezerwacja';
    case 'payment': return 'Płatność';
    case 'camp': return 'Obóz';
    case 'turnus': return 'Turnus';
    case 'user': return 'Użytkownik';
    case 'contract': return 'Umowa';
    case 'auth': return 'Autoryzacja';
    case 'report': return 'Raport';
    default: return category;
  }
};

function SystemLogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const getInitialFilters = useCallback((): SearchFilters => ({
    search: searchParams?.get('search') || '',
    action: searchParams?.get('action') || '',
    category: searchParams?.get('category') || '',
    userId: searchParams?.get('user_id') || '',
    dateFrom: searchParams?.get('date_from') || '',
    dateTo: searchParams?.get('date_to') || '',
  }), [searchParams]);
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(getInitialFilters);
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams?.get('page');
    return pageParam ? parseInt(pageParam, 10) : 1;
  });
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const pageSize = 10;

  useEffect(() => {
    const checkAccess = async () => {
      if (!authService.isAuthenticated()) {
        router.push('/admin-panel/login');
        return;
      }

      const user = await authService.verifyToken();
      if (!user) {
        router.push('/admin-panel/login');
        return;
      }

      if (user.id !== 0) {
        router.push('/admin-panel/settings');
        return;
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [router]);

  // Update URL with current filters
  const updateURL = useCallback((newFilters: SearchFilters, page: number) => {
    const params = new URLSearchParams();
    
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.action) params.set('action', newFilters.action);
    if (newFilters.category) params.set('category', newFilters.category);
    if (newFilters.userId) params.set('user_id', newFilters.userId);
    if (newFilters.dateFrom) params.set('date_from', newFilters.dateFrom);
    if (newFilters.dateTo) params.set('date_to', newFilters.dateTo);
    if (page > 1) params.set('page', page.toString());
    
    const queryString = params.toString();
    const newUrl = queryString 
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;
    
    window.history.replaceState({}, '', newUrl);
  }, []);

  // Filter and paginate logs (client-side for now with sample data)
  useEffect(() => {
    if (!isAuthorized) return;

    let filtered = [...SAMPLE_LOGS];

    // Apply filters
    if (appliedFilters.search) {
      const search = appliedFilters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.user_name.toLowerCase().includes(search) ||
        log.user_email.toLowerCase().includes(search) ||
        log.description.toLowerCase().includes(search) ||
        (log.target_name && log.target_name.toLowerCase().includes(search))
      );
    }

    if (appliedFilters.action) {
      filtered = filtered.filter(log => log.action === appliedFilters.action);
    }

    if (appliedFilters.category) {
      filtered = filtered.filter(log => log.category === appliedFilters.category);
    }

    if (appliedFilters.userId) {
      filtered = filtered.filter(log => log.user_id === parseInt(appliedFilters.userId));
    }

    if (appliedFilters.dateFrom) {
      filtered = filtered.filter(log => log.timestamp >= appliedFilters.dateFrom);
    }

    if (appliedFilters.dateTo) {
      filtered = filtered.filter(log => log.timestamp <= appliedFilters.dateTo + 'T23:59:59');
    }

    setLogs(filtered);
    updateURL(appliedFilters, currentPage);
  }, [isAuthorized, appliedFilters, currentPage, updateURL]);

  const handleFilterChange = (field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    setAppliedFilters(filters);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    const emptyFilters: SearchFilters = {
      search: '',
      action: '',
      category: '',
      userId: '',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== '');

  // Pagination
  const totalPages = Math.ceil(logs.length / pageSize);
  const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Get unique users for filter dropdown
  const uniqueUsers = [...new Map(SAMPLE_LOGS.map(log => [log.user_id, { id: log.user_id, name: log.user_name }])).values()];

  if (loading) {
    return (
      <AdminLayout>
        <div className="w-full flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
            <p className="mt-4 text-sm text-gray-600">Sprawdzanie autoryzacji...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="w-full">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link
            href="/admin-panel/settings/super-functions"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Powrót do super funkcji</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Logi systemowe</h1>
          <p className="text-sm text-gray-600">
            Przeglądanie wszystkich zdarzeń systemowych i akcji użytkowników
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Szukaj..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            {/* Action type */}
            <div>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm bg-white"
              >
                <option value="">Wszystkie akcje</option>
                <option value="view">Podgląd</option>
                <option value="edit">Edycja</option>
                <option value="create">Utworzenie</option>
                <option value="delete">Usunięcie</option>
                <option value="login">Logowanie</option>
                <option value="logout">Wylogowanie</option>
              </select>
            </div>
            
            {/* Category */}
            <div>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm bg-white"
              >
                <option value="">Wszystkie kategorie</option>
                <option value="reservation">Rezerwacja</option>
                <option value="payment">Płatność</option>
                <option value="camp">Obóz</option>
                <option value="turnus">Turnus</option>
                <option value="user">Użytkownik</option>
                <option value="contract">Umowa</option>
                <option value="auth">Autoryzacja</option>
                <option value="report">Raport</option>
              </select>
            </div>
            
            {/* User */}
            <div className="relative">
              <select
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm bg-white"
              >
                <option value="">Wszyscy użytkownicy</option>
                {uniqueUsers.map(user => (
                  <option key={user.id} value={user.id?.toString()}>{user.name}</option>
                ))}
              </select>
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            {/* Date from */}
            <div className="relative">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm"
              />
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            {/* Date to */}
            <div className="relative">
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm"
              />
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-[#03adf0] text-white font-medium rounded-lg hover:bg-[#0288c7] transition-colors text-sm flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtruj
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Wyczyść filtry
              </button>
            )}
          </div>
        </div>

        {/* Summary Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <p className="text-sm text-gray-600">
            Wyświetlanie <strong>{paginatedLogs.length}</strong> z <strong>{logs.length}</strong> zdarzeń
            {hasActiveFilters && <span className="text-[#03adf0] ml-2">(filtrowane)</span>}
          </p>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm text-gray-600">
                {hasActiveFilters ? 'Nie znaleziono zdarzeń pasujących do filtrów' : 'Brak zdarzeń do wyświetlenia'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Data i czas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Użytkownik
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Akcja
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Kategoria
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Opis
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedRow === log.id ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.timestamp).toLocaleDateString('pl-PL', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                          <span className="text-gray-500 ml-2">
                            {new Date(log.timestamp).toLocaleTimeString('pl-PL', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{log.user_name}</div>
                          <div className="text-xs text-gray-500">{log.user_email}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            {getActionIcon(log.action)}
                            {getActionLabel(log.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {getCategoryLabel(log.category)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>{log.description}</div>
                          {log.target_name && (
                            <div className="text-xs text-gray-500 mt-1">
                              → {log.target_name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {log.ip_address}
                        </td>
                      </tr>
                      {/* Expanded row with details */}
                      {expandedRow === log.id && log.details && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Szczegóły zdarzenia</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                {Object.entries(log.details).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-medium text-gray-600">{key}:</span>
                                    <span className="ml-2 text-gray-900">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-lg shadow-md p-4 mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Strona {currentPage} z {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[#03adf0] text-white'
                        : 'border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// Wrapper component with Suspense for useSearchParams
export default function SystemLogsPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="w-full flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
            <p className="mt-4 text-sm text-gray-600">Ładowanie...</p>
          </div>
        </div>
      </AdminLayout>
    }>
      <SystemLogsContent />
    </Suspense>
  );
}

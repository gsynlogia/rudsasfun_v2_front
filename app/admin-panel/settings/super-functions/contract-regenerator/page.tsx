'use client';

import { ArrowLeft, RefreshCw, FileText, CheckCircle, XCircle, Loader2, Search, ChevronLeft, ChevronRight, ChevronDown, FileQuestion, X, Calendar, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { authService } from '@/lib/services/AuthService';
import { authenticatedApiCall } from '@/utils/api-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';

interface Mismatch {
  field: string;
  html: string;
  profile: string;
}

interface ComparisonItem {
  category: string;
  field: string;
  html: string;
  profile: string;
  match: boolean;
}

interface ContractItem {
  reservation_id: number;
  reservation_number: string;
  contract_id: number | null;
  contract_filename: string | null;
  contract_path: string | null;
  created_at: string | null;
  camp_name: string | null;
  property_name: string | null;
  participant_first_name: string;
  participant_last_name: string;
  participant_gender: string;
  needs_regeneration: boolean;
  has_contract: boolean;
  total_price: number;
  mismatches: Mismatch[];
  mismatch_count: number;
  comparison_data: ComparisonItem[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface ApiResponse {
  items: ContractItem[];
  pagination: PaginationInfo;
}

interface SearchFilters {
  search: string;
  reservationNumber: string;
  contractStatus: string;
  campName: string;
  dateFrom: string;
  dateTo: string;
}

// Skeleton row component
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-6 w-24 bg-gray-200 rounded-full"></div></td>
      <td className="px-4 py-3"><div className="h-4 w-28 bg-gray-200 rounded"></div></td>
      <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-200 rounded"></div></td>
      <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-200 rounded"></div></td>
      <td className="px-4 py-3"><div className="h-4 w-36 bg-gray-200 rounded"></div></td>
      <td className="px-4 py-3"><div className="h-4 w-28 bg-gray-200 rounded"></div></td>
      <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
    </tr>
  );
}

/**
 * Admin Panel - Umowy Regenerator
 * Route: /admin-panel/settings/super-functions/contract-regenerator
 *
 * Super function for regenerating contracts with gender verification
 * Only accessible for user ID 0
 */
function ContractRegeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize filters from URL params
  const getInitialFilters = useCallback((): SearchFilters => ({
    search: searchParams?.get('search') || '',
    reservationNumber: searchParams?.get('reservation_number') || '',
    contractStatus: searchParams?.get('status') || '',
    campName: searchParams?.get('camp') || '',
    dateFrom: searchParams?.get('date_from') || '',
    dateTo: searchParams?.get('date_to') || '',
  }), [searchParams]);
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  
  // Filter state - local inputs
  const [filters, setFilters] = useState<SearchFilters>(getInitialFilters);
  // Applied filters (what's actually being searched)
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(getInitialFilters);
  
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams?.get('page');
    return pageParam ? parseInt(pageParam, 10) : 1;
  });
  const [pageSize] = useState(20);
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

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
    if (newFilters.reservationNumber) params.set('reservation_number', newFilters.reservationNumber);
    if (newFilters.contractStatus) params.set('status', newFilters.contractStatus);
    if (newFilters.campName) params.set('camp', newFilters.campName);
    if (newFilters.dateFrom) params.set('date_from', newFilters.dateFrom);
    if (newFilters.dateTo) params.set('date_to', newFilters.dateTo);
    if (page > 1) params.set('page', page.toString());
    
    const queryString = params.toString();
    const newUrl = queryString 
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;
    
    window.history.replaceState({}, '', newUrl);
  }, []);

  const fetchContracts = useCallback(async (page: number, searchFilters: SearchFilters) => {
    try {
      setLoadingContracts(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      
      if (searchFilters.search) params.append('search', searchFilters.search);
      if (searchFilters.reservationNumber) params.append('reservation_number', searchFilters.reservationNumber);
      if (searchFilters.contractStatus) params.append('contract_status', searchFilters.contractStatus);
      if (searchFilters.campName) params.append('camp_name', searchFilters.campName);
      if (searchFilters.dateFrom) params.append('date_from', searchFilters.dateFrom);
      if (searchFilters.dateTo) params.append('date_to', searchFilters.dateTo);
      
      const data = await authenticatedApiCall<ApiResponse>(
        `${API_BASE_URL}/api/contracts/regenerator/list?${params.toString()}`,
      );
      setContracts(data.items);
      setPagination(data.pagination);
      setShowSkeleton(false);
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania umów');
      setShowSkeleton(false);
    } finally {
      setLoadingContracts(false);
    }
  }, [pageSize]);

  // Fetch on initial load and when appliedFilters or page changes
  useEffect(() => {
    if (!isAuthorized) return;
    fetchContracts(currentPage, appliedFilters);
    updateURL(appliedFilters, currentPage);
  }, [isAuthorized, currentPage, appliedFilters, fetchContracts, updateURL]);

  // Debounced filter change handler
  const handleFilterChange = useCallback((field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Show skeleton after 300ms
    debounceTimerRef.current = setTimeout(() => {
      setShowSkeleton(true);
      setCurrentPage(1);
      setAppliedFilters(prev => ({ ...prev, [field]: value }));
    }, 300);
  }, []);

  // Immediate search (for Enter key or button click)
  const handleImmediateSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setShowSkeleton(true);
    setCurrentPage(1);
    setAppliedFilters(filters);
  }, [filters]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleImmediateSearch();
    }
  };

  const handleClearFilters = useCallback(() => {
    const emptyFilters: SearchFilters = {
      search: '',
      reservationNumber: '',
      contractStatus: '',
      campName: '',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setCurrentPage(1);
  }, []);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  
  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== '');

  const handleRegenerate = async (reservationId: number) => {
    try {
      setRegenerating(reservationId);
      setError(null);

      await authenticatedApiCall(
        `${API_BASE_URL}/api/contracts/regenerator/regenerate/${reservationId}`,
        {
          method: 'POST',
        },
      );

      // Refresh contracts list
      await fetchContracts(currentPage, appliedFilters);
    } catch (err) {
      console.error('Error regenerating contract:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas regeneracji umowy');
    } finally {
      setRegenerating(null);
    }
  };

  const handleRegenerateAll = async () => {
    if (!confirm('Czy na pewno chcesz przegenerować wszystkie umowy wymagające regeneracji?')) {
      return;
    }

    try {
      setRegeneratingAll(true);
      setError(null);

      const result = await authenticatedApiCall<{
        total: number;
        successful: Array<{ reservation_id: number; contract_path: string }>;
        failed: Array<{ reservation_id: number; error: string }>;
      }>(
        `${API_BASE_URL}/api/contracts/regenerator/regenerate-all`,
        {
          method: 'POST',
        },
      );

      alert(
        `Zregenerowano ${result.successful.length} z ${result.total} umów.\n${
        result.failed.length > 0 ? `Błędy: ${result.failed.length}` : ''}`,
      );

      // Refresh contracts list
      await fetchContracts(currentPage, appliedFilters);
    } catch (err) {
      console.error('Error regenerating all contracts:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas regeneracji wszystkich umów');
    } finally {
      setRegeneratingAll(false);
    }
  };

  const handleOpenContract = async (reservationNumber: string) => {
    try {
      // Get authentication token
      const token = authService.getToken();
      if (!token) {
        alert('Brak autoryzacji. Zaloguj się ponownie.');
        return;
      }

      // Open contract in new tab using dedicated admin endpoint with authentication
      const url = `${API_BASE_URL}/api/contracts/regenerator/view/${reservationNumber}`;
      const newWindow = window.open('', '_blank');

      if (newWindow) {
        // Fetch HTML with authentication token
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'text/html',
          },
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: 'Błąd podczas ładowania umowy' }));
          newWindow.document.write(`
            <html>
              <head><title>Błąd</title></head>
              <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: red;">Błąd</h1>
                <p>${error.detail || 'Nie udało się załadować umowy'}</p>
              </body>
            </html>
          `);
          return;
        }

        const html = await response.text();
        newWindow.document.open();
        newWindow.document.write(html);
        newWindow.document.close();
      }
    } catch (err) {
      console.error('Error opening contract:', err);
      alert('Nie udało się otworzyć umowy. Spróbuj ponownie.');
    }
  };

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

  const contractsWithMismatch = contracts.filter(c => c.needs_regeneration && c.has_contract).length;
  const contractsWithoutContract = contracts.filter(c => !c.has_contract).length;
  const totalMismatches = contracts.reduce((sum, c) => sum + (c.mismatch_count || 0), 0);

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Umowy Regenerator</h1>
          <p className="text-sm text-gray-600">
            Przegląd i regeneracja umów z weryfikacją poprawności danych (płeć)
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Name search */}
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Imię lub nazwisko..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            {/* Reservation number */}
            <div className="relative">
              <input
                type="text"
                value={filters.reservationNumber}
                onChange={(e) => handleFilterChange('reservationNumber', e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Nr rezerwacji (np. 505)..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm"
              />
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            {/* Contract status */}
            <div>
              <select
                value={filters.contractStatus}
                onChange={(e) => handleFilterChange('contractStatus', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm bg-white"
              >
                <option value="">Status umowy...</option>
                <option value="ok">OK - dane zgodne</option>
                <option value="data_mismatch">Niespójność danych</option>
                <option value="no_contract">Brak umowy</option>
              </select>
            </div>
            
            {/* Camp name */}
            <div className="relative">
              <input
                type="text"
                value={filters.campName}
                onChange={(e) => handleFilterChange('campName', e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Nazwa obozu..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm"
              />
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
              onClick={handleImmediateSearch}
              className="px-4 py-2 bg-[#03adf0] text-white font-medium rounded-lg hover:bg-[#0288c7] transition-colors text-sm flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Szukaj
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

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray-600">
              {pagination ? (
                <>
                  Wyświetlanie <strong>{contracts.length}</strong> z <strong>{pagination.total}</strong> rezerwacji
                  {contractsWithMismatch > 0 && (
                    <span className="text-red-600 ml-2">
                      ({contractsWithMismatch} z niespójnością danych, {totalMismatches} różnic)
                    </span>
                  )}
                  {contractsWithoutContract > 0 && (
                    <span className="text-orange-600 ml-2">
                      ({contractsWithoutContract} bez umowy)
                    </span>
                  )}
                </>
              ) : (
                <>Ładowanie...</>
              )}
            </p>
          </div>
          {contractsWithMismatch > 0 && (
            <button
              onClick={handleRegenerateAll}
              disabled={regeneratingAll}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {regeneratingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Przegenerowywanie...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Przegeneruj niespójne ({contractsWithMismatch})</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Contracts Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {(loadingContracts && !showSkeleton) ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#03adf0] mb-4" />
              <p className="text-sm text-gray-600">Ładowanie rezerwacji...</p>
            </div>
          ) : showSkeleton ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Numer rezerwacji</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Uczestnik</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Płeć</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Obóz</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Data utworzenia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Akcje</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-600">
                {hasActiveFilters ? 'Nie znaleziono rezerwacji pasujących do wyszukiwania' : 'Brak rezerwacji do wyświetlenia'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Numer rezerwacji
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Uczestnik
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Płeć
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Obóz
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Data utworzenia
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contracts.map((contract) => (
                    <React.Fragment key={contract.reservation_id}>
                      <tr
                        onClick={() => setExpandedRow(expandedRow === contract.reservation_id ? null : contract.reservation_id)}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedRow === contract.reservation_id ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedRow === contract.reservation_id ? 'rotate-180' : ''}`} />
                            {!contract.has_contract ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                <FileQuestion className="w-3 h-3" />
                                Brak umowy
                              </span>
                            ) : contract.needs_regeneration ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <AlertTriangle className="w-3 h-3" />
                                Niespójność ({contract.mismatch_count})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3" />
                                OK
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {contract.reservation_number}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {contract.participant_first_name} {contract.participant_last_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {contract.participant_gender}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>{contract.camp_name || 'Brak danych'}</div>
                          {contract.property_name && (
                            <div className="text-xs text-gray-500">{contract.property_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {contract.created_at
                            ? new Date(contract.created_at).toLocaleDateString('pl-PL', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Brak danych'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {contract.has_contract && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenContract(contract.reservation_number); }}
                                className="text-[#03adf0] hover:text-[#0288c7] transition-colors flex items-center gap-1"
                                title="Otwórz umowę w nowej karcie"
                              >
                                <FileText className="w-4 h-4" />
                                <span>Zobacz</span>
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRegenerate(contract.reservation_id); }}
                              disabled={regenerating === contract.reservation_id}
                              className="text-green-600 hover:text-green-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={contract.has_contract ? "Regeneruj umowę" : "Wygeneruj umowę"}
                            >
                              {regenerating === contract.reservation_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                              <span>{contract.has_contract ? 'Regeneruj' : 'Generuj'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded row with full contract details */}
                      {expandedRow === contract.reservation_id && (
                        <tr key={`expanded-${contract.reservation_id}`} className="bg-gray-50">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  Porównanie umowy HTML z profilem - {contract.reservation_number}
                                </h4>
                                {contract.has_contract && contract.mismatch_count > 0 && (
                                  <span className="text-sm text-red-600 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4" />
                                    {contract.mismatch_count} niespójności
                                  </span>
                                )}
                              </div>
                              
                              {!contract.has_contract ? (
                                <div className="text-center py-6 text-gray-500">
                                  <FileQuestion className="w-12 h-12 mx-auto mb-2 text-orange-400" />
                                  <p>Brak wygenerowanej umowy HTML dla tej rezerwacji.</p>
                                  <p className="text-sm">Kliknij przycisk &quot;Generuj&quot; aby utworzyć umowę.</p>
                                </div>
                              ) : contract.comparison_data && contract.comparison_data.length > 0 ? (
                                <div className="space-y-4">
                                  {/* Group by category */}
                                  {(() => {
                                    const categories = [...new Set(contract.comparison_data.map(item => item.category))];
                                    return categories.map((category) => {
                                      const categoryItems = contract.comparison_data.filter(item => item.category === category);
                                      const hasMismatch = categoryItems.some(item => !item.match);
                                      return (
                                        <div key={category} className={`border rounded-lg overflow-hidden ${hasMismatch ? 'border-red-300' : 'border-gray-200'}`}>
                                          <div className={`px-3 py-2 text-sm font-semibold ${hasMismatch ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>
                                            {category}
                                            {hasMismatch && <span className="ml-2 text-xs">(niespójność)</span>}
                                          </div>
                                          <table className="min-w-full text-sm">
                                            <thead className="bg-gray-50">
                                              <tr>
                                                <th className="px-3 py-2 text-left font-medium text-gray-600 w-1/4">Pole</th>
                                                <th className="px-3 py-2 text-left font-medium text-gray-600 w-5/12">W umowie HTML</th>
                                                <th className="px-3 py-2 text-left font-medium text-gray-600 w-5/12">W profilu</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {categoryItems.map((item, idx) => (
                                                <tr key={idx} className={item.match ? 'bg-white' : 'bg-red-50'}>
                                                  <td className="px-3 py-2 font-medium text-gray-700">
                                                    {item.field}
                                                  </td>
                                                  <td className={`px-3 py-2 ${!item.match ? 'text-red-600 line-through' : 'text-gray-800'}`}>
                                                    {item.html || <span className="italic text-gray-400">brak</span>}
                                                  </td>
                                                  <td className={`px-3 py-2 ${!item.match ? 'text-green-700 font-semibold' : 'text-gray-800'}`}>
                                                    {item.profile || <span className="italic text-gray-400">brak</span>}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      );
                                    });
                                  })()}
                                  
                                  {/* Regenerate button */}
                                  {contract.mismatch_count > 0 && (
                                    <div className="flex justify-end pt-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleRegenerate(contract.reservation_id); }}
                                        disabled={regenerating === contract.reservation_id}
                                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                      >
                                        {regenerating === contract.reservation_id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <RefreshCw className="w-4 h-4" />
                                        )}
                                        Przegeneruj umowę ({contract.mismatch_count} różnic)
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-6 text-green-600">
                                  <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                                  <p className="font-medium">Wszystkie dane w umowie są zgodne z profilem.</p>
                                </div>
                              )}
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
        {pagination && pagination.total_pages > 1 && (
          <div className="bg-white rounded-lg shadow-md p-4 mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Strona {pagination.page} z {pagination.total_pages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.has_prev}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                let pageNum: number;
                if (pagination.total_pages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.total_pages - 2) {
                  pageNum = pagination.total_pages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      pagination.page === pageNum
                        ? 'bg-[#03adf0] text-white'
                        : 'border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.has_next}
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
export default function ContractRegeneratorPage() {
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
      <ContractRegeneratorContent />
    </Suspense>
  );
}
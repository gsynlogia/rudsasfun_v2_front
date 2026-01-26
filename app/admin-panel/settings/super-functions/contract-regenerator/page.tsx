'use client';

import { ArrowLeft, RefreshCw, FileText, CheckCircle, XCircle, Loader2, Search, ChevronLeft, ChevronRight, FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { authService } from '@/lib/services/AuthService';
import { authenticatedApiCall } from '@/utils/api-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';

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
  gender_in_contract: string | null;
  gender_match: boolean;
  needs_regeneration: boolean;
  has_contract: boolean;
  total_price: number;
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

/**
 * Admin Panel - Umowy Regenerator
 * Route: /admin-panel/settings/super-functions/contract-regenerator
 *
 * Super function for regenerating contracts with gender verification
 * Only accessible for user ID 0
 */
export default function ContractRegeneratorPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    const checkAccess = async () => {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        router.push('/admin-panel/login');
        return;
      }

      // Verify token and get user info
      const user = await authService.verifyToken();
      if (!user) {
        router.push('/admin-panel/login');
        return;
      }

      // Only user ID 0 can access
      if (user.id !== 0) {
        router.push('/admin-panel/settings');
        return;
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [router]);

  const fetchContracts = useCallback(async (page: number, search: string) => {
    try {
      setLoadingContracts(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search) {
        params.append('search', search);
      }
      const data = await authenticatedApiCall<ApiResponse>(
        `${API_BASE_URL}/api/contracts/regenerator/list?${params.toString()}`,
      );
      setContracts(data.items);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania umów');
    } finally {
      setLoadingContracts(false);
    }
  }, [pageSize]);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchContracts(currentPage, searchTerm);
  }, [isAuthorized, currentPage, searchTerm, fetchContracts]);

  const handleSearch = () => {
    setCurrentPage(1);
    setSearchTerm(searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

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
      await fetchContracts(currentPage, searchTerm);
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
      await fetchContracts(currentPage, searchTerm);
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

  const contractsNeedingRegeneration = contracts.filter(c => c.needs_regeneration).length;
  const contractsWithoutContract = contracts.filter(c => !c.has_contract).length;

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
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Szukaj po numerze rezerwacji, imieniu lub nazwisku..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent text-sm"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-[#03adf0] text-white font-medium rounded-lg hover:bg-[#0288c7] transition-colors text-sm"
            >
              Szukaj
            </button>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Wyczyść
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
                  {contractsNeedingRegeneration > 0 && (
                    <span className="text-red-600 ml-2">
                      ({contractsNeedingRegeneration} wymaga regeneracji)
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
          {contractsNeedingRegeneration > 0 && (
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
                  <span>Przegeneruj wszystkie ({contractsNeedingRegeneration})</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Contracts Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loadingContracts ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#03adf0] mb-4" />
              <p className="text-sm text-gray-600">Ładowanie rezerwacji...</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-600">
                {searchTerm ? 'Nie znaleziono rezerwacji pasujących do wyszukiwania' : 'Brak rezerwacji do wyświetlenia'}
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
                    <tr
                      key={contract.reservation_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {!contract.has_contract ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <FileQuestion className="w-3 h-3" />
                            Brak umowy
                          </span>
                        ) : contract.needs_regeneration ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3" />
                            Wymaga regeneracji
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            OK
                          </span>
                        )}
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
                              onClick={() => handleOpenContract(contract.reservation_number)}
                              className="text-[#03adf0] hover:text-[#0288c7] transition-colors flex items-center gap-1"
                              title="Otwórz umowę w nowej karcie"
                            >
                              <FileText className="w-4 h-4" />
                              <span>Zobacz</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleRegenerate(contract.reservation_id)}
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
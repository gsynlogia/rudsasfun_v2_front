'use client';

import { ArrowLeft, RefreshCw, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { authService } from '@/lib/services/AuthService';
import { authenticatedApiCall } from '@/utils/api-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';

interface ContractItem {
  reservation_id: number;
  reservation_number: string;
  contract_id: number;
  contract_filename: string;
  contract_path: string;
  created_at: string | null;
  camp_name: string | null;
  property_name: string | null;
  participant_first_name: string;
  participant_last_name: string;
  participant_gender: string;
  gender_in_contract: string | null;
  gender_match: boolean;
  needs_regeneration: boolean;
  total_price: number;
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
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isAuthorized) return;

    const fetchContracts = async () => {
      try {
        setLoadingContracts(true);
        setError(null);
        const data = await authenticatedApiCall<ContractItem[]>(
          `${API_BASE_URL}/api/contracts/regenerator/list`
        );
        setContracts(data);
      } catch (err) {
        console.error('Error fetching contracts:', err);
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania umów');
      } finally {
        setLoadingContracts(false);
      }
    };

    fetchContracts();
  }, [isAuthorized]);

  const handleRegenerate = async (reservationId: number) => {
    try {
      setRegenerating(reservationId);
      setError(null);
      
      await authenticatedApiCall(
        `${API_BASE_URL}/api/contracts/regenerator/regenerate/${reservationId}`,
        {
          method: 'POST',
        }
      );

      // Refresh contracts list
      const data = await authenticatedApiCall<ContractItem[]>(
        `${API_BASE_URL}/api/contracts/regenerator/list`
      );
      setContracts(data);
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
        }
      );

      alert(
        `Zregenerowano ${result.successful.length} z ${result.total} umów.\n` +
        (result.failed.length > 0 ? `Błędy: ${result.failed.length}` : '')
      );

      // Refresh contracts list
      const data = await authenticatedApiCall<ContractItem[]>(
        `${API_BASE_URL}/api/contracts/regenerator/list`
      );
      setContracts(data);
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

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Znaleziono <strong>{contracts.length}</strong> umów
              {contractsNeedingRegeneration > 0 && (
                <span className="text-red-600 ml-2">
                  ({contractsNeedingRegeneration} wymaga regeneracji)
                </span>
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
              <p className="text-sm text-gray-600">Ładowanie umów...</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-600">Brak umów do wyświetlenia</p>
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
                      key={contract.contract_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {contract.needs_regeneration ? (
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
                          <button
                            onClick={() => handleOpenContract(contract.reservation_number)}
                            className="text-[#03adf0] hover:text-[#0288c7] transition-colors flex items-center gap-1"
                            title="Otwórz umowę w nowej karcie"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Zobacz</span>
                          </button>
                          <button
                            onClick={() => handleRegenerate(contract.reservation_id)}
                            disabled={regenerating === contract.reservation_id}
                            className="text-green-600 hover:text-green-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Regeneruj umowę"
                          >
                            {regenerating === contract.reservation_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                            <span>Regeneruj</span>
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
      </div>
    </AdminLayout>
  );
}


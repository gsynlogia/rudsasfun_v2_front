'use client';

import { ArrowLeft, Save, Edit, MapPin, Calendar, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import type { Camp, CampProperty } from '@/types/reservation';

/**
 * Fetch camp by ID
 */
const fetchCampById = (id: number): Promise<Camp | null> => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';
  return fetch(`${API_BASE_URL}/api/camps/${id}`)
    .then(response => {
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .catch(err => {
      console.error('[CampEditPage] Error fetching camp:', err);
      throw err;
    });
};

/**
 * Fetch camp turnusy/properties
 */
const fetchCampTurnusy = (campId: number): Promise<CampProperty[]> => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';
  return fetch(`${API_BASE_URL}/api/camps/${campId}/editions`)
    .then(response => {
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .catch(err => {
      console.error('[CampEditPage] Error fetching camp turnusy:', err);
      throw err;
    });
};

export default function CampEditPage({ params }: { params: Promise<{ campId: string }> | { campId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [campId, setCampId] = useState<number | null>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';
  
  // Get fromPage param to return to correct pagination page
  const fromPage = searchParams.get('fromPage');

  const [camp, setCamp] = useState<Camp | null>(null);
  const [turnusy, setTurnusy] = useState<CampProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTurnusy, setLoadingTurnusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Camp>>({});
  const [saving, setSaving] = useState(false);

  // Resolve params (handle both Promise and direct params)
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = params instanceof Promise ? await params : params;
        const resolvedCampId = parseInt(resolvedParams.campId);

        if (isNaN(resolvedCampId)) {
          setError('Nieprawidłowe parametry URL');
          setLoading(false);
          return;
        }

        setCampId(resolvedCampId);
      } catch (err) {
        console.error('[CampEditPage] Error resolving params:', err);
        setError('Błąd podczas parsowania parametrów');
        setLoading(false);
      }
    };

    resolveParams();
  }, [params]);

  // Load camp data
  useEffect(() => {
    if (campId) {
      fetchCampById(campId)
        .then(data => {
          setCamp(data);
          if (data) {
            setFormData(data);
          } else {
            setError(`Obóz o ID ${campId} nie został znaleziony.`);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('[CampEditPage] Error loading camp:', err);
          setError(err instanceof Error ? err.message : 'Błąd podczas ładowania obozu');
          setLoading(false);
        });
    }
  }, [campId]);

  // Load camp turnusy
  useEffect(() => {
    if (campId) {
      setLoadingTurnusy(true);
      fetchCampTurnusy(campId)
        .then(data => {
          console.log('[CampEditPage] Loaded turnusy:', data);
          setTurnusy(data || []);
          setLoadingTurnusy(false);
        })
        .catch(err => {
          console.error('[CampEditPage] Error loading turnusy:', err);
          setTurnusy([]);
          setLoadingTurnusy(false);
        });
    }
  }, [campId]);

  // Helper functions
  const getPeriodLabel = (period: string) => {
    return period === 'lato' ? 'Lato' : 'Zima';
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handleEditTurnus = (turnusId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!campId) return;
    console.log('[CampEditPage] Navigating to turnus edit:', { campId, turnusId });
    router.push(`/admin-panel/camps/${campId}/turnus/${turnusId}/edit`);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.name.trim()) {
      setError('Nazwa obozu jest wymagana');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (!campId) {
        setError('Brak wymaganego parametru campId');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/camps/${campId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

            const returnUrl = fromPage ? `/admin-panel/camps?page=${fromPage}` : '/admin-panel/camps';
            router.push(returnUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania obozu');
      console.error('Error saving camp:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-4 text-center text-gray-600">Ładowanie obozu...</div>
      </AdminLayout>
    );
  }

  if (error && !camp) {
    return (
      <AdminLayout>
        <div className="p-4">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => router.push('/admin-panel/camps')}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do listy
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {camp ? `Edytuj obóz: ${camp.name}` : 'Edytuj obóz'}
          </h1>
          <button
            onClick={() => router.push('/admin-panel/camps')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do listy
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nazwa obozu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                style={{ borderRadius: 0 }}
                placeholder="Np. Laserowy Paintball"
                disabled={saving}
              />
            </div>

            {camp && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    ID obozu
                  </label>
                  <p className="text-sm text-gray-900">{camp.id}</p>
                </div>
                {camp.created_at && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Data utworzenia
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(camp.created_at).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Camp Turnusy Table */}
          {camp && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Turnusy obozu</h2>
                {loadingTurnusy && (
                  <span className="text-xs text-gray-500">Ładowanie...</span>
                )}
              </div>

              {turnusy.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {turnusy.map((turnus) => (
                    <div
                      key={turnus.id}
                      className="bg-white rounded-lg p-4 border border-gray-200 hover:border-[#03adf0] hover:shadow-md transition-all duration-200 cursor-pointer"
                      onClick={(e) => handleEditTurnus(turnus.id, e)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getPeriodLabel(turnus.period)}
                          </span>
                          <button
                            onClick={(e) => handleEditTurnus(turnus.id, e)}
                            className="p-1 text-[#03adf0] hover:bg-blue-50 transition-all duration-200"
                            title="Edytuj turnus"
                            style={{ cursor: 'pointer' }}
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-900">{turnus.city}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600">
                            {formatDate(turnus.start_date)} - {formatDate(turnus.end_date)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Liczba dni: <span className="font-medium text-gray-900">{turnus.days_count || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !loadingTurnusy ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  <p>Brak turnusów dla tego obozu</p>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={() => router.push('/admin-panel/camps')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-all duration-200"
              style={{ borderRadius: 0, cursor: 'pointer' }}
              disabled={saving}
            >
              Anuluj
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.name?.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#03adf0] border-2 border-[#03adf0] hover:bg-[#0288c7] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 0, cursor: saving || !formData.name?.trim() ? 'not-allowed' : 'pointer' }}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}


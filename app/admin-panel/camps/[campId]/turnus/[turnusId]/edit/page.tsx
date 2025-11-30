'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { ArrowLeft, Save, Calendar, MapPin } from 'lucide-react';
import type { Camp, CampProperty } from '@/types/reservation';

/**
 * Fetch camp by ID
 */
const fetchCampById = (id: number): Promise<Camp | null> => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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
      console.error('[CampTurnusEditPage] Error fetching camp:', err);
      throw err;
    });
};

/**
 * Fetch camp property/turnus by camp ID and property ID
 * Uses GET /api/camps/{camp_id}/editions endpoint (backend still uses 'editions')
 */
const fetchCampProperty = (campId: number, propertyId: number): Promise<CampProperty | null> => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return fetch(`${API_BASE_URL}/api/camps/${campId}/editions`)
    .then(response => {
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((properties: CampProperty[]) => {
      // Find the specific property by ID
      return properties.find(p => p.id === propertyId) || null;
    })
    .catch(err => {
      console.error('[CampTurnusEditPage] Error fetching camp property:', err);
      throw err;
    });
};

/**
 * Camp Turnus Edit Page
 * Route: /admin-panel/camps/[campId]/turnus/[turnusId]/edit
 * 
 * Allows editing a specific camp turnus/property
 */
export default function CampTurnusEditPage({ 
  params 
}: { 
  params: Promise<{ campId: string; turnusId: string }> | { campId: string; turnusId: string }
}) {
  const router = useRouter();
  // Handle both Promise and direct params (Next.js 13+ compatibility)
  const [campId, setCampId] = useState<number | null>(null);
  const [turnusId, setTurnusId] = useState<number | null>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [camp, setCamp] = useState<Camp | null>(null);
  const [property, setProperty] = useState<CampProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [period, setPeriod] = useState<'lato' | 'zima'>('lato');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Resolve params (handle both Promise and direct params)
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = params instanceof Promise ? await params : params;
        const resolvedCampId = parseInt(resolvedParams.campId);
        const resolvedTurnusId = parseInt(resolvedParams.turnusId);
        
        if (isNaN(resolvedCampId) || isNaN(resolvedTurnusId)) {
          console.error('[CampTurnusEditPage] Invalid params:', resolvedParams);
          setError('Nieprawidłowe parametry URL');
          setLoading(false);
          return;
        }
        
        setCampId(resolvedCampId);
        setTurnusId(resolvedTurnusId);
      } catch (err) {
        console.error('[CampTurnusEditPage] Error resolving params:', err);
        setError('Błąd podczas parsowania parametrów');
        setLoading(false);
      }
    };
    
    resolveParams();
  }, [params]);

  // Load camp and property data
  useEffect(() => {
    if (campId && turnusId) {
      Promise.all([
        fetchCampById(campId),
        fetchCampProperty(campId, turnusId)
      ])
        .then(([campData, propertyData]) => {
          setCamp(campData);
          setProperty(propertyData);
          
          if (!campData) {
            console.error(`[CampTurnusEditPage] Camp ${campId} not found`);
            setError(`Obóz o ID ${campId} nie został znaleziony.`);
          } else if (!propertyData) {
            console.error(`[CampTurnusEditPage] Property ${turnusId} for camp ${campId} not found`);
            setError(`Turnus o ID ${turnusId} dla obozu ${campId} nie został znaleziony.`);
          } else {
            // Populate form with property data
            setPeriod(propertyData.period as 'lato' | 'zima');
            setCity(propertyData.city);
            // Convert ISO date to YYYY-MM-DD format for input
            setStartDate(propertyData.start_date.split('T')[0]);
            setEndDate(propertyData.end_date.split('T')[0]);
            console.log('[CampTurnusEditPage] Data loaded successfully:', { campId, turnusId });
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('[CampTurnusEditPage] Error loading data:', err);
          setError(err instanceof Error ? err.message : 'Błąd podczas ładowania danych');
          setLoading(false);
        });
    }
  }, [campId, turnusId]);

  const handleSave = async () => {
    if (!city.trim() || !startDate || !endDate) {
      setError('Wszystkie pola są wymagane');
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      setError('Data rozpoczęcia musi być wcześniejsza niż data zakończenia');
      return;
    }

    if (!campId || !turnusId) {
      console.error('[CampTurnusEditPage] Missing required params for save:', { campId, turnusId });
      setError('Brak wymaganych parametrów');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      console.log('[CampTurnusEditPage] Saving:', { campId, turnusId, period, city, startDate, endDate });

      const response = await fetch(`${API_BASE_URL}/api/camps/${campId}/properties/${turnusId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period,
          city: city.trim(),
          start_date: startDate,
          end_date: endDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('[CampTurnusEditPage] Save error:', errorData);
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      console.log('[CampTurnusEditPage] Save successful, navigating to camps list');
      router.push('/admin-panel/camps');
    } catch (err) {
      console.error('[CampTurnusEditPage] Error saving:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania turnusu obozu');
    } finally {
      setSaving(false);
    }
  };

  const getPeriodLabel = (period: string) => {
    return period === 'lato' ? 'Lato' : 'Zima';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-4 text-center text-gray-600">Ładowanie turnusu obozu...</div>
      </AdminLayout>
    );
  }

  if (error && (!camp || !property)) {
    return (
      <AdminLayout>
        <div className="p-4">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => router.push('/admin-panel/camps')}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors text-sm font-medium"
            style={{ borderRadius: 0, cursor: 'pointer' }}
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
            {camp && property 
              ? `Edytuj turnus: ${camp.name} - ${getPeriodLabel(property.period)} ${property.city}`
              : 'Edytuj turnus obozu'}
          </h1>
          <button
            onClick={() => router.push('/admin-panel/camps')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors text-sm font-medium"
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
            {/* Camp Info */}
            {camp && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h2 className="text-sm font-medium text-gray-500 mb-2">Obóz</h2>
                <p className="text-lg font-semibold text-gray-900">{camp.name}</p>
                <p className="text-xs text-gray-500">ID: {camp.id}</p>
              </div>
            )}

            {/* Period */}
            <div>
              <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-2">
                Okres <span className="text-red-500">*</span>
              </label>
              <select
                id="period"
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'lato' | 'zima')}
                required
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                style={{ borderRadius: 0 }}
                disabled={saving}
              >
                <option value="lato">Lato</option>
                <option value="zima">Zima</option>
              </select>
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Miejscowość <span className="text-red-500">*</span>
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                style={{ borderRadius: 0 }}
                placeholder="np. Wiele"
                disabled={saving}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data rozpoczęcia <span className="text-red-500">*</span>
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                  style={{ borderRadius: 0 }}
                  disabled={saving}
                />
              </div>

              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data zakończenia <span className="text-red-500">*</span>
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  min={startDate}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                  style={{ borderRadius: 0 }}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Days count */}
            {startDate && endDate && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                <p className="text-sm text-blue-700">
                  <strong>Liczba dni:</strong>{' '}
                  {(() => {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    return `${days} ${days === 1 ? 'dzień' : 'dni'}`;
                  })()}
                </p>
              </div>
            )}

            {/* Property Info */}
            {property && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    ID turnusu
                  </label>
                  <p className="text-sm text-gray-900">{property.id}</p>
                </div>
                {property.created_at && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Data utworzenia
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(property.created_at).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

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
              disabled={saving || !city.trim() || !startDate || !endDate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#03adf0] border-2 border-[#03adf0] hover:bg-[#0288c7] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 0, cursor: (saving || !city.trim() || !startDate || !endDate) ? 'not-allowed' : 'pointer' }}
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

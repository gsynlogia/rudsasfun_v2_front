'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { ArrowLeft, Save, Calendar, MapPin, Truck, Copy, Search, Plus, Trash2, UtensilsCrossed, DollarSign, FileText } from 'lucide-react';
import type { Camp, CampProperty, CampPropertyTransport } from '@/types/reservation';
import UniversalModal from '@/components/admin/UniversalModal';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';
import { authenticatedApiCall } from '@/utils/api-auth';

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
 * Fetch transport settings for a camp property/turnus
 */
const fetchTransport = (campId: number, propertyId: number): Promise<CampPropertyTransport | null> => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return fetch(`${API_BASE_URL}/api/camps/${campId}/properties/${propertyId}/transport`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(async response => {
      if (!response.ok) {
        // For HTTP errors, log but return null
        console.warn(`[CampTurnusEditPage] HTTP error fetching transport: ${response.status}`);
        return null;
      }
      // Backend returns null (200 OK) or the transport object when transport exists
      const data = await response.json();
      // If response is null or empty, return null
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return null;
      }
      return data;
    })
    .catch(err => {
      // Network errors or other issues - log but return null (transport is optional)
      console.warn('[CampTurnusEditPage] Error fetching transport (will be created on save):', err.message || err);
      return null; // Return null if transport doesn't exist yet or fetch fails
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
  const [maxParticipants, setMaxParticipants] = useState<number>(50);

  // Transport state
  const [transport, setTransport] = useState<CampPropertyTransport | null>(null);
  const [loadingTransport, setLoadingTransport] = useState(false);

  // Available transports modal state
  const [showAvailableTransportsModal, setShowAvailableTransportsModal] = useState(false);
  const [availableTransports, setAvailableTransports] = useState<any[]>([]);
  const [loadingAvailableTransports, setLoadingAvailableTransports] = useState(false);
  
  // Delete transport confirmation modal
  const [showDeleteTransportModal, setShowDeleteTransportModal] = useState(false);
  const [isDeletingTransport, setIsDeletingTransport] = useState(false);
  const [searchTransportQuery, setSearchTransportQuery] = useState('');

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

  // Load camp, property and transport data
  useEffect(() => {
    if (campId && turnusId) {
      Promise.all([
        fetchCampById(campId),
        fetchCampProperty(campId, turnusId),
        fetchTransport(campId, turnusId)
      ])
        .then(([campData, propertyData, transportData]) => {
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
            setMaxParticipants(propertyData.max_participants || 50);
            
            // Populate transport data if exists - map cities to transport fields
            if (transportData) {
              // Map cities array to transport fields for display
              const mappedTransport: CampPropertyTransport = {
                id: transportData.id,
                name: transportData.name || null,
                property_id: transportData.property_id || null,
                departure_type: transportData.departure_type,
                departure_city: transportData.cities?.[0]?.city || null,
                departure_collective_price: transportData.cities?.[0]?.departure_price || null,
                departure_own_price: null,
                return_type: transportData.return_type,
                return_city: transportData.cities?.[0]?.city || null,
                return_collective_price: transportData.cities?.[0]?.return_price || null,
                return_own_price: null,
              };
              setTransport(mappedTransport);
              console.log('[CampTurnusEditPage] Transport loaded and mapped:', mappedTransport);
            } else {
              setTransport(null);
            }
            
            console.log('[CampTurnusEditPage] Data loaded successfully:', { campId, turnusId, transportData });
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

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate minimum end date (start date + 1 day)
  const getMinEndDate = () => {
    if (!startDate) return today;
    const start = new Date(startDate);
    start.setDate(start.getDate() + 1);
    return start.toISOString().split('T')[0];
  };

  const handleSave = async () => {
    if (!city.trim() || !startDate || !endDate || maxParticipants < 1) {
      setError('Wszystkie pola są wymagane');
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);

    // Check if start date is not in the past
    if (start < todayDate) {
      setError('Data rozpoczęcia nie może być w przeszłości');
      return;
    }

    // Check if end date is at least 1 day after start date
    const minEndDate = new Date(startDate);
    minEndDate.setDate(minEndDate.getDate() + 1);
    if (end < minEndDate) {
      setError('Data zakończenia musi być co najmniej 1 dzień po dacie rozpoczęcia');
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
          period: 'lato', // Always "lato"
          city: city.trim(),
          start_date: startDate,
          end_date: endDate,
          max_participants: maxParticipants,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('[CampTurnusEditPage] Save error:', errorData);
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      console.log('[CampTurnusEditPage] Property save successful');
      
      console.log('[CampTurnusEditPage] All saves successful, navigating to camps list');
      router.push('/admin-panel/camps');
    } catch (err) {
      console.error('[CampTurnusEditPage] Error saving:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania turnusu obozu');
    } finally {
      setSaving(false);
    }
  };

  // Assign selected transport to this turnus
  const assignTransportToTurnus = async (transportId: number) => {
    if (!campId || !turnusId) {
      console.error('[CampTurnusEditPage] Missing required params:', { campId, turnusId });
      return;
    }

    try {
      setLoadingTransport(true);
      setError(null);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // First, get current transport to check existing camp_ids
      const getResponse = await fetch(`${API_BASE_URL}/api/camps/transports/${transportId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!getResponse.ok) {
        throw new Error('Failed to fetch transport data');
      }

      const currentTransport = await getResponse.json();
      const currentCampIds = currentTransport.camp_ids || [];
      
      // Add current camp to camp_ids if not already present (many-to-many relationship)
      // This allows the same transport to be assigned to multiple camps
      const updatedCampIds = currentCampIds.includes(campId) 
        ? currentCampIds 
        : [...currentCampIds, campId];

      // Update transport to assign it to this camp (via camp_ids, not property_id)
      // property_id should remain NULL or unchanged to allow multiple camps
      const response = await fetch(`${API_BASE_URL}/api/camps/transports/${transportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          camp_ids: updatedCampIds, // Assign to this camp via many-to-many
          // Don't set property_id - keep it as is to allow multiple camps
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const updatedTransport = await response.json();
      
      // Map cities array to transport fields for display
      const mappedTransport: CampPropertyTransport = {
        id: updatedTransport.id,
        name: updatedTransport.name || null,
        property_id: updatedTransport.property_id || null,
        departure_type: updatedTransport.departure_type,
        departure_city: updatedTransport.cities?.[0]?.city || null,
        departure_collective_price: updatedTransport.cities?.[0]?.departure_price || null,
        departure_own_price: null,
        return_type: updatedTransport.return_type,
        return_city: updatedTransport.cities?.[0]?.city || null,
        return_collective_price: updatedTransport.cities?.[0]?.return_price || null,
        return_own_price: null,
      };
      setTransport(mappedTransport);
      
      console.log('[CampTurnusEditPage] Transport assigned successfully:', mappedTransport);
    } catch (err) {
      console.error('[CampTurnusEditPage] Error assigning transport:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas przypisywania transportu');
      throw err;
    } finally {
      setLoadingTransport(false);
    }
  };

  // Remove transport assignment from camp
  const handleRemoveTransport = async () => {
    if (!transport || !transport.id || !campId) {
      return;
    }

    try {
      setIsDeletingTransport(true);
      setError(null);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // First, get current transport to check existing camp_ids
      const getResponse = await fetch(`${API_BASE_URL}/api/camps/transports/${transport.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!getResponse.ok) {
        throw new Error('Failed to fetch transport data');
      }

      const currentTransport = await getResponse.json();
      const currentCampIds = currentTransport.camp_ids || [];
      
      // Remove current camp from camp_ids (many-to-many relationship)
      const updatedCampIds = currentCampIds.filter((id: number) => id !== campId);

      // Update transport to remove this camp from camp_ids
      const response = await fetch(`${API_BASE_URL}/api/camps/transports/${transport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          camp_ids: updatedCampIds, // Remove this camp from the list
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      setTransport(null);
      setShowDeleteTransportModal(false);
      
      console.log('[CampTurnusEditPage] Transport unassigned successfully');
    } catch (err) {
      console.error('[CampTurnusEditPage] Error removing transport:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania przypisania transportu');
    } finally {
      setIsDeletingTransport(false);
    }
  };

  const getPeriodLabel = (period: string) => {
    return period === 'lato' ? 'Lato' : 'Zima';
  };

  // Fetch available transports from other turnusy
  const fetchAvailableTransports = async () => {
    if (!campId || !turnusId) return;

    try {
      setLoadingAvailableTransports(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${API_BASE_URL}/api/camps/${campId}/properties/${turnusId}/transport/available`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.warn('[CampTurnusEditPage] Error fetching available transports:', response.status);
        setAvailableTransports([]);
        return;
      }

      const data = await response.json();
      // Backend returns empty list (200 OK) if no transports found - not an error
      const transports = Array.isArray(data) ? data : [];
      console.log('[CampTurnusEditPage] Fetched available transports:', transports.length, transports);
      console.log('[CampTurnusEditPage] Transport details:', transports.map(t => ({
        id: t.id,
        name: t.name,
        camp_ids: t.camp_ids,
        camp_name: t.camp_name,
        is_assigned_to_current_camp: t.is_assigned_to_current_camp
      })));
      setAvailableTransports(transports);
    } catch (err) {
      console.error('[CampTurnusEditPage] Error fetching available transports:', err);
      setAvailableTransports([]);
    } finally {
      setLoadingAvailableTransports(false);
    }
  };

  // Open available transports modal
  const handleOpenAvailableTransports = async () => {
    setShowAvailableTransportsModal(true);
    setSearchTransportQuery('');
    await fetchAvailableTransports();
  };


  // Select transport from available transports
  const handleSelectTransport = async (selectedTransport: any) => {
    try {
      setLoadingTransport(true);
      
      // Assign transport to this turnus
      await assignTransportToTurnus(selectedTransport.id);
      
      // Update transport state with selected transport
      const transportData: CampPropertyTransport = {
        id: selectedTransport.id,
        name: selectedTransport.name || null,
        property_id: turnusId || null,
        departure_type: selectedTransport.departure_type,
        departure_city: selectedTransport.cities?.[0]?.city || selectedTransport.departure_city || null,
        departure_collective_price: selectedTransport.cities?.[0]?.departure_price || selectedTransport.departure_collective_price || null,
        departure_own_price: null,
        return_type: selectedTransport.return_type,
        return_city: selectedTransport.cities?.[0]?.city || selectedTransport.return_city || null,
        return_collective_price: selectedTransport.cities?.[0]?.return_price || selectedTransport.return_collective_price || null,
        return_own_price: null,
      };
      setTransport(transportData);
      
      // Close modal
      setShowAvailableTransportsModal(false);
      setSearchTransportQuery('');
    } catch (err) {
      console.error('[CampTurnusEditPage] Error selecting transport:', err);
      // Error already set in assignTransportToTurnus
    } finally {
      setLoadingTransport(false);
    }
  };

  // Filter transports by search query
  const filteredTransports = availableTransports.filter((transport) => {
    if (!searchTransportQuery.trim()) return true;
    const query = searchTransportQuery.toLowerCase();
    const name = transport.name?.toLowerCase() || '';
    const period = transport.turnus_period?.toLowerCase() || '';
    const city = transport.turnus_city?.toLowerCase() || '';
    // Check cities array (new structure)
    const citiesMatch = transport.cities?.some((c: any) => 
      c.city?.toLowerCase().includes(query)
    ) || false;
    // Fallback to old structure
    const departureCity = transport.cities?.[0]?.city?.toLowerCase() || transport.departure_city?.toLowerCase() || '';
    const returnCity = transport.cities?.[0]?.city?.toLowerCase() || transport.return_city?.toLowerCase() || '';
    return (
      name.includes(query) ||
      period.includes(query) ||
      city.includes(query) ||
      citiesMatch ||
      departureCity.includes(query) ||
      returnCity.includes(query)
    );
  });

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

            {/* Period - hidden, always set to "lato" */}
            <input
              type="hidden"
              id="period"
              value="lato"
            />

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

            {/* Dates and Max Participants */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  min={today}
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
                  min={getMinEndDate()}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                  style={{ borderRadius: 0 }}
                  disabled={saving}
                />
              </div>

              <div>
                <label htmlFor="max-participants" className="block text-sm font-medium text-gray-700 mb-2">
                  Maksymalna liczba uczestników <span className="text-red-500">*</span>
                </label>
                <input
                  id="max-participants"
                  type="number"
                  min="1"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 1)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                  style={{ borderRadius: 0 }}
                  placeholder="np. 50"
                  disabled={saving}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maks. liczba uczestników
                </p>
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

            {/* Transport Section */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Transport</h2>
                </div>
                {!transport && (
                  <button
                    onClick={handleOpenAvailableTransports}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#03adf0] border border-[#03adf0] hover:bg-[#E0F2FF] transition-all duration-200"
                    style={{ borderRadius: 0, cursor: 'pointer' }}
                    disabled={saving || loading || loadingTransport}
                    title="Wybierz z dostępnych transportów"
                  >
                    <Copy className="w-3 h-3" />
                    Wybierz transport
                  </button>
                )}
              </div>

              {/* Selected Transport Display */}
              {transport ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {transport.name || 'Transport bez nazwy'}
                        </h3>
                        {transport.departure_type && (
                          <div className="mt-2 space-y-1">
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Wyjazd:</span>{' '}
                              {transport.departure_type === 'collective' ? 'Transport zbiorowy' : 'Własny transport'}
                              {transport.departure_type === 'collective' && transport.departure_city && (
                                <span className="ml-2">({transport.departure_city})</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Powrót:</span>{' '}
                              {transport.return_type === 'collective' ? 'Transport zbiorowy' : 'Własny transport'}
                              {transport.return_type === 'collective' && transport.return_city && (
                                <span className="ml-2">({transport.return_city})</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDeleteTransportModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 hover:bg-red-50 transition-all duration-200"
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                      disabled={saving || loading || isDeletingTransport}
                      title="Usuń przypisanie transportu"
                    >
                      <Trash2 className="w-3 h-3" />
                      Usuń
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center text-sm text-gray-500">
                  Brak przypisanego transportu. Kliknij "Wybierz transport", aby przypisać transport do tego turnusu.
                </div>
              )}
            </div>

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

          {/* Available Transports Modal */}
          <UniversalModal
            isOpen={showAvailableTransportsModal}
            title="Wybierz z dostępnych transportów"
            onClose={() => {
              setShowAvailableTransportsModal(false);
              setSearchTransportQuery('');
            }}
            maxWidth="2xl"
            className="max-h-[80vh] flex flex-col"
          >
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTransportQuery}
                  onChange={(e) => setSearchTransportQuery(e.target.value)}
                  placeholder="Szukaj po okresie, mieście, mieście wyjazdu/powrotu..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingAvailableTransports ? (
                <div className="text-center text-gray-500 py-8">Ładowanie dostępnych transportów...</div>
              ) : filteredTransports.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {availableTransports.length === 0 ? (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Brak zadeklarowanych transportów</p>
                      <p className="text-xs text-gray-500">Nie znaleziono żadnych dostępnych transportów (z innych turnusów lub niezależnych).</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Brak wyników wyszukiwania</p>
                      <p className="text-xs text-gray-500">Spróbuj zmienić kryteria wyszukiwania.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                      {filteredTransports.map((transport) => (
                        <div
                          key={transport.id}
                          onClick={() => handleSelectTransport(transport)}
                          className="p-4 border border-gray-200 hover:border-[#03adf0] hover:bg-[#E0F2FF] transition-all duration-200 cursor-pointer flex items-start justify-between"
                          style={{ borderRadius: 0 }}
                        >
                          <div className="flex-1">
                              {/* Transport name or turnus info */}
                              {transport.name ? (
                                <div className="mb-2">
                                  <span className="text-sm font-medium text-gray-900">{transport.name}</span>
                                  {transport.turnus_period && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        {getPeriodLabel(transport.turnus_period)}
                                      </span>
                                      <span className="text-xs text-gray-600">{transport.turnus_city}</span>
                                    </div>
                                  )}
                                  {!transport.turnus_period && (
                                    <span className="text-xs text-gray-500 italic ml-2">
                                      (Niezależny transport
                                      {transport.camp_name && ` - przypisany do: ${transport.camp_name}`}
                                      {transport.is_assigned_to_current_camp && ' - już przypisany do tego obozu'}
                                      )
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mb-2">
                                  {transport.turnus_period ? (
                                    <>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        {getPeriodLabel(transport.turnus_period)}
                                      </span>
                                      <span className="text-sm text-gray-600">
                                        {transport.turnus_city || 'Brak miasta'}
                                      </span>
                                      {transport.turnus_start_date && transport.turnus_end_date && (
                                        <span className="text-xs text-gray-500">
                                          {new Date(transport.turnus_start_date).toLocaleDateString('pl-PL')} - {new Date(transport.turnus_end_date).toLocaleDateString('pl-PL')}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-sm text-gray-600 italic">Transport ogólny (bez nazwy)</span>
                                  )}
                                </div>
                              )}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-medium text-gray-700">Wyjazd:</span>
                                <span className="ml-1 text-gray-600">
                                  {transport.departure_type === 'collective' ? 'Zbiorowy' : 'Własny'}
                                  {transport.departure_type === 'collective' && (
                                    <>
                                      {transport.cities && transport.cities.length > 0 ? (
                                        <span className="ml-1">
                                          {transport.cities.map((c: any, idx: number) => (
                                            <span key={idx}>
                                              {c.city}
                                              {c.departure_price && ` (${c.departure_price.toFixed(2)} PLN)`}
                                              {idx < transport.cities.length - 1 && ', '}
                                            </span>
                                          ))}
                                        </span>
                                      ) : (
                                        <>
                                          {transport.departure_city && ` - ${transport.departure_city}`}
                                          {transport.departure_collective_price && (
                                            <span className="ml-1 text-gray-500">
                                              ({transport.departure_collective_price.toFixed(2)} PLN)
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </>
                                  )}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Powrót:</span>
                                <span className="ml-1 text-gray-600">
                                  {transport.return_type === 'collective' ? 'Zbiorowy' : 'Własny'}
                                  {transport.return_type === 'collective' && (
                                    <>
                                      {transport.cities && transport.cities.length > 0 ? (
                                        <span className="ml-1">
                                          {transport.cities.map((c: any, idx: number) => (
                                            <span key={idx}>
                                              {c.city}
                                              {c.return_price && ` (${c.return_price.toFixed(2)} PLN)`}
                                              {idx < transport.cities.length - 1 && ', '}
                                            </span>
                                          ))}
                                        </span>
                                      ) : (
                                        <>
                                          {transport.return_city && ` - ${transport.return_city}`}
                                          {transport.return_collective_price && (
                                            <span className="ml-1 text-gray-500">
                                              ({transport.return_collective_price.toFixed(2)} PLN)
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Copy className="w-4 h-4 text-[#03adf0] flex-shrink-0 ml-2" />
                        </div>
                      ))}
                </div>
              )}
            </div>
          </UniversalModal>

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

      {/* Delete Transport Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteTransportModal}
        onClose={() => setShowDeleteTransportModal(false)}
        onConfirm={handleRemoveTransport}
        itemType="transport"
        itemName={transport?.name || 'Transport'}
        itemId={transport?.id}
        additionalInfo="Przypisanie transportu do tego turnusu zostanie usunięte. Transport pozostanie w systemie i będzie dostępny do przypisania do innych turnusów."
        isLoading={isDeletingTransport}
      />

    </AdminLayout>
  );
}

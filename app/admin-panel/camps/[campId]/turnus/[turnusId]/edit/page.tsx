'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { ArrowLeft, Save, Calendar, MapPin, Truck, Copy, Search, Plus } from 'lucide-react';
import type { Camp, CampProperty, CampPropertyTransport } from '@/types/reservation';
import UniversalModal from '@/components/admin/UniversalModal';

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
    .then(response => {
      if (!response.ok) {
        // For HTTP errors, log but return null
        console.warn(`[CampTurnusEditPage] HTTP error fetching transport: ${response.status}`);
        return null;
      }
      // Backend now returns null (200 OK) instead of 404 when transport doesn't exist
      return response.json();
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

  // Transport state
  const [transport, setTransport] = useState<CampPropertyTransport | null>(null);
  const [loadingTransport, setLoadingTransport] = useState(false);
  const [departureType, setDepartureType] = useState<'collective' | 'own'>('collective');
  const [departureCity, setDepartureCity] = useState('');
  const [departureCollectivePrice, setDepartureCollectivePrice] = useState<number | ''>('');
  const [returnType, setReturnType] = useState<'collective' | 'own'>('collective');
  const [returnCity, setReturnCity] = useState('');
  const [returnCollectivePrice, setReturnCollectivePrice] = useState<number | ''>('');

  // Available transports modal state
  const [showAvailableTransportsModal, setShowAvailableTransportsModal] = useState(false);
  const [availableTransports, setAvailableTransports] = useState<any[]>([]);
  const [loadingAvailableTransports, setLoadingAvailableTransports] = useState(false);
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
          setTransport(transportData);
          
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
            
            // Populate transport data if exists
            if (transportData) {
              setDepartureType(transportData.departure_type);
              setDepartureCity(transportData.departure_city || '');
              setDepartureCollectivePrice(transportData.departure_collective_price || '');
              setReturnType(transportData.return_type);
              setReturnCity(transportData.return_city || '');
              setReturnCollectivePrice(transportData.return_collective_price || '');
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

      console.log('[CampTurnusEditPage] Property save successful, saving transport...');
      
      // Save transport settings
      await saveTransport();
      
      console.log('[CampTurnusEditPage] All saves successful, navigating to camps list');
      router.push('/admin-panel/camps');
    } catch (err) {
      console.error('[CampTurnusEditPage] Error saving:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania turnusu obozu');
    } finally {
      setSaving(false);
    }
  };

  const saveTransport = async () => {
    if (!campId || !turnusId) {
      console.error('[CampTurnusEditPage] Missing required params for transport save:', { campId, turnusId });
      return;
    }

    try {
      setLoadingTransport(true);
      
      const transportData = {
        property_id: turnusId,
        name: transport?.name || null, // Preserve name if transport exists
        departure_type: departureType,
        departure_city: departureType === 'collective' ? departureCity : null,
        departure_collective_price: departureType === 'collective' && departureCollectivePrice !== '' ? Number(departureCollectivePrice) : null,
        departure_own_price: null, // Not used for own transport
        return_type: returnType,
        return_city: returnType === 'collective' ? returnCity : null,
        return_collective_price: returnType === 'collective' && returnCollectivePrice !== '' ? Number(returnCollectivePrice) : null,
        return_own_price: null, // Not used for own transport
      };

      console.log('[CampTurnusEditPage] Saving transport:', transportData);

      let response;
      if (transport) {
        // Update existing transport
        response = await fetch(`${API_BASE_URL}/api/camps/${campId}/properties/${turnusId}/transport`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transportData),
        });
      } else {
        // Create new transport
        response = await fetch(`${API_BASE_URL}/api/camps/${campId}/properties/${turnusId}/transport`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transportData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('[CampTurnusEditPage] Transport save error:', errorData);
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const savedTransport = await response.json();
      setTransport(savedTransport);
      console.log('[CampTurnusEditPage] Transport save successful');
    } catch (err) {
      console.error('[CampTurnusEditPage] Error saving transport:', err);
      // Don't throw - transport is optional, just log the error
    } finally {
      setLoadingTransport(false);
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
      setAvailableTransports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[CampTurnusEditPage] Error fetching available transports:', err);
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

  // Create transport from turnus with default name
  const handleCreateTransportFromTurnus = async () => {
    if (!camp || !property || !campId || !turnusId) {
      setError('Brak danych obozu lub turnusu');
      return;
    }

    // Validate transport fields
    if (departureType === 'collective' && (!departureCity.trim() || departureCollectivePrice === '')) {
      setError('Wypełnij wszystkie wymagane pola dla transportu zbiorowego wyjazdu');
      return;
    }

    if (returnType === 'collective' && (!returnCity.trim() || returnCollectivePrice === '')) {
      setError('Wypełnij wszystkie wymagane pola dla transportu zbiorowego powrotu');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Generate default transport name: "CampName - Period City (StartDate)"
      const periodLabel = getPeriodLabel(property.period);
      const startDateFormatted = property.start_date ? new Date(property.start_date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
      const defaultName = `${camp.name} - ${periodLabel} ${property.city}${startDateFormatted ? ` (${startDateFormatted})` : ''}`;

      const transportData = {
        name: defaultName,
        property_id: turnusId, // Assign to current turnus
        departure_type: departureType,
        departure_city: departureType === 'collective' ? departureCity.trim() : null,
        departure_collective_price: departureType === 'collective' && departureCollectivePrice !== '' ? Number(departureCollectivePrice) : null,
        departure_own_price: null,
        return_type: returnType,
        return_city: returnType === 'collective' ? returnCity.trim() : null,
        return_collective_price: returnType === 'collective' && returnCollectivePrice !== '' ? Number(returnCollectivePrice) : null,
        return_own_price: null,
      };

      console.log('[CampTurnusEditPage] Creating transport from turnus:', transportData);

      const response = await fetch(
        `${API_BASE_URL}/api/camps/transports`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transportData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const createdTransport = await response.json();
      
      // Update transport state with created transport (includes name)
      setTransport(createdTransport);
      
      // Form fields are already populated, just confirm
      console.log('[CampTurnusEditPage] Transport created successfully:', createdTransport);
      
      // Show success message (optional - could use a toast notification)
      // For now, just log - the transport is now created and assigned to turnus
    } catch (err) {
      console.error('[CampTurnusEditPage] Error creating transport:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas tworzenia transportu');
    } finally {
      setSaving(false);
    }
  };

  // Select transport from available transports
  const handleSelectTransport = (selectedTransport: any) => {
    // Import all transport fields
    setDepartureType(selectedTransport.departure_type);
    setDepartureCity(selectedTransport.departure_city || '');
    setDepartureCollectivePrice(selectedTransport.departure_collective_price || '');
    setReturnType(selectedTransport.return_type);
    setReturnCity(selectedTransport.return_city || '');
    setReturnCollectivePrice(selectedTransport.return_collective_price || '');
    
    // Update transport state with selected transport (to show name in header)
    // Create a transport object from selected transport data
    const transportData: CampPropertyTransport = {
      id: selectedTransport.id,
      name: selectedTransport.name || null,
      property_id: selectedTransport.property_id || null,
      departure_type: selectedTransport.departure_type,
      departure_city: selectedTransport.departure_city || null,
      departure_collective_price: selectedTransport.departure_collective_price || null,
      departure_own_price: null,
      return_type: selectedTransport.return_type,
      return_city: selectedTransport.return_city || null,
      return_collective_price: selectedTransport.return_collective_price || null,
      return_own_price: null,
    };
    setTransport(transportData);
    
    // Close modal
    setShowAvailableTransportsModal(false);
    setSearchTransportQuery('');
  };

  // Filter transports by search query
  const filteredTransports = availableTransports.filter((transport) => {
    if (!searchTransportQuery.trim()) return true;
    const query = searchTransportQuery.toLowerCase();
    const name = transport.name?.toLowerCase() || '';
    const period = transport.turnus_period?.toLowerCase() || '';
    const city = transport.turnus_city?.toLowerCase() || '';
    const departureCity = transport.departure_city?.toLowerCase() || '';
    const returnCity = transport.return_city?.toLowerCase() || '';
    return (
      name.includes(query) ||
      period.includes(query) ||
      city.includes(query) ||
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

            {/* Transport Section */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {transport?.name ? `Transport: ${transport.name}` : 'Transport'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateTransportFromTurnus}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-[#03adf0] border border-[#03adf0] hover:bg-[#0288c7] transition-all duration-200"
                    style={{ borderRadius: 0, cursor: 'pointer' }}
                    disabled={saving || loading}
                    title="Utwórz transport dla tego turnusu"
                  >
                    <Plus className="w-3 h-3" />
                    Utwórz transport
                  </button>
                  <button
                    onClick={handleOpenAvailableTransports}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#03adf0] border border-[#03adf0] hover:bg-[#E0F2FF] transition-all duration-200"
                    style={{ borderRadius: 0, cursor: 'pointer' }}
                    disabled={saving || loading}
                    title="Wybierz z dostępnych transportów"
                  >
                    <Copy className="w-3 h-3" />
                    Wybierz z dostępnych transportów
                  </button>
                </div>
              </div>

              {/* Two-column layout: Departure and Return side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Departure (Wyjazd) */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Wyjazd do obozu
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Departure Type */}
                    <div>
                      <label htmlFor="departure-type" className="block text-xs font-medium text-gray-700 mb-1.5">
                        Sposób transportu <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="departure-type"
                        value={departureType}
                        onChange={(e) => setDepartureType(e.target.value as 'collective' | 'own')}
                        required
                        className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                        style={{ borderRadius: 0, cursor: 'pointer' }}
                        disabled={saving}
                      >
                        <option value="collective">Transport zbiorowy</option>
                        <option value="own">Własny transport</option>
                      </select>
                    </div>

                    {/* Departure City and Price (only for collective) */}
                    {departureType === 'collective' && (
                      <>
                        <div>
                          <label htmlFor="departure-city" className="block text-xs font-medium text-gray-700 mb-1.5">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            Miasto wyjazdu <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="departure-city"
                            type="text"
                            value={departureCity}
                            onChange={(e) => setDepartureCity(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                            style={{ borderRadius: 0 }}
                            placeholder="np. Warszawa"
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <label htmlFor="departure-collective-price" className="block text-xs font-medium text-gray-700 mb-1.5">
                            Cena (PLN) <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="departure-collective-price"
                            type="number"
                            value={departureCollectivePrice}
                            onChange={(e) => setDepartureCollectivePrice(e.target.value === '' ? '' : Number(e.target.value))}
                            required
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                            style={{ borderRadius: 0 }}
                            placeholder="500.00"
                            disabled={saving}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Return (Powrót) */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Powrót z obozu
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Return Type */}
                    <div>
                      <label htmlFor="return-type" className="block text-xs font-medium text-gray-700 mb-1.5">
                        Sposób transportu <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="return-type"
                        value={returnType}
                        onChange={(e) => setReturnType(e.target.value as 'collective' | 'own')}
                        required
                        className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                        style={{ borderRadius: 0, cursor: 'pointer' }}
                        disabled={saving}
                      >
                        <option value="collective">Transport zbiorowy</option>
                        <option value="own">Własny transport</option>
                      </select>
                    </div>

                    {/* Return City and Price (only for collective) */}
                    {returnType === 'collective' && (
                      <>
                        <div>
                          <label htmlFor="return-city" className="block text-xs font-medium text-gray-700 mb-1.5">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            Miasto powrotu <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="return-city"
                            type="text"
                            value={returnCity}
                            onChange={(e) => setReturnCity(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                            style={{ borderRadius: 0 }}
                            placeholder="np. Warszawa"
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <label htmlFor="return-collective-price" className="block text-xs font-medium text-gray-700 mb-1.5">
                            Cena (PLN) <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="return-collective-price"
                            type="number"
                            value={returnCollectivePrice}
                            onChange={(e) => setReturnCollectivePrice(e.target.value === '' ? '' : Number(e.target.value))}
                            required
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                            style={{ borderRadius: 0 }}
                            placeholder="500.00"
                            disabled={saving}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
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
                          className="p-4 border border-gray-200 hover:border-[#03adf0] hover:bg-[#E0F2FF] transition-all duration-200 cursor-pointer"
                          style={{ borderRadius: 0 }}
                        >
                          <div className="flex items-start justify-between">
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
                                    <span className="text-xs text-gray-500 italic ml-2">(Niezależny transport)</span>
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
                                {transport.departure_type === 'collective' && transport.departure_city && ` - ${transport.departure_city}`}
                                {transport.departure_type === 'collective' && transport.departure_collective_price && (
                                  <span className="ml-1 text-gray-500">
                                    ({transport.departure_collective_price.toFixed(2)} PLN)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Powrót:</span>
                              <span className="ml-1 text-gray-600">
                                {transport.return_type === 'collective' ? 'Zbiorowy' : 'Własny'}
                                {transport.return_type === 'collective' && transport.return_city && ` - ${transport.return_city}`}
                                {transport.return_type === 'collective' && transport.return_collective_price && (
                                  <span className="ml-1 text-gray-500">
                                    ({transport.return_collective_price.toFixed(2)} PLN)
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Copy className="w-4 h-4 text-[#03adf0] flex-shrink-0 ml-2" />
                      </div>
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
    </AdminLayout>
  );
}

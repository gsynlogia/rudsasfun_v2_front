'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { ArrowLeft, Save, MapPin, Truck } from 'lucide-react';
import type { CampPropertyTransport } from '@/types/reservation';

/**
 * Fetch transport by ID
 */
const fetchTransportById = (transportId: number): Promise<CampPropertyTransport | null> => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return fetch(`${API_BASE_URL}/api/camps/transports/${transportId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
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
      console.error('[TransportEditPage] Error fetching transport:', err);
      throw err;
    });
};

/**
 * Transport Edit Page
 * Route: /admin-panel/transports/[transportId]/edit
 * 
 * Allows editing a specific transport
 */
export default function TransportEditPage({ 
  params 
}: { 
  params: Promise<{ transportId: string }> | { transportId: string }
}) {
  const router = useRouter();
  const [transportId, setTransportId] = useState<number | null>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [transport, setTransport] = useState<CampPropertyTransport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [transportName, setTransportName] = useState('');
  const [departureType, setDepartureType] = useState<'collective' | 'own'>('collective');
  const [departureCity, setDepartureCity] = useState('');
  const [departureCollectivePrice, setDepartureCollectivePrice] = useState<number | ''>('');
  const [returnType, setReturnType] = useState<'collective' | 'own'>('collective');
  const [returnCity, setReturnCity] = useState('');
  const [returnCollectivePrice, setReturnCollectivePrice] = useState<number | ''>('');

  // Resolve params (handle both Promise and direct params)
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = params instanceof Promise ? await params : params;
        const resolvedTransportId = parseInt(resolvedParams.transportId);
        
        if (isNaN(resolvedTransportId)) {
          console.error('[TransportEditPage] Invalid params:', resolvedParams);
          setError('Nieprawidłowe parametry URL');
          setLoading(false);
          return;
        }
        
        setTransportId(resolvedTransportId);
      } catch (err) {
        console.error('[TransportEditPage] Error resolving params:', err);
        setError('Błąd podczas parsowania parametrów');
        setLoading(false);
      }
    };
    
    resolveParams();
  }, [params]);

  // Load transport data
  useEffect(() => {
    if (transportId) {
      fetchTransportById(transportId)
        .then((transportData) => {
          setTransport(transportData);
          
          if (!transportData) {
            console.error(`[TransportEditPage] Transport ${transportId} not found`);
            setError(`Transport o ID ${transportId} nie został znaleziony.`);
          } else {
            // Populate form with transport data
            setTransportName(transportData.name || '');
            setDepartureType(transportData.departure_type);
            setDepartureCity(transportData.departure_city || '');
            setDepartureCollectivePrice(transportData.departure_collective_price || '');
            setReturnType(transportData.return_type);
            setReturnCity(transportData.return_city || '');
            setReturnCollectivePrice(transportData.return_collective_price || '');
            
            console.log('[TransportEditPage] Data loaded successfully:', { transportId, transportData });
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('[TransportEditPage] Error loading data:', err);
          setError(err instanceof Error ? err.message : 'Błąd podczas ładowania danych');
          setLoading(false);
        });
    }
  }, [transportId]);

  const handleSave = async () => {
    // Validate transport fields
    if (departureType === 'collective' && (!departureCity.trim() || departureCollectivePrice === '')) {
      setError('Wypełnij wszystkie wymagane pola dla transportu zbiorowego wyjazdu');
      return;
    }

    if (returnType === 'collective' && (!returnCity.trim() || returnCollectivePrice === '')) {
      setError('Wypełnij wszystkie wymagane pola dla transportu zbiorowego powrotu');
      return;
    }

    if (!transportId) {
      console.error('[TransportEditPage] Missing required params for save:', { transportId });
      setError('Brak wymaganych parametrów');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const transportData = {
        name: transportName.trim() || null,
        departure_type: departureType,
        departure_city: departureType === 'collective' ? departureCity.trim() : null,
        departure_collective_price: departureType === 'collective' && departureCollectivePrice !== '' ? Number(departureCollectivePrice) : null,
        departure_own_price: null,
        return_type: returnType,
        return_city: returnType === 'collective' ? returnCity.trim() : null,
        return_collective_price: returnType === 'collective' && returnCollectivePrice !== '' ? Number(returnCollectivePrice) : null,
        return_own_price: null,
      };

      console.log('[TransportEditPage] Saving transport:', transportData);

      const response = await fetch(`${API_BASE_URL}/api/camps/transports/${transportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transportData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('[TransportEditPage] Save error:', errorData);
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const savedTransport = await response.json();
      setTransport(savedTransport);
      
      console.log('[TransportEditPage] Save successful, navigating to transports list');
      router.push('/admin-panel/transports');
    } catch (err) {
      console.error('[TransportEditPage] Error saving:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania transportu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-4 text-center text-gray-600">Ładowanie transportu...</div>
      </AdminLayout>
    );
  }

  if (error && !transport) {
    return (
      <AdminLayout>
        <div className="p-4">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => router.push('/admin-panel/transports')}
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
            {transport 
              ? `Edytuj transport: ${transport.name || 'Transport ogólny'}`
              : 'Edytuj transport'}
          </h1>
          <button
            onClick={() => router.push('/admin-panel/transports')}
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
            {/* Transport Name */}
            <div>
              <label htmlFor="transport-name" className="block text-sm font-medium text-gray-700 mb-2">
                Nazwa transportu <span className="text-gray-500 text-xs">(opcjonalna)</span>
              </label>
              <input
                id="transport-name"
                type="text"
                value={transportName}
                onChange={(e) => setTransportName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                style={{ borderRadius: 0 }}
                placeholder="np. Transport Warszawa-Kraków"
                disabled={saving}
              />
              <p className="mt-1 text-xs text-gray-500">
                Możesz podać nazwę transportu lub zostawić puste (transport ogólny)
              </p>
            </div>

            {/* Transport Section */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Szczegóły transportu</h2>
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

            {/* Transport Info */}
            {transport && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    ID transportu
                  </label>
                  <p className="text-sm text-gray-900">{transport.id}</p>
                </div>
                {transport.created_at && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Data utworzenia
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(transport.created_at).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                )}
                {transport.property_id && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Przypisany do turnusu
                    </label>
                    <p className="text-sm text-gray-900">ID: {transport.property_id}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={() => router.push('/admin-panel/transports')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-all duration-200"
              style={{ borderRadius: 0, cursor: 'pointer' }}
              disabled={saving}
            >
              Anuluj
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (departureType === 'collective' && (!departureCity.trim() || departureCollectivePrice === '')) || (returnType === 'collective' && (!returnCity.trim() || returnCollectivePrice === ''))}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#03adf0] border-2 border-[#03adf0] hover:bg-[#0288c7] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 0, cursor: (saving || (departureType === 'collective' && (!departureCity.trim() || departureCollectivePrice === '')) || (returnType === 'collective' && (!returnCity.trim() || returnCollectivePrice === ''))) ? 'not-allowed' : 'pointer' }}
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


'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { ArrowLeft, Save, MapPin, Truck, Plus, X } from 'lucide-react';
import type { CampPropertyTransport } from '@/types/reservation';

/**
 * Fetch transport by ID
 */
const fetchTransportById = (transportId: number): Promise<CampPropertyTransport | null> => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
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
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';

  const [transport, setTransport] = useState<CampPropertyTransport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [transportName, setTransportName] = useState('');
  const [departureType, setDepartureType] = useState<'collective' | 'own'>('collective');
  const [returnType, setReturnType] = useState<'collective' | 'own'>('collective');
  
  // Cities state - array of {city: string, departure_price: number | '', return_price: number | ''}
  interface CityFormData {
    id: string; // Temporary ID for React keys
    city: string;
    departure_price: number | '';
    return_price: number | '';
  }
  const [cities, setCities] = useState<CityFormData[]>([]);
  
  // Helper functions for cities
  const addCity = () => {
    setCities([...cities, {
      id: Date.now().toString(),
      city: '',
      departure_price: '',
      return_price: '',
    }]);
  };

  const removeCity = (id: string) => {
    setCities(cities.filter(c => c.id !== id));
  };

  const updateCity = (id: string, field: 'city' | 'departure_price' | 'return_price', value: string | number) => {
    setCities(cities.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

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
            setReturnType(transportData.return_type);
            
            // Load cities from new structure
            const transportCities = (transportData as any).cities || [];
            if (transportCities.length > 0) {
              setCities(transportCities.map((city: any, index: number) => ({
                id: city.id?.toString() || Date.now().toString() + index,
                city: city.city || '',
                departure_price: city.departure_price || '',
                return_price: city.return_price || '',
              })));
            } else {
              // If no cities, add one empty city if transport is collective
              if (transportData.departure_type === 'collective' || transportData.return_type === 'collective') {
                addCity();
              }
            }
            
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
    // Validate cities if transport is collective
    if (departureType === 'collective' && cities.length === 0) {
      setError('Dodaj przynajmniej jedno miasto dla transportu zbiorowego wyjazdu');
      return;
    }

    if (returnType === 'collective' && cities.length === 0) {
      setError('Dodaj przynajmniej jedno miasto dla transportu zbiorowego powrotu');
      return;
    }

    // Validate all cities have required fields
    for (const city of cities) {
      if (!city.city.trim()) {
        setError('Wszystkie miasta muszą mieć nazwę');
        return;
      }
      if (departureType === 'collective' && city.departure_price === '') {
        setError(`Miasto "${city.city}" musi mieć cenę wyjazdu`);
        return;
      }
      if (returnType === 'collective' && city.return_price === '') {
        setError(`Miasto "${city.city}" musi mieć cenę powrotu`);
        return;
      }
    }

    if (!transportId) {
      console.error('[TransportEditPage] Missing required params for save:', { transportId });
      setError('Brak wymaganych parametrów');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Prepare cities data
      const citiesData = cities.map(city => ({
        city: city.city.trim(),
        departure_price: departureType === 'collective' && city.departure_price !== '' ? Number(city.departure_price) : null,
        return_price: returnType === 'collective' && city.return_price !== '' ? Number(city.return_price) : null,
      }));

      const transportData = {
        name: transportName.trim() || null,
        // camp_ids removed - transport can only be assigned to camps during turnus editing
        departure_type: departureType,
        return_type: returnType,
        cities: citiesData,
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

            {/* Note: Camp assignment removed - transport can only be assigned to camps during turnus editing */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <p className="text-sm text-blue-700">
                <strong>Uwaga:</strong> Transport może być przypisany do obozu tylko podczas edycji turnusu. 
                Aby przypisać transport do obozu, edytuj turnus i wybierz transport z listy dostępnych transportów.
              </p>
            </div>

            {/* Transport Type Selection */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Szczegóły transportu</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {/* Departure Type */}
                <div>
                  <label htmlFor="departure-type" className="block text-sm font-medium text-gray-700 mb-2">
                    Typ transportu wyjazdu <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="departure-type"
                    value={departureType}
                    onChange={(e) => {
                      setDepartureType(e.target.value as 'collective' | 'own');
                      if (e.target.value === 'own' && returnType === 'own') {
                        setCities([]);
                      } else if (cities.length === 0) {
                        addCity();
                      }
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                    style={{ borderRadius: 0, cursor: 'pointer' }}
                    disabled={saving}
                  >
                    <option value="collective">Transport zbiorowy</option>
                    <option value="own">Własny transport</option>
                  </select>
                </div>

                {/* Return Type */}
                <div>
                  <label htmlFor="return-type" className="block text-sm font-medium text-gray-700 mb-2">
                    Typ transportu powrotu <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="return-type"
                    value={returnType}
                    onChange={(e) => {
                      setReturnType(e.target.value as 'collective' | 'own');
                      if (e.target.value === 'own' && departureType === 'own') {
                        setCities([]);
                      } else if (cities.length === 0) {
                        addCity();
                      }
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                    style={{ borderRadius: 0, cursor: 'pointer' }}
                    disabled={saving}
                  >
                    <option value="collective">Transport zbiorowy</option>
                    <option value="own">Własny transport</option>
                  </select>
                </div>
              </div>

              {/* Cities List - Only show if at least one transport type is collective */}
              {(departureType === 'collective' || returnType === 'collective') && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Miasta z cenami <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addCity}
                      disabled={saving}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-[#03adf0] hover:bg-[#0288c7] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ borderRadius: 0 }}
                    >
                      <span className="text-lg">+</span>
                      Dodaj miasto
                    </button>
                  </div>

                  {cities.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500 border border-gray-200" style={{ borderRadius: 0 }}>
                      Kliknij "Dodaj miasto" aby dodać pierwsze miasto
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cities.map((city, index) => (
                        <div key={city.id} className="border border-gray-200 p-4" style={{ borderRadius: 0 }}>
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700">Miasto {index + 1}</h4>
                            {cities.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeCity(city.id)}
                                disabled={saving}
                                className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                              >
                                Usuń
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nazwa miasta <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={city.city}
                                onChange={(e) => updateCity(city.id, 'city', e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                                style={{ borderRadius: 0 }}
                                placeholder="np. Warszawa"
                                disabled={saving}
                              />
                            </div>
                            {departureType === 'collective' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Cena wyjazdu (PLN) <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  value={city.departure_price}
                                  onChange={(e) => updateCity(city.id, 'departure_price', e.target.value === '' ? '' : Number(e.target.value))}
                                  required
                                  min="0"
                                  step="0.01"
                                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                                  style={{ borderRadius: 0 }}
                                  placeholder="500.00"
                                  disabled={saving}
                                />
                              </div>
                            )}
                            {returnType === 'collective' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Cena powrotu (PLN) <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  value={city.return_price}
                                  onChange={(e) => updateCity(city.id, 'return_price', e.target.value === '' ? '' : Number(e.target.value))}
                                  required
                                  min="0"
                                  step="0.01"
                                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
                                  style={{ borderRadius: 0 }}
                                  placeholder="500.00"
                                  disabled={saving}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
              disabled={saving || (departureType === 'collective' && cities.length === 0) || (returnType === 'collective' && cities.length === 0)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#03adf0] border-2 border-[#03adf0] hover:bg-[#0288c7] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 0, cursor: (saving || (departureType === 'collective' && cities.length === 0) || (returnType === 'collective' && cities.length === 0)) ? 'not-allowed' : 'pointer' }}
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


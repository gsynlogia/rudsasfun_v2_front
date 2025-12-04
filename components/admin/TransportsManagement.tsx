'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Plus, MapPin, Copy, Search, Edit, Trash2, AlertCircle, ExternalLink } from 'lucide-react';
import UniversalModal from './UniversalModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import type { Camp, CampProperty } from '@/types/reservation';
import { API_BASE_URL } from '@/utils/api-config';

interface TransportCity {
  id: number;
  city: string;
  departure_price?: number | null;
  return_price?: number | null;
  display_order?: number;
}

interface Transport {
  id: number;
  name?: string | null;  // Optional transport name
  property_id?: number | null;  // Optional - can be independent transport
  camp_ids?: number[];  // Array of camp IDs (many-to-many)
  camp_name?: string | null;
  turnus_period?: string | null;
  turnus_city?: string | null;
  turnus_start_date?: string | null;
  turnus_end_date?: string | null;
  departure_type: 'collective' | 'own';
  return_type: 'collective' | 'own';
  cities?: TransportCity[];  // Array of cities with prices
  created_at?: string | null;
  updated_at?: string | null;
}

export default function TransportsManagement() {
  const router = useRouter();
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<Transport | null>(null);
  const [transportUsage, setTransportUsage] = useState<Array<{
    camp_id: number;
    camp_name: string;
    turnus_id: number;
    turnus_period: string;
    turnus_city: string;
    turnus_start_date?: string | null;
    turnus_end_date?: string | null;
  }>>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTransportId, setEditingTransportId] = useState<number | null>(null);
  const [editingTransportName, setEditingTransportName] = useState('');

  // Form state
  const [transportName, setTransportName] = useState('');
  const [campId, setCampId] = useState<number | ''>('');
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

  // Fetch all transports
  const fetchTransports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/camps/transports/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTransports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[TransportsManagement] Error fetching transports:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania transportów');
      setTransports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransports();
  }, []);

  // Filter transports by search query
  const filteredTransports = transports.filter((transport) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      transport.name?.toLowerCase().includes(query) ||
      transport.camp_name?.toLowerCase().includes(query) ||
      transport.turnus_city?.toLowerCase().includes(query) ||
      transport.turnus_period?.toLowerCase().includes(query) ||
      transport.cities?.some(city => city.city.toLowerCase().includes(query)) ||
      false
    );
  });

  // Add new city field
  const addCity = () => {
    setCities([...cities, {
      id: Date.now().toString(),
      city: '',
      departure_price: '',
      return_price: '',
    }]);
  };

  // Remove city field
  const removeCity = (id: string) => {
    setCities(cities.filter(c => c.id !== id));
  };

  // Update city field
  const updateCity = (id: string, field: 'city' | 'departure_price' | 'return_price', value: string | number) => {
    setCities(cities.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  // Handle create transport
  const handleCreateTransport = async () => {
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
        property_id: null,  // Independent transport
        camp_id: campId !== '' ? Number(campId) : null,
        departure_type: departureType,
        return_type: returnType,
        cities: citiesData,
      };

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

      // Reset form
      setTransportName('');
      setCampId('');
      setDepartureType('collective');
      setReturnType('collective');
      setCities([]);
      setShowCreateModal(false);

      // Refresh transports list
      await fetchTransports();
    } catch (err) {
      console.error('[TransportsManagement] Error creating transport:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas tworzenia transportu');
    } finally {
      setSaving(false);
    }
  };

  // Check transport usage before deletion
  const checkTransportUsage = async (transportId: number): Promise<Array<{
    camp_id: number;
    camp_name: string;
    turnus_id: number;
    turnus_period: string;
    turnus_city: string;
    turnus_start_date?: string | null;
    turnus_end_date?: string | null;
  }>> => {
    try {
      setLoadingUsage(true);
      const response = await fetch(
        `${API_BASE_URL}/api/camps/transports/${transportId}/usage`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const usage = await response.json();
      return Array.isArray(usage) ? usage : [];
    } catch (err) {
      console.error('[TransportsManagement] Error checking transport usage:', err);
      return [];
    } finally {
      setLoadingUsage(false);
    }
  };

  // Handle delete transport click - check usage first
  const handleDeleteClick = async (transport: Transport, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTransport(transport);
    
    // Check if transport is assigned to any turnus
    const usage = await checkTransportUsage(transport.id);
    
    if (usage.length > 0) {
      // Transport is assigned - show usage modal
      setTransportUsage(usage);
      setShowDeleteModal(false);
      setShowUsageModal(true);
    } else {
      // Transport is not assigned - show delete confirmation
      setShowUsageModal(false);
      setShowDeleteModal(true);
    }
  };

  // Handle delete transport
  const handleDeleteTransport = async () => {
    if (!selectedTransport) return;

    try {
      setSaving(true);
      setError(null);

      // Independent transport - use DELETE endpoint by transport ID
      const response = await fetch(
        `${API_BASE_URL}/api/camps/transports/${selectedTransport.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      setShowDeleteModal(false);
      setSelectedTransport(null);

      // Refresh transports list
      await fetchTransports();
    } catch (err) {
      console.error('[TransportsManagement] Error deleting transport:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas usuwania transportu');
    } finally {
      setSaving(false);
    }
  };

  // Handle navigate to turnus edit
  const handleNavigateToTurnus = (campId: number, turnusId: number) => {
    router.push(`/admin-panel/camps/${campId}/turnus/${turnusId}/edit`);
  };

  const getPeriodLabel = (period: string) => {
    return period === 'lato' ? 'Lato' : 'Zima';
  };

  // Handle edit transport name
  const handleEditTransportName = async (transportId: number, newName: string) => {
    try {
      setSaving(true);
      setError(null);

      // Find transport to get camp_id and property_id
      const transport = transports.find(t => t.id === transportId);
      if (!transport) {
        throw new Error('Transport nie znaleziony');
      }

      // If transport is assigned to a turnus, update via turnus endpoint
      // Get camp_id from camp_ids array (first one) or fetch from turnus
      let campId: number | null = null;
      if (transport.camp_ids && transport.camp_ids.length > 0) {
        campId = transport.camp_ids[0];
      } else if (transport.property_id) {
        // Fetch turnus to get camp_id
        const turnusResponse = await fetch(
          `${API_BASE_URL}/api/camps/properties/${transport.property_id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        if (turnusResponse.ok) {
          const turnusData = await turnusResponse.json();
          campId = turnusData.camp_id;
        }
      }

      if (transport.property_id && campId) {
        // First get current transport data
        const getResponse = await fetch(
          `${API_BASE_URL}/api/camps/${campId}/properties/${transport.property_id}/transport`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!getResponse.ok) {
          throw new Error(`HTTP error! status: ${getResponse.status}`);
        }

        const currentTransport = await getResponse.json();

        // Update with new name
        const updateResponse = await fetch(
          `${API_BASE_URL}/api/camps/${campId}/properties/${transport.property_id}/transport`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: newName.trim() || null,
              departure_type: currentTransport.departure_type,
              return_type: currentTransport.return_type,
              cities: currentTransport.cities?.map((city: TransportCity) => ({
                city: city.city,
                departure_price: city.departure_price,
                return_price: city.return_price,
              })) || [],
            }),
          }
        );

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || `HTTP error! status: ${updateResponse.status}`);
        }
      } else {
        // Independent transport - use new PUT endpoint by transport ID
        const updateResponse = await fetch(
          `${API_BASE_URL}/api/camps/transports/${transportId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: newName.trim() || null,
            }),
          }
        );

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || `HTTP error! status: ${updateResponse.status}`);
        }
      }

      setEditingTransportId(null);
      setEditingTransportName('');

      // Refresh transports list
      await fetchTransports();
    } catch (err) {
      console.error('[TransportsManagement] Error editing transport name:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas edycji nazwy transportu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-600">Ładowanie transportów...</div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div style={{ marginTop: 0, paddingTop: 0 }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Transport</h1>
          <button
            onClick={() => {
              setShowCreateModal(true);
              setError(null);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#03adf0] border-2 border-[#03adf0] hover:bg-[#0288c7] transition-all duration-200"
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            <Plus className="w-4 h-4" />
            Dodaj transport
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj po nazwie transportu, obozu, mieście, okresie..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm"
            style={{ borderRadius: 0 }}
          />
        </div>
      </div>

      {/* Transports Table */}
      {filteredTransports.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm font-medium text-gray-700 mb-2">
            {transports.length === 0 ? 'Brak zadeklarowanych transportów' : 'Brak wyników wyszukiwania'}
          </p>
          <p className="text-xs text-gray-500">
            {transports.length === 0 
              ? 'Kliknij "Dodaj transport" aby utworzyć nowy transport.'
              : 'Spróbuj zmienić kryteria wyszukiwania.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ cursor: 'pointer' }}>
                  Nazwa transportu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ cursor: 'pointer' }}>
                  Przypisanie
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ cursor: 'pointer' }}>
                  Wyjazd
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ cursor: 'pointer' }}>
                  Powrót
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ cursor: 'pointer' }}>
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransports.map((transport) => (
                <tr key={transport.id} className="hover:bg-gray-50" style={{ cursor: 'pointer' }}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {transport.name || (
                      <span className="text-gray-400 italic">Transport ogólny</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {transport.property_id ? (
                      <div className="flex items-center gap-2">
                        {transport.camp_name && (
                          <span className="font-medium">{transport.camp_name}</span>
                        )}
                        {transport.turnus_period && (
                          <>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {getPeriodLabel(transport.turnus_period)}
                            </span>
                            {transport.turnus_city && (
                              <span>{transport.turnus_city}</span>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">Niezależny transport</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {transport.departure_type === 'collective' ? (
                      <div className="space-y-1">
                        {transport.cities && transport.cities.length > 0 ? (
                          transport.cities.map((city, idx) => (
                            <div key={city.id || idx} className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span>{city.city}</span>
                              {city.departure_price && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({city.departure_price.toFixed(2)} PLN)
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">Własny</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {transport.return_type === 'collective' ? (
                      <div className="space-y-1">
                        {transport.cities && transport.cities.length > 0 ? (
                          transport.cities.map((city, idx) => (
                            <div key={city.id || idx} className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span>{city.city}</span>
                              {city.return_price && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({city.return_price.toFixed(2)} PLN)
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">Własny</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {editingTransportId !== transport.id && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin-panel/transports/${transport.id}/edit`);
                            }}
                            className="p-1 text-[#03adf0] hover:bg-[#E0F2FF] transition-all duration-200"
                            title="Edytuj transport"
                            style={{ cursor: 'pointer' }}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(transport, e)}
                            className="p-1 text-red-600 hover:bg-red-50 transition-all duration-200"
                            title="Usuń transport"
                            style={{ cursor: 'pointer' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Transport Modal */}
      <UniversalModal
        isOpen={showCreateModal}
        title="Dodaj nowy transport"
        onClose={() => {
          setShowCreateModal(false);
          setError(null);
          setTransportName('');
          setCampId('');
          setDepartureType('collective');
          setReturnType('collective');
          setCities([]);
        }}
        maxWidth="2xl"
        className="max-h-[90vh] flex flex-col"
      >
        <div className="flex-1 overflow-y-auto p-6">
          {/* Transport Name (Optional) */}
          <div className="mb-6">
            <label htmlFor="transport-name" className="block text-sm font-medium text-gray-700 mb-2">
              Nazwa transportu <span className="text-xs text-gray-500">(opcjonalna)</span>
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
            <p className="text-xs text-gray-500 mt-1">
              Możesz podać nazwę transportu lub zostawić puste (transport ogólny)
            </p>
          </div>

          {/* Camp ID (Optional) */}
          <div className="mb-6">
            <label htmlFor="camp-id" className="block text-sm font-medium text-gray-700 mb-2">
              ID obozu <span className="text-xs text-gray-500">(opcjonalne)</span>
            </label>
            <input
              id="camp-id"
              type="number"
              value={campId}
              onChange={(e) => setCampId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm transition-all duration-200"
              style={{ borderRadius: 0 }}
              placeholder="np. 1"
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-1">
              Możesz przypisać transport do obozu (wszystkie turnusy tego obozu będą mogły używać tego transportu)
            </p>
          </div>

          {/* Transport Type Selection */}
          <div className="mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                    if (e.target.value === 'own') {
                      // Clear cities if switching to own transport
                      setCities([]);
                    } else if (cities.length === 0) {
                      // Add first city if switching to collective
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
                      // Clear cities if both are own
                      setCities([]);
                    } else if (cities.length === 0 && (departureType === 'collective' || e.target.value === 'collective')) {
                      // Add first city if switching to collective
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
          </div>

          {/* Cities List - Only show if at least one transport type is collective */}
          {(departureType === 'collective' || returnType === 'collective') && (
            <div className="mb-6">
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
                  <Plus className="w-3 h-3" />
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

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setError(null);
                setTransportName('');
                setCampId('');
                setDepartureType('collective');
                setReturnType('collective');
                setCities([]);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-all duration-200"
              style={{ borderRadius: 0, cursor: 'pointer' }}
              disabled={saving}
            >
              Anuluj
            </button>
            <button
              onClick={handleCreateTransport}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#03adf0] border-2 border-[#03adf0] hover:bg-[#0288c7] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 0, cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Zapisywanie...' : 'Utwórz transport'}
            </button>
          </div>
        </div>
      </UniversalModal>

      {/* Transport Usage Modal - Shows camps using this transport */}
      {showUsageModal && selectedTransport && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => {
            setShowUsageModal(false);
            setSelectedTransport(null);
            setTransportUsage([]);
          }}
        >
          <div
            className="bg-white shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-scaleIn"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">Nie można usunąć transportu</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Transport <strong>{selectedTransport.name || `Transport ${selectedTransport.id}`}</strong> jest przypisany do następujących turnusów:
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingUsage ? (
                <div className="text-center text-gray-500 py-8">Ładowanie...</div>
              ) : transportUsage.length === 0 ? (
                <div className="text-center text-gray-500 py-8">Brak przypisanych turnusów</div>
              ) : (
                <div className="space-y-3">
                  {transportUsage.map((usage, index) => (
                    <div
                      key={`${usage.camp_id}-${usage.turnus_id}`}
                      onClick={() => handleNavigateToTurnus(usage.camp_id, usage.turnus_id)}
                      className="p-4 border border-gray-200 hover:border-[#03adf0] hover:bg-[#E0F2FF] transition-all duration-200 cursor-pointer"
                      style={{ borderRadius: 0 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-gray-900">{usage.camp_name}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {getPeriodLabel(usage.turnus_period)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>
                              <span className="font-medium">Miasto:</span> {usage.turnus_city}
                            </div>
                            {usage.turnus_start_date && usage.turnus_end_date && (
                              <div>
                                <span className="font-medium">Okres:</span>{' '}
                                {new Date(usage.turnus_start_date).toLocaleDateString('pl-PL')} - {new Date(usage.turnus_end_date).toLocaleDateString('pl-PL')}
                              </div>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-[#03adf0] flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowUsageModal(false);
                    setSelectedTransport(null);
                    setTransportUsage([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-all duration-200"
                  style={{ borderRadius: 0, cursor: 'pointer' }}
                >
                  Zamknij
                </button>
              </div>
            </div>
          </div>

          {/* Animations CSS */}
          <style jsx global>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }

            @keyframes scaleIn {
              from {
                opacity: 0;
                transform: scale(0.95);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }

            .animate-fadeIn {
              animation: fadeIn 0.2s ease-out;
            }

            .animate-scaleIn {
              animation: scaleIn 0.3s ease-out;
            }
          `}</style>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        itemType="other"
        itemName={selectedTransport?.name || `Transport ${selectedTransport?.id || ''}`}
        itemId={selectedTransport?.id || 0}
        onConfirm={handleDeleteTransport}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedTransport(null);
        }}
        isLoading={saving}
      />
    </div>
  );
}


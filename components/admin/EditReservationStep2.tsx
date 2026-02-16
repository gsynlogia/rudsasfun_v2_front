'use client';

import { useState, useEffect, useRef } from 'react';

import { authenticatedApiCall } from '@/utils/api-auth';
import { API_BASE_URL } from '@/utils/api-config';

interface EditReservationStep2Props {
  data: {
    selected_diets?: number[] | null;
    selected_addons?: string[] | null;
    selected_protection?: string[] | null;
    selected_promotion?: string | null;
    promotion_justification?: any;
    departure_type: string;
    departure_city?: string | null;
    return_type: string;
    return_city?: string | null;
    transport_different_cities?: boolean;
    selected_source?: string | null;
    source_inne_text?: string | null;
  };
  camp_id: number;
  property_id: number;
  property_city?: string | null;
  onChange: (data: any) => void;
}

interface Addon {
  id: string;
  name: string;
  price: number;
}

interface Protection {
  id: number;
  name: string;
  price: number;
}

interface Promotion {
  id: number;
  general_promotion_id?: number;
  relation_id?: number;
  name: string;
  price: number;
}

interface Source {
  id: number;
  name: string;
}

interface TurnusDiet {
  id: number;
  name: string;
  price: number;
  relation_id?: number;
}

export default function EditReservationStep2({ data, camp_id, property_id, property_city, onChange }: EditReservationStep2Props) {
  // Normalize data - ensure arrays are properly formatted
  const normalizeArray = (arr: any): any[] => {
    if (!arr) return [];
    if (typeof arr === 'string') {
      try {
        return JSON.parse(arr);
      } catch {
        return [];
      }
    }
    return Array.isArray(arr) ? arr : [];
  };

  // Normalize selected_addons - ensure they are strings
  const normalizeSelectedAddons = (addons: any): string[] => {
    const normalized = normalizeArray(addons);
    return normalized.map(a => String(a)); // Ensure all are strings
  };

  const initialSelectedAddons = normalizeSelectedAddons(data.selected_addons);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(initialSelectedAddons);

  // Update selectedAddons when data.selected_addons changes
  useEffect(() => {
    const normalized = normalizeSelectedAddons(data.selected_addons);
    setSelectedAddons(normalized);
    console.log('[EditReservationStep2] Updated selected addons from data:', normalized);
  }, [data.selected_addons]);
  const normalizeSelectedDiets = (arr: any): number[] => {
    const normalized = normalizeArray(arr);
    return normalized.map((x) => (typeof x === 'number' ? x : parseInt(String(x), 10))).filter((n) => !Number.isNaN(n));
  };
  const [selectedDiets, setSelectedDiets] = useState<number[]>(normalizeSelectedDiets(data.selected_diets));
  useEffect(() => {
    const normalized = normalizeSelectedDiets(data.selected_diets);
    setSelectedDiets((prev) => (JSON.stringify([...prev].sort()) === JSON.stringify([...normalized].sort()) ? prev : normalized));
  }, [data.selected_diets]);
  const [selectedProtection, setSelectedProtection] = useState<string[]>(normalizeArray(data.selected_protection));
  const [selectedPromotion, setSelectedPromotion] = useState<string>(data.selected_promotion ? String(data.selected_promotion) : '');
  const [promotionJustification, setPromotionJustification] = useState<any>(data.promotion_justification || {});
  const [transportData, setTransportData] = useState({
    departureType: data.departure_type || 'zbiorowy',
    departureCity: data.departure_city || '',
    returnType: data.return_type || 'zbiorowy',
    returnCity: data.return_city || '',
    differentCities: data.transport_different_cities || false,
  });
  const [selectedSource, setSelectedSource] = useState<string>(data.selected_source || '');
  const [inneText, setInneText] = useState<string>(data.source_inne_text || '');

  const [addons, setAddons] = useState<Addon[]>([]);
  const [turnusDiets, setTurnusDiets] = useState<TurnusDiet[]>([]);
  const [protections, setProtections] = useState<Protection[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch addons (use property_city from props instead of fetching property)
        const selectedAddonIds = normalizeSelectedAddons(data.selected_addons);

        if (property_city) {
          // First, fetch addons available for this city
          const addonsRes = await fetch(`${API_BASE_URL}/api/addons/public?city=${encodeURIComponent(property_city)}`);
          if (addonsRes.ok) {
            const addonsData = await addonsRes.json();
            const fetchedAddons = (addonsData.addons || []).map((a: any) => ({ id: String(a.id), name: a.name, price: a.price }));

            // Also fetch addons that are already selected but might not be available for this city
            // This ensures we show all selected addons, even if they're not available for current city
            const addonsMap = new Map<string, Addon>();
            fetchedAddons.forEach((a: Addon) => {
              addonsMap.set(a.id, a);
            });

            // Fetch selected addons that might not be in the city-filtered list
            for (const addonIdStr of selectedAddonIds) {
              if (!addonsMap.has(addonIdStr)) {
                try {
                  const addonId = parseInt(addonIdStr);
                  if (!isNaN(addonId)) {
                    const addonData = await authenticatedApiCall<any>(`/api/addons/${addonId}`);
                    addonsMap.set(addonIdStr, { id: addonIdStr, name: addonData.name, price: addonData.price });
                  }
                } catch (err) {
                  console.error(`Error fetching addon ${addonIdStr}:`, err);
                }
              }
            }

            setAddons(Array.from(addonsMap.values()));

            // Debug: log selected addons and fetched addons
            console.log('[EditReservationStep2] Selected addons from data:', selectedAddonIds);
            console.log('[EditReservationStep2] Fetched addons IDs:', Array.from(addonsMap.keys()));
            console.log('[EditReservationStep2] All addons:', Array.from(addonsMap.values()));
          } else {
            // If city-based fetch fails, still try to fetch selected addons individually
            const addonsMap = new Map<string, Addon>();
            for (const addonIdStr of selectedAddonIds) {
              try {
                const addonId = parseInt(addonIdStr);
                if (!isNaN(addonId)) {
                  const addonData = await authenticatedApiCall<any>(`/api/addons/${addonId}`);
                  addonsMap.set(addonIdStr, { id: addonIdStr, name: addonData.name, price: addonData.price });
                }
              } catch (err) {
                console.error(`Error fetching addon ${addonIdStr}:`, err);
              }
            }
            setAddons(Array.from(addonsMap.values()));
          }
        } else {
          // If no property_city, fetch selected addons individually
          const addonsMap = new Map<string, Addon>();
          for (const addonIdStr of selectedAddonIds) {
            try {
              const addonId = parseInt(addonIdStr);
              if (!isNaN(addonId)) {
                const addonData = await authenticatedApiCall<any>(`/api/addons/${addonId}`);
                addonsMap.set(addonIdStr, { id: addonIdStr, name: addonData.name, price: addonData.price });
              }
            } catch (err) {
              console.error(`Error fetching addon ${addonIdStr}:`, err);
            }
          }
          setAddons(Array.from(addonsMap.values()));
        }

        // Fetch turnus diets (dodatkowe diety z turnusu)
        const dietsRes = await fetch(`${API_BASE_URL}/api/camps/${camp_id}/properties/${property_id}/diets`);
        if (dietsRes.ok) {
          const dietsData = await dietsRes.json();
          const list = Array.isArray(dietsData) ? dietsData : [];
          setTurnusDiets(list.map((d: any) => ({ id: d.id ?? d.relation_id ?? 0, name: d.name || '', price: typeof d.price === 'number' ? d.price : 0, relation_id: d.relation_id })));
        }

        // Fetch protections
        const protectionsRes = await fetch(`${API_BASE_URL}/api/camps/${camp_id}/properties/${property_id}/protections`);
        if (protectionsRes.ok) {
          const protectionsData = await protectionsRes.json();
          setProtections(Array.isArray(protectionsData) ? protectionsData : []);
        }

        // Fetch promotions
        const promotionsRes = await fetch(`${API_BASE_URL}/api/camps/${camp_id}/properties/${property_id}/promotions`);
        if (promotionsRes.ok) {
          const promotionsData = await promotionsRes.json();
          setPromotions(Array.isArray(promotionsData) ? promotionsData : []);
        }

        // Fetch sources
        const sourcesRes = await fetch(`${API_BASE_URL}/api/sources/public`);
        if (sourcesRes.ok) {
          const sourcesData = await sourcesRes.json();
          setSources(Array.isArray(sourcesData) ? sourcesData : []);
        }
      } catch (err) {
        console.error('Error fetching Step2 data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [camp_id, property_id, property_city, data.selected_addons]);

  // Notify parent of changes - use useRef to track previous values and only call onChange when actually changed
  const prevDataRef = useRef<any>(null);

  useEffect(() => {
    const newData = {
      selected_diets: selectedDiets,
      selected_addons: selectedAddons,
      selected_protection: selectedProtection,
      selected_promotion: selectedPromotion,
      promotion_justification: promotionJustification,
      departure_type: transportData.departureType,
      departure_city: transportData.departureCity,
      return_type: transportData.returnType,
      return_city: transportData.returnCity,
      transport_different_cities: transportData.differentCities,
      selected_source: selectedSource,
      source_inne_text: inneText,
    };

    // Only call onChange if data actually changed
    if (JSON.stringify(prevDataRef.current) !== JSON.stringify(newData)) {
      prevDataRef.current = newData;
      onChange(newData);
    }
  }, [selectedDiets, selectedAddons, selectedProtection, selectedPromotion, promotionJustification, transportData, selectedSource, inneText, onChange]);

  if (loading) {
    return <div className="text-center py-8">Ładowanie danych...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Krok 2: Szczegóły rezerwacji</h2>

      {/* Diety (dodatkowe diety z turnusu) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Diety (dostępne w turnusie)</h3>
        <div className="space-y-2">
          {turnusDiets.length > 0 ? (
            turnusDiets.map((diet) => {
              const dietId = diet.relation_id ?? diet.id;
              const isSelected = selectedDiets.includes(dietId);
              return (
                <label key={diet.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDiets([...selectedDiets, dietId]);
                      } else {
                        setSelectedDiets(selectedDiets.filter((id) => id !== dietId));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-900">
                    {diet.name} {diet.price > 0 ? `(+${diet.price.toFixed(2)} PLN)` : ''}
                  </span>
                </label>
              );
            })
          ) : (
            <p className="text-sm text-gray-500">Brak dodatkowych diet dla tego turnusu</p>
          )}
        </div>
      </div>

      {/* Dodatki */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dodatki</h3>
        <div className="space-y-2">
          {addons.length > 0 ? (
            addons.map((addon) => {
              // Ensure both are strings for comparison
              const addonIdStr = String(addon.id);
              const isSelected = selectedAddons.some(id => String(id) === addonIdStr);

              // Debug log for each addon
              if (addonIdStr === '2') {
                console.log('[EditReservationStep2] Checking addon ID 2:', {
                  addonIdStr,
                  selectedAddons,
                  isSelected,
                });
              }

              return (
                <label key={addon.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAddons([...selectedAddons, addonIdStr]);
                      } else {
                        setSelectedAddons(selectedAddons.filter(id => String(id) !== addonIdStr));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-900">
                    {addon.name} {addon.price > 0 ? `(+${addon.price.toFixed(2)} PLN)` : ''}
                  </span>
                </label>
              );
            })
          ) : (
            <p className="text-sm text-gray-500">Brak dostępnych dodatków dla tego turnusu</p>
          )}
        </div>
      </div>

      {/* Ochrony */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ochrony</h3>
        <div className="space-y-2">
          {protections.map((protection) => {
            const protectionId = `protection-${protection.id}`;
            const isSelected = selectedProtection.includes(protectionId);
            return (
              <label key={protection.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProtection([...selectedProtection, protectionId]);
                    } else {
                      setSelectedProtection(selectedProtection.filter(id => id !== protectionId));
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-900">
                  {protection.name} {protection.price > 0 ? `(+${protection.price.toFixed(2)} PLN)` : ''}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Promocje */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Promocje</h3>
        <select
          value={selectedPromotion}
          onChange={(e) => setSelectedPromotion(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
          style={{ borderRadius: 0 }}
        >
          <option value="">Brak promocji</option>
          {promotions.map((promo) => {
            const promoId = String(promo.relation_id || promo.id);
            return (
              <option key={promo.id} value={promoId}>
                {promo.name} {promo.price < 0 ? `${promo.price.toFixed(2)} PLN` : promo.price > 0 ? `+${promo.price.toFixed(2)} PLN` : ''}
              </option>
            );
          })}
        </select>
        {selectedPromotion && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Uzasadnienie promocji:</label>
            <textarea
              value={promotionJustification?.text || ''}
              onChange={(e) => setPromotionJustification({ ...promotionJustification, text: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              style={{ borderRadius: 0 }}
            />
          </div>
        )}
      </div>

      {/* Transport */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transport</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wyjazd:</label>
            <select
              value={transportData.departureType}
              onChange={(e) => setTransportData({ ...transportData, departureType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              style={{ borderRadius: 0 }}
            >
              <option value="zbiorowy">Zbiorowy</option>
              <option value="wlasny">Własny</option>
            </select>
            {transportData.departureType === 'zbiorowy' && (
              <input
                type="text"
                value={transportData.departureCity}
                onChange={(e) => setTransportData({ ...transportData, departureCity: e.target.value })}
                placeholder="Miasto wyjazdu"
                className="w-full mt-2 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                style={{ borderRadius: 0 }}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Powrót:</label>
            <select
              value={transportData.returnType}
              onChange={(e) => setTransportData({ ...transportData, returnType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              style={{ borderRadius: 0 }}
            >
              <option value="zbiorowy">Zbiorowy</option>
              <option value="wlasny">Własny</option>
            </select>
            {transportData.returnType === 'zbiorowy' && (
              <input
                type="text"
                value={transportData.returnCity}
                onChange={(e) => setTransportData({ ...transportData, returnCity: e.target.value })}
                placeholder="Miasto powrotu"
                className="w-full mt-2 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                style={{ borderRadius: 0 }}
              />
            )}
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={transportData.differentCities}
                onChange={(e) => setTransportData({ ...transportData, differentCities: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-900">Różne miasta wyjazdu i powrotu</span>
            </label>
          </div>
        </div>
      </div>

      {/* Źródło */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Źródło</h3>
        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
          style={{ borderRadius: 0 }}
        >
          <option value="">Wybierz źródło</option>
          {sources.map((source) => (
            <option key={source.id} value={String(source.id)}>
              {source.name}
            </option>
          ))}
          <option value="inne">Inne</option>
        </select>
        {selectedSource === 'inne' && (
          <input
            type="text"
            value={inneText}
            onChange={(e) => setInneText(e.target.value)}
            placeholder="Podaj źródło"
            className="w-full mt-2 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
            style={{ borderRadius: 0 }}
          />
        )}
      </div>
    </div>
  );
}
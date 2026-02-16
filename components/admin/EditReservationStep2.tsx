'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

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
    departure_transport_city_id?: number | null;
    return_type: string;
    return_city?: string | null;
    return_transport_city_id?: number | null;
    transport_different_cities?: boolean;
    selected_source?: string | null;
    source_inne_text?: string | null;
  };
  camp_id: number;
  property_id: number;
  property_city?: string | null;
  onChange: (data: any) => void;
  /** Nazwa promocji z rezerwacji (do wyświetlenia „dane historyczne” gdy promocja nieaktywna / usunięta). */
  promotion_name?: string | null;
  /** Cena promocji z rezerwacji. */
  promotion_price?: number | null;
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
  does_not_reduce_price?: boolean;
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

interface TransportCityOption {
  id?: number;
  city: string;
  departure_price: number | null;
  return_price: number | null;
}

function getPromotionType(promotionName?: string | null): string {
  if (!promotionName) return 'other';
  const nameLower = String(promotionName).toLowerCase();
  if (nameLower.includes('duża rodzina') || nameLower.includes('duza rodzina')) return 'duza_rodzina';
  if (nameLower.includes('rodzeństwo razem') || nameLower.includes('rodzenstwo razem')) return 'rodzenstwo_razem';
  if (nameLower.includes('obozy na maxa') || nameLower.includes('obozy na max')) return 'obozy_na_maxa';
  if (nameLower.includes('first minute') || nameLower.includes('wczesna rezerwacja')) return 'first_minute';
  if (nameLower.includes('bon') && (
    nameLower.includes('brązowy') || nameLower.includes('brazowy') ||
    nameLower.includes('srebrny') ||
    nameLower.includes('złoty') || nameLower.includes('zloty') ||
    nameLower.includes('platynowy')
  )) return 'bonowych';
  if (nameLower.includes('bonowych') || nameLower.includes('bonowa')) return 'bonowych';
  return 'other';
}

function formatPromotionPrice(price: number): string {
  if (price < 0) return `${price.toFixed(2)} PLN`;
  if (price > 0) return `+${price.toFixed(2)} PLN`;
  return '0,00 PLN';
}

function hasJustificationData(justification: any): boolean {
  return Boolean(
    justification &&
    typeof justification === 'object' &&
    Object.keys(justification).length > 0 &&
    Object.values(justification).some(
      (val: any) =>
        val !== null &&
        val !== undefined &&
        val !== '' &&
        (Array.isArray(val) ? val.length > 0 : true),
    ),
  );
}

function formatJustificationForDisplay(just: any): string {
  if (!just || typeof just !== 'object') return '';
  const parts: string[] = [];
  if (just.card_number) parts.push(`Numer karty dużej rodziny: ${just.card_number}`);
  if (just.sibling_first_name || just.sibling_last_name) {
    const n = [just.sibling_first_name, just.sibling_last_name].filter(Boolean).join(' ');
    if (n) parts.push(`Rodzeństwo: ${n}`);
  }
  if (just.first_camp_date) parts.push(`Data pierwszego obozu: ${just.first_camp_date}`);
  if (just.first_camp_name) parts.push(`Nazwa pierwszego obozu: ${just.first_camp_name}`);
  if (just.reason) parts.push(`Powód wyboru promocji: ${just.reason}`);
  if (just.years) {
    const y = Array.isArray(just.years) ? just.years.join(', ') : String(just.years);
    if (y) parts.push(`Lata uczestnictwa: ${y}`);
  }
  const known = ['card_number', 'sibling_first_name', 'sibling_last_name', 'first_camp_date', 'first_camp_name', 'reason', 'years'];
  Object.keys(just).filter((k) => !known.includes(k)).forEach((key) => {
    const v = just[key];
    if (v !== null && v !== undefined && v !== '') parts.push(`${key}: ${String(v)}`);
  });
  return parts.join('\n');
}

export default function EditReservationStep2({ data, camp_id, property_id, property_city, onChange, promotion_name, promotion_price }: EditReservationStep2Props) {
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
    departureTransportCityId: data.departure_transport_city_id ?? undefined,
    returnType: data.return_type || 'zbiorowy',
    returnCity: data.return_city || '',
    returnTransportCityId: data.return_transport_city_id ?? undefined,
    differentCities: data.transport_different_cities || false,
  });
  const [selectedSource, setSelectedSource] = useState<string>(data.selected_source != null ? String(data.selected_source) : '');
  const [inneText, setInneText] = useState<string>(data.source_inne_text || '');

  useEffect(() => {
    setSelectedSource(data.selected_source != null ? String(data.selected_source) : '');
    setInneText(data.source_inne_text || '');
  }, [data.selected_source, data.source_inne_text]);

  const [addons, setAddons] = useState<Addon[]>([]);
  const [turnusDiets, setTurnusDiets] = useState<TurnusDiet[]>([]);
  const [protections, setProtections] = useState<Protection[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [transportCities, setTransportCities] = useState<TransportCityOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch addons (prefer property_id, fallback property_city)
        const selectedAddonIds = normalizeSelectedAddons(data.selected_addons);
        const addonsUrl = property_id != null
          ? `${API_BASE_URL}/api/addons/public?property_id=${property_id}`
          : property_city
            ? `${API_BASE_URL}/api/addons/public?city=${encodeURIComponent(property_city)}`
            : null;

        if (addonsUrl) {
          const addonsRes = await fetch(addonsUrl);
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
          // Brak property_id i city – pobierz tylko wybrane addony po ID
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

        // Fetch promotions (ta sama lista i logika co #promocje-transport)
        const promotionsRes = await fetch(`${API_BASE_URL}/api/camps/${camp_id}/properties/${property_id}/promotions`);
        if (promotionsRes.ok) {
          const promotionsData = await promotionsRes.json();
          const list = Array.isArray(promotionsData) ? promotionsData : [];
          setPromotions(list.map((p: any) => ({
            id: p.id ?? 0,
            relation_id: p.relation_id ?? p.id,
            general_promotion_id: p.general_promotion_id,
            name: p.name || `Promocja #${p.relation_id ?? p.id}`,
            price: typeof p.price === 'number' ? p.price : 0,
            does_not_reduce_price: !!p.does_not_reduce_price,
          })));
        }

        // Fetch sources (API zwraca { sources: [...] } – jak w SourceSection)
        const sourcesRes = await fetch(`${API_BASE_URL}/api/sources/public`);
        if (sourcesRes.ok) {
          const sourcesData = await sourcesRes.json();
          setSources(sourcesData?.sources ?? []);
        }

        // Fetch transport cities (ta sama lista i endpoint co w procesie rezerwacji – TransportSection)
        if (camp_id && property_id) {
          try {
            const citiesData = await authenticatedApiCall<TransportCityOption[]>(
              `${API_BASE_URL}/api/camps/${camp_id}/properties/${property_id}/transport/cities`,
            );
            setTransportCities(Array.isArray(citiesData) ? citiesData : []);
          } catch {
            setTransportCities([]);
          }
        } else {
          setTransportCities([]);
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
      departure_transport_city_id: transportData.departureTransportCityId ?? null,
      return_type: transportData.returnType,
      return_city: transportData.returnCity,
      return_transport_city_id: transportData.returnTransportCityId ?? null,
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

      {/* Promocje – ta sama logika i dane co #promocje-transport */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Promocje</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Promocja:</label>
            <div className="flex items-center gap-2">
              <select
                value={selectedPromotion}
                onChange={(e) => setSelectedPromotion(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                style={{ borderRadius: 0 }}
              >
                <option value="">Brak promocji</option>
                {promotions.map((promo) => {
                  const promoId = String(promo.relation_id ?? promo.id);
                  return (
                    <option key={promo.id} value={promoId}>
                      {promo.name} — {formatPromotionPrice(promo.price)}
                      {promo.does_not_reduce_price ? ' (nie obniża ceny)' : ''}
                    </option>
                  );
                })}
              </select>
              {selectedPromotion ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPromotion('');
                    setPromotionJustification({});
                  }}
                  className="flex-shrink-0 p-2 border border-gray-300 hover:bg-gray-100 transition-colors"
                  style={{ borderRadius: 0 }}
                  aria-label="Usuń promocję"
                  title="Usuń promocję"
                >
                  <X className="h-4 w-4 text-gray-700" />
                </button>
              ) : null}
            </div>
          </div>

          {selectedPromotion && (() => {
            const currentPromo = promotions.find(
              (p) => String(p.relation_id ?? p.id) === selectedPromotion,
            );
            return currentPromo ? (
              <div>
                <p className="text-sm text-gray-900 font-medium">{currentPromo.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Cena: {formatPromotionPrice(currentPromo.price)}
                  {currentPromo.does_not_reduce_price ? ' (promocja informacyjna – nie obniża ceny)' : ''}
                </p>
              </div>
            ) : null;
          })()}

          {/* Dane historyczne: gdy brak wybranej promocji lub promocja nieaktywna, ale rezerwacja miała promocję */}
          {(selectedPromotion === '' || (selectedPromotion && !promotions.find((p) => String(p.relation_id ?? p.id) === selectedPromotion))) &&
            (data.selected_promotion || promotion_name) && (
              <div className="space-y-1">
                <p className="text-sm text-gray-900 font-medium">
                  {promotion_name || `Promocja #${data.selected_promotion}`}
                </p>
                {promotion_price != null && promotion_price !== undefined && (
                  <p className="text-sm text-gray-600">
                    Cena: {formatPromotionPrice(promotion_price)}
                  </p>
                )}
                <p className="text-sm text-gray-500 italic">(promocja nieaktywna - dane historyczne)</p>
                {hasJustificationData(data.promotion_justification) && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Uzasadnienie:</label>
                    <pre className="text-sm text-gray-900 bg-gray-50 p-3 whitespace-pre-wrap border border-gray-100" style={{ borderRadius: 0 }}>
                      {formatJustificationForDisplay(data.promotion_justification)}
                    </pre>
                  </div>
                )}
              </div>
            )}

          {selectedPromotion && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Uzasadnienie promocji:</label>
              {(() => {
                const currentPromo = promotions.find(
                  (p) => String(p.relation_id ?? p.id) === selectedPromotion,
                );
                const promotionName = currentPromo?.name ?? selectedPromotion;
                const type = getPromotionType(promotionName);
                const just = promotionJustification || {};

                if (type === 'duza_rodzina') {
                  return (
                    <input
                      type="text"
                      value={just.card_number ?? ''}
                      onChange={(e) => setPromotionJustification({ ...just, card_number: e.target.value })}
                      placeholder="Numer karty dużej rodziny *"
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      style={{ borderRadius: 0 }}
                    />
                  );
                }
                if (type === 'rodzenstwo_razem') {
                  return (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={just.sibling_first_name ?? ''}
                        onChange={(e) => setPromotionJustification({ ...just, sibling_first_name: e.target.value })}
                        placeholder="Imię rodzeństwa *"
                        className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        style={{ borderRadius: 0 }}
                      />
                      <input
                        type="text"
                        value={just.sibling_last_name ?? ''}
                        onChange={(e) => setPromotionJustification({ ...just, sibling_last_name: e.target.value })}
                        placeholder="Nazwisko rodzeństwa *"
                        className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                  );
                }
                if (type === 'obozy_na_maxa') {
                  return (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={just.first_camp_date ?? ''}
                        onChange={(e) => setPromotionJustification({ ...just, first_camp_date: e.target.value })}
                        placeholder="Data pierwszego obozu (DD.MM.RRRR)"
                        className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        style={{ borderRadius: 0 }}
                      />
                      <input
                        type="text"
                        value={just.first_camp_name ?? ''}
                        onChange={(e) => setPromotionJustification({ ...just, first_camp_name: e.target.value })}
                        placeholder="Nazwa pierwszego obozu"
                        className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        style={{ borderRadius: 0 }}
                      />
                      <p className="text-xs text-gray-500">Wystarczy wypełnić datę lub nazwę.</p>
                    </div>
                  );
                }
                if (type === 'first_minute') {
                  return (
                    <input
                      type="text"
                      value={just.reason ?? ''}
                      onChange={(e) => setPromotionJustification({ ...just, reason: e.target.value })}
                      placeholder="Powód wyboru promocji First Minute *"
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      style={{ borderRadius: 0 }}
                    />
                  );
                }
                if (type === 'bonowych') {
                  return (
                    <input
                      type="text"
                      value={Array.isArray(just.years) ? just.years.join(', ') : (just.years ?? '')}
                      onChange={(e) => setPromotionJustification({ ...just, years: e.target.value })}
                      placeholder="Lata uczestnictwa (np. 2022, 2023) *"
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      style={{ borderRadius: 0 }}
                    />
                  );
                }
                return (
                  <textarea
                    value={just.reason ?? just.text ?? ''}
                    onChange={(e) => setPromotionJustification({ ...just, reason: e.target.value })}
                    placeholder="Uzasadnienie (krótki opis) *"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    style={{ borderRadius: 0 }}
                  />
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Transport */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transport</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wyjazd:</label>
            <select
              value={transportData.departureType}
              onChange={(e) => {
                const v = e.target.value;
                setTransportData({
                  ...transportData,
                  departureType: v,
                  ...(v !== 'zbiorowy' ? { departureCity: '', departureTransportCityId: undefined } : {}),
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              style={{ borderRadius: 0 }}
            >
              <option value="zbiorowy">Zbiorowy</option>
              <option value="wlasny">Własny</option>
            </select>
            {transportData.departureType === 'zbiorowy' && (
              transportCities.length > 0 ? (
                <select
                  value={transportData.departureCity}
                  onChange={(e) => {
                    const cityName = e.target.value;
                    const city = transportCities.find((c) => c.city === cityName);
                    setTransportData({
                      ...transportData,
                      departureCity: cityName,
                      departureTransportCityId: city?.id,
                    });
                  }}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  style={{ borderRadius: 0 }}
                >
                  <option value="">Wybierz miasto wyjazdu</option>
                  {transportCities.map((c) => (
                    <option key={c.id ?? c.city} value={c.city}>
                      {c.city}
                      {c.departure_price != null ? ` (${c.departure_price.toFixed(2)} PLN)` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-2 text-sm text-gray-500">Brak transportu zbiorowego dla tego turnusu.</p>
              )
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Powrót:</label>
            <select
              value={transportData.returnType}
              onChange={(e) => {
                const v = e.target.value;
                setTransportData({
                  ...transportData,
                  returnType: v,
                  ...(v !== 'zbiorowy' ? { returnCity: '', returnTransportCityId: undefined } : {}),
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
              style={{ borderRadius: 0 }}
            >
              <option value="zbiorowy">Zbiorowy</option>
              <option value="wlasny">Własny</option>
            </select>
            {transportData.returnType === 'zbiorowy' && (
              transportCities.length > 0 ? (
                <select
                  value={transportData.returnCity}
                  onChange={(e) => {
                    const cityName = e.target.value;
                    const city = transportCities.find((c) => c.city === cityName);
                    setTransportData({
                      ...transportData,
                      returnCity: cityName,
                      returnTransportCityId: city?.id,
                    });
                  }}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                  style={{ borderRadius: 0 }}
                >
                  <option value="">Wybierz miasto powrotu</option>
                  {transportCities.map((c) => (
                    <option key={c.id ?? c.city} value={c.city}>
                      {c.city}
                      {c.return_price != null ? ` (${c.return_price.toFixed(2)} PLN)` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-2 text-sm text-gray-500">Brak transportu zbiorowego dla tego turnusu.</p>
              )
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
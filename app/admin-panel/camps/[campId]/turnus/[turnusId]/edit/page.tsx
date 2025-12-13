'use client';

import { ArrowLeft, Save, Calendar, MapPin, Truck, Copy, Search, Trash2, UtensilsCrossed, Tag, Shield } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';
import UniversalModal from '@/components/admin/UniversalModal';
import type { Camp, CampProperty, CampPropertyTransport, TransportCity } from '@/types/reservation';
import { authenticatedApiCall } from '@/utils/api-auth';

// Helper interface for transport city with defaults
interface TransportCityWithDefaults {
  city: string | null;
  departure_price: number | null;
  return_price: number | null;
}

// Helper function to get first city with defaults
const getFirstCity = (cities?: TransportCity[]): TransportCityWithDefaults => {
  const defaultCity: TransportCityWithDefaults = {
    city: null,
    departure_price: null,
    return_price: null,
  };

  if (!cities || cities.length === 0) {
    return defaultCity;
  }

  const firstCity = cities[0];
  return {
    city: firstCity.city || null,
    departure_price: firstCity.departure_price ?? null,
    return_price: firstCity.return_price ?? null,
  };
};

/**
 * Fetch camp by ID
 */
const fetchCampById = (id: number): Promise<Camp | null> => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
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
    .catch(_err => {
      console.error('[CampTurnusEditPage] Error fetching camp:', _err);
      throw _err;
    });
};

/**
 * Fetch camp property/turnus by camp ID and property ID
 * Uses GET /api/camps/{camp_id}/editions endpoint (backend still uses 'editions')
 */
const fetchCampProperty = (campId: number, propertyId: number): Promise<CampProperty | null> => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
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
    .catch(_err => {
      console.error('[CampTurnusEditPage] Error fetching camp property:', _err);
      throw _err;
    });
};

/**
 * Fetch diets assigned to a turnus
 */
const fetchTurnusDiets = async (campId: number, propertyId: number): Promise<any[]> => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
  try {
    const response = await fetch(`${API_BASE_URL}/api/camps/${campId}/properties/${propertyId}/diets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data || [];
  } catch (_err) {
    console.warn('[CampTurnusEditPage] Error fetching turnus diets:', _err);
    return [];
  }
};

/**
 * Fetch promotions assigned to a turnus
 */
const fetchTurnusPromotions = async (campId: number, propertyId: number): Promise<any[]> => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
  try {
    const response = await fetch(`${API_BASE_URL}/api/camps/${campId}/properties/${propertyId}/promotions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data || [];
  } catch (_err) {
    console.warn('[CampTurnusEditPage] Error fetching turnus promotions:', _err);
    return [];
  }
};

/**
 * Fetch protections assigned to a turnus
 */
const fetchTurnusProtections = async (campId: number, propertyId: number): Promise<any[]> => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
  try {
    const response = await fetch(`${API_BASE_URL}/api/camps/${campId}/properties/${propertyId}/protections`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data || [];
  } catch (_err) {
    console.warn('[CampTurnusEditPage] Error fetching turnus protections:', _err);
    return [];
  }
};

/**
 * Fetch transport settings for a camp property/turnus
 */
const fetchTransport = (campId: number, propertyId: number): Promise<CampPropertyTransport | null> => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
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
    .catch(_err => {
      // Network errors or other issues - log but return null (transport is optional)
      console.warn('[CampTurnusEditPage] Error fetching transport (will be created on save):', _err.message || _err);
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
  params,
}: {
  params: Promise<{ campId: string; turnusId: string }> | { campId: string; turnusId: string }
}) {
  const router = useRouter();
  // Handle both Promise and direct params (Next.js 13+ compatibility)
  const [campId, setCampId] = useState<number | null>(null);
  const [turnusId, setTurnusId] = useState<number | null>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';

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

  // Diets state
  const [turnusDiets, setTurnusDiets] = useState<any[]>([]);
  const [loadingDiets, setLoadingDiets] = useState(false);
  const [showAvailableDietsModal, setShowAvailableDietsModal] = useState(false);
  const [availableDiets, setAvailableDiets] = useState<any[]>([]);
  const [loadingAvailableDiets, setLoadingAvailableDiets] = useState(false);
  const [searchDietQuery, setSearchDietQuery] = useState('');
  const [showDeleteDietModal, setShowDeleteDietModal] = useState(false);
  const [dietToDelete, setDietToDelete] = useState<number | null>(null);
  const [isDeletingDiet, setIsDeletingDiet] = useState(false);

  // Promotions state
  const [turnusPromotions, setTurnusPromotions] = useState<any[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [showAvailablePromotionsModal, setShowAvailablePromotionsModal] = useState(false);
  const [availablePromotions, setAvailablePromotions] = useState<any[]>([]);
  const [loadingAvailablePromotions, setLoadingAvailablePromotions] = useState(false);
  const [searchPromotionQuery, setSearchPromotionQuery] = useState('');
  const [showDeletePromotionModal, setShowDeletePromotionModal] = useState(false);
  const [_promotionToDelete, setPromotionToDelete] = useState<number | null>(null);
  const [isDeletingPromotion, setIsDeletingPromotion] = useState(false);

  // Protections state
  const [turnusProtections, setTurnusProtections] = useState<any[]>([]);
  const [loadingProtections, setLoadingProtections] = useState(false);
  const [showAvailableProtectionsModal, setShowAvailableProtectionsModal] = useState(false);
  const [availableProtections, setAvailableProtections] = useState<any[]>([]);
  const [loadingAvailableProtections, setLoadingAvailableProtections] = useState(false);
  const [searchProtectionQuery, setSearchProtectionQuery] = useState('');
  const [showDeleteProtectionModal, setShowDeleteProtectionModal] = useState(false);
  const [_protectionToDelete, setProtectionToDelete] = useState<number | null>(null);
  const [isDeletingProtection, setIsDeletingProtection] = useState(false);

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
      } catch (_err) {
        console.error('[CampTurnusEditPage] Error resolving params:', _err);
        setError('Błąd podczas parsowania parametrów');
        setLoading(false);
      }
    };

    resolveParams();
  }, [params]);

  // Load camp, property and transport data
  useEffect(() => {
    if (campId && turnusId) {
        if (!campId || !turnusId) {
          setError('Invalid camp ID or turnus ID');
          setLoading(false);
          return;
        }

        Promise.all([
          fetchCampById(campId),
          fetchCampProperty(campId, turnusId),
          fetchTransport(campId, turnusId),
          fetchTurnusDiets(campId, turnusId),
          fetchTurnusPromotions(campId, turnusId),
          fetchTurnusProtections(campId, turnusId),
        ])
          .then(([campData, propertyData, transportData, dietsData, promotionsData, protectionsData]) => {
          setCamp(campData);
          setProperty(propertyData);

          console.log('[CampTurnusEditPage] Fetched diets data:', dietsData);
          console.log('[CampTurnusEditPage] Diets data length:', dietsData?.length || 0);

          // Set turnus diets immediately after fetching
          setTurnusDiets(dietsData || []);
          console.log('[CampTurnusEditPage] Set turnusDiets to:', dietsData || []);

          // Set turnus promotions immediately after fetching
          setTurnusPromotions(promotionsData || []);
          console.log('[CampTurnusEditPage] Set turnusPromotions to:', promotionsData || []);

          // Set turnus protections immediately after fetching
          setTurnusProtections(protectionsData || []);
          console.log('[CampTurnusEditPage] Set turnusProtections to:', protectionsData || []);

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
              const firstCity = getFirstCity(transportData.cities);
              const mappedTransport: CampPropertyTransport = {
                id: transportData.id,
                name: transportData.name || null,
                property_id: transportData.property_id || null,
                departure_type: transportData.departure_type,
                departure_city: firstCity.city,
                departure_collective_price: firstCity.departure_price,
                departure_own_price: null,
                return_type: transportData.return_type,
                return_city: firstCity.city,
                return_collective_price: firstCity.return_price,
                return_own_price: null,
              };
              setTransport(mappedTransport);
              console.log('[CampTurnusEditPage] Transport loaded and mapped:', mappedTransport);
            } else {
              setTransport(null);
            }

            console.log('[CampTurnusEditPage] Data loaded successfully:', { campId, turnusId, transportData, dietsData });
          }
          setLoading(false);
        })
        .catch(_err => {
          console.error('[CampTurnusEditPage] Error loading data:', _err);
          setError(_err instanceof Error ? _err.message : 'Błąd podczas ładowania danych');
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
    } catch (_err) {
      console.error('[CampTurnusEditPage] Error saving:', _err);
      setError(_err instanceof Error ? _err.message : 'Błąd podczas zapisywania turnusu obozu');
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

      // First, check if this turnus already has a transport assigned
      // If yes, unassign it before assigning the new one
      if (transport && transport.id && transport.id !== transportId) {
        console.warn('[CampTurnusEditPage] Unassigning previous transport:', transport.id);
        try {
          await authenticatedApiCall<CampPropertyTransport>(
            `/api/camps/transports/${transport.id}`,
            {
              method: 'PUT',
              body: JSON.stringify({
                property_id: null, // Unassign previous transport from this turnus
              }),
            },
          );
          console.warn('[CampTurnusEditPage] Previous transport unassigned');
        } catch (err) {
          console.warn('[CampTurnusEditPage] Error unassigning previous transport (continuing anyway):', err);
        }
      }

      // Assign transport to this turnus by setting property_id
      // Backend will automatically assign transport to the camp of this turnus
      const updatedTransport = await authenticatedApiCall<CampPropertyTransport>(
        `/api/camps/transports/${transportId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            property_id: turnusId, // Assign transport to this turnus
            // Backend automatically assigns transport to camp of this turnus
          }),
        },
      );

      // Reload transport data for this turnus to get the updated transport
      // This ensures we have the correct transport after assignment
      let mappedTransport: CampPropertyTransport | null = null;
      try {
        const transportData = await authenticatedApiCall<CampPropertyTransport>(
          `/api/camps/${campId}/properties/${turnusId}/transport`,
        );

        if (transportData) {
          // Map cities array to transport fields for display
          const firstCity = getFirstCity(transportData.cities);
          mappedTransport = {
            id: transportData.id,
            name: transportData.name || null,
            property_id: transportData.property_id || null,
            departure_type: transportData.departure_type,
            departure_city: firstCity.city,
            departure_collective_price: firstCity.departure_price,
            departure_own_price: null,
            return_type: transportData.return_type,
            return_city: firstCity.city,
            return_collective_price: firstCity.return_price,
            return_own_price: null,
          };
        }
      } catch (err) {
        console.warn('[CampTurnusEditPage] Error reloading transport (using updated transport):', err);
      }

      // Fallback to updatedTransport if reload failed
      if (!mappedTransport) {
        const firstCity = getFirstCity(updatedTransport.cities);
        mappedTransport = {
          id: updatedTransport.id,
          name: updatedTransport.name || null,
          property_id: updatedTransport.property_id || null,
          departure_type: updatedTransport.departure_type,
          departure_city: firstCity.city,
          departure_collective_price: firstCity.departure_price,
          departure_own_price: null,
          return_type: updatedTransport.return_type,
          return_city: firstCity.city,
          return_collective_price: firstCity.return_price,
          return_own_price: null,
        };
      }

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

      console.log('[CampTurnusEditPage] Removing transport:', { transportId: transport.id, campId });

      // First, get current transport to check existing camp_ids
      const currentTransport = await authenticatedApiCall<CampPropertyTransport>(
        `/api/camps/transports/${transport.id}`,
        {
          method: 'GET',
        },
      );

      console.log('[CampTurnusEditPage] Current transport:', currentTransport);

      // Unassign transport from this turnus by setting property_id to null
      // This will remove the transport from this turnus, but keep camp associations if transport is used by other turnuses
      const updatedTransport = await authenticatedApiCall<CampPropertyTransport>(
        `/api/camps/transports/${transport.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            property_id: null, // Unassign transport from this turnus
            // Note: Camp associations remain if transport is used by other turnuses
          }),
        },
      );

      console.log('[CampTurnusEditPage] Transport updated:', updatedTransport);

      // Reload transport data to ensure UI reflects the latest state
      // After unassigning, transport should not be returned by the API
      try {
        if (!campId || !turnusId) {
          console.warn('[CampTurnusEditPage] Cannot reload transport: campId or turnusId is null');
          return;
        }
        const reloadedTransport = await fetchTransport(campId, turnusId);
        if (reloadedTransport) {
          // If transport is still returned, map it
          const firstCity = getFirstCity(reloadedTransport.cities);
          const mappedTransport: CampPropertyTransport = {
            id: reloadedTransport.id,
            name: reloadedTransport.name || null,
            property_id: reloadedTransport.property_id || null,
            departure_type: reloadedTransport.departure_type,
            departure_city: firstCity.city,
            departure_collective_price: firstCity.departure_price,
            departure_own_price: null,
            return_type: reloadedTransport.return_type,
            return_city: firstCity.city,
            return_collective_price: firstCity.return_price,
            return_own_price: null,
          };
          setTransport(mappedTransport);
          console.warn('[CampTurnusEditPage] Transport still exists after unassignment:', mappedTransport);
        } else {
          // Transport was successfully removed
          setTransport(null);
          console.log('[CampTurnusEditPage] Transport successfully removed (not returned by API)');
        }
      } catch (reloadErr) {
        console.warn('[CampTurnusEditPage] Error reloading transport after removal:', reloadErr);
        // Assume transport was removed if reload fails
        setTransport(null);
      }

      setShowDeleteTransportModal(false);

      console.log('[CampTurnusEditPage] Transport unassigned successfully');
    } catch (err) {
      console.error('[CampTurnusEditPage] Error removing transport:', err);
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas usuwania przypisania transportu';
      setError(errorMessage);

      // Log additional details for debugging
      if (err instanceof Error) {
        console.error('[CampTurnusEditPage] Error details:', {
          message: err.message,
          stack: err.stack,
          transportId: transport?.id,
          campId: campId,
        });
      }
    } finally {
      setIsDeletingTransport(false);
    }
  };

  const getPeriodLabel = (period: string) => {
    return period === 'lato' ? 'Lato' : 'Zima';
  };

  // Fetch available diets (all center diets from the system)
  const fetchAvailableDiets = async () => {
    if (!campId || !turnusId) return;

    try {
      setLoadingAvailableDiets(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
      // Use regular fetch for public endpoint (no authentication required)
      // Fetch center diets (not general diets or diets table)
      const response = await fetch(`${API_BASE_URL}/api/center-diets/public`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Response is List[CenterDietResponse] - array of center diets
      const diets = Array.isArray(data) ? data : [];
      console.log('[CampTurnusEditPage] Fetched available center diets:', diets.length);
      setAvailableDiets(diets);
    } catch (err) {
      console.error('[CampTurnusEditPage] Error fetching available center diets:', err);
      setAvailableDiets([]);
    } finally {
      setLoadingAvailableDiets(false);
    }
  };

  const handleOpenAvailableDiets = async () => {
    setSearchDietQuery('');
    await fetchAvailableDiets();
    setShowAvailableDietsModal(true);
  };

  const handleSelectDiet = async (diet: any) => {
    console.log('[CampTurnusEditPage] handleSelectDiet called with:', { diet, campId, turnusId });

    if (!campId || !turnusId) {
      console.error('[CampTurnusEditPage] Missing campId or turnusId:', { campId, turnusId });
      setError('Brak ID obozu lub turnusu');
      return;
    }

    if (!diet || !diet.id) {
      console.error('[CampTurnusEditPage] Missing diet or diet.id:', diet);
      setError('Brak ID diety do przypisania');
      return;
    }

    try {
      setLoadingDiets(true);
      setError(null);
      console.log('[CampTurnusEditPage] Assigning diet to turnus:', { dietId: diet.id, campId, turnusId });

      // Assign diet to turnus
      const response = await authenticatedApiCall(
        `/api/camps/${campId}/properties/${turnusId}/diets/${diet.id}`,
        {
          method: 'POST',
        },
      );

      console.log('[CampTurnusEditPage] Diet assignment API call successful, response:', response);

      // Reload diets
      if (!campId || !turnusId) {
        console.error('[CampTurnusEditPage] Cannot reload diets: campId or turnusId is null');
        return;
      }
      const updatedDiets = await fetchTurnusDiets(campId, turnusId);
      console.log('[CampTurnusEditPage] Reloaded diets:', updatedDiets);
      setTurnusDiets(updatedDiets);

      setShowAvailableDietsModal(false);
      setSearchDietQuery('');
      console.log('[CampTurnusEditPage] Diet assigned successfully');
    } catch (err) {
      console.error('[CampTurnusEditPage] Error assigning diet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas przypisywania diety';
      setError(errorMessage);
      // Don't close modal on error so user can see the error and try again
    } finally {
      setLoadingDiets(false);
    }
  };

  const handleRemoveDiet = async () => {
    if (!dietToDelete || !campId || !turnusId) return;

    try {
      setIsDeletingDiet(true);
      setError(null);

      await authenticatedApiCall(
        `/api/camps/${campId}/properties/${turnusId}/diets/${dietToDelete}`,
        {
          method: 'DELETE',
        },
      );

      // Reload diets
      if (!campId || !turnusId) {
        console.error('[CampTurnusEditPage] Cannot reload diets: campId or turnusId is null');
        return;
      }
      const updatedDiets = await fetchTurnusDiets(campId, turnusId);
      setTurnusDiets(updatedDiets);

      setShowDeleteDietModal(false);
      setDietToDelete(null);
      console.log('[CampTurnusEditPage] Diet removed successfully');
    } catch (err) {
      console.error('[CampTurnusEditPage] Error removing diet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas usuwania przypisania diety';
      setError(errorMessage);
    } finally {
      setIsDeletingDiet(false);
    }
  };

  // Filter diets based on search query
  const filteredDiets = availableDiets.filter((diet) => {
    if (!searchDietQuery.trim()) return true;
    const query = searchDietQuery.toLowerCase();
    return (
      diet.display_name?.toLowerCase().includes(query) ||
      diet.name?.toLowerCase().includes(query) ||
      diet.description?.toLowerCase().includes(query)
    );
  });

  // Promotions functions
  const fetchAvailablePromotions = async () => {
    if (!campId || !turnusId) return;

    try {
      setLoadingAvailablePromotions(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
      const response = await fetch(`${API_BASE_URL}/api/center-promotions/public`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Response is List[CenterPromotionResponse] - array of center promotions
      const promotions = Array.isArray(data) ? data : [];
      console.log('[CampTurnusEditPage] Fetched available center promotions:', promotions.length);
      setAvailablePromotions(promotions);
    } catch (err) {
      console.error('[CampTurnusEditPage] Error fetching available center promotions:', err);
      setAvailablePromotions([]);
    } finally {
      setLoadingAvailablePromotions(false);
    }
  };

  const handleOpenAvailablePromotions = async () => {
    setSearchPromotionQuery('');
    await fetchAvailablePromotions();
    setShowAvailablePromotionsModal(true);
  };

  const handleSelectPromotion = async (promotion: any) => {
    console.log('[CampTurnusEditPage] handleSelectPromotion called with:', { promotion, campId, turnusId });

    if (!campId || !turnusId) {
      console.error('[CampTurnusEditPage] Missing campId or turnusId:', { campId, turnusId });
      setError('Brak ID obozu lub turnusu');
      return;
    }

    if (!promotion || !promotion.id) {
      console.error('[CampTurnusEditPage] Missing promotion or promotion.id:', promotion);
      setError('Brak ID promocji do przypisania');
      return;
    }

    try {
      setLoadingPromotions(true);
      setError(null);
      console.log('[CampTurnusEditPage] Assigning promotion to turnus:', { promotionId: promotion.id, campId, turnusId });

      // Assign promotion to turnus
      const response = await authenticatedApiCall(
        `/api/camps/${campId}/properties/${turnusId}/promotions/${promotion.id}`,
        {
          method: 'POST',
        },
      );

      console.log('[CampTurnusEditPage] Promotion assignment API call successful, response:', response);

      // Reload promotions
      if (!campId || !turnusId) {
        console.error('[CampTurnusEditPage] Cannot reload promotions: campId or turnusId is null');
        return;
      }
      const updatedPromotions = await fetchTurnusPromotions(campId, turnusId);
      console.log('[CampTurnusEditPage] Reloaded promotions:', updatedPromotions);
      setTurnusPromotions(updatedPromotions);

      setShowAvailablePromotionsModal(false);
      setSearchPromotionQuery('');
      console.log('[CampTurnusEditPage] Promotion assigned successfully');
    } catch (err) {
      console.error('[CampTurnusEditPage] Error assigning promotion:', err);
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas przypisywania promocji';
      setError(errorMessage);
    } finally {
      setLoadingPromotions(false);
    }
  };

  const handleRemoveAllPromotions = async () => {
    if (!campId || !turnusId || turnusPromotions.length === 0) return;

    try {
      setIsDeletingPromotion(true);
      setError(null);

      // Get unique center promotion IDs (one center promotion can have multiple general promotions)
      const uniqueCenterPromotionIds = new Set<number>();
      turnusPromotions.forEach(p => {
        if (p.center_promotion_id) {
          uniqueCenterPromotionIds.add(p.center_promotion_id);
        }
      });

      // Remove all center promotions assigned to this turnus
      for (const centerPromotionId of uniqueCenterPromotionIds) {
        await authenticatedApiCall(
          `/api/camps/${campId}/properties/${turnusId}/promotions/${centerPromotionId}`,
          {
            method: 'DELETE',
          },
        );
      }

      // Reload promotions
      const updatedPromotions = await fetchTurnusPromotions(campId, turnusId);
      setTurnusPromotions(updatedPromotions);

      setShowDeletePromotionModal(false);
      setPromotionToDelete(null);
      console.log('[CampTurnusEditPage] All promotions removed successfully');
    } catch (err) {
      console.error('[CampTurnusEditPage] Error removing promotions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas usuwania przypisania promocji';
      setError(errorMessage);
    } finally {
      setIsDeletingPromotion(false);
    }
  };

  // Filter promotions based on search query
  // Protections handlers
  const fetchAvailableProtections = async () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
    try {
      setLoadingAvailableProtections(true);
      const response = await fetch(`${API_BASE_URL}/api/center-protections/public`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const protections = Array.isArray(data) ? data : [];
      console.log('[CampTurnusEditPage] Fetched available center protections:', protections.length);
      setAvailableProtections(protections);
    } catch (err) {
      console.error('[CampTurnusEditPage] Error fetching available center protections:', err);
      setAvailableProtections([]);
    } finally {
      setLoadingAvailableProtections(false);
    }
  };

  const handleOpenAvailableProtections = async () => {
    setSearchProtectionQuery('');
    await fetchAvailableProtections();
    setShowAvailableProtectionsModal(true);
  };

  const handleSelectProtection = async (protection: any) => {
    console.log('[CampTurnusEditPage] handleSelectProtection called with:', { protection, campId, turnusId });

    if (!campId || !turnusId) {
      console.error('[CampTurnusEditPage] Missing campId or turnusId:', { campId, turnusId });
      setError('Brak ID obozu lub turnusu');
      return;
    }

    if (!protection || !protection.id) {
      console.error('[CampTurnusEditPage] Missing protection or protection.id:', protection);
      setError('Brak ID ochrony do przypisania');
      return;
    }

    try {
      setLoadingProtections(true);
      setError(null);
      console.log('[CampTurnusEditPage] Assigning protection to turnus:', { protectionId: protection.id, campId, turnusId });

      // Assign protection to turnus
      const response = await authenticatedApiCall(
        `/api/camps/${campId}/properties/${turnusId}/protections/${protection.id}`,
        {
          method: 'POST',
        },
      );

      console.log('[CampTurnusEditPage] Protection assignment API call successful, response:', response);

      // Reload protections
      if (!campId || !turnusId) {
        console.error('[CampTurnusEditPage] Cannot reload protections: campId or turnusId is null');
        return;
      }
      const updatedProtections = await fetchTurnusProtections(campId, turnusId);
      console.log('[CampTurnusEditPage] Reloaded protections:', updatedProtections);
      setTurnusProtections(updatedProtections);

      setShowAvailableProtectionsModal(false);
      setSearchProtectionQuery('');
      console.log('[CampTurnusEditPage] Protection assigned successfully');
    } catch (err) {
      console.error('[CampTurnusEditPage] Error assigning protection:', err);
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas przypisywania ochrony';
      setError(errorMessage);
    } finally {
      setLoadingProtections(false);
    }
  };

  const handleRemoveAllProtections = async () => {
    if (!campId || !turnusId || turnusProtections.length === 0) return;

    try {
      setIsDeletingProtection(true);
      setError(null);

      // Get unique center protection IDs
      const uniqueCenterProtectionIds = new Set<number>();
      turnusProtections.forEach(p => {
        if (p.center_protection_id) {
          uniqueCenterProtectionIds.add(p.center_protection_id);
        }
      });

      // Remove all center protections assigned to this turnus
      for (const centerProtectionId of uniqueCenterProtectionIds) {
        await authenticatedApiCall(
          `/api/camps/${campId}/properties/${turnusId}/protections/${centerProtectionId}`,
          {
            method: 'DELETE',
          },
        );
      }

      // Reload protections
      const updatedProtections = await fetchTurnusProtections(campId, turnusId);
      setTurnusProtections(updatedProtections);
      setShowDeleteProtectionModal(false);
    } catch (err) {
      console.error('[CampTurnusEditPage] Error removing protections:', err);
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas usuwania ochron';
      setError(errorMessage);
    } finally {
      setIsDeletingProtection(false);
    }
  };

  const filteredProtections = availableProtections.filter((protection) => {
    if (!searchProtectionQuery.trim()) return true;
    const query = searchProtectionQuery.toLowerCase();
    return (
      protection.name?.toLowerCase().includes(query) ||
      protection.display_name?.toLowerCase().includes(query) ||
      protection.description?.toLowerCase().includes(query)
    );
  });

  const filteredPromotions = availablePromotions.filter((promotion) => {
    if (!searchPromotionQuery.trim()) return true;
    const query = searchPromotionQuery.toLowerCase();
    return (
      promotion.display_name?.toLowerCase().includes(query) ||
      promotion.name?.toLowerCase().includes(query) ||
      promotion.description?.toLowerCase().includes(query)
    );
  });

  // Fetch available transports from other turnusy
  const fetchAvailableTransports = async () => {
    if (!campId || !turnusId) return;

    try {
      setLoadingAvailableTransports(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
      const response = await fetch(
        `${API_BASE_URL}/api/camps/${campId}/properties/${turnusId}/transport/available`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
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
        is_assigned_to_current_camp: t.is_assigned_to_current_camp,
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
      const firstCity = getFirstCity(selectedTransport.cities);
      const transportData: CampPropertyTransport = {
        id: selectedTransport.id,
        name: selectedTransport.name || null,
        property_id: turnusId || null,
        departure_type: selectedTransport.departure_type,
        departure_city: firstCity.city || selectedTransport.departure_city || null,
        departure_collective_price: firstCity.departure_price || selectedTransport.departure_collective_price || null,
        departure_own_price: null,
        return_type: selectedTransport.return_type,
        return_city: firstCity.city || selectedTransport.return_city || null,
        return_collective_price: firstCity.return_price || selectedTransport.return_collective_price || null,
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
      c.city?.toLowerCase().includes(query),
    ) || false;
    // Fallback to old structure
    const firstCity = getFirstCity(transport.cities);
    const departureCity = firstCity.city?.toLowerCase() || transport.departure_city?.toLowerCase() || '';
    const returnCity = firstCity.city?.toLowerCase() || transport.return_city?.toLowerCase() || '';
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
                  Brak przypisanego transportu. Kliknij &quot;Wybierz transport&quot;, aby przypisać transport do tego turnusu.
                </div>
              )}
            </div>

            {/* Dietary Prescriptions Section */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Dietary prescriptions</h2>
                </div>
                <button
                  onClick={handleOpenAvailableDiets}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#03adf0] border border-[#03adf0] hover:bg-[#E0F2FF] transition-all duration-200"
                  style={{ borderRadius: 0, cursor: 'pointer' }}
                  disabled={saving || loading || loadingDiets}
                  title="Wybierz z dostępnych diet"
                >
                  <Copy className="w-3 h-3" />
                  Wybierz dietę
                </button>
              </div>

              {/* Selected Diets Display */}
              {turnusDiets.length > 0 ? (
                <div className="space-y-3">
                  {turnusDiets.map((diet) => (
                    <div key={diet.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2">
                            {/* Display general diet name (not "Dieta dla ośrodka") */}
                            <h3 className="text-sm font-semibold text-gray-900">
                              {diet.name || 'Dieta bez nazwy'}
                            </h3>
                            {diet.has_no_relations && (
                              <p className="text-xs text-yellow-700 mt-1 font-medium bg-yellow-50 p-2 rounded">
                                ⚠️ Center diet przypisany, ale nie ma relacji z general diets.{' '}
                                <a
                                  href={`/admin-panel/diets/center`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#03adf0] hover:text-[#0299d6] underline font-semibold"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  Dodaj relacje w edycji center diet
                                </a>
                                , aby diety były widoczne w rezerwacji.
                              </p>
                            )}
                            {diet.description && (
                              <p className="text-xs text-gray-600 mt-1">{diet.description}</p>
                            )}
                            {/* Display price from relation (center-specific price) */}
                            {diet.price !== undefined && (
                              <p className="text-xs text-gray-700 mt-1 font-medium">
                                Cena: {diet.price.toFixed(2)} PLN
                                {diet.is_center_diet_relation && (
                                  <span className="text-gray-500 ml-1">(cena dla ośrodka)</span>
                                )}
                              </p>
                            )}
                            {/* Show icon if available */}
                            {diet.icon_url && (
                              <div className="mt-2">
                                <Image
                                  src={diet.icon_url}
                                  alt={diet.name || 'Dieta'}
                                  width={32}
                                  height={32}
                                  className="object-contain"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            // Use relation_id if available (for center diet relations), otherwise use diet.id
                            const dietIdToDelete = diet.relation_id || diet.id;
                            setDietToDelete(dietIdToDelete);
                            setShowDeleteDietModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 hover:bg-red-50 transition-all duration-200"
                          style={{ borderRadius: 0, cursor: 'pointer' }}
                          disabled={saving || loading || isDeletingDiet}
                          title={diet.is_center_diet_relation ? 'Usuń relację z center diet' : 'Usuń przypisanie diety'}
                        >
                          <Trash2 className="w-3 h-3" />
                          Usuń
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center text-sm">
            <p className="text-yellow-800 font-medium mb-1">
              Brak przypisanych diet do wyświetlenia
            </p>
            <p className="text-yellow-700 text-xs">
              Center diet może być przypisany do turnusu, ale nie ma relacji z general diets.
              <br />
              Aby diety były widoczne w rezerwacji, dodaj relacje z general diets w edycji center diet.
            </p>
            <button
              onClick={handleOpenAvailableDiets}
              className="mt-3 px-4 py-2 bg-[#03adf0] text-white text-sm font-medium hover:bg-[#0299d6] transition-all duration-200"
              style={{ borderRadius: 0 }}
              disabled={loading || saving || loadingDiets}
            >
              Wybierz dietę
            </button>
          </div>
        )}
            </div>

            {/* Promotions Section */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Promocje</h2>
                </div>
                <div className="flex items-center gap-2">
                  {turnusPromotions.length > 0 && (
                    <button
                      onClick={() => {
                        setShowDeletePromotionModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 hover:bg-red-50 transition-all duration-200"
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                      disabled={saving || loading || isDeletingPromotion}
                      title="Usuń wszystkie przypisane promocje"
                    >
                      <Trash2 className="w-3 h-3" />
                      Usuń
                    </button>
                  )}
                  <button
                    onClick={handleOpenAvailablePromotions}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#03adf0] border border-[#03adf0] hover:bg-[#E0F2FF] transition-all duration-200"
                    style={{ borderRadius: 0, cursor: 'pointer' }}
                    disabled={saving || loading || loadingPromotions}
                    title="Wybierz z dostępnych promocji"
                  >
                    <Copy className="w-3 h-3" />
                    Wybierz promocję
                  </button>
                </div>
              </div>

              {/* Selected Promotions Display */}
              {turnusPromotions.length > 0 ? (
                <div className="space-y-3">
                  {turnusPromotions.map((promotion) => {
                    // Skip promotions without relations (placeholders)
                    if (promotion.has_no_relations) {
                      return null;
                    }
                    return (
                      <div key={promotion.id || promotion.relation_id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start">
                          <div className="flex-1">
                            <div className="mb-2">
                              <h3 className="text-sm font-semibold text-gray-900">
                                {promotion.name || 'Promocja bez nazwy'}
                              </h3>
                              {promotion.description && (
                                <p className="text-xs text-gray-600 mt-1">{promotion.description}</p>
                              )}
                              {/* Display price from relation (center-specific price, can be negative) */}
                              {promotion.price !== undefined && (
                                <p className="text-xs text-gray-700 mt-1 font-medium">
                                  Cena: {promotion.price < 0
                                    ? `${promotion.price.toFixed(2)} PLN`
                                    : promotion.price > 0
                                      ? `+${promotion.price.toFixed(2)} PLN`
                                      : '0.00 PLN'
                                  }
                                  {promotion.is_center_promotion_relation && (
                                    <span className="text-gray-500 ml-1">(cena dla ośrodka)</span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center text-sm">
                  <p className="text-yellow-800 font-medium mb-1">
                    Brak przypisanych promocji do wyświetlenia
                  </p>
                  <p className="text-yellow-700 text-xs">
                    Center promotion może być przypisany do turnusu, ale nie ma relacji z general promotions.
                    <br />
                    Aby promocje były widoczne w rezerwacji, dodaj relacje z general promotions w edycji center promotion.
                  </p>
                  <button
                    onClick={handleOpenAvailablePromotions}
                    className="mt-3 px-4 py-2 bg-[#03adf0] text-white text-sm font-medium hover:bg-[#0299d6] transition-all duration-200"
                    style={{ borderRadius: 0 }}
                    disabled={loading || saving || loadingPromotions}
                  >
                    Wybierz promocję
                  </button>
                </div>
              )}
            </div>

            {/* Protections Section */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Ochrony</h2>
                </div>
                <div className="flex items-center gap-2">
                  {turnusProtections.length > 0 && (
                    <button
                      onClick={() => {
                        setShowDeleteProtectionModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 hover:bg-red-50 transition-all duration-200"
                      style={{ borderRadius: 0, cursor: 'pointer' }}
                      disabled={saving || loading || isDeletingProtection}
                      title="Usuń wszystkie przypisane ochrony"
                    >
                      <Trash2 className="w-3 h-3" />
                      Usuń
                    </button>
                  )}
                  <button
                    onClick={handleOpenAvailableProtections}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#03adf0] border border-[#03adf0] hover:bg-[#E0F2FF] transition-all duration-200"
                    style={{ borderRadius: 0, cursor: 'pointer' }}
                    disabled={saving || loading || loadingProtections}
                    title="Wybierz z dostępnych ochron"
                  >
                    <Copy className="w-3 h-3" />
                    Wybierz ochronę
                  </button>
                </div>
              </div>

              {/* Selected Protections Display */}
              {turnusProtections.length > 0 ? (
                <div className="space-y-3">
                  {turnusProtections.map((protection) => {
                    // Skip protections without relations (placeholders)
                    if (protection.has_no_relations) {
                      return null;
                    }
                    return (
                      <div key={protection.id || protection.relation_id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start">
                          <div className="flex-1">
                            <div className="mb-2">
                              <h3 className="text-sm font-semibold text-gray-900">
                                {protection.name || 'Ochrona bez nazwy'}
                              </h3>
                              {protection.description && (
                                <p className="text-xs text-gray-600 mt-1">{protection.description}</p>
                              )}
                              {/* Display price from relation (center-specific price) */}
                              {protection.price !== undefined && (
                                <p className="text-xs text-gray-700 mt-1 font-medium">
                                  Cena: {protection.price.toFixed(2)} PLN
                                  {protection.is_center_protection_relation && (
                                    <span className="text-gray-500 ml-1">(cena dla ośrodka)</span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center text-sm">
                  <p className="text-yellow-800 font-medium mb-1">
                    Brak przypisanych ochron do wyświetlenia
                  </p>
                  <p className="text-yellow-700 text-xs">
                    Center protection może być przypisany do turnusu, ale nie ma relacji z general protections.
                    <br />
                    Aby ochrony były widoczne w rezerwacji, dodaj relacje z general protections w edycji center protection.
                  </p>
                  <button
                    onClick={handleOpenAvailableProtections}
                    className="mt-3 px-4 py-2 bg-[#03adf0] text-white text-sm font-medium hover:bg-[#0299d6] transition-all duration-200"
                    style={{ borderRadius: 0 }}
                    disabled={loading || saving || loadingProtections}
                  >
                    Wybierz ochronę
                  </button>
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

          {/* Available Protections Modal */}
          <UniversalModal
            isOpen={showAvailableProtectionsModal}
            title="Wybierz z dostępnych ochron"
            onClose={() => {
              setShowAvailableProtectionsModal(false);
              setSearchProtectionQuery('');
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
                  value={searchProtectionQuery}
                  onChange={(e) => setSearchProtectionQuery(e.target.value)}
                  placeholder="Szukaj po nazwie ochrony..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingAvailableProtections ? (
                <div className="text-center text-gray-500 py-8">Ładowanie dostępnych ochron...</div>
              ) : filteredProtections.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {availableProtections.length === 0 ? (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Brak zadeklarowanych ochron</p>
                      <p className="text-xs text-gray-500">Nie znaleziono żadnych dostępnych ochron.</p>
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
                  {filteredProtections.map((protection) => (
                    <div
                      key={protection.id}
                      onClick={() => {
                        if (loadingProtections) return;
                        handleSelectProtection(protection);
                      }}
                      className={`p-4 border border-gray-200 hover:border-[#03adf0] hover:bg-[#E0F2FF] transition-all duration-200 cursor-pointer ${
                        loadingProtections ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 mb-1">
                            {protection.display_name || protection.name || 'Ochrona bez nazwy'}
                          </h3>
                          {protection.description && (
                            <p className="text-xs text-gray-600 mb-2">{protection.description}</p>
                          )}
                          {protection.general_protections && protection.general_protections.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-700 mb-1">Ochrony ogólne:</p>
                              <ul className="list-disc list-inside text-xs text-gray-600">
                                {protection.general_protections.map((rel: any) => (
                                  <li key={rel.id}>
                                    {rel.general_protection_name} - {rel.price.toFixed(2)} PLN
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <Copy className="w-4 h-4 text-[#03adf0] flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </UniversalModal>

          {/* Delete Protection Confirmation Modal */}
          <DeleteConfirmationModal
            isOpen={showDeleteProtectionModal}
            itemType="other"
            itemName={`wszystkie ochrony (${turnusProtections.length})`}
            itemId={0}
            onCancel={() => {
              setShowDeleteProtectionModal(false);
              setProtectionToDelete(null);
            }}
            onConfirm={handleRemoveAllProtections}
            isLoading={isDeletingProtection}
          />

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
        onCancel={() => setShowDeleteTransportModal(false)}
        onConfirm={handleRemoveTransport}
        itemType="transport"
        itemName={transport?.name || 'Transport'}
        itemId={transport?.id || 0}
        additionalInfo="Przypisanie transportu do tego turnusu zostanie usunięte. Transport pozostanie w systemie i będzie dostępny do przypisania do innych turnusów."
        isLoading={isDeletingTransport}
      />

      {/* Available Diets Modal */}
      <UniversalModal
        isOpen={showAvailableDietsModal}
        title="Wybierz z dostępnych diet"
        onClose={() => {
          setShowAvailableDietsModal(false);
          setSearchDietQuery('');
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
              value={searchDietQuery}
              onChange={(e) => setSearchDietQuery(e.target.value)}
              placeholder="Szukaj po nazwie diety..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm"
              style={{ borderRadius: 0 }}
            />
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingAvailableDiets ? (
            <div className="text-center text-gray-500 py-8">Ładowanie dostępnych diet...</div>
          ) : filteredDiets.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {availableDiets.length === 0 ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Brak dostępnych diet</p>
                  <p className="text-xs text-gray-500">Nie znaleziono żadnych dostępnych diet w systemie.</p>
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
              {filteredDiets.map((diet) => (
                <div
                  key={diet.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[CampTurnusEditPage] Diet clicked in modal:', diet);
                    handleSelectDiet(diet);
                  }}
                  className={`p-4 border border-gray-200 hover:border-[#03adf0] hover:bg-[#E0F2FF] transition-all duration-200 cursor-pointer ${
                    loadingDiets ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {diet.display_name || diet.name || 'Dieta bez nazwy'}
                      </h3>
                      {diet.description && (
                        <p className="text-xs text-gray-600 mb-1">{diet.description}</p>
                      )}
                      {diet.property_city && (
                        <p className="text-xs text-gray-500 mb-1">
                          Miejscowość: {diet.property_city}
                        </p>
                      )}
                      {diet.general_diets && diet.general_diets.length > 0 && (
                        <p className="text-xs text-gray-600 mb-1">
                          Powiązane diety: {diet.general_diets.map((gd: any) => gd.general_diet_name).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </UniversalModal>

      {/* Delete Diet Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteDietModal}
        onCancel={() => {
          setShowDeleteDietModal(false);
          setDietToDelete(null);
        }}
        onConfirm={handleRemoveDiet}
        itemType="diet"
        itemName={turnusDiets.find(d => d.id === dietToDelete)?.name || 'Dieta'}
        itemId={dietToDelete || 0}
        additionalInfo="Przypisanie diety do tego turnusu zostanie usunięte. Dieta pozostanie w systemie i będzie dostępna do przypisania do innych turnusów."
        isLoading={isDeletingDiet}
      />

      {/* Available Promotions Modal */}
      <UniversalModal
        isOpen={showAvailablePromotionsModal}
        title="Wybierz z dostępnych promocji"
        onClose={() => {
          setShowAvailablePromotionsModal(false);
          setSearchPromotionQuery('');
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
              value={searchPromotionQuery}
              onChange={(e) => setSearchPromotionQuery(e.target.value)}
              placeholder="Szukaj po nazwie promocji..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm"
              style={{ borderRadius: 0 }}
            />
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingAvailablePromotions ? (
            <div className="text-center text-gray-500 py-8">Ładowanie dostępnych promocji...</div>
          ) : filteredPromotions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {availablePromotions.length === 0 ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Brak dostępnych promocji</p>
                  <p className="text-xs text-gray-500">Nie znaleziono żadnych dostępnych promocji w systemie.</p>
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
              {filteredPromotions.map((promotion) => (
                <div
                  key={promotion.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[CampTurnusEditPage] Promotion clicked in modal:', promotion);
                    handleSelectPromotion(promotion);
                  }}
                  className={`p-4 border border-gray-200 hover:border-[#03adf0] hover:bg-[#E0F2FF] transition-all duration-200 cursor-pointer ${
                    loadingPromotions ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {promotion.display_name || promotion.name || 'Promocja bez nazwy'}
                      </h3>
                      {promotion.description && (
                        <p className="text-xs text-gray-600 mb-1">{promotion.description}</p>
                      )}
                      {promotion.property_city && (
                        <p className="text-xs text-gray-500 mb-1">
                          Miejscowość: {promotion.property_city}
                        </p>
                      )}
                      {promotion.general_promotions && promotion.general_promotions.length > 0 && (
                        <p className="text-xs text-gray-600 mb-1">
                          Powiązane promocje: {promotion.general_promotions.map((gp: any) => gp.general_promotion_name).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </UniversalModal>

      {/* Delete All Promotions Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeletePromotionModal}
        onCancel={() => {
          setShowDeletePromotionModal(false);
          setPromotionToDelete(null);
        }}
        onConfirm={handleRemoveAllPromotions}
        itemType="other"
        itemName={`wszystkie promocje (${turnusPromotions.length})`}
        itemId={0}
        additionalInfo="Wszystkie promocje przypisane do tego turnusu zostaną usunięte. Promocje pozostaną w systemie i będą dostępne do przypisania do innych turnusów."
        isLoading={isDeletingPromotion}
      />

    </AdminLayout>
  );
}

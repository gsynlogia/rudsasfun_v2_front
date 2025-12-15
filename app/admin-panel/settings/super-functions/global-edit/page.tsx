'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { ArrowLeft, Check, X, Truck, UtensilsCrossed, Tag, Shield, Search, Loader2, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/AuthService';
import { authenticatedApiCall } from '@/utils/api-auth';
import UniversalModal from '@/components/admin/UniversalModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rezerwacja.radsas-fun.pl';

interface CampProperty {
  id: number;
  camp_id: number;
  period: string;
  city: string;
  start_date: string;
  end_date: string;
  days_count: number;
  max_participants: number;
  use_default_diet?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

interface Camp {
  id: number;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
  properties: CampProperty[];
}

interface TurnusAssignmentStatus {
  turnusId: number;
  campId: number;
  campName: string;
  period: string;
  city: string;
  startDate: string;
  endDate: string;
  daysCount: number; // Number of days the turnus lasts
  hasTransport: boolean;
  hasDiets: boolean;
  hasPromotions: boolean;
  hasProtections: boolean;
}

/**
 * Admin Panel - Globalna edycja obozów i turnusów
 * Route: /admin-panel/settings/super-functions/global-edit
 * 
 * Global view for editing all turnuses - assign transport, diets, promotions, protections
 * Only accessible for user ID 0
 */
export default function GlobalEditPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [turnuses, setTurnuses] = useState<TurnusAssignmentStatus[]>([]);
  const [allTurnuses, setAllTurnuses] = useState<TurnusAssignmentStatus[]>([]); // Store all turnuses for filtering
  const [loadingTurnuses, setLoadingTurnuses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filterTransport, setFilterTransport] = useState<'all' | 'assigned' | 'not-assigned'>('all');
  const [filterDiet, setFilterDiet] = useState<'all' | 'assigned' | 'not-assigned'>('all');
  const [filterPromotion, setFilterPromotion] = useState<'all' | 'assigned' | 'not-assigned'>('all');
  const [filterProtection, setFilterProtection] = useState<'all' | 'assigned' | 'not-assigned'>('all');
  const [filterCity, setFilterCity] = useState<'all' | 'BEAVER' | 'LIMBA' | 'SAWA'>('all');

  // Modal states
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [showProtectionModal, setShowProtectionModal] = useState(false);
  
  // Selected turnus for assignment
  const [selectedTurnus, setSelectedTurnus] = useState<TurnusAssignmentStatus | null>(null);
  
  // Available items for selection
  const [availableTransports, setAvailableTransports] = useState<any[]>([]);
  const [availableDiets, setAvailableDiets] = useState<any[]>([]);
  const [availablePromotions, setAvailablePromotions] = useState<any[]>([]);
  const [availableProtections, setAvailableProtections] = useState<any[]>([]);
  
  // Loading states for modals
  const [loadingTransports, setLoadingTransports] = useState(false);
  const [loadingDiets, setLoadingDiets] = useState(false);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [loadingProtections, setLoadingProtections] = useState(false);
  
  // Assignment loading states
  const [assigningTransport, setAssigningTransport] = useState(false);
  const [assigningDiet, setAssigningDiet] = useState(false);
  const [assigningPromotion, setAssigningPromotion] = useState(false);
  const [assigningProtection, setAssigningProtection] = useState(false);
  
  // Search queries
  const [transportSearchQuery, setTransportSearchQuery] = useState('');
  const [dietSearchQuery, setDietSearchQuery] = useState('');
  const [promotionSearchQuery, setPromotionSearchQuery] = useState('');
  const [protectionSearchQuery, setProtectionSearchQuery] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        router.push('/admin-panel/login');
        return;
      }

      // Verify token and get user info
      const user = await authService.verifyToken();
      if (!user) {
        router.push('/admin-panel/login');
        return;
      }

      // Only user ID 0 can access
      if (user.id !== 0) {
        router.push('/admin-panel/settings');
        return;
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (isAuthorized) {
      loadAllTurnuses();
    }
  }, [isAuthorized]);

  const loadAllTurnuses = async () => {
    try {
      setLoadingTurnuses(true);
      setError(null);

      // Fetch all camps with properties
      const response = await fetch(`${API_BASE_URL}/api/camps/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const camps: Camp[] = data.camps || [];

      // Build list of all turnuses with assignment status
      const turnusList: TurnusAssignmentStatus[] = [];

      for (const camp of camps) {
        for (const property of camp.properties || []) {
          // Check transport
          let hasTransport = false;
          try {
            const transportResponse = await fetch(
              `${API_BASE_URL}/api/camps/${camp.id}/properties/${property.id}/transport`
            );
            if (transportResponse.ok) {
              const transportData = await transportResponse.json();
              hasTransport = transportData !== null && transportData.id !== undefined;
            }
          } catch (err) {
            console.warn(`Error checking transport for turnus ${property.id}:`, err);
          }

          // Check diets
          let hasDiets = false;
          try {
            const dietsResponse = await fetch(
              `${API_BASE_URL}/api/camps/${camp.id}/properties/${property.id}/diets`
            );
            if (dietsResponse.ok) {
              const dietsData = await dietsResponse.json();
              hasDiets = Array.isArray(dietsData) && dietsData.length > 0;
            }
          } catch (err) {
            console.warn(`Error checking diets for turnus ${property.id}:`, err);
          }

          // Check promotions that reduce price (exclude promotions with does_not_reduce_price=true)
          let hasPromotions = false;
          try {
            const promotionsResponse = await fetch(
              `${API_BASE_URL}/api/camps/${camp.id}/properties/${property.id}/promotions`
            );
            if (promotionsResponse.ok) {
              const promotionsData = await promotionsResponse.json();
              // Filter out promotions that don't reduce price (bony/vouchers)
              const priceReducingPromotions = Array.isArray(promotionsData) 
                ? promotionsData.filter((p: any) => !p.does_not_reduce_price)
                : [];
              hasPromotions = priceReducingPromotions.length > 0;
            }
          } catch (err) {
            console.warn(`Error checking promotions for turnus ${property.id}:`, err);
          }

          // Check protections
          let hasProtections = false;
          try {
            const protectionsResponse = await fetch(
              `${API_BASE_URL}/api/camps/${camp.id}/properties/${property.id}/protections`
            );
            if (protectionsResponse.ok) {
              const protectionsData = await protectionsResponse.json();
              hasProtections = Array.isArray(protectionsData) && protectionsData.length > 0;
            }
          } catch (err) {
            console.warn(`Error checking protections for turnus ${property.id}:`, err);
          }

          // Calculate days count: (end_date - start_date) + 1
          // Example: 27 to 30 = 4 days (27, 28, 29, 30)
          const startDateObj = new Date(property.start_date);
          const endDateObj = new Date(property.end_date);
          const daysCount = property.days_count || ((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;

          turnusList.push({
            turnusId: property.id,
            campId: camp.id,
            campName: camp.name,
            period: property.period,
            city: property.city,
            startDate: property.start_date,
            endDate: property.end_date,
            daysCount: Math.round(daysCount),
            hasTransport,
            hasDiets,
            hasPromotions,
            hasProtections,
          });
        }
      }

      setAllTurnuses(turnusList);
      setTurnuses(turnusList);
    } catch (err) {
      console.error('Error loading turnuses:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania turnusów');
    } finally {
      setLoadingTurnuses(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...allTurnuses];

    // Filter by transport
    if (filterTransport === 'assigned') {
      filtered = filtered.filter(t => t.hasTransport);
    } else if (filterTransport === 'not-assigned') {
      filtered = filtered.filter(t => !t.hasTransport);
    }

    // Filter by diet
    if (filterDiet === 'assigned') {
      filtered = filtered.filter(t => t.hasDiets);
    } else if (filterDiet === 'not-assigned') {
      filtered = filtered.filter(t => !t.hasDiets);
    }

    // Filter by promotion
    if (filterPromotion === 'assigned') {
      filtered = filtered.filter(t => t.hasPromotions);
    } else if (filterPromotion === 'not-assigned') {
      filtered = filtered.filter(t => !t.hasPromotions);
    }

    // Filter by protection
    if (filterProtection === 'assigned') {
      filtered = filtered.filter(t => t.hasProtections);
    } else if (filterProtection === 'not-assigned') {
      filtered = filtered.filter(t => !t.hasProtections);
    }

    // Filter by city
    if (filterCity !== 'all') {
      filtered = filtered.filter(t => t.city === filterCity);
    }

    setTurnuses(filtered);
  }, [allTurnuses, filterTransport, filterDiet, filterPromotion, filterProtection, filterCity]);

  // Fetch available transports
  const fetchAvailableTransports = async () => {
    try {
      setLoadingTransports(true);
      const response = await fetch(`${API_BASE_URL}/api/camps/transports/all`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAvailableTransports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching transports:', err);
      setAvailableTransports([]);
    } finally {
      setLoadingTransports(false);
    }
  };

  // Fetch available diets
  const fetchAvailableDiets = async () => {
    try {
      setLoadingDiets(true);
      const response = await fetch(`${API_BASE_URL}/api/center-diets/public`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAvailableDiets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching diets:', err);
      setAvailableDiets([]);
    } finally {
      setLoadingDiets(false);
    }
  };

  // Fetch available promotions
  const fetchAvailablePromotions = async () => {
    try {
      setLoadingPromotions(true);
      const response = await fetch(`${API_BASE_URL}/api/center-promotions/public`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAvailablePromotions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching promotions:', err);
      setAvailablePromotions([]);
    } finally {
      setLoadingPromotions(false);
    }
  };

  // Fetch available protections
  const fetchAvailableProtections = async () => {
    try {
      setLoadingProtections(true);
      const response = await fetch(`${API_BASE_URL}/api/center-protections/public`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAvailableProtections(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching protections:', err);
      setAvailableProtections([]);
    } finally {
      setLoadingProtections(false);
    }
  };

  // Open modals
  const handleOpenTransportModal = async (turnus: TurnusAssignmentStatus) => {
    setSelectedTurnus(turnus);
    setTransportSearchQuery('');
    await fetchAvailableTransports();
    setShowTransportModal(true);
  };

  const handleOpenDietModal = async (turnus: TurnusAssignmentStatus) => {
    setSelectedTurnus(turnus);
    setDietSearchQuery('');
    await fetchAvailableDiets();
    setShowDietModal(true);
  };

  const handleOpenPromotionModal = async (turnus: TurnusAssignmentStatus) => {
    setSelectedTurnus(turnus);
    setPromotionSearchQuery('');
    await fetchAvailablePromotions();
    setShowPromotionModal(true);
  };

  const handleOpenProtectionModal = async (turnus: TurnusAssignmentStatus) => {
    setSelectedTurnus(turnus);
    setProtectionSearchQuery('');
    await fetchAvailableProtections();
    setShowProtectionModal(true);
  };

  // Assign transport
  const handleAssignTransport = async (transportId: number) => {
    if (!selectedTurnus) return;

    try {
      setAssigningTransport(true);
      setError(null);

      // First, check if turnus already has a transport assigned
      const currentTransportResponse = await fetch(
        `${API_BASE_URL}/api/camps/${selectedTurnus.campId}/properties/${selectedTurnus.turnusId}/transport`
      );
      
      if (currentTransportResponse.ok) {
        const currentTransport = await currentTransportResponse.json();
        if (currentTransport && currentTransport.id && currentTransport.id !== transportId) {
          // Unassign previous transport
          await authenticatedApiCall(
            `/api/camps/transports/${currentTransport.id}`,
            {
              method: 'PUT',
              body: JSON.stringify({ property_id: null }),
            }
          );
        }
      }

      // Assign new transport
      await authenticatedApiCall(
        `/api/camps/transports/${transportId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ property_id: selectedTurnus.turnusId }),
        }
      );

      // Verify change in database
      const verifyResponse = await fetch(
        `${API_BASE_URL}/api/camps/${selectedTurnus.campId}/properties/${selectedTurnus.turnusId}/transport`
      );
      if (verifyResponse.ok) {
        const verifiedTransport = await verifyResponse.json();
        const isAssigned = verifiedTransport !== null && verifiedTransport.id !== undefined;
        console.log(`✅ Transport assignment verified in database for turnus ${selectedTurnus.turnusId}:`, isAssigned);
      }

      // Update local state without reloading page
      setAllTurnuses(prev => prev.map(t => 
        t.turnusId === selectedTurnus.turnusId 
          ? { ...t, hasTransport: true }
          : t
      ));

      setShowTransportModal(false);
      setSelectedTurnus(null);
    } catch (err) {
      console.error('Error assigning transport:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas przypisywania transportu');
    } finally {
      setAssigningTransport(false);
    }
  };

  // Assign diet
  const handleAssignDiet = async (dietId: number) => {
    if (!selectedTurnus) return;

    try {
      setAssigningDiet(true);
      setError(null);

      await authenticatedApiCall(
        `/api/camps/${selectedTurnus.campId}/properties/${selectedTurnus.turnusId}/diets/${dietId}`,
        {
          method: 'POST',
        }
      );

      // Verify change in database
      const verifyResponse = await fetch(
        `${API_BASE_URL}/api/camps/${selectedTurnus.campId}/properties/${selectedTurnus.turnusId}/diets`
      );
      if (verifyResponse.ok) {
        const verifiedDiets = await verifyResponse.json();
        const hasDiets = Array.isArray(verifiedDiets) && verifiedDiets.length > 0;
        console.log(`✅ Diet assignment verified in database for turnus ${selectedTurnus.turnusId}:`, hasDiets);
      }

      // Update local state without reloading page
      setAllTurnuses(prev => prev.map(t => 
        t.turnusId === selectedTurnus.turnusId 
          ? { ...t, hasDiets: true }
          : t
      ));

      setShowDietModal(false);
      setSelectedTurnus(null);
    } catch (err) {
      console.error('Error assigning diet:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas przypisywania diety');
    } finally {
      setAssigningDiet(false);
    }
  };

  // Assign promotion
  const handleAssignPromotion = async (promotionId: number) => {
    if (!selectedTurnus) return;

    try {
      setAssigningPromotion(true);
      setError(null);

      await authenticatedApiCall(
        `/api/camps/${selectedTurnus.campId}/properties/${selectedTurnus.turnusId}/promotions/${promotionId}`,
        {
          method: 'POST',
        }
      );

      // Verify change in database - check only price-reducing promotions
      const verifyResponse = await fetch(
        `${API_BASE_URL}/api/camps/${selectedTurnus.campId}/properties/${selectedTurnus.turnusId}/promotions`
      );
      if (verifyResponse.ok) {
        const verifiedPromotions = await verifyResponse.json();
        // Filter out promotions that don't reduce price (bony/vouchers)
        const priceReducingPromotions = Array.isArray(verifiedPromotions) 
          ? verifiedPromotions.filter((p: any) => !p.does_not_reduce_price)
          : [];
        const hasPromotions = priceReducingPromotions.length > 0;
        console.log(`✅ Promotion assignment verified in database for turnus ${selectedTurnus.turnusId}:`, hasPromotions);
        
        // Update local state without reloading page
        setAllTurnuses(prev => prev.map(t => 
          t.turnusId === selectedTurnus.turnusId 
            ? { ...t, hasPromotions }
            : t
        ));
      } else {
        // If verification fails, still update state optimistically
        setAllTurnuses(prev => prev.map(t => 
          t.turnusId === selectedTurnus.turnusId 
            ? { ...t, hasPromotions: true }
            : t
        ));
      }

      setShowPromotionModal(false);
      setSelectedTurnus(null);
    } catch (err) {
      console.error('Error assigning promotion:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas przypisywania promocji');
    } finally {
      setAssigningPromotion(false);
    }
  };

  // Assign protection
  const handleAssignProtection = async (protectionId: number) => {
    if (!selectedTurnus) return;

    try {
      setAssigningProtection(true);
      setError(null);

      await authenticatedApiCall(
        `/api/camps/${selectedTurnus.campId}/properties/${selectedTurnus.turnusId}/protections/${protectionId}`,
        {
          method: 'POST',
        }
      );

      // Verify change in database
      const verifyResponse = await fetch(
        `${API_BASE_URL}/api/camps/${selectedTurnus.campId}/properties/${selectedTurnus.turnusId}/protections`
      );
      if (verifyResponse.ok) {
        const verifiedProtections = await verifyResponse.json();
        const hasProtections = Array.isArray(verifiedProtections) && verifiedProtections.length > 0;
        console.log(`✅ Protection assignment verified in database for turnus ${selectedTurnus.turnusId}:`, hasProtections);
      }

      // Update local state without reloading page
      setAllTurnuses(prev => prev.map(t => 
        t.turnusId === selectedTurnus.turnusId 
          ? { ...t, hasProtections: true }
          : t
      ));

      setShowProtectionModal(false);
      setSelectedTurnus(null);
    } catch (err) {
      console.error('Error assigning protection:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas przypisywania ochrony');
    } finally {
      setAssigningProtection(false);
    }
  };

  // Filter functions
  const filteredTransports = availableTransports.filter((transport) => {
    if (!transportSearchQuery.trim()) return true;
    const query = transportSearchQuery.toLowerCase();
    return (
      transport.name?.toLowerCase().includes(query) ||
      transport.turnus_period?.toLowerCase().includes(query) ||
      transport.turnus_city?.toLowerCase().includes(query) ||
      transport.cities?.some((c: any) => c.city?.toLowerCase().includes(query))
    );
  });

  const filteredDiets = availableDiets.filter((diet) => {
    if (!dietSearchQuery.trim()) return true;
    const query = dietSearchQuery.toLowerCase();
    return (
      diet.display_name?.toLowerCase().includes(query) ||
      diet.name?.toLowerCase().includes(query) ||
      diet.description?.toLowerCase().includes(query)
    );
  });

  const filteredPromotions = availablePromotions.filter((promotion) => {
    if (!promotionSearchQuery.trim()) return true;
    const query = promotionSearchQuery.toLowerCase();
    return (
      promotion.display_name?.toLowerCase().includes(query) ||
      promotion.name?.toLowerCase().includes(query) ||
      promotion.description?.toLowerCase().includes(query)
    );
  });

  const filteredProtections = availableProtections.filter((protection) => {
    if (!protectionSearchQuery.trim()) return true;
    const query = protectionSearchQuery.toLowerCase();
    return (
      protection.display_name?.toLowerCase().includes(query) ||
      protection.name?.toLowerCase().includes(query) ||
      protection.description?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatDateRange = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startDay = start.getDate().toString().padStart(2, '0');
    const startMonth = (start.getMonth() + 1).toString().padStart(2, '0');
    const endDay = end.getDate().toString().padStart(2, '0');
    const endMonth = (end.getMonth() + 1).toString().padStart(2, '0');
    const year = end.getFullYear();
    return `${startDay}.${startMonth} - ${endDay}.${endMonth}.${year}`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="w-full flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
            <p className="mt-4 text-sm text-gray-600">Sprawdzanie autoryzacji...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="w-full">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link
            href="/admin-panel/settings/super-functions"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Powrót do super funkcji</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Globalna edycja obozów i turnusów
          </h1>
          <p className="text-sm text-gray-600">
            Przypisz transport, diety, promocje i ochrony do wszystkich turnusów w systemie
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Filters Section */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtry</h2>
          <div className="flex flex-wrap items-end gap-3">
            {/* Transport Filter */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Truck className="inline-block mr-1" size={14} />
                Transport
              </label>
              <select
                value={filterTransport}
                onChange={(e) => setFilterTransport(e.target.value as 'all' | 'assigned' | 'not-assigned')}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent min-w-[140px]"
              >
                <option value="all">Wszystkie</option>
                <option value="assigned">Z przypisanym transportem</option>
                <option value="not-assigned">Bez transportu</option>
              </select>
            </div>

            {/* Diet Filter */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <UtensilsCrossed className="inline-block mr-1" size={14} />
                Diety
              </label>
              <select
                value={filterDiet}
                onChange={(e) => setFilterDiet(e.target.value as 'all' | 'assigned' | 'not-assigned')}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent min-w-[140px]"
              >
                <option value="all">Wszystkie</option>
                <option value="assigned">Z przypisanymi dietami</option>
                <option value="not-assigned">Bez diet</option>
              </select>
            </div>

            {/* Promotion Filter */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Tag className="inline-block mr-1" size={14} />
                Promocje
              </label>
              <select
                value={filterPromotion}
                onChange={(e) => setFilterPromotion(e.target.value as 'all' | 'assigned' | 'not-assigned')}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent min-w-[140px]"
              >
                <option value="all">Wszystkie</option>
                <option value="assigned">Z przypisanymi promocjami</option>
                <option value="not-assigned">Bez promocji</option>
              </select>
            </div>

            {/* Protection Filter */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Shield className="inline-block mr-1" size={14} />
                Ochrony
              </label>
              <select
                value={filterProtection}
                onChange={(e) => setFilterProtection(e.target.value as 'all' | 'assigned' | 'not-assigned')}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent min-w-[140px]"
              >
                <option value="all">Wszystkie</option>
                <option value="assigned">Z przypisanymi ochronami</option>
                <option value="not-assigned">Bez ochron</option>
              </select>
            </div>

            {/* City Filter */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <MapPin className="inline-block mr-1" size={14} />
                Miasto
              </label>
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value as 'all' | 'BEAVER' | 'LIMBA' | 'SAWA')}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent min-w-[120px]"
              >
                <option value="all">Wszystkie</option>
                <option value="BEAVER">BEAVER</option>
                <option value="LIMBA">LIMBA</option>
                <option value="SAWA">SAWA</option>
              </select>
            </div>
          </div>
          
          {/* Active Filters Summary */}
          {(filterTransport !== 'all' || filterDiet !== 'all' || filterPromotion !== 'all' || filterProtection !== 'all' || filterCity !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Wyświetlanych turnusów: <span className="font-semibold text-gray-900">{turnuses.length}</span> z <span className="font-semibold text-gray-900">{allTurnuses.length}</span>
                </p>
                <button
                  onClick={() => {
                    setFilterTransport('all');
                    setFilterDiet('all');
                    setFilterPromotion('all');
                    setFilterProtection('all');
                    setFilterCity('all');
                  }}
                  className="text-sm text-[#03adf0] hover:text-[#0288c7] font-medium"
                >
                  Wyczyść wszystkie filtry
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loadingTurnuses ? (
          <div className="w-full flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
              <p className="mt-4 text-sm text-gray-600">Ładowanie turnusów...</p>
            </div>
          </div>
        ) : (
          /* Turnuses Table */
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oboz
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Okres
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Miasto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Daty (dni)
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transport
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diety
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Promocje
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ochrony
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {turnuses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                        Brak turnusów w systemie
                      </td>
                    </tr>
                  ) : (
                    turnuses.map((turnus) => (
                      <tr key={turnus.turnusId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {turnus.campName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {turnus.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {turnus.city}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <div>
                            <div>{formatDateRange(turnus.startDate, turnus.endDate)}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {turnus.daysCount} {turnus.daysCount === 1 ? 'dzień' : turnus.daysCount < 5 ? 'dni' : 'dni'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {turnus.hasTransport ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Check size={16} />
                              <span className="text-xs">OK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <X size={16} />
                              <span className="text-xs">Brak</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {turnus.hasDiets ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Check size={16} />
                              <span className="text-xs">OK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <X size={16} />
                              <span className="text-xs">Brak</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {turnus.hasPromotions ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Check size={16} />
                              <span className="text-xs">OK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <X size={16} />
                              <span className="text-xs">Brak</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {turnus.hasProtections ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Check size={16} />
                              <span className="text-xs">OK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <X size={16} />
                              <span className="text-xs">Brak</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenTransportModal(turnus)}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                                turnus.hasTransport
                                  ? 'text-green-700 bg-green-50 hover:bg-green-100'
                                  : 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                              }`}
                              title="Przypisz transport"
                            >
                              <Truck size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenDietModal(turnus)}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                                turnus.hasDiets
                                  ? 'text-green-700 bg-green-50 hover:bg-green-100'
                                  : 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                              }`}
                              title="Przypisz diety"
                            >
                              <UtensilsCrossed size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenPromotionModal(turnus)}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                                turnus.hasPromotions
                                  ? 'text-green-700 bg-green-50 hover:bg-green-100'
                                  : 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                              }`}
                              title="Przypisz promocje"
                            >
                              <Tag size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenProtectionModal(turnus)}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                                turnus.hasProtections
                                  ? 'text-green-700 bg-green-50 hover:bg-green-100'
                                  : 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                              }`}
                              title="Przypisz ochrony"
                            >
                              <Shield size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transport Selection Modal */}
        <UniversalModal
          isOpen={showTransportModal}
          onClose={() => setShowTransportModal(false)}
          title={`Przypisz transport - ${selectedTurnus?.campName} (${selectedTurnus?.period}, ${selectedTurnus?.city})`}
          maxWidth="lg"
        >
          <div className="p-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Szukaj transportu..."
                  value={transportSearchQuery}
                  onChange={(e) => setTransportSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                />
              </div>
            </div>
            {loadingTransports ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-[#03adf0]" size={24} />
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredTransports.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Brak dostępnych transportów</p>
                ) : (
                  filteredTransports.map((transport) => (
                    <button
                      key={transport.id}
                      onClick={() => handleAssignTransport(transport.id)}
                      disabled={assigningTransport}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#03adf0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{transport.name || 'Transport bez nazwy'}</p>
                          {transport.turnus_period && transport.turnus_city && (
                            <p className="text-sm text-gray-600">
                              {transport.turnus_period} - {transport.turnus_city}
                            </p>
                          )}
                        </div>
                        {assigningTransport && (
                          <Loader2 className="animate-spin text-[#03adf0]" size={16} />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </UniversalModal>

        {/* Diet Selection Modal */}
        <UniversalModal
          isOpen={showDietModal}
          onClose={() => setShowDietModal(false)}
          title={`Przypisz dietę - ${selectedTurnus?.campName} (${selectedTurnus?.period}, ${selectedTurnus?.city})`}
          maxWidth="lg"
        >
          <div className="p-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Szukaj diety..."
                  value={dietSearchQuery}
                  onChange={(e) => setDietSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                />
              </div>
            </div>
            {loadingDiets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-[#03adf0]" size={24} />
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredDiets.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Brak dostępnych diet</p>
                ) : (
                  filteredDiets.map((diet) => (
                    <button
                      key={diet.id}
                      onClick={() => handleAssignDiet(diet.id)}
                      disabled={assigningDiet}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#03adf0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {diet.display_name || diet.name || 'Dieta bez nazwy'}
                          </p>
                          {diet.description && (
                            <p className="text-sm text-gray-600 mt-1">{diet.description}</p>
                          )}
                        </div>
                        {assigningDiet && (
                          <Loader2 className="animate-spin text-[#03adf0]" size={16} />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </UniversalModal>

        {/* Promotion Selection Modal */}
        <UniversalModal
          isOpen={showPromotionModal}
          onClose={() => setShowPromotionModal(false)}
          title={`Przypisz promocję - ${selectedTurnus?.campName} (${selectedTurnus?.period}, ${selectedTurnus?.city})`}
          maxWidth="lg"
        >
          <div className="p-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Szukaj promocji..."
                  value={promotionSearchQuery}
                  onChange={(e) => setPromotionSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                />
              </div>
            </div>
            {loadingPromotions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-[#03adf0]" size={24} />
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredPromotions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Brak dostępnych promocji</p>
                ) : (
                  filteredPromotions.map((promotion) => (
                    <button
                      key={promotion.id}
                      onClick={() => handleAssignPromotion(promotion.id)}
                      disabled={assigningPromotion}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#03adf0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {promotion.display_name || promotion.name || 'Promocja bez nazwy'}
                          </p>
                          {promotion.description && (
                            <p className="text-sm text-gray-600 mt-1">{promotion.description}</p>
                          )}
                        </div>
                        {assigningPromotion && (
                          <Loader2 className="animate-spin text-[#03adf0]" size={16} />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </UniversalModal>

        {/* Protection Selection Modal */}
        <UniversalModal
          isOpen={showProtectionModal}
          onClose={() => setShowProtectionModal(false)}
          title={`Przypisz ochronę - ${selectedTurnus?.campName} (${selectedTurnus?.period}, ${selectedTurnus?.city})`}
          maxWidth="lg"
        >
          <div className="p-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Szukaj ochrony..."
                  value={protectionSearchQuery}
                  onChange={(e) => setProtectionSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03adf0] focus:border-transparent"
                />
              </div>
            </div>
            {loadingProtections ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-[#03adf0]" size={24} />
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredProtections.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Brak dostępnych ochron</p>
                ) : (
                  filteredProtections.map((protection) => (
                    <button
                      key={protection.id}
                      onClick={() => handleAssignProtection(protection.id)}
                      disabled={assigningProtection}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#03adf0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {protection.display_name || protection.name || 'Ochrona bez nazwy'}
                          </p>
                          {protection.description && (
                            <p className="text-sm text-gray-600 mt-1">{protection.description}</p>
                          )}
                        </div>
                        {assigningProtection && (
                          <Loader2 className="animate-spin text-[#03adf0]" size={16} />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </UniversalModal>
      </div>
    </AdminLayout>
  );
}

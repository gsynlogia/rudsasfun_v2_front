'use client';

import { Info, Download } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { useReservation } from '@/context/ReservationContext';
import { API_BASE_URL } from '@/utils/api-config';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';

interface Promotion {
  id: number;
  general_promotion_id?: number;
  center_promotion_id?: number;
  name: string;
  price: number; // Can be negative
  description?: string;
  is_center_promotion_relation?: boolean;
  relation_id?: number;
  does_not_reduce_price?: boolean; // If true, promotion does not reduce camp price (e.g., vouchers/bons)
}

/**
 * Sort promotions by specified order based on name matching
 */
function sortPromotionsByOrder(promotions: Promotion[]): Promotion[] {
  const orderMap: Record<string, number> = {
    'first minute': 1,
    'rodzeństwo razem': 2,
    'obozy na maxa': 3,
    'duża rodzina': 4,
    'bon brązowy': 5,
    'bon srebrny': 6,
    'bon złoty': 7,
    'bon platynowy': 8,
  };

  return [...promotions].sort((a, b) => {
    const nameA = a.name.toLowerCase().trim();
    const nameB = b.name.toLowerCase().trim();

    let orderA = 999; // Default for unknown promotions
    let orderB = 999;

    // Check if name contains any of the order keys
    for (const [key, order] of Object.entries(orderMap)) {
      if (nameA.includes(key)) {
        orderA = order;
        break;
      }
    }

    for (const [key, order] of Object.entries(orderMap)) {
      if (nameB.includes(key)) {
        orderB = order;
        break;
      }
    }

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // If same order, maintain original order (stable sort)
    return 0;
  });
}

/**
 * PromotionsSection Component
 * Displays promotions from API for the selected turnus with justification fields
 */
export default function PromotionsSection() {
  const { reservation, addReservationItem, removeReservationItemsByType } = useReservation();
  const pathname = usePathname();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string>('');
  const [promotionJustification, setPromotionJustification] = useState<Record<string, any>>({});
  const prevPromotionRef = useRef<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [promotionDocumentUrl, setPromotionDocumentUrl] = useState<string | null>(null);

  // Extract camp_id and property_id from URL (similar to Step5)
  const getCampIds = (): { campId: number | null; propertyId: number | null } => {
    const pathParts = pathname.split('/').filter(Boolean);
    const campIdIndex = pathParts.indexOf('camps');
    if (campIdIndex !== -1 && campIdIndex + 1 < pathParts.length) {
      const campId = parseInt(pathParts[campIdIndex + 1], 10);
      const propertyId = campIdIndex + 3 < pathParts.length
        ? parseInt(pathParts[campIdIndex + 3], 10)
        : null;
      return {
        campId: !isNaN(campId) ? campId : null,
        propertyId: propertyId && !isNaN(propertyId) ? propertyId : null,
      };
    }
    return { campId: null, propertyId: null };
  };

  // Determine promotion type from name (for justification requirements)
  const getPromotionType = (promotionName: string): string => {
    const nameLower = promotionName.toLowerCase();
    if (nameLower.includes('duża rodzina') || nameLower.includes('duza rodzina')) return 'duza_rodzina';
    if (nameLower.includes('rodzeństwo razem') || nameLower.includes('rodzenstwo razem')) return 'rodzenstwo_razem';
    if (nameLower.includes('obozy na maxa') || nameLower.includes('obozy na max')) return 'obozy_na_maxa';
    if (nameLower.includes('first minute') || nameLower.includes('wczesna rezerwacja')) return 'first_minute';
    if (nameLower.includes('bonowych') || nameLower.includes('bonowa')) return 'bonowych';
    return 'other';
  };

  // Check if promotion requires justification
  const requiresJustification = (promotionName: string): boolean => {
    const type = getPromotionType(promotionName);
    return ['duza_rodzina', 'rodzenstwo_razem', 'obozy_na_maxa', 'first_minute', 'bonowych'].includes(type);
  };

  // Fetch promotions for the selected turnus
  useEffect(() => {
    const fetchPromotions = async () => {
      const { campId, propertyId } = getCampIds();

      if (!campId || !propertyId) {
        setPromotions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `${API_BASE_URL}/api/camps/${campId}/properties/${propertyId}/promotions?check_usage=false`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            setPromotions([]);
            setLoading(false);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const promotionsList = Array.isArray(data) ? data : [];
        const sortedPromotions = sortPromotionsByOrder(promotionsList);
        setPromotions(sortedPromotions);
        console.log('[PromotionsSection] Fetched promotions:', sortedPromotions.length, sortedPromotions);
      } catch (err) {
        console.error('[PromotionsSection] Error fetching promotions:', err);
        setError('Nie udało się załadować promocji');
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, [pathname]);

  // Fetch public documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/documents/public`);
        if (!response.ok) return;
        const data = await response.json();
        const doc = (data.documents || []).find((d: { name: string }) => d.name === 'promotion_regulation');
        if (doc && doc.file_url) {
          setPromotionDocumentUrl(doc.file_url);
        }
      } catch (err) {
        console.error('[PromotionsSection] Error fetching documents:', err);
      }
    };
    fetchDocuments();
  }, []);

  // Load data from sessionStorage on mount
  useEffect(() => {
    const syncData = () => {
      const savedData = loadStep2FormData();
      if (savedData && savedData.selectedPromotion) {
        setSelectedPromotionId(savedData.selectedPromotion);
        prevPromotionRef.current = savedData.selectedPromotion;
      }
      if (savedData && savedData.promotionJustification) {
        setPromotionJustification(savedData.promotionJustification || {});
      }
    };
    
    syncData();
    setIsInitialized(true);
    
    // Listen for fake data loaded event
    const handleFakeDataLoaded = () => {
      setTimeout(syncData, 100); // Small delay to ensure sessionStorage is updated
    };
    window.addEventListener('fakeDataLoaded', handleFakeDataLoaded);
    
    return () => {
      window.removeEventListener('fakeDataLoaded', handleFakeDataLoaded);
    };
  }, []);

  // Update reservation when promotion changes
  useEffect(() => {
    if (!isInitialized || prevPromotionRef.current === selectedPromotionId) return;

    // Remove previous promotion
    removeReservationItemsByType('promotion');

    // Add new promotion if selected
    if (selectedPromotionId) {
      const selectedPromotion = promotions.find(
        p => String(p.id || p.relation_id) === selectedPromotionId,
      );

      if (selectedPromotion) {
        const displayName = selectedPromotion.name;
        const { price, does_not_reduce_price } = selectedPromotion;

        // Add promotion to reservation items
        // If does_not_reduce_price is true, set price to 0 so it doesn't affect total price
        addReservationItem({
          name: displayName,
          price: does_not_reduce_price ? 0 : price,
          type: 'promotion',
          // Store original price and flag in item metadata for display purposes
          metadata: {
            originalPrice: price,
            doesNotReducePrice: does_not_reduce_price || false,
          },
        });
      }
    }

    prevPromotionRef.current = selectedPromotionId;
  }, [selectedPromotionId, promotions, isInitialized, addReservationItem, removeReservationItemsByType]);

  // Save to sessionStorage whenever promotion or justification changes
  useEffect(() => {
    if (!isInitialized) return;
    const savedData = loadStep2FormData();
    const formData = {
      ...savedData,
      selectedPromotion: selectedPromotionId,
      promotionJustification: promotionJustification,
    };
    saveStep2FormData(formData as any);
  }, [selectedPromotionId, promotionJustification, isInitialized]);

  const selectedPromotion = promotions.find(
    p => String(p.id || p.relation_id) === selectedPromotionId,
  );

  const promotionType = selectedPromotion ? getPromotionType(selectedPromotion.name) : null;

  // Auto-fill justification for First Minute promotion
  useEffect(() => {
    if (selectedPromotion && promotionType === 'first_minute') {
      // Automatically fill reason for First Minute promotion
      setPromotionJustification((prev) => {
        if (!prev.reason || prev.reason.trim() === '') {
          return {
            ...prev,
            reason: 'Promocja - First Minute',
          };
        }
        return prev;
      });
    }
  }, [selectedPromotion, promotionType]);

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Promocje
      </h2>
      <section className="bg-white p-4 sm:p-6">
        {loading ? (
          <div className="text-center text-gray-500 py-4">Ładowanie promocji...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-4">{error}</div>
        ) : promotions.length === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-sm text-red-800 font-medium">
              Brak promocji dla tego turnusu
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Wybierz promocję, która Ci przysługuje
              </label>
              <select
                value={selectedPromotionId}
                onChange={(e) => {
                  setSelectedPromotionId(e.target.value);
                  // Reset justification when promotion changes
                  if (!e.target.value) {
                    setPromotionJustification({});
                  } else {
                    // Keep existing justification if switching between promotions
                    // Only reset if switching to empty
                  }
                }}
                className="w-full px-3 sm:px-4 py-2 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] pr-8 sm:pr-10"
              >
                <option value="">Brak promocji</option>
                {promotions.map((promo) => (
                  <option key={promo.id || promo.relation_id} value={String(promo.id || promo.relation_id)}>
                    {promo.name} {promo.price < 0
                      ? `${promo.price.toFixed(2)} PLN`
                      : promo.price > 0
                        ? `+${promo.price.toFixed(2)} PLN`
                        : '0.00 PLN'
                    }
                  </option>
                ))}
              </select>
            </div>

            {/* Justification fields based on promotion type */}
            {selectedPromotion && requiresJustification(selectedPromotion.name) && (
              <div className={`mb-4 sm:mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${promotionType === 'first_minute' ? 'hidden' : ''}`}>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Uzasadnienie promocji *
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Wypełnij poniższe pola, aby uzasadnić wybór tej promocji.
                </p>

                {promotionType === 'duza_rodzina' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Numer karty dużej rodziny *
                    </label>
                    <input
                      type="text"
                      value={promotionJustification.card_number || ''}
                      onChange={(e) => setPromotionJustification({
                        ...promotionJustification,
                        card_number: e.target.value,
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      placeholder="Wpisz numer karty dużej rodziny"
                      required
                    />
                    {!promotionJustification.card_number?.trim() && (
                      <p className="text-xs text-red-600 mt-1">To pole jest wymagane</p>
                    )}
                  </div>
                )}

                {promotionType === 'rodzenstwo_razem' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Imię rodzeństwa *
                      </label>
                      <input
                        type="text"
                        value={promotionJustification.sibling_first_name || ''}
                        onChange={(e) => setPromotionJustification({
                          ...promotionJustification,
                          sibling_first_name: e.target.value,
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        placeholder="Wpisz imię rodzeństwa"
                        required
                      />
                      {!promotionJustification.sibling_first_name?.trim() && (
                        <p className="text-xs text-red-600 mt-1">To pole jest wymagane</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Nazwisko rodzeństwa *
                      </label>
                      <input
                        type="text"
                        value={promotionJustification.sibling_last_name || ''}
                        onChange={(e) => setPromotionJustification({
                          ...promotionJustification,
                          sibling_last_name: e.target.value,
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        placeholder="Wpisz nazwisko rodzeństwa"
                        required
                      />
                      {!promotionJustification.sibling_last_name?.trim() && (
                        <p className="text-xs text-red-600 mt-1">To pole jest wymagane</p>
                      )}
                    </div>
                  </div>
                )}

                {promotionType === 'obozy_na_maxa' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Data pierwszego obozu
                      </label>
                      <input
                        type="date"
                        value={promotionJustification.first_camp_date || ''}
                        onChange={(e) => setPromotionJustification({
                          ...promotionJustification,
                          first_camp_date: e.target.value,
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Nazwa pierwszego obozu
                      </label>
                      <input
                        type="text"
                        value={promotionJustification.first_camp_name || ''}
                        onChange={(e) => setPromotionJustification({
                          ...promotionJustification,
                          first_camp_name: e.target.value,
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        placeholder="Wpisz nazwę pierwszego obozu"
                      />
                    </div>
                    {!promotionJustification.first_camp_date && !promotionJustification.first_camp_name?.trim() && (
                      <p className="text-xs text-red-600 mt-1">Wypełnij przynajmniej jedno pole (data lub nazwa obozu)</p>
                    )}
                  </div>
                )}

                {promotionType === 'first_minute' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Powód wyboru promocji *
                    </label>
                    <textarea
                      value={promotionJustification.reason || ''}
                      onChange={(e) => setPromotionJustification({
                        ...promotionJustification,
                        reason: e.target.value,
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      rows={3}
                      placeholder="Wpisz powód wyboru promocji First Minute"
                      required
                    />
                    {!promotionJustification.reason?.trim() && (
                      <p className="text-xs text-red-600 mt-1">To pole jest wymagane</p>
                    )}
                  </div>
                )}

                {promotionType === 'bonowych' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Lata uczestnictwa w obozach *
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(promotionJustification.years)
                        ? promotionJustification.years.join(', ')
                        : promotionJustification.years || ''
                      }
                      onChange={(e) => {
                        const yearsStr = e.target.value;
                        const years = yearsStr.split(',').map(y => y.trim()).filter(y => y);
                        setPromotionJustification({
                          ...promotionJustification,
                          years: years,
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      placeholder="Wpisz lata uczestnictwa (np. 2023, 2024, 2025)"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Wpisz lata oddzielone przecinkami (np. 2023, 2024, 2025)
                    </p>
                    {(!promotionJustification.years || (Array.isArray(promotionJustification.years) && promotionJustification.years.length === 0)) && (
                      <p className="text-xs text-red-600 mt-1">To pole jest wymagane</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Information block */}
            <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg mb-4 sm:mb-6">
              <Info className="w-5 h-5 text-[#03adf0] flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-gray-600">
                Promocje nie łączą się. Możesz wybrać tylko jedną promocję.
              </p>
            </div>

            {/* Regulation button */}
            {promotionDocumentUrl && (
              <button
                onClick={() => window.open(promotionDocumentUrl, '_blank')}
                className="flex items-center gap-2 px-4 sm:px-6 py-2 border-2 border-[#03adf0] text-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-colors text-xs sm:text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Regulamin promocji
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

'use client';

import { Info, UtensilsCrossed } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { useReservation } from '@/context/ReservationContext';
import type { ReservationItem } from '@/types/reservation';
import { API_BASE_URL, getStaticAssetUrl } from '@/utils/api-config';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';

interface Diet {
  id: number;
  name: string;
  price: number;
  description?: string | null;
  icon_url?: string | null;
  is_active: boolean;
}

/**
 * DietSection Component
 * Displays diet selection with tiles (from database)
 */
export default function DietSection() {
  const { reservation, addReservationItem, removeReservationItem } = useReservation();

  // Initialize with data from sessionStorage if available
  const getInitialSelectedDiets = (): Set<number> => {
    if (typeof window === 'undefined') return new Set();
    const savedData = loadStep2FormData();
    if (savedData && savedData.selectedDiets && Array.isArray(savedData.selectedDiets)) {
      return new Set(savedData.selectedDiets);
    }
    return new Set();
  };

  const [selectedDiets, setSelectedDiets] = useState<Set<number>>(getInitialSelectedDiets);
  const [diets, setDiets] = useState<Diet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dietReservationIdsRef = useRef<Map<number, string>>(new Map()); // Map: dietId -> reservationItemId

  // Fetch diets from API
  useEffect(() => {
    const fetchDiets = async () => {
      try {
        setLoading(true);
        setError(null);
        // Public endpoint - no authentication required
        const response = await fetch(`${API_BASE_URL}/api/diets/public`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setDiets(data.diets || []);
      } catch (err) {
        console.error('[DietSection] Error fetching diets:', err);
        setError('Nie udało się załadować diet');
        setDiets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDiets();
  }, []);

  const [isInitialized, setIsInitialized] = useState(false);

  // Sync with sessionStorage on mount
  useEffect(() => {
    const savedData = loadStep2FormData();
    if (savedData && savedData.selectedDiets && Array.isArray(savedData.selectedDiets)) {
      const savedSet = new Set(savedData.selectedDiets);
      const currentArray = Array.from(selectedDiets).sort();
      const savedArray = Array.from(savedSet).sort();
      if (JSON.stringify(currentArray) !== JSON.stringify(savedArray)) {
        setSelectedDiets(savedSet);
      }
    }
    setIsInitialized(true);
  }, []);

  // Restore reservation items when initialized and reservation is available
  useEffect(() => {
    if (!isInitialized || diets.length === 0) return;

    const savedData = loadStep2FormData();
    const dietsToRestore = savedData && savedData.selectedDiets && Array.isArray(savedData.selectedDiets)
      ? Array.from(savedData.selectedDiets)
      : [];

    // Restore reservation items for diets
    dietsToRestore.forEach(dietId => {
      const diet = diets.find(d => d.id === dietId);
      if (diet) {
        const reservationId = `diet-${dietId}`;

        // Check if already exists in reservation
        const existing = reservation.items.find(
          (item: ReservationItem) => item.type === 'diet' && item.name === diet.name,
        );
        if (!existing) {
          dietReservationIdsRef.current.set(dietId, reservationId);
          addReservationItem({
            name: diet.name,
            price: diet.price,
            type: 'diet',
          }, reservationId);
        } else {
          // Update mapping with existing ID
          dietReservationIdsRef.current.set(dietId, existing.id);
        }
      }
    });

  }, [isInitialized, diets.length, reservation.items.length]);

  // Update reservation when diets change
  useEffect(() => {
    if (!isInitialized || diets.length === 0) return;

    const currentDietIds = new Set(selectedDiets);
    const previousDietIds = new Set(dietReservationIdsRef.current.keys());

    // Find added and removed diets
    const added = Array.from(currentDietIds).filter(id => !previousDietIds.has(id));
    const removed = Array.from(previousDietIds).filter(id => !currentDietIds.has(id));

    // Remove removed diets from reservation
    removed.forEach(dietId => {
      const reservationId = dietReservationIdsRef.current.get(dietId);
      if (reservationId) {
        const item = reservation.items.find((item: ReservationItem) => item.id === reservationId);
        if (item) {
          removeReservationItem(item.id);
        } else {
          const diet = diets.find(d => d.id === dietId);
          if (diet) {
            const itemByName = reservation.items.find(
              (item: ReservationItem) => item.type === 'diet' && item.name === diet.name,
            );
            if (itemByName) {
              removeReservationItem(itemByName.id);
            }
          }
        }
        dietReservationIdsRef.current.delete(dietId);
      }
    });

    // Add new diets to reservation
    added.forEach(dietId => {
      const diet = diets.find(d => d.id === dietId);
      if (diet) {
        const reservationId = `diet-${dietId}`;

        const existingItem = reservation.items.find((item: ReservationItem) => item.id === reservationId);

        if (!existingItem) {
          dietReservationIdsRef.current.set(dietId, reservationId);
          addReservationItem({
            name: diet.name,
            price: diet.price,
            type: 'diet',
          }, reservationId);
        } else {
          dietReservationIdsRef.current.set(dietId, existingItem.id);
        }
      }
    });
  }, [selectedDiets, addReservationItem, removeReservationItem, diets, reservation.items, isInitialized]);

  // Save to sessionStorage whenever diets change
  useEffect(() => {
    if (!isInitialized) return;

    const savedData = loadStep2FormData();
    const formData = {
      selectedAddons: savedData?.selectedAddons || [],
      selectedProtection: Array.isArray(savedData?.selectedProtection)
        ? savedData.selectedProtection
        : (savedData?.selectedProtection ? [savedData.selectedProtection] : []),
      selectedPromotion: savedData?.selectedPromotion || '',
      promotionJustification: savedData?.promotionJustification || {}, // Preserve promotion justification
      transportData: savedData?.transportData || {
        departureType: '',
        departureCity: '',
        returnType: '',
        returnCity: '',
      },
      selectedSource: savedData?.selectedSource || '',
      inneText: savedData?.inneText || '',
      selectedDiets: Array.from(selectedDiets),
    };
    saveStep2FormData(formData);
  }, [selectedDiets, isInitialized]);

  const toggleDiet = (dietId: number) => {
    setSelectedDiets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dietId)) {
        newSet.delete(dietId);
      } else {
        newSet.add(dietId);
      }
      return newSet;
    });
  };

  // Filter only active diets
  const activeDiets = diets.filter(diet => diet.is_active);

  if (loading) {
    return (
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Diety
        </h2>
        <section className="bg-white p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600">Ładowanie diet...</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Diety
        </h2>
        <section className="bg-white p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-red-600">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Diety
      </h2>
      <section className="bg-white p-4 sm:p-6">
        <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
          Wybierz dietę dla uczestnika. Możesz wybrać jedną lub więcej diet.
        </p>

        {/* Diet tiles */}
        {activeDiets.length > 0 ? (
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
            {activeDiets.map((diet) => {
              const isSelected = selectedDiets.has(diet.id);
              return (
                <button
                  key={diet.id}
                  onClick={() => toggleDiet(diet.id)}
                  className={`w-28 h-28 sm:w-32 sm:h-32 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#03adf0] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {/* Icon or name in blue square */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                    {diet.icon_url ? (
                      <img
                        src={getStaticAssetUrl(diet.icon_url) || ''}
                        alt={diet.name}
                        className="w-full h-full object-contain"
                        style={{
                          filter: isSelected ? 'brightness(0) invert(1)' : 'brightness(0)',
                        }}
                        onError={(e) => {
                          // If image fails to load, show name in blue square
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="w-full h-full flex items-center justify-center ${
                              isSelected ? 'bg-[#0288c7]' : 'bg-[#03adf0]'
                            } rounded"><span class="text-[10px] sm:text-xs font-medium text-center text-white px-1">${diet.name}</span></div>`;
                          }
                        }}
                      />
                    ) : (
                      // No icon - show name in blue square (centered)
                      <div className={`w-full h-full flex items-center justify-center ${
                        isSelected ? 'bg-[#0288c7]' : 'bg-[#03adf0]'
                      } rounded`}>
                        <span className="text-[10px] sm:text-xs font-medium text-center text-white px-1 break-words">
                          {diet.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] sm:text-xs text-center font-medium ${
                    isSelected ? 'text-white' : 'text-gray-600'
                  }`}>
                    {diet.name}
                  </span>
                  <span className={`text-[9px] sm:text-[10px] ${
                    isSelected ? 'text-white' : 'text-gray-500'
                  }`}>
                    {diet.price > 0 ? `+${diet.price} zł` : '0 zł'}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
            Brak dostępnych diet.
          </p>
        )}

        {/* Information block */}
        {activeDiets.length > 0 && (
          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <Info className="w-5 h-5 text-[#03adf0] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-800 mb-2">
                Informacje o dietach
              </p>
              <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
                {activeDiets.map((diet) => (
                  <li key={diet.id}>
                    <strong>{diet.name}:</strong> {diet.description || 'Brak opisu'}
                    {diet.price > 0 && `, cena ${diet.price} zł`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
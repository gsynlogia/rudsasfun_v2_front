'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Info } from 'lucide-react';
import { useReservation } from '@/context/ReservationContext';
import { loadStep1FormData, saveStep1FormData, type Step1FormData } from '@/utils/sessionStorage';
import { API_BASE_URL } from '@/utils/api-config';

interface Diet {
  id: number;
  name: string;
  price: number;
  description?: string | null;
  icon_url?: string | null;
  is_active: boolean;
}

/**
 * DietSection Component for Step1
 * Displays diet selection with tiles (from database)
 * Replaces hardcoded standard/vegetarian diets
 */
export default function DietSection() {
  const { reservation, addReservationItem, removeReservationItemsByType } = useReservation();
  const pathname = usePathname();
  
  const [selectedDietId, setSelectedDietId] = useState<number | null>(null);
  const [diets, setDiets] = useState<Diet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevDietIdRef = useRef<number | null>(null);
  const hasLoadedFromStorageRef = useRef(false);

  // Load selectedDietId from sessionStorage first
  const loadDietFromStorage = useCallback(() => {
    const savedData = loadStep1FormData();
    if (savedData && savedData.selectedDietId !== undefined && savedData.selectedDietId !== null) {
      setSelectedDietId(savedData.selectedDietId);
      prevDietIdRef.current = savedData.selectedDietId;
      hasLoadedFromStorageRef.current = true;
      return savedData.selectedDietId;
    }
    return null;
  }, []);

  // Load from sessionStorage on mount
  useEffect(() => {
    loadDietFromStorage();
  }, []);

  // Also load when pathname changes to Step1 (handles case when component doesn't remount)
  useEffect(() => {
    if (pathname && pathname.includes('/step/1')) {
      loadDietFromStorage();
    }
  }, [pathname, loadDietFromStorage]);

  // Fetch diets from API
  useEffect(() => {
    const fetchDiets = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Public endpoint - no authentication required
        // Returns all active global diets from admin panel
        const url = `${API_BASE_URL}/api/diets/public`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setDiets(data.diets || []);
        
        // Check sessionStorage directly to get the most up-to-date value
        const savedData = loadStep1FormData();
        const savedDietId = savedData?.selectedDietId;
        
        // Only set default diet if we haven't loaded from sessionStorage
        if (!hasLoadedFromStorageRef.current && data.diets && data.diets.length > 0) {
          const standardDiet = data.diets.find((d: Diet) => d.name === 'Standardowa');
          const defaultDiet = standardDiet || data.diets[0];
          setSelectedDietId(defaultDiet.id);
          prevDietIdRef.current = defaultDiet.id;
        } else if (savedDietId !== undefined && savedDietId !== null) {
          // Verify that the selected diet from storage exists in the fetched diets
          const dietExists = data.diets.some((d: Diet) => d.id === savedDietId);
          if (dietExists) {
            // Set the saved diet
            setSelectedDietId(savedDietId);
            prevDietIdRef.current = savedDietId;
          } else if (data.diets.length > 0) {
            // If saved diet doesn't exist, fall back to default
            const standardDiet = data.diets.find((d: Diet) => d.name === 'Standardowa');
            const defaultDiet = standardDiet || data.diets[0];
            setSelectedDietId(defaultDiet.id);
            prevDietIdRef.current = defaultDiet.id;
          }
        }
      } catch (err) {
        console.error('[DietSection] Error fetching diets:', err);
        setError('Nie udało się załadować diet');
        setDiets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDiets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update reservation when diet changes
  useEffect(() => {
    if (!selectedDietId || diets.length === 0) return;
    if (prevDietIdRef.current === selectedDietId) return;

    // Remove all previous diet items
    removeReservationItemsByType('diet');

    // Add new diet
    const selectedDiet = diets.find(d => d.id === selectedDietId);
    if (selectedDiet && selectedDiet.price > 0) {
      // Only add to reservation if price > 0 (standard diet is free)
      addReservationItem({
        name: selectedDiet.name,
        price: selectedDiet.price,
        type: 'diet',
      });
    }

    prevDietIdRef.current = selectedDietId;
  }, [selectedDietId, diets, addReservationItem, removeReservationItemsByType]);

  // Save to sessionStorage whenever diet changes
  useEffect(() => {
    if (selectedDietId === null) return;
    
    const savedData = loadStep1FormData();
    if (savedData) {
      const formData: Step1FormData = {
        ...savedData,
        selectedDietId,
        parents: savedData.parents || [],
      };
      saveStep1FormData(formData);
    }
  }, [selectedDietId]);

  const handleDietSelect = (dietId: number) => {
    setSelectedDietId(dietId);
  };

  // Filter only active diets
  const activeDiets = diets.filter(diet => diet.is_active);

  if (loading) {
    return (
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Dieta uczestnika
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
          Dieta uczestnika
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
        Dieta uczestnika
      </h2>
      <section className="bg-white p-4 sm:p-6">
        {/* Diet tiles */}
        {activeDiets.length > 0 ? (
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {activeDiets.map((diet) => {
              const isSelected = selectedDietId === diet.id;
              return (
                <button
                  key={diet.id}
                  onClick={() => handleDietSelect(diet.id)}
                  className={`w-32 h-32 sm:w-36 sm:h-36 flex flex-col items-center justify-center gap-2 transition-colors ${
                    isSelected
                      ? 'bg-[#03adf0] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {diet.icon_url ? (
                    <>
                      {/* Icon */}
                      <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                        <img
                          src={diet.icon_url}
                          alt={diet.name}
                          className={`w-full h-full object-contain ${
                            isSelected ? 'brightness-0 invert' : ''
                          }`}
                        />
                      </div>
                      <span className={`text-xs sm:text-sm font-medium ${
                        isSelected ? 'text-white' : 'text-gray-600'
                      }`}>
                        {diet.name}
                      </span>
                      <span className={`text-[10px] sm:text-xs ${
                        isSelected ? 'text-white' : 'text-gray-500'
                      }`}>
                        {diet.price > 0 ? `+${diet.price} zł` : '0 zł'}
                      </span>
                    </>
                  ) : (
                    <>
                      {/* No icon - just text centered */}
                      <span className={`text-xs sm:text-sm font-medium text-center ${
                        isSelected ? 'text-white' : 'text-gray-600'
                      }`}>
                        {diet.name}
                      </span>
                      <span className={`text-[10px] sm:text-xs ${
                        isSelected ? 'text-white' : 'text-gray-500'
                      }`}>
                        {diet.price > 0 ? `+${diet.price} zł` : '0 zł'}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-gray-500">
            Brak dostępnych diet.
          </p>
        )}
      </section>
    </div>
  );
}


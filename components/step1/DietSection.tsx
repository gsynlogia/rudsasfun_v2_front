'use client';

import { usePathname, useParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';

import { useReservation } from '@/context/ReservationContext';
import { DEFAULT_DIET } from '@/types/defaults';
import { BackendUnavailableError } from '@/utils/api-auth';
import { API_BASE_URL, getStaticAssetUrl } from '@/utils/api-config';
import { loadStep1FormData, saveStep1FormData, type Step1FormData } from '@/utils/sessionStorage';

interface Diet {
  id: number;
  name: string;
  price: number;
  description?: string | null;
  icon_url?: string | null;
  icon_svg?: string | null;
  is_active: boolean;
}

/**
 * DietSection Component for Step1
 * Displays diet selection with tiles (from database)
 * Replaces hardcoded standard/vegetarian diets
 */
export default function DietSection() {
  const { reservation: _reservation, addReservationItem, removeReservationItemsByType } = useReservation();
  const pathname = usePathname();
  const params = useParams();

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
  // Logic: If camp has center diets, use them; otherwise use general diets
  useEffect(() => {
    const fetchDiets = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get property_id from URL params (editionId is the property_id)
        const editionId = params?.editionId as string | undefined;
        const propertyId = editionId ? parseInt(editionId, 10) : undefined;

        // Extract campId from pathname
        const pathParts = pathname.split('/').filter(Boolean);
        const campIdIndex = pathParts.indexOf('camps');
        const campId = campIdIndex !== -1 && campIdIndex + 1 < pathParts.length
          ? parseInt(pathParts[campIdIndex + 1], 10)
          : undefined;

        let dietsData: Diet[] = [];

        // First, try to get diets assigned to this turnus (property_id)
        // This endpoint returns:
        // - Diets from turnus_diets table (many-to-many)
        // - General diets from CenterDietGeneralDiet relations (expanded from center diets assigned to this turnus)
        // If turnus has no assigned diets, this returns empty array
        if (propertyId && campId) {
          try {
            const turnusDietsResponse = await fetch(`${API_BASE_URL}/api/camps/${campId}/properties/${propertyId}/diets`);
            if (turnusDietsResponse.ok) {
              const turnusDiets = await turnusDietsResponse.json();
              if (turnusDiets && Array.isArray(turnusDiets) && turnusDiets.length > 0) {
                console.log('[DietSection] Raw turnus diets from API:', turnusDiets);

                // Check if all diets are center diets without relations (has_no_relations flag)
                const hasOnlyCenterDietsWithoutRelations = turnusDiets.every((td: any) => td.has_no_relations === true);

                if (hasOnlyCenterDietsWithoutRelations) {
                  // Center diet is assigned but has no relations - use general diets as fallback
                  console.log('[DietSection] Center diet assigned but no relations - using general diets as fallback');
                  // Don't set dietsData here - let it fall through to general diets logic below
                } else {
                  // Use diets assigned to this turnus (general diets from relations)
                  // Backend now returns general diets from CenterDietGeneralDiet relations as separate items
                  // Each item has:
                  // - id: relation_id (for deletion)
                  // - general_diet_id: ID of the general diet (for selection)
                  // - name: from general_diet
                  // - price: from CenterDietGeneralDiet relation (center-specific price)
                  // - icon_url, icon_svg: from general_diet
                  dietsData = turnusDiets
                    .filter((td: any) => !td.has_no_relations) // Filter out center diets without relations
                    .map((td: any) => {
                      const mappedDiet = {
                        id: td.general_diet_id || td.id, // Use general_diet_id for selection (this is the actual diet ID)
                        relation_id: td.relation_id || td.id, // Keep relation_id for reference (for deletion if needed)
                        name: td.name, // Name from general_diet
                        price: td.price, // Price from CenterDietGeneralDiet relation (center-specific)
                        description: td.description, // Description from general_diet
                        icon_url: td.icon_url, // Icon from general_diet
                        icon_svg: td.icon_svg, // Icon SVG from general_diet
                        is_active: td.is_active,
                        is_center_diet_relation: td.is_center_diet_relation || false, // Mark if from center diet relation
                      };
                      console.log('[DietSection] Mapped diet:', { original: td, mapped: mappedDiet });
                      return mappedDiet;
                    });
                  console.log('[DietSection] Using turnus-specific diets (including general diets from center diet relations):', dietsData.length);
                }
              } else {
                console.log('[DietSection] No diets assigned to turnus, will use general diets');
              }
            }
          } catch (err) {
            console.warn('[DietSection] Error fetching turnus diets, falling back to general diets:', err);
          }
        }

        // If no turnus diets, use general diets (fallback to "dieta ogólna")
        // DO NOT use center-diets/property endpoint here - it returns center diets with legacy property_id
        // which may not be assigned to this turnus. Only use diets explicitly assigned via get_turnus_diets.
        const isUsingGeneralDiets = dietsData.length === 0;
        if (isUsingGeneralDiets) {
          try {
            // Try new general diets endpoint first
            const generalDietsResponse = await fetch(`${API_BASE_URL}/api/general-diets/public`);
            if (generalDietsResponse.ok) {
              const generalDiets = await generalDietsResponse.json();
              dietsData = generalDiets.map((gd: any) => ({
                id: gd.id,
                name: gd.display_name || gd.name,
                price: gd.price,
                description: gd.description,
                icon_url: gd.icon_url,
                icon_svg: gd.icon_svg,
                is_active: gd.is_active,
              }));
              console.log('[DietSection] Using general diets (no turnus diets assigned):', dietsData.length);
            } else {
              // Fallback to center-diets/general/public
              const centerGeneralResponse = await fetch(`${API_BASE_URL}/api/center-diets/general/public`);
              if (centerGeneralResponse.ok) {
                const generalDiets = await centerGeneralResponse.json();
                dietsData = generalDiets.map((gd: any) => ({
                  id: gd.id,
                  name: gd.display_name || gd.name,
                  price: gd.price,
                  description: gd.description,
                  icon_url: gd.icon_url,
                  icon_svg: gd.icon_svg,
                  is_active: gd.is_active,
                }));
                console.log('[DietSection] Using general diets from center-diets/general/public:', dietsData.length);
              } else {
                // Fallback to old endpoint
                const response = await fetch(`${API_BASE_URL}/api/diets/public`);
                if (response.ok) {
                  const data = await response.json();
                  dietsData = data.diets || [];
                  console.log('[DietSection] Using diets from old endpoint:', dietsData.length);
                }
              }
            }
          } catch (err) {
            console.warn('[DietSection] Error fetching general diets, trying fallback:', err);
            // Fallback to old endpoint
            try {
              const response = await fetch(`${API_BASE_URL}/api/diets/public`);
              if (response.ok) {
                const data = await response.json();
                dietsData = data.diets || [];
                console.log('[DietSection] Using diets from fallback endpoint:', dietsData.length);
              }
            } catch (fallbackErr) {
              console.error('[DietSection] All diet endpoints failed:', fallbackErr);
            }
          }
        }

        setDiets(dietsData);

        // Check sessionStorage directly to get the most up-to-date value
        const savedData = loadStep1FormData();
        const savedDietId = savedData?.selectedDietId;

        // Only set default diet if we haven't loaded from sessionStorage
        if (!hasLoadedFromStorageRef.current && dietsData && dietsData.length > 0) {
          // When using general diets (no turnus diets), always use the first general diet
          // Otherwise, try to find "dieta ogólna" or "standardowa" first
          let defaultDiet: Diet;
          if (isUsingGeneralDiets) {
            // When no turnus diets, use first general diet as default
            defaultDiet = dietsData[0];
            console.log('[DietSection] No turnus diets - using first general diet as default:', defaultDiet.name);
          } else {
            // When turnus has specific diets, try to find "ogólna" or "standardowa"
            const generalDiet = dietsData.find((d: Diet) =>
              d.name?.toLowerCase().includes('ogólna') ||
              d.name?.toLowerCase().includes('ogolna') ||
              d.name?.toLowerCase().includes('standardowa') ||
              d.name?.toLowerCase().includes('standard') ||
              d.name?.toLowerCase().includes('general'),
            );
            defaultDiet = generalDiet || dietsData[0];
            console.log('[DietSection] Turnus has specific diets - default diet selected:', defaultDiet.name);
          }
          setSelectedDietId(defaultDiet.id);
          prevDietIdRef.current = defaultDiet.id;
        } else if (savedDietId !== undefined && savedDietId !== null) {
          // Verify that the selected diet from storage exists in the fetched diets
          const dietExists = dietsData.some((d: Diet) => d.id === savedDietId);
          if (dietExists) {
            // Set the saved diet
            setSelectedDietId(savedDietId);
            prevDietIdRef.current = savedDietId;
          } else if (dietsData.length > 0) {
            // If saved diet doesn't exist, fall back to default
            let defaultDiet: Diet;
            if (isUsingGeneralDiets) {
              // When no turnus diets, use first general diet as default
              defaultDiet = dietsData[0];
              console.log('[DietSection] Saved diet not found - using first general diet as fallback:', defaultDiet.name);
            } else {
              // When turnus has specific diets, try to find "ogólna" or "standardowa"
              const generalDiet = dietsData.find((d: Diet) =>
                d.name?.toLowerCase().includes('ogólna') ||
                d.name?.toLowerCase().includes('ogolna') ||
                d.name?.toLowerCase().includes('standardowa') ||
                d.name?.toLowerCase().includes('standard') ||
                d.name?.toLowerCase().includes('general'),
              );
              defaultDiet = generalDiet || dietsData[0];
              console.log('[DietSection] Saved diet not found - fallback diet selected:', defaultDiet.name);
            }
            setSelectedDietId(defaultDiet.id);
            prevDietIdRef.current = defaultDiet.id;
          }
        }
      } catch (err) {
        console.error('[DietSection] Error fetching diets:', err);
        if (err instanceof BackendUnavailableError) {
          setError('Zapraszamy ponownie później.');
        } else {
          setError('Nie udało się załadować diet');
        }
        // Use default diet when backend is unavailable
        setDiets([{
          ...DEFAULT_DIET,
          id: 1,
          name: 'Standardowa',
          price: 0,
          is_active: true,
        }]);
      } finally {
        setLoading(false);
      }
    };

    fetchDiets();

  }, [params?.editionId]); // Re-fetch when property changes

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
                  className={`w-32 h-32 sm:w-36 sm:h-36 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#03adf0] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {diet.icon_url ? (
                    <>
                      {/* Icon URL (uploaded icon) - highest priority */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center flex-shrink-0">
                        <img
                          src={getStaticAssetUrl(diet.icon_url) || ''}
                          alt={diet.name}
                          className={`w-full h-full object-contain max-w-full max-h-full ${
                            isSelected ? 'brightness-0 invert' : ''
                          }`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            maxWidth: '100%',
                            maxHeight: '100%',
                          }}
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
                  ) : diet.icon_svg ? (
                    <>
                      {/* SVG icon (pasted SVG code) - second priority */}
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{
                          filter: isSelected ? 'brightness(0) invert(1)' : 'none',
                        }}
                      >
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          dangerouslySetInnerHTML={{
                            __html: diet.icon_svg.replace(
                              /<svg([^>]*?)>/i,
                              (match, attrs) => {
                                // Remove existing width/height/style attributes
                                attrs = attrs.replace(/\s*(width|height|style)=["'][^"']*["']/gi, '');
                                // Add fixed size and contain behavior
                                return `<svg${attrs} style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain;">`;
                              },
                            ),
                          }}
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


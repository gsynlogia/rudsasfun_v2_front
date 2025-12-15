'use client';

import { Info, Check } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

import { useReservation } from '@/context/ReservationContext';
import { API_BASE_URL, getStaticAssetUrl } from '@/utils/api-config';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';

interface Protection {
  id: number;
  general_protection_id?: number;
  center_protection_id?: number;
  name: string;
  price: number;  // Cannot be negative
  description?: string;
  icon_url?: string | null;
  icon_svg?: string | null;
  is_center_protection_relation?: boolean;
  relation_id?: number;
  is_active?: boolean;
}

/**
 * ProtectionsSection Component
 * Displays protections from API for the selected turnus
 * NOTE: Multiple selection allowed (checkboxes), NO justification required
 */
export default function ProtectionsSection() {
  const { reservation, addReservationItem, removeReservationItemsByType } = useReservation();
  const pathname = usePathname();
  const [protections, setProtections] = useState<Protection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProtectionIds, setSelectedProtectionIds] = useState<number[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Extract camp_id and property_id from URL
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

  // Fetch protections for the selected turnus
  useEffect(() => {
    const fetchProtections = async () => {
      const { campId, propertyId } = getCampIds();

      if (!campId || !propertyId) {
        setProtections([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // FIRST PRIORITY: Fetch protections assigned to this turnus
        const turnusProtectionsResponse = await fetch(
          `${API_BASE_URL}/api/camps/${campId}/properties/${propertyId}/protections`,
        );

        if (!turnusProtectionsResponse.ok) {
          if (turnusProtectionsResponse.status === 404) {
            // No turnus protections - fallback to general protections
            const generalProtectionsResponse = await fetch(`${API_BASE_URL}/api/general-protections/public`);
            if (generalProtectionsResponse.ok) {
              const generalProtections = await generalProtectionsResponse.json();
              setProtections(generalProtections.map((gp: any) => ({
                id: gp.id,
                name: gp.display_name || gp.name,
                price: gp.price,
                description: gp.description,
                icon_url: gp.icon_url,
                icon_svg: gp.icon_svg,
                is_active: gp.is_active,
              })));
            } else {
              setProtections([]);
            }
            setLoading(false);
            return;
          }
          throw new Error(`HTTP error! status: ${turnusProtectionsResponse.status}`);
        }

        const turnusProtections = await turnusProtectionsResponse.json();
        const protectionsList = Array.isArray(turnusProtections) ? turnusProtections : [];

        // Check if all protections are placeholders without relations
        const hasOnlyCenterProtectionsWithoutRelations = protectionsList.every(
          (tp: any) => tp.has_no_relations === true,
        );

        if (hasOnlyCenterProtectionsWithoutRelations || protectionsList.length === 0) {
          // Fallback to general protections
          const generalProtectionsResponse = await fetch(`${API_BASE_URL}/api/general-protections/public`);
          if (generalProtectionsResponse.ok) {
            const generalProtections = await generalProtectionsResponse.json();
            setProtections(generalProtections.map((gp: any) => ({
              id: gp.id,
              name: gp.display_name || gp.name,
              price: gp.price,
              description: gp.description,
              is_active: gp.is_active,
            })));
          } else {
            setProtections([]);
          }
        } else {
          // Use turnus-specific protections (general protections from center protection relations)
          setProtections(protectionsList
            .filter((tp: any) => !tp.has_no_relations)  // Filter placeholders
            .map((tp: any) => ({
              id: tp.general_protection_id || tp.id,  // Use general_protection_id for selection
              relation_id: tp.relation_id || tp.id,  // Keep for reference
              name: tp.name,  // Name from general_protection
              price: tp.price,  // Price from CenterProtectionGeneralProtection relation
              description: tp.description,
              icon_url: tp.icon_url,  // Icon from general_protection
              icon_svg: tp.icon_svg,  // Icon SVG from general_protection
              is_active: tp.is_active,
              is_center_protection_relation: tp.is_center_protection_relation || false,
            })));
        }

        console.log('[ProtectionsSection] Fetched protections:', protectionsList.length, protectionsList);
      } catch (err) {
        console.error('[ProtectionsSection] Error fetching protections:', err);
        setError('Nie udało się załadować ochron');
        setProtections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProtections();
  }, [pathname]);

  // Load data from sessionStorage on mount
  useEffect(() => {
    const savedData = loadStep2FormData();
    if (savedData && savedData.selectedProtectionIds && Array.isArray(savedData.selectedProtectionIds)) {
      // Verify that selected protections exist in fetched protections
      const validIds = savedData.selectedProtectionIds.filter((id: number) =>
        protections.some((p: Protection) => p.id === id),
      );
      setSelectedProtectionIds(validIds);
    }
    setIsInitialized(true);
  }, []);

  // Update reservation when protections change (MULTIPLE SELECTION)
  useEffect(() => {
    if (!isInitialized) return;

    // Remove all previous protection items
    removeReservationItemsByType('protection');

    if (selectedProtectionIds.length > 0 && protections.length > 0) {
      // Add all selected protections with predictable IDs
      selectedProtectionIds.forEach((protectionId) => {
        const selectedProtection = protections.find(p => p.id === protectionId);
        if (selectedProtection) {
          // Use predictable ID format: protection-{protectionId}
          const reservationId = `protection-${protectionId}`;
          addReservationItem({
            name: selectedProtection.name,
            price: selectedProtection.price,
            type: 'protection',
          }, reservationId);
        }
      });
    }

    // Save to sessionStorage
    const savedData = loadStep2FormData();
    if (savedData) {
      // Convert selectedProtectionIds (numbers) to selectedProtection (strings) for compatibility
      const selectedProtectionStrings = selectedProtectionIds.map(id => `protection-${id}`);
      const formData = {
        ...savedData,
        selectedProtectionIds: selectedProtectionIds,  // Array of numeric IDs
        selectedProtection: selectedProtectionStrings,  // Array of string IDs (for Step5 and backend)
      };
      saveStep2FormData(formData as any);
    }
  }, [selectedProtectionIds, protections, isInitialized, addReservationItem, removeReservationItemsByType]);

  // Handle protection toggle (MULTIPLE SELECTION - checkbox)
  const handleProtectionToggle = (protectionId: number) => {
    setSelectedProtectionIds((prev) => {
      if (prev.includes(protectionId)) {
        // Remove from selection
        return prev.filter(id => id !== protectionId);
      } else {
        // Add to selection
        return [...prev, protectionId];
      }
    });
  };

  const activeProtections = protections.filter(p => p.is_active !== false);

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Ochrony
      </h2>
      <section className="bg-white p-4 sm:p-6">
        {loading ? (
          <div className="text-center text-gray-500 py-4">Ładowanie ochron...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-4">{error}</div>
        ) : activeProtections.length === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-sm text-red-800 font-medium">
              Brak dostępnych ochron dla tego turnusu
            </p>
          </div>
        ) : (
          <>
            {/* Protection tiles (NO ICONS - only text and price) */}
            <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
              {activeProtections.map((protection) => {
                const isSelected = selectedProtectionIds.includes(protection.id);  // MULTIPLE SELECTION

                return (
                  <div key={protection.id} className="relative">
                    <button
                      onClick={() => handleProtectionToggle(protection.id)}
                      className={`w-32 h-32 sm:w-36 sm:h-36 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#03adf0] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {/* Icon display */}
                      {protection.icon_url ? (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0">
                          <img
                            src={getStaticAssetUrl(protection.icon_url) || ''}
                            alt={protection.name}
                            className="w-full h-full object-contain max-w-full max-h-full"
                            style={{
                              filter: isSelected ? 'brightness(0) invert(1)' : 'brightness(0)',
                            }}
                          />
                        </div>
                      ) : protection.icon_svg ? (
                        <div
                          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 overflow-hidden"
                          style={{
                            filter: isSelected ? 'brightness(0) invert(1)' : 'brightness(0)',
                          }}
                          dangerouslySetInnerHTML={{
                            __html: protection.icon_svg.replace(
                              /<svg([^>]*?)>/i,
                              (match, attrs) => {
                                // Remove existing width/height/style attributes
                                attrs = attrs.replace(/\s*(width|height|style)=["'][^"']*["']/gi, '');
                                // Add fixed size and contain behavior
                                return `<svg${attrs} width="100%" height="100%" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
                              },
                            ),
                          }}
                        />
                      ) : null}

                      {/* Name and price */}
                      <span className={`text-xs sm:text-sm font-medium text-center ${
                        isSelected ? 'text-white' : 'text-gray-600'
                      }`}>
                        {protection.name}
                      </span>
                      <span className={`text-[10px] sm:text-xs ${
                        isSelected ? 'text-white' : 'text-gray-500'
                      }`}>
                        {protection.price.toFixed(2)} zł
                      </span>
                      {protection.description && (
                        <span className={`text-[9px] sm:text-[10px] text-center ${
                          isSelected ? 'text-white opacity-90' : 'text-gray-500'
                        }`}>
                          {protection.description}
                        </span>
                      )}
                    </button>
                    {/* Selection indicator (checkbox) */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Information block */}
            <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg mb-4 sm:mb-6">
              <Info className="w-5 h-5 text-[#03adf0] flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-gray-600">
                Możesz wybrać wiele ochron. Ochrony sumują się.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}


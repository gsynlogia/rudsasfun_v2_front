'use client';

import { Info, Download } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { useReservation } from '@/context/ReservationContext';
import { API_BASE_URL, getStaticAssetUrl } from '@/utils/api-config';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';
import type { ReservationItem } from '@/types/reservation';

interface Protection {
  id: string;  // Protection ID for compatibility
  name: string;
  price: number;
  description?: string;
  icon_url?: string | null;
  icon_svg?: string | null;
  apiId?: number;  // Real protection ID from API
}

/**
 * ProtectionSection Component
 * Displays all protection options from database with regulation buttons
 * Icons, names, and prices are fetched from API
 */
export default function ProtectionSection() {
  const { reservation, addReservationItem, removeReservationItem } = useReservation();
  const pathname = usePathname();

  // Initialize with data from sessionStorage if available
  const getInitialSelectedProtections = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    const savedData = loadStep2FormData();
    if (savedData && savedData.selectedProtection) {
      // Handle both old format (string) and new format (array)
      if (Array.isArray(savedData.selectedProtection)) {
        return new Set(savedData.selectedProtection);
      } else if (typeof savedData.selectedProtection === 'string') {
        // Convert old single selection to array
        return new Set([savedData.selectedProtection]);
      }
    }
    return new Set();
  };

  const [selectedProtections, setSelectedProtections] = useState<Set<string>>(getInitialSelectedProtections);
  const protectionReservationIdsRef = useRef<Map<string, string>>(new Map()); // Map: protectionId -> reservationItemId
  const [documents, setDocuments] = useState<Map<string, string>>(new Map()); // Map: document name -> file_url
  const [protections, setProtections] = useState<Protection[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Fetch all protections from API
  useEffect(() => {
    const fetchProtections = async () => {
      const { campId, propertyId } = getCampIds();

      if (!campId || !propertyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch protections assigned to this turnus
        const turnusProtectionsResponse = await fetch(
          `${API_BASE_URL}/api/camps/${campId}/properties/${propertyId}/protections`,
        );

        let protectionsList: any[] = [];

        if (turnusProtectionsResponse.ok) {
          const turnusProtections = await turnusProtectionsResponse.json();
          protectionsList = Array.isArray(turnusProtections) ? turnusProtections : [];

          // Filter out placeholders without relations
          protectionsList = protectionsList.filter((tp: any) => !tp.has_no_relations);
        } else if (turnusProtectionsResponse.status === 404) {
          // No turnus protections - fallback to general protections
          const generalProtectionsResponse = await fetch(`${API_BASE_URL}/api/general-protections/public`);
          if (generalProtectionsResponse.ok) {
            protectionsList = await generalProtectionsResponse.json();
          }
        }

        // Map all protections from API
        const fetchedProtections: Protection[] = protectionsList.map((p: any, index: number) => ({
          id: `protection-${p.general_protection_id || p.id || index}`,
          name: p.name || p.display_name || `Ochrona ${index + 1}`,
          price: p.price || 0,
          description: p.description || '',
          icon_url: p.icon_url,
          icon_svg: p.icon_svg,
          apiId: p.general_protection_id || p.id,
        }));

        setProtections(fetchedProtections);
      } catch (err) {
        console.error('[ProtectionSection] Error fetching protections:', err);
        setProtections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProtections();
  }, [pathname]);

  // Fetch public documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/documents/public`);
        if (!response.ok) return;
        const data = await response.json();
        const docsMap = new Map<string, string>();
        (data.documents || []).forEach((doc: { name: string; file_url: string | null }) => {
          if (doc.file_url) {
            docsMap.set(doc.name, doc.file_url);
          }
        });
        setDocuments(docsMap);
      } catch (err) {
        console.error('[ProtectionSection] Error fetching documents:', err);
      }
    };
    fetchDocuments();
  }, []);

  // Sync with sessionStorage on mount
  useEffect(() => {
    const savedData = loadStep2FormData();
    if (savedData && savedData.selectedProtection) {
      // Handle both old format (string) and new format (array)
      if (Array.isArray(savedData.selectedProtection)) {
        const savedSet = new Set(savedData.selectedProtection);
        setSelectedProtections(savedSet);
      } else if (typeof savedData.selectedProtection === 'string') {
        setSelectedProtections(new Set([savedData.selectedProtection]));
      }
    }
    setIsInitialized(true);
  }, []);

  // Restore protection items when initialized and reservation is available
  useEffect(() => {
    if (!isInitialized) return;

    const savedData = loadStep2FormData();
    const protectionsToRestore = savedData && savedData.selectedProtection
      ? (Array.isArray(savedData.selectedProtection)
          ? savedData.selectedProtection
          : savedData.selectedProtection ? [savedData.selectedProtection] : [])
      : [];

    // Restore reservation items for protections
    protectionsToRestore.forEach((protectionId: string) => {
      const protection = protections.find(p => p.id === protectionId);
      if (protection) {
        const reservationId = `protection-${protectionId}`;

        // Check if already exists in reservation
        const existing = reservation.items.find(
          (item: ReservationItem) => item.type === 'protection' && item.id === reservationId,
        );
        if (!existing) {
          // Check if exists by name (for backward compatibility)
          const existingByName = reservation.items.find(
            (item: ReservationItem) => item.type === 'protection' && item.name === `Ochrona ${protection.name}`,
          );
          if (!existingByName) {
            protectionReservationIdsRef.current.set(protectionId, reservationId);
            addReservationItem({
              name: `Ochrona ${protection.name}`,
              price: protection.price,
              type: 'protection',
            }, reservationId);
          } else {
            // Update mapping with existing ID
            protectionReservationIdsRef.current.set(protectionId, existingByName.id);
          }
        } else {
          // Update mapping with existing ID
          protectionReservationIdsRef.current.set(protectionId, existing.id);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, reservation.items.length]);

  // Update reservation when protections change
  useEffect(() => {
    if (!isInitialized) return;

    const currentProtectionIds = new Set(selectedProtections);
    const previousProtectionIds = new Set(protectionReservationIdsRef.current.keys());

    // Find added and removed protections
    const added = Array.from(currentProtectionIds).filter(id => !previousProtectionIds.has(id));
    const removed = Array.from(previousProtectionIds).filter(id => !currentProtectionIds.has(id));

    // Remove removed protections from reservation
    removed.forEach(protectionId => {
      const reservationId = protectionReservationIdsRef.current.get(protectionId);
      if (reservationId) {
        const item = reservation.items.find((item: ReservationItem) => item.id === reservationId);
        if (item) {
          removeReservationItem(item.id);
        } else {
          const protection = protections.find(p => p.id === protectionId);
          if (protection) {
            const itemByName = reservation.items.find(
              (item: ReservationItem) => item.type === 'protection' && item.name === `Ochrona ${protection.name}`,
            );
            if (itemByName) {
              removeReservationItem(itemByName.id);
            }
          }
        }
        protectionReservationIdsRef.current.delete(protectionId);
      }
    });

    // Add new protections to reservation
    added.forEach(protectionId => {
      const protection = protections.find(p => p.id === protectionId);
      if (protection) {
        const reservationId = `protection-${protectionId}`;

        const existingItem = reservation.items.find((item: ReservationItem) => item.id === reservationId);

        if (!existingItem) {
          protectionReservationIdsRef.current.set(protectionId, reservationId);
          addReservationItem({
            name: `Ochrona ${protection.name}`,
            price: protection.price,
            type: 'protection',
          }, reservationId);
        } else {
          protectionReservationIdsRef.current.set(protectionId, existingItem.id);
        }
      }
    });
  }, [selectedProtections, addReservationItem, removeReservationItem, protections, reservation.items, isInitialized]);

  // Save to sessionStorage whenever protections change
  useEffect(() => {
    if (!isInitialized) return;

    const savedData = loadStep2FormData();
    const formData = {
      ...savedData,
      selectedProtection: Array.from(selectedProtections),
    };
    saveStep2FormData(formData as any);
  }, [selectedProtections, isInitialized]);

  const toggleProtection = (protectionId: string) => {
    setSelectedProtections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(protectionId)) {
        newSet.delete(protectionId);
      } else {
        newSet.add(protectionId);
      }
      return newSet;
    });
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Ochrona rezerwacji
      </h2>
      <section className="bg-white p-4 sm:p-6">
        {loading ? (
          <div className="text-center text-gray-500 py-4">Ładowanie ochron...</div>
        ) : protections.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 font-medium">
              Brak dostępnych ochron dla tego turnusu
            </p>
          </div>
        ) : (
          <>
            {/* Protection tiles */}
            <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
          {protections.map((protection) => {
            const isSelected = selectedProtections.has(protection.id);
            return (
              <button
                key={protection.id}
                onClick={() => toggleProtection(protection.id)}
                className={`w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#03adf0] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {/* Icon display from API */}
                {protection.icon_url ? (
                  <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                    <img
                      src={getStaticAssetUrl(protection.icon_url) || ''}
                      alt={protection.name}
                      className={`w-full h-full object-contain max-w-full max-h-full ${
                        isSelected ? 'brightness-0 invert' : ''
                      }`}
                      style={{
                        filter: isSelected ? 'brightness(0) invert(1)' : 'none',
                      }}
                    />
                  </div>
                ) : protection.icon_svg ? (
                  <div
                    className="w-10 h-10 flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{
                      filter: isSelected ? 'brightness(0) invert(1)' : 'none',
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
                ) : (
                  // Fallback icon if no icon from API
                  <div className={`w-10 h-10 flex items-center justify-center ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                    {protection.id === 'tarcza' ? (
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    ) : (
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    )}
                  </div>
                )}
                <span className={`text-[10px] sm:text-xs text-center font-medium ${
                  isSelected ? 'text-white' : 'text-gray-600'
                }`}>
                  {protection.name}
                </span>
                <span className={`text-[9px] sm:text-[10px] ${
                  isSelected ? 'text-white' : 'text-gray-500'
                }`}>
                  +{protection.price.toFixed(2)} zł
                </span>
              </button>
            );
          })}
        </div>

        {/* Information block */}
        {protections.length > 0 && (
          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg mb-4 sm:mb-6">
            <Info className="w-5 h-5 text-[#03adf0] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
                {protections.map((protection) => (
                  <li key={protection.id}>
                    <strong>{protection.name}:</strong> {protection.description || 'Brak opisu'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Regulation buttons - dynamic based on protection names */}
        <div className="flex flex-wrap gap-3 sm:gap-4">
          {protections.map((protection) => {
            // Map protection names to document keys
            const protectionNameUpper = protection.name.toUpperCase();
            let documentKey: string | null = null;

            if (protectionNameUpper.includes('TARCZA') || protectionNameUpper.includes('SHIELD')) {
              documentKey = 'shield_protection';
            } else if (protectionNameUpper.includes('OAZA') || protectionNameUpper.includes('OASIS')) {
              documentKey = 'oasa_protection';
            }

            if (documentKey && documents.has(documentKey)) {
              return (
                <button
                  key={`reg-${protection.id}`}
                  onClick={() => window.open(documents.get(documentKey!), '_blank')}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 border-2 border-[#03adf0] text-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-colors text-xs sm:text-sm font-medium cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Regulamin Ochrony {protection.name.toUpperCase()}
                </button>
              );
            }
            return null;
          })}
        </div>
          </>
        )}
      </section>
    </div>
  );
}


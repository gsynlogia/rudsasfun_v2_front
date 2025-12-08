'use client';

import { useState, useEffect, useRef } from 'react';
import { Info, Download } from 'lucide-react';
import { useReservation } from '@/context/ReservationContext';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';
import { API_BASE_URL } from '@/utils/api-config';

/**
 * ProtectionSection Component
 * Displays protection options (Tarcza, Oaza) with regulation buttons
 */
export default function ProtectionSection() {
  const { reservation, addReservationItem, removeReservationItem } = useReservation();
  
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

  const protections = [
    {
      id: 'tarcza',
      name: 'Tarcza',
      price: 50,
      description: 'Ochrona od rezygnacji przed rozpoczęciem obozu/kolonii',
    },
    {
      id: 'oaza',
      name: 'Oaza',
      price: 100,
      description: 'Ochrona od rezygnacji w trakcie trwania obozu/kolonii',
    },
  ];

  const tarczaIcon = (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );

  const oazaIcon = (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );

  const [isInitialized, setIsInitialized] = useState(false);

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
          item => item.type === 'protection' && item.id === reservationId
        );
        if (!existing) {
          // Check if exists by name (for backward compatibility)
          const existingByName = reservation.items.find(
            item => item.type === 'protection' && item.name === `Ochrona ${protection.name}`
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
        const item = reservation.items.find(item => item.id === reservationId);
        if (item) {
          removeReservationItem(item.id);
        } else {
          const protection = protections.find(p => p.id === protectionId);
          if (protection) {
            const itemByName = reservation.items.find(
              item => item.type === 'protection' && item.name === `Ochrona ${protection.name}`
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
        
        const existingItem = reservation.items.find(item => item.id === reservationId);
        
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
                <div className={isSelected ? 'text-white' : 'text-gray-600'}>
                  {protection.id === 'tarcza' ? tarczaIcon : oazaIcon}
                </div>
                <span className={`text-[10px] sm:text-xs text-center font-medium ${
                  isSelected ? 'text-white' : 'text-gray-600'
                }`}>
                  {protection.name}
                </span>
                <span className={`text-[9px] sm:text-[10px] ${
                  isSelected ? 'text-white' : 'text-gray-500'
                }`}>
                  +{protection.price} zł
                </span>
              </button>
            );
          })}
        </div>

        {/* Information block */}
        <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg mb-4 sm:mb-6">
          <Info className="w-5 h-5 text-[#03adf0] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
              {protections.map((protection) => (
                <li key={protection.id}>
                  <strong>{protection.name}:</strong> {protection.description}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Regulation buttons */}
        <div className="flex flex-wrap gap-3 sm:gap-4">
          {documents.has('shield_protection') && (
            <button
              onClick={() => window.open(documents.get('shield_protection'), '_blank')}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 border-2 border-[#03adf0] text-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-colors text-xs sm:text-sm font-medium cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Regulamin Ochrony TARCZA
            </button>
          )}
          {documents.has('oasa_protection') && (
            <button
              onClick={() => window.open(documents.get('oasa_protection'), '_blank')}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 border-2 border-[#03adf0] text-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-colors text-xs sm:text-sm font-medium cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Regulamin Ochrony OAZA
            </button>
          )}
        </div>
      </section>
    </div>
  );
}


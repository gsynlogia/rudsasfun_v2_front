'use client';

import { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { useReservation } from '@/context/ReservationContext';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';

/**
 * AddonsSection Component
 * Displays addons selection with tiles (Skuter wodny, Banan wodny, Quady)
 */
export default function AddonsSection() {
  const { reservation, addReservationItem, removeReservationItem } = useReservation();
  
  // Initialize with data from sessionStorage if available, otherwise default to banan
  const getInitialSelectedAddons = (): Set<string> => {
    if (typeof window === 'undefined') return new Set(['banan']);
    const savedData = loadStep2FormData();
    if (savedData && savedData.selectedAddons && Array.isArray(savedData.selectedAddons) && savedData.selectedAddons.length > 0) {
      return new Set(savedData.selectedAddons);
    }
    return new Set(['banan']);
  };
  
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(getInitialSelectedAddons);
  const addonReservationIdsRef = useRef<Map<string, string>>(new Map()); // Map: addonId -> reservationItemId

  const addons = [
    {
      id: 'skuter',
      name: 'Skuter wodny',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      description: '20 minut przejażdżki z opiekunem, cena 150 zł',
      price: 150,
    },
    {
      id: 'banan',
      name: 'Banan wodny',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: '20 minut przejażdżki',
      price: 0,
    },
    {
      id: 'quady',
      name: 'Quady',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      description: '30 minut przejażdżki',
      price: 150,
    },
  ];

  const [isInitialized, setIsInitialized] = useState(false);

  // Sync with sessionStorage on mount (in case it changed)
  useEffect(() => {
    const savedData = loadStep2FormData();
    if (savedData && savedData.selectedAddons && Array.isArray(savedData.selectedAddons) && savedData.selectedAddons.length > 0) {
      const savedSet = new Set(savedData.selectedAddons);
      // Only update if different from current state
      const currentArray = Array.from(selectedAddons).sort();
      const savedArray = Array.from(savedSet).sort();
      if (JSON.stringify(currentArray) !== JSON.stringify(savedArray)) {
        setSelectedAddons(savedSet);
      }
    }
    setIsInitialized(true);
  }, []);

  // Restore reservation items when initialized and reservation is available
  useEffect(() => {
    if (!isInitialized) return;

    const savedData = loadStep2FormData();
    const addonsToRestore = savedData && savedData.selectedAddons && Array.isArray(savedData.selectedAddons)
      ? Array.from(savedData.selectedAddons)
      : ['banan']; // Default: banan

    // Restore reservation items for addons
    addonsToRestore.forEach(addonId => {
      const addon = addons.find(a => a.id === addonId);
      if (addon) {
        const reservationId = `addon-${addonId}`;
        
        // Check if already exists in reservation
        const existing = reservation.items.find(
          item => item.type === 'addon' && item.name === addon.name
        );
        if (!existing) {
          addonReservationIdsRef.current.set(addonId, reservationId);
          addReservationItem({
            name: addon.name,
            price: addon.price,
            type: 'addon',
          }, reservationId);
        } else {
          // Update mapping with existing ID
          addonReservationIdsRef.current.set(addonId, existing.id);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, reservation.items.length]);

  // Update reservation when addons change
  useEffect(() => {
    const currentAddonIds = new Set(selectedAddons);
    const previousAddonIds = new Set(addonReservationIdsRef.current.keys());

    // Find added and removed addons
    const added = Array.from(currentAddonIds).filter(id => !previousAddonIds.has(id));
    const removed = Array.from(previousAddonIds).filter(id => !currentAddonIds.has(id));

    // Remove removed addons from reservation
    removed.forEach(addonId => {
      const reservationId = addonReservationIdsRef.current.get(addonId);
      if (reservationId) {
        // Try to find by stored ID first
        const item = reservation.items.find(item => item.id === reservationId);
        if (item) {
          removeReservationItem(item.id);
        } else {
          // Fallback: find by name and type
          const addon = addons.find(a => a.id === addonId);
          if (addon) {
            const itemByName = reservation.items.find(
              item => item.type === 'addon' && item.name === addon.name
            );
            if (itemByName) {
              removeReservationItem(itemByName.id);
            }
          }
        }
        addonReservationIdsRef.current.delete(addonId);
      }
    });

    // Add new addons to reservation
    added.forEach(addonId => {
      const addon = addons.find(a => a.id === addonId);
      if (addon) {
        // Use predictable ID format: addon-{addonId}
        const reservationId = `addon-${addonId}`;
        
        // Check if item with this ID already exists
        const existingItem = reservation.items.find(item => item.id === reservationId);
        
        if (!existingItem) {
          addonReservationIdsRef.current.set(addonId, reservationId);
          // Use the predictable ID when adding
          addReservationItem({
            name: addon.name,
            price: addon.price,
            type: 'addon',
          }, reservationId);
        } else {
          // Item already exists, just update the mapping
          addonReservationIdsRef.current.set(addonId, existingItem.id);
        }
      }
    });
  }, [selectedAddons, addReservationItem, removeReservationItem, addons, reservation.items]);

  // Save to sessionStorage whenever addons change
  useEffect(() => {
    if (!isInitialized) return; // Don't save during initial load
    
    const savedData = loadStep2FormData();
    const formData = {
      selectedAddons: Array.from(selectedAddons),
      selectedProtection: savedData?.selectedProtection || '',
      selectedPromotion: savedData?.selectedPromotion || '',
      transportData: savedData?.transportData || {
        departureType: '',
        departureCity: '',
        returnType: '',
        returnCity: '',
      },
      sources: savedData?.sources || {
        kolejna: false,
        znajomi: false,
        internet: false,
        wycieczka: false,
        inne: false,
      },
      inneText: savedData?.inneText || '',
    };
    saveStep2FormData(formData);
  }, [selectedAddons, isInitialized]);

  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(addonId)) {
        newSet.delete(addonId);
      } else {
        newSet.add(addonId);
      }
      return newSet;
    });
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Dodatki
      </h2>
      <section className="bg-white p-4 sm:p-6">
        <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
          Miejsce na opis dodany przez Administratora portalu lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla in risus nisi. Praesent tortor neque, pellentesque volutpat congue et, euismod aliquam sapien. Suspendisse turpis diam, iaculis imperdiet egestas vitae, porttitor luctus nulla. In at placerat odio. Donec mauris arcu, accumsan quis libero nec, maximus convallis elit.
        </p>

        {/* Addon tiles */}
        <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
          {addons.map((addon) => {
            const isSelected = selectedAddons.has(addon.id);
            return (
              <button
                key={addon.id}
                onClick={() => toggleAddon(addon.id)}
                className={`w-28 h-28 sm:w-32 sm:h-32 flex flex-col items-center justify-center gap-2 transition-colors ${
                  isSelected
                    ? 'bg-[#03adf0] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <div className={isSelected ? 'text-white' : 'text-gray-600'}>
                  {addon.icon}
                </div>
                <span className={`text-[10px] sm:text-xs text-center font-medium ${
                  isSelected ? 'text-white' : 'text-gray-600'
                }`}>
                  {addon.name}
                </span>
                <span className={`text-[9px] sm:text-[10px] ${
                  isSelected ? 'text-white' : 'text-gray-500'
                }`}>
                  {addon.price > 0 ? `+${addon.price} zł` : '0 zł'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Information block */}
        <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <Info className="w-5 h-5 text-[#03adf0] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-medium text-gray-800 mb-2">
              Przykładowy nagłówek wpisany przez Admina
            </p>
            <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
              {addons.map((addon) => (
                <li key={addon.id}>
                  <strong>{addon.name}:</strong> {addon.description}
                  {addon.price > 0 && `, cena ${addon.price} zł`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}


'use client';

import { Info } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

import { useReservation } from '@/context/ReservationContext';
import { API_BASE_URL, getStaticAssetUrl } from '@/utils/api-config';
import { loadStep2FormData, saveStep2FormData } from '@/utils/sessionStorage';

/**
 * AddonsSection Component
 * Displays addon description from database, addon selection tiles, and info block from database
 */
export default function AddonsSection() {
  const { reservation, addReservationItem, removeReservationItem } = useReservation();

  // Initialize with data from sessionStorage if available
  const getInitialSelectedAddons = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    const savedData = loadStep2FormData();
    if (savedData && savedData.selectedAddons && Array.isArray(savedData.selectedAddons) && savedData.selectedAddons.length > 0) {
      return new Set(savedData.selectedAddons);
    }
    return new Set();
  };

  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(getInitialSelectedAddons);
  const [addonDescription, setAddonDescription] = useState<string>('');
  const [infoHeader, setInfoHeader] = useState<string>('');
  const [loadingDescription, setLoadingDescription] = useState(true);
  const [addons, setAddons] = useState<Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    icon: React.ReactNode;
  }>>([]);
  const [loadingAddons, setLoadingAddons] = useState(true);
  const addonReservationIdsRef = useRef<Map<string, string>>(new Map()); // Map: addonId -> reservationItemId

  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch addon description and info header from API
  useEffect(() => {
    const fetchDescription = async () => {
      try {
        setLoadingDescription(true);
        const response = await fetch(`${API_BASE_URL}/api/addon-description/public`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAddonDescription(data.description || '');
        setInfoHeader(data.info_header || '');
      } catch (err) {
        console.error('[AddonsSection] Error fetching addon description:', err);
        // Fallback to empty string if API fails
        setAddonDescription('');
        setInfoHeader('');
        // Backend unavailable - description will be empty, user can still proceed
      } finally {
        setLoadingDescription(false);
      }
    };
    fetchDescription();
  }, []);

  // Fetch addons from API
  useEffect(() => {
    const fetchAddons = async () => {
      try {
        setLoadingAddons(true);
        const response = await fetch(`${API_BASE_URL}/api/addons/public`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const addonsFromApi = (data.addons || []).map((addon: {
          id: number;
          name: string;
          description: string | null;
          price: number;
          icon_url: string | null;
          icon_svg: string | null;
        }) => ({
          id: addon.id.toString(),
          name: addon.name,
          description: addon.description || '',
          price: addon.price,
          icon: addon.icon_url ? (
            <Image
              src={getStaticAssetUrl(addon.icon_url) || ''}
              alt={addon.name}
              width={48}
              height={48}
              className="object-contain"
              unoptimized
              onError={(e) => {
                // Fallback to SVG if image fails
                const target = e.target as HTMLImageElement;
                if (addon.icon_svg) {
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = addon.icon_svg;
                  }
                } else {
                  target.style.display = 'none';
                }
              }}
            />
          ) : addon.icon_svg ? (
            <div
              className="w-12 h-12"
              dangerouslySetInnerHTML={{ __html: addon.icon_svg }}
            />
          ) : (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        }));
        setAddons(addonsFromApi);
      } catch (err) {
        console.error('[AddonsSection] Error fetching addons:', err);
        // Fallback to empty array if API fails
        setAddons([]);
        // Backend unavailable - addons will be empty, user can still proceed
      } finally {
        setLoadingAddons(false);
      }
    };
    fetchAddons();
  }, []);

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

  // Restore reservation items when initialized, reservation is available, and addons are loaded
  useEffect(() => {
    if (!isInitialized || addons.length === 0) return;

    const savedData = loadStep2FormData();
    const addonsToRestore = savedData && savedData.selectedAddons && Array.isArray(savedData.selectedAddons)
      ? Array.from(savedData.selectedAddons)
      : [];

    // Restore reservation items for addons
    addonsToRestore.forEach(addonId => {
      const addon = addons.find(a => a.id === addonId);
      if (addon) {
        const reservationId = `addon-${addonId}`;

        // Check if already exists in reservation
        const existing = reservation.items.find(
          item => item.type === 'addon' && item.name === addon.name,
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

  }, [isInitialized, addons.length, reservation.items.length]);

  // Update reservation when addons change
  useEffect(() => {
    if (!isInitialized || addons.length === 0) return;

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
              item => item.type === 'addon' && item.name === addon.name,
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
      selectedDiets: savedData?.selectedDiets || [],
      selectedAddons: Array.from(selectedAddons),
      selectedProtection: savedData?.selectedProtection || [],
      selectedPromotion: savedData?.selectedPromotion || '',
      transportData: savedData?.transportData || {
        departureType: '',
        departureCity: '',
        returnType: '',
        returnCity: '',
      },
      selectedSource: savedData?.selectedSource || '',
      inneText: savedData?.inneText || '',
    };
    saveStep2FormData(formData);
  }, [selectedAddons, isInitialized, addons.length]);

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
        {/* Description from database (top) */}
        {loadingDescription ? (
          <div className="mb-4 sm:mb-6">
            <div className="animate-pulse bg-gray-200 h-4 rounded w-full"></div>
          </div>
        ) : addonDescription ? (
          <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 whitespace-pre-wrap">
            {addonDescription}
          </p>
        ) : null}

        {/* Addon tiles (selection) */}
        {loadingAddons ? (
          <div className="flex justify-center items-center py-4 mb-4 sm:mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03adf0]"></div>
            <p className="ml-3 text-gray-600">Ładowanie dodatków...</p>
          </div>
        ) : addons.length === 0 ? (
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
            Brak dostępnych dodatków.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
            {addons.map((addon) => {
            const isSelected = selectedAddons.has(addon.id);
            return (
              <button
                key={addon.id}
                onClick={() => toggleAddon(addon.id)}
                className={`w-28 h-28 sm:w-32 sm:h-32 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer ${
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
        )}

        {/* Information block from database (bottom) */}
        {loadingAddons ? (
          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <Info className="w-5 h-5 text-[#03adf0] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="animate-pulse bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
              <div className="animate-pulse bg-gray-200 h-4 rounded w-full"></div>
            </div>
          </div>
        ) : addons.length > 0 && (infoHeader || addons.some(a => a.description)) ? (
          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <Info className="w-5 h-5 text-[#03adf0] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {infoHeader && (
                <div
                  className="text-xs sm:text-sm font-medium text-gray-800 mb-2"
                  dangerouslySetInnerHTML={{ __html: infoHeader }}
                />
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}


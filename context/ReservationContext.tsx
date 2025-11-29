'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { ReservationState, ReservationContextType, ReservationItem, ReservationCamp } from '@/types/reservation';
import { saveReservationState, loadReservationState } from '@/utils/sessionStorage';

const BASE_PRICE = 2200;

const getDefaultReservationState = (): ReservationState => {
  return {
    basePrice: BASE_PRICE,
    items: [
      {
        id: 'base',
        name: 'Cena podstawowa',
        price: BASE_PRICE,
        type: 'base',
      },
    ],
    totalPrice: BASE_PRICE,
  };
};

const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

interface ReservationProviderProps {
  children: ReactNode;
}

/**
 * ReservationProvider Component
 * Provides reservation state management for the entire application
 * Singleton pattern: single source of truth for reservation data
 */
export function ReservationProvider({ children }: ReservationProviderProps) {
  // Start with default state to avoid hydration mismatch
  const [reservation, setReservation] = useState<ReservationState>(getDefaultReservationState);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from sessionStorage only on client side after mount
  useEffect(() => {
    const savedState = loadReservationState();
    if (savedState) {
      setReservation(savedState);
    }
    setIsHydrated(true);
  }, []);

  // Save to sessionStorage whenever reservation state changes (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveReservationState(reservation);
    }
  }, [reservation, isHydrated]);

  const addReservationItem = useCallback((item: Omit<ReservationItem, 'id'>, customId?: string) => {
    setReservation((prev) => {
      // If customId is provided, check if item with that ID already exists
      if (customId) {
        const existingItemIndex = prev.items.findIndex(i => i.id === customId);
        if (existingItemIndex !== -1) {
          // Item already exists with this ID, don't add duplicate
          return prev;
        }
      }

      // For addon type, allow multiple items (don't replace)
      // For other types (diet, protection, promotion), only one can exist
      if (item.type === 'addon') {
        // Check if this exact addon already exists (by name)
        const existingAddon = prev.items.find(
          i => i.type === 'addon' && i.name === item.name
        );
        if (existingAddon) {
          // Addon already exists, don't add duplicate
          return prev;
        }
      } else if (item.type !== 'base') {
        // For non-addon types, replace existing item of the same type
        const existingItemIndex = prev.items.findIndex(
          (i) => i.type === item.type && i.type !== 'base'
        );
        if (existingItemIndex !== -1) {
          const newItems = [...prev.items];
          newItems[existingItemIndex] = { ...item, id: prev.items[existingItemIndex].id };
          const totalPrice = newItems.reduce((sum, item) => sum + item.price, 0);
          return {
            ...prev,
            items: newItems,
            totalPrice,
          };
        }
      }

      if (item.type === 'base') {
        // Don't add base if it already exists
        return prev;
      }

      // Add new item with custom ID or generate one
      const itemId = customId || `${item.type}-${Date.now()}`;
      const newItems = [...prev.items, { ...item, id: itemId }];
      const totalPrice = newItems.reduce((sum, item) => sum + item.price, 0);

      return {
        ...prev,
        items: newItems,
        totalPrice,
      };
    });
  }, []);

  const removeReservationItem = useCallback((id: string) => {
    setReservation((prev) => {
      // Don't allow removing base price
      if (id === 'base') return prev;

      const newItems = prev.items.filter((item) => item.id !== id);
      const totalPrice = newItems.reduce((sum, item) => sum + item.price, 0);

      return {
        ...prev,
        items: newItems,
        totalPrice,
      };
    });
  }, []);

  const removeReservationItemsByType = useCallback((type: ReservationItem['type']) => {
    setReservation((prev) => {
      // Don't allow removing base price by type
      if (type === 'base') return prev;

      const newItems = prev.items.filter((item) => item.type !== type);
      const totalPrice = newItems.reduce((sum, item) => sum + item.price, 0);

      return {
        ...prev,
        items: newItems,
        totalPrice,
      };
    });
  }, []);

  const updateReservationItem = useCallback((id: string, item: Partial<ReservationItem>) => {
    setReservation((prev) => {
      const newItems = prev.items.map((i) =>
        i.id === id ? { ...i, ...item } : i
      );
      const totalPrice = newItems.reduce((sum, item) => sum + item.price, 0);

      return {
        ...prev,
        items: newItems,
        totalPrice,
      };
    });
  }, []);

  const updateReservationCamp = useCallback((camp: ReservationCamp) => {
    setReservation((prev) => ({
      ...prev,
      camp,
    }));
  }, []);

  const resetReservation = useCallback(() => {
    setReservation(getDefaultReservationState());
  }, []);

  const value: ReservationContextType = {
    reservation,
    addReservationItem,
    removeReservationItem,
    removeReservationItemsByType,
    updateReservationItem,
    updateReservationCamp,
    resetReservation,
  };

  return (
    <ReservationContext.Provider value={value}>
      {children}
    </ReservationContext.Provider>
  );
}

/**
 * useReservation Hook
 * Custom hook to access reservation context
 * Throws error if used outside ReservationProvider
 */
export function useReservation(): ReservationContextType {
  const context = useContext(ReservationContext);
  if (context === undefined) {
    throw new Error('useReservation must be used within a ReservationProvider');
  }
  return context;
}


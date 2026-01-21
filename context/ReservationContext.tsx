'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

import type { ReservationState, ReservationContextType, ReservationItem, ReservationCamp } from '@/types/reservation';
import { saveReservationState, loadReservationState } from '@/utils/sessionStorage';

const DEFAULT_BASE_PRICE = 2200; // Fallback default, will be replaced by API value

const getDefaultReservationState = (): ReservationState => {
  return {
    basePrice: DEFAULT_BASE_PRICE,
    items: [
      {
        id: 'base',
        name: 'Cena podstawowa',
        price: DEFAULT_BASE_PRICE,
        type: 'base',
      },
    ],
    totalPrice: DEFAULT_BASE_PRICE,
    currentStep: 1,
    reservationNumber: null,
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
    setReservation((prev: ReservationState) => {
      // Don't add base if it already exists
      if (item.type === 'base') {
        return prev;
      }

      // If customId is provided, check if item with that ID already exists
      if (customId) {
        const existingItemIndex = prev.items.findIndex((i: ReservationItem) => i.id === customId);
        if (existingItemIndex !== -1) {
          // Item already exists with this ID, don't add duplicate
          return prev;
        }
      }

      // For addon and protection types, allow multiple items (don't replace)
      // For other types (diet, promotion), only one can exist
      if (item.type === 'addon' || item.type === 'protection') {
        // For protection/addon with customId, we already checked above
        // For protection/addon without customId, check by name to avoid duplicates
        if (!customId) {
          const existingItem = prev.items.find(
            (i: ReservationItem) => i.type === item.type && i.name === item.name,
          );
          if (existingItem) {
            // Item already exists, don't add duplicate
            return prev;
          }
        }
        // If we get here, either customId was provided (and doesn't exist) or no duplicate by name
        // Proceed to add the item
      } else {
        // For non-addon, non-protection types, replace existing item of the same type
        const existingItemIndex = prev.items.findIndex(
          (i: ReservationItem) => i.type === item.type,
        );
        if (existingItemIndex !== -1) {
          const newItems = [...prev.items];
          newItems[existingItemIndex] = { ...item, id: prev.items[existingItemIndex].id };
          const totalPrice = newItems.reduce((sum: number, item: ReservationItem) => sum + item.price, 0);
          return {
            ...prev,
            items: newItems,
            totalPrice,
          };
        }
      }

      // Add new item with custom ID or generate one
      const itemId = customId || `${item.type}-${Date.now()}`;
      const newItems = [...prev.items, { ...item, id: itemId }];
      const totalPrice = newItems.reduce((sum: number, item: ReservationItem) => sum + item.price, 0);

      return {
        ...prev,
        items: newItems,
        totalPrice,
      };
    });
  }, []);

  const removeReservationItem = useCallback((id: string) => {
    setReservation((prev: ReservationState) => {
      // Don't allow removing base price
      if (id === 'base') return prev;

      const newItems = prev.items.filter((item: ReservationItem) => item.id !== id);
      const totalPrice = newItems.reduce((sum: number, item: ReservationItem) => sum + item.price, 0);

      return {
        ...prev,
        items: newItems,
        totalPrice,
      };
    });
  }, []);

  const removeReservationItemsByType = useCallback((type: ReservationItem['type']) => {
    setReservation((prev: ReservationState) => {
      // Don't allow removing base price by type
      if (type === 'base') return prev;

      const newItems = prev.items.filter((item: ReservationItem) => item.type !== type);
      const totalPrice = newItems.reduce((sum: number, item: ReservationItem) => sum + item.price, 0);

      return {
        ...prev,
        items: newItems,
        totalPrice,
      };
    });
  }, []);

  const updateReservationItem = useCallback((id: string, item: Partial<ReservationItem>) => {
    setReservation((prev: ReservationState) => {
      const newItems = prev.items.map((i: ReservationItem) =>
        i.id === id ? { ...i, ...item } : i,
      );
      const totalPrice = newItems.reduce((sum: number, item: ReservationItem) => sum + item.price, 0);

      return {
        ...prev,
        items: newItems,
        totalPrice,
      };
    });
  }, []);

  const updateReservationCamp = useCallback((camp: ReservationCamp) => {
    setReservation((prev: ReservationState) => ({
      ...prev,
      camp,
    }));
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setReservation((prev: ReservationState) => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  const setReservationNumber = useCallback((reservationNumber: string | null) => {
    setReservation((prev: ReservationState) => ({
      ...prev,
      reservationNumber,
    }));
  }, []);

  const setBasePrice = useCallback((price: number) => {
    setReservation((prev: ReservationState) => {
      // Update basePrice
      const newBasePrice = price;

      // Update base item price
      const newItems = prev.items.map((item: ReservationItem) =>
        item.id === 'base' ? { ...item, price: newBasePrice } : item,
      );

      // Recalculate total price
      const totalPrice = newItems.reduce((sum: number, item: ReservationItem) => sum + item.price, 0);

      return {
        ...prev,
        basePrice: newBasePrice,
        items: newItems,
        totalPrice,
      };
    });
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
    setBasePrice,
    setCurrentStep,
    setReservationNumber,
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


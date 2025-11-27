'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { ReservationState, ReservationContextType, ReservationItem } from '@/types/reservation';
import { saveReservationState, loadReservationState } from '@/utils/sessionStorage';

const BASE_PRICE = 2200;

const getInitialReservationState = (): ReservationState => {
  // Try to load from sessionStorage first
  const savedState = loadReservationState();
  if (savedState) {
    return savedState;
  }
  
  // Otherwise return default state
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
  const [reservation, setReservation] = useState<ReservationState>(getInitialReservationState);

  // Save to sessionStorage whenever reservation state changes
  useEffect(() => {
    saveReservationState(reservation);
  }, [reservation]);

  const addReservationItem = useCallback((item: Omit<ReservationItem, 'id'>) => {
    setReservation((prev) => {
      // Check if item with same type already exists (for diet, only one can be selected)
      const existingItemIndex = prev.items.findIndex(
        (i) => i.type === item.type && i.type !== 'base'
      );

      let newItems: ReservationItem[];
      if (existingItemIndex !== -1 && item.type !== 'base') {
        // Replace existing item of the same type (keep existing ID)
        newItems = [...prev.items];
        newItems[existingItemIndex] = { ...item, id: prev.items[existingItemIndex].id };
      } else if (item.type === 'base') {
        // Don't add base if it already exists
        return prev;
      } else {
        // Add new item with type-based ID for easier tracking
        newItems = [...prev.items, { ...item, id: `${item.type}-${Date.now()}` }];
      }

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

  const resetReservation = useCallback(() => {
    setReservation(getInitialReservationState());
  }, []);

  const value: ReservationContextType = {
    reservation,
    addReservationItem,
    removeReservationItem,
    removeReservationItemsByType,
    updateReservationItem,
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


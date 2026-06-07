'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

export type PaymentStatusHeader = 'unpaid' | 'partial' | 'paid';

export interface ReservationPaymentHeaderValue {
  totalPrice: number;
  totalPaid: number;
  paymentStatus: PaymentStatusHeader;
  /** Gdy true – dane jeszcze się ładują, pokaż placeholder. */
  loading?: boolean;
}

interface ReservationPaymentHeaderContextType {
  value: ReservationPaymentHeaderValue | null;
  setPaymentHeader: (data: ReservationPaymentHeaderValue | null) => void;
}

const ReservationPaymentHeaderContext = createContext<ReservationPaymentHeaderContextType | null>(null);

export function useReservationPaymentHeader() {
  const ctx = useContext(ReservationPaymentHeaderContext);
  return ctx;
}

interface ReservationPaymentHeaderProviderProps {
  children: ReactNode;
  /** Gdy null/undefined – header płatności ukryty (np. poza stroną rezerwacji). */
  initialTotalPrice?: number | null;
}

export function ReservationPaymentHeaderProvider({ children, initialTotalPrice }: ReservationPaymentHeaderProviderProps) {
  const [value, setValue] = useState<ReservationPaymentHeaderValue | null>(() =>
    initialTotalPrice != null && Number.isFinite(initialTotalPrice)
      ? { totalPrice: initialTotalPrice, totalPaid: 0, paymentStatus: 'unpaid' as const }
      : null
  );

  const setPaymentHeader = useCallback((data: ReservationPaymentHeaderValue | null) => {
    setValue(data);
  }, []);

  return (
    <ReservationPaymentHeaderContext.Provider value={{ value, setPaymentHeader }}>
      {children}
    </ReservationPaymentHeaderContext.Provider>
  );
}

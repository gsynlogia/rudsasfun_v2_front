/**
 * Reservation Types and Interfaces
 * Centralized type definitions for the reservation system
 */

export type StepNumber = 1 | 2 | 3 | 4 | 5;

export interface Step {
  number: StepNumber;
  label: string;
  active: boolean;
  completed: boolean;
}

export interface StepNavigationProps {
  currentStep: StepNumber;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onStepClick: (step: StepNumber) => void;
}

export interface LayoutProps {
  currentStep: StepNumber;
  completedSteps: StepNumber[];
  onStepClick: (step: StepNumber) => void;
  children: React.ReactNode;
}

export interface StepComponentProps {
  onNext?: () => void;
  onPrevious?: () => void;
}

/**
 * Reservation State Management Types
 */
export interface ReservationItem {
  id: string;
  name: string;
  price: number;
  type: 'base' | 'diet' | 'accommodation' | 'addon' | 'protection' | 'promotion' | 'other';
}

export interface ReservationState {
  basePrice: number;
  items: ReservationItem[];
  totalPrice: number;
}

export interface ReservationContextType {
  reservation: ReservationState;
  addReservationItem: (item: Omit<ReservationItem, 'id'>, customId?: string) => void;
  removeReservationItem: (id: string) => void;
  removeReservationItemsByType: (type: ReservationItem['type']) => void;
  updateReservationItem: (id: string, item: Partial<ReservationItem>) => void;
  resetReservation: () => void;
}

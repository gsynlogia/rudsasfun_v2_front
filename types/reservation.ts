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

/**
 * CampProperty interface - 1:1 with backend CampPropertyResponse
 * All fields match exactly with backend JSON response
 */
export interface CampProperty {
  id: number;
  camp_id: number;
  period: string; // "lato" | "zima"
  city: string;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  days_count: number;
  created_at?: string | null; // ISO datetime string or null
  updated_at?: string | null; // ISO datetime string or null
}

/**
 * Camp interface - 1:1 with backend CampResponse
 * All fields match exactly with backend JSON response
 */
export interface Camp {
  id: number;
  name: string;
  created_at?: string | null; // ISO datetime string or null
  updated_at?: string | null; // ISO datetime string or null
  properties?: CampProperty[] | null; // Optional list of properties
}

/**
 * CampWithProperty interface - 1:1 with backend CampWithPropertyResponse
 * All fields match exactly with backend JSON response
 */
export interface CampWithProperty {
  camp: Camp;
  property: CampProperty;
}

export interface LayoutProps {
  currentStep: StepNumber;
  completedSteps: StepNumber[];
  onStepClick?: (step: StepNumber) => void;
  children: React.ReactNode;
  campData?: CampWithProperty;
  isDisabled?: boolean; // When camp/edition doesn't exist
}

export interface StepComponentProps {
  onNext?: () => void;
  onPrevious?: () => void;
  disabled?: boolean; // When camp/edition doesn't exist, form should be disabled
}

/**
 * Reservation State Management Types
 */
export interface ReservationItem {
  id: string;
  name: string;
  price: number;
  type: 'base' | 'diet' | 'accommodation' | 'addon' | 'protection' | 'promotion' | 'transport' | 'source' | 'other';
}

export interface ReservationCampProperties {
  period: string;
  city: string;
  start_date: string;
  end_date: string;
}

export interface ReservationCamp {
  id: number;
  name: string;
  properties: ReservationCampProperties;
}

export interface ReservationState {
  basePrice: number;
  items: ReservationItem[];
  totalPrice: number;
  camp?: ReservationCamp; // Information about the camp being reserved
}

export interface ReservationContextType {
  reservation: ReservationState;
  addReservationItem: (item: Omit<ReservationItem, 'id'>, customId?: string) => void;
  removeReservationItem: (id: string) => void;
  removeReservationItemsByType: (type: ReservationItem['type']) => void;
  updateReservationItem: (id: string, item: Partial<ReservationItem>) => void;
  updateReservationCamp: (camp: ReservationCamp) => void;
  resetReservation: () => void;
}

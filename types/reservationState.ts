import { ReservationCamp } from './reservationCamp';
import { ReservationItem } from './reservationItem';

export interface ReservationState {
  basePrice: number;
  items: ReservationItem[];
  totalPrice: number;
  camp?: ReservationCamp;
  currentStep: number;
  reservationNumber?: string | null;
}
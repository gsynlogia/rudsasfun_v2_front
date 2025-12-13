import { ReservationItem } from './reservationItem';
import { ReservationCamp } from './reservationCamp';

export interface ReservationState {
  basePrice: number;
  items: ReservationItem[];
  totalPrice: number;
  camp?: ReservationCamp;
}


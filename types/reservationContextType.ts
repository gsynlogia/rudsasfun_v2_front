import { ReservationState } from './reservationState';
import { ReservationItem } from './reservationItem';
import { ReservationCamp } from './reservationCamp';

export interface ReservationContextType {
  reservation: ReservationState;
  addReservationItem: (item: Omit<ReservationItem, 'id'>, customId?: string) => void;
  removeReservationItem: (id: string) => void;
  removeReservationItemsByType: (type: ReservationItem['type']) => void;
  updateReservationItem: (id: string, item: Partial<ReservationItem>) => void;
  updateReservationCamp: (camp: ReservationCamp) => void;
  resetReservation: () => void;
}


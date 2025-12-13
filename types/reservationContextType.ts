import { ReservationCamp } from './reservationCamp';
import { ReservationItem } from './reservationItem';
import { ReservationState } from './reservationState';

export interface ReservationContextType {
  reservation: ReservationState;
  addReservationItem: (item: Omit<ReservationItem, 'id'>, customId?: string) => void;
  removeReservationItem: (id: string) => void;
  removeReservationItemsByType: (type: ReservationItem['type']) => void;
  updateReservationItem: (id: string, item: Partial<ReservationItem>) => void;
  updateReservationCamp: (camp: ReservationCamp) => void;
  setBasePrice: (price: number) => void;
  resetReservation: () => void;
}


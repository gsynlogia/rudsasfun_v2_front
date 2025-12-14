import { ReservationCampProperties } from './reservationCampProperties';

export interface ReservationCamp {
  id: number;
  name: string;
  properties: ReservationCampProperties;
}

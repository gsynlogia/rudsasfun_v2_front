export interface ReservationCampProperties {
  period: string;
  city: string;
  start_date: string;
  end_date: string;
  min_age?: number | null;
  max_age?: number | null;
}
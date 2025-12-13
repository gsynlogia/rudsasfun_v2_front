import { TransportCity } from './transportCity';

export interface CampPropertyTransport {
  id: number;
  name?: string | null;
  property_id?: number | null;
  camp_ids?: number[];
  departure_type: 'collective' | 'own';
  departure_city?: string | null;
  departure_collective_price?: number | null;
  departure_own_price?: number | null;
  return_type: 'collective' | 'own';
  return_city?: string | null;
  return_collective_price?: number | null;
  return_own_price?: number | null;
  cities?: TransportCity[];
  created_at?: string | null;
  updated_at?: string | null;
}


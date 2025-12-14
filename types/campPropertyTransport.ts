import { TransportCity } from './transportCity';

export interface CampPropertyTransport {
  id: number;
  property_id: number | null;
  name: string | null;
  departure_type: 'collective' | 'own';
  return_type: 'collective' | 'own';
  departure_city?: string | null;
  return_city?: string | null;
  departure_collective_price?: number | null;
  departure_own_price?: number | null;
  return_collective_price?: number | null;
  return_own_price?: number | null;
  camp_ids?: number[];
  cities?: TransportCity[];
  created_at?: string | null;
  updated_at?: string | null;
}

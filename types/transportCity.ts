export interface TransportCity {
  id: number;
  transport_id: number;
  city: string;
  departure_price: number;
  return_price: number | null;
  display_order: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}
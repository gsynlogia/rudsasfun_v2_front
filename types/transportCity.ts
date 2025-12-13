export interface TransportCity {
  id: number;
  transport_id: number;
  city: string;
  departure_price?: number | null;
  return_price?: number | null;
  display_order?: number;
  created_at?: string | null;
  updated_at?: string | null;
}


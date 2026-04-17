export interface ReservationItem {
  id: string;
  name: string;
  price: number;
  type: 'base' | 'diet' | 'accommodation' | 'addon' | 'protection' | 'promotion' | 'promo_code' | 'transport' | 'source' | 'other';
  metadata?: {
    originalPrice?: number;
    doesNotReducePrice?: boolean;
  };
}
export interface ReservationItem {
  id: string;
  name: string;
  price: number;
  type: 'base' | 'diet' | 'accommodation' | 'addon' | 'protection' | 'promotion' | 'transport' | 'source' | 'other';
  metadata?: {
    originalPrice?: number;
    doesNotReducePrice?: boolean;
  };
}

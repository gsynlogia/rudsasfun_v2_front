export interface ReservationStorageState {
  basePrice: number;
  items: Array<{
    id: string;
    name: string;
    price: number;
    type: 'base' | 'diet' | 'accommodation' | 'addon' | 'protection' | 'promotion' | 'transport' | 'source' | 'other';
  }>;
  totalPrice: number;
  camp?: {
    id: number;
    name: string;
    properties: {
      period: string;
      city: string;
      start_date: string;
      end_date: string;
    };
  };
}


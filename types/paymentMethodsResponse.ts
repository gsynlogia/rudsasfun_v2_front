export interface PaymentMethod {
  id: number;
  name: string;
  [key: string]: any;
}

export interface PaymentMethodsResponse {
  banks: PaymentMethod[];
  cards: PaymentMethod[];
  wallets: PaymentMethod[];
  installments: PaymentMethod[];
  other: PaymentMethod[];
}

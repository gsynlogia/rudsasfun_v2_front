export interface PaymentMethod {
  id: number;
  name: string;
  full_name: string;
  image: Record<string, string> | null;
  instant_redirection: boolean;
}

export interface PaymentMethodsResponse {
  banks: PaymentMethod[];
  cards: PaymentMethod[];
  wallets: PaymentMethod[];
  installments: PaymentMethod[];
  other: PaymentMethod[];
}


export interface Step5FormData {
  payNow: boolean;
  paymentMethod: 'online' | 'transfer' | 'blik' | '';
  paymentAmount: 'full' | 'deposit' | '';
  paymentInstallments?: 'full' | '2' | '3';
}


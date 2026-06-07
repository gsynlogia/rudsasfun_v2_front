export interface CreatePaymentRequest {
  amount: number;
  description: string;
  order_id: string;
  payer_email: string;
  payer_name?: string;
  channel_id?: number;
  blik_code?: string;
  success_url?: string;
  error_url?: string;
}
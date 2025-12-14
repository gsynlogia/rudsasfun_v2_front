export interface CreatePaymentResponse {
  transaction_id: string;
  status: string;
  payment_url: string | null;
  title: string;
  order_id: string;
}

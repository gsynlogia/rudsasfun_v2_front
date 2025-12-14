export interface PaymentStatusResponse {
  transaction_id: string;
  order_id: string | null;
  status: string;
  amount: number | null;
  paid_amount: number | null;
  payer_email: string | null;
  created_at: string | null;
  paid_at: string | null;
  payment_date: string | null;
}

export interface PaymentResponse {
  id: number;
  transaction_id: string;
  order_id: string;
  amount: number;
  paid_amount: number | null;
  description: string | null;
  status: string;
  payer_email: string;
  payer_name: string | null;
  channel_id: number | null;
  payment_url: string | null;
  title: string | null;
  created_at: string;
  paid_at: string | null;
  payment_date: string | null;
  webhook_received_at: string | null;
}
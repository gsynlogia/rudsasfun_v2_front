export interface InvoiceResponse {
  id: number;
  reservation_id: number;
  user_id: number;
  fakturownia_invoice_id: number;
  invoice_number: string;
  invoice_pdf_path: string | null;
  total_amount: number;
  net_amount: number;
  tax_amount: number;
  is_paid: boolean;
  paid_at: string | null;
  is_canceled: boolean;
  canceled_at: string | null;
  issue_date: string;
  sell_date: string;
  payment_to: string;
  buyer_name: string;
  buyer_tax_no: string | null;
  buyer_email: string | null;
  created_at: string;
  updated_at: string;
}


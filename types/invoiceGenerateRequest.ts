export interface InvoiceGenerateRequest {
  reservation_id: number;
  selected_items: string[];
  buyer_tax_no?: string;
}


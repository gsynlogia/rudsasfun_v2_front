import { InvoiceResponse } from './invoiceResponse';

export interface InvoiceListResponse {
  invoices: InvoiceResponse[];
  total: number;
}


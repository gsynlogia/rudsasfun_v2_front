/**
 * Manual Invoice Service
 * Service for managing manual invoice entries
 */
import { authenticatedApiCall } from '@/utils/api-auth';

export interface ManualInvoiceResponse {
  id: number;
  reservation_id: number;
  user_id: number;
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
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

export interface ManualInvoiceCreate {
  reservation_id: number;
  user_id: number;
  invoice_number: string;
  invoice_pdf_path?: string | null;
  total_amount: number;
  net_amount: number;
  tax_amount: number;
  is_paid?: boolean;
  paid_at?: string | null;
  is_canceled?: boolean;
  canceled_at?: string | null;
  issue_date: string;
  sell_date: string;
  payment_to: string;
  buyer_name: string;
  buyer_tax_no?: string | null;
  buyer_email?: string | null;
  notes?: string | null;
}

export interface ManualInvoiceUpdate {
  invoice_number?: string;
  invoice_pdf_path?: string | null;
  total_amount?: number;
  net_amount?: number;
  tax_amount?: number;
  is_paid?: boolean;
  paid_at?: string | null;
  is_canceled?: boolean;
  canceled_at?: string | null;
  issue_date?: string;
  sell_date?: string;
  payment_to?: string;
  buyer_name?: string;
  buyer_tax_no?: string | null;
  buyer_email?: string | null;
  notes?: string | null;
}

class ManualInvoiceService {
  /**
   * Get all manual invoices for a reservation
   */
  async getByReservation(reservationId: number): Promise<ManualInvoiceResponse[]> {
    return authenticatedApiCall<ManualInvoiceResponse[]>(
      `/api/manual-invoices/reservation/${reservationId}`,
    );
  }

  /**
   * Get a specific manual invoice by ID
   */
  async getById(invoiceId: number): Promise<ManualInvoiceResponse> {
    return authenticatedApiCall<ManualInvoiceResponse>(
      `/api/manual-invoices/${invoiceId}`,
    );
  }

  /**
   * Create a new manual invoice
   */
  async create(invoice: ManualInvoiceCreate): Promise<ManualInvoiceResponse> {
    return authenticatedApiCall<ManualInvoiceResponse>(
      '/api/manual-invoices',
      {
        method: 'POST',
        body: JSON.stringify(invoice),
      },
    );
  }

  /**
   * Update a manual invoice
   */
  async update(invoiceId: number, invoice: ManualInvoiceUpdate): Promise<ManualInvoiceResponse> {
    return authenticatedApiCall<ManualInvoiceResponse>(
      `/api/manual-invoices/${invoiceId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(invoice),
      },
    );
  }

  /**
   * Delete a manual invoice
   */
  async delete(invoiceId: number): Promise<void> {
    return authenticatedApiCall<void>(
      `/api/manual-invoices/${invoiceId}`,
      {
        method: 'DELETE',
      },
    );
  }
}

export const manualInvoiceService = new ManualInvoiceService();
/**
 * Invoice Service
 * Service for managing invoices via API
 */
import { API_BASE_URL } from '@/utils/api-config';
import { authService } from './AuthService';

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

export interface InvoiceListResponse {
  invoices: InvoiceResponse[];
  total: number;
}

export interface InvoiceGenerateRequest {
  reservation_id: number;
  selected_items: string[];
  buyer_tax_no?: string;
}

class InvoiceService {
  /**
   * Generate invoice for selected payment items
   */
  async generateInvoice(request: InvoiceGenerateRequest): Promise<InvoiceResponse> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const response = await fetch(`${API_BASE_URL}/api/invoices/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas generowania faktury' }));
      throw new Error(error.detail || 'Błąd podczas generowania faktury');
    }

    return response.json();
  }

  /**
   * Get all invoices for current user
   */
  async getMyInvoices(): Promise<InvoiceListResponse> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const response = await fetch(`${API_BASE_URL}/api/invoices/my`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas pobierania faktur' }));
      throw new Error(error.detail || 'Błąd podczas pobierania faktur');
    }

    return response.json();
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoice(invoiceId: number): Promise<Blob> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const response = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas pobierania faktury' }));
      throw new Error(error.detail || 'Błąd podczas pobierania faktury');
    }

    return response.blob();
  }

  /**
   * Get invoice PDF download URL
   * Note: Backend uses Authorization header, not query parameter
   */
  getInvoicePdfUrl(invoiceId: number): string {
    return `${API_BASE_URL}/api/invoices/${invoiceId}/pdf`;
  }

  /**
   * Get all invoices for a specific reservation (admin only)
   */
  async getInvoicesByReservation(reservationId: number): Promise<InvoiceListResponse> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const response = await fetch(`${API_BASE_URL}/api/invoices/reservation/${reservationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas pobierania faktur' }));
      throw new Error(error.detail || 'Błąd podczas pobierania faktur');
    }

    return response.json();
  }

  /**
   * Cancel an invoice (admin only)
   */
  async cancelInvoice(invoiceId: number): Promise<void> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const response = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas anulowania faktury' }));
      throw new Error(error.detail || 'Błąd podczas anulowania faktury');
    }
  }
}

export const invoiceService = new InvoiceService();


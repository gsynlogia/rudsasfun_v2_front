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
  issue_date: string;
  sell_date: string;
  payment_to: string;
  buyer_name: string;
  buyer_tax_no: string | null;
  buyer_email: string | null;
  is_canceled?: boolean;
  canceled_at?: string | null;
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
      let errorMessage = 'Błąd podczas generowania faktury';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.detail || error.message || `HTTP ${response.status}: ${response.statusText}`;
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText || 'Błąd podczas generowania faktury'}`;
      }
      throw new Error(errorMessage);
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

    try {
      const response = await fetch(`${API_BASE_URL}/api/invoices/my`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // For 500 errors (Internal Server Error), return empty list instead of throwing
        // This allows the UI to continue working even if backend has issues
        if (response.status === 500) {
          console.error('[InvoiceService] Backend error (500): Internal server error. Returning empty invoice list.');
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const error = await response.json();
              console.error('[InvoiceService] Error details:', error);
            }
          } catch {
            // Ignore parsing errors for error responses
          }
          // Return empty list to allow UI to continue
          return { invoices: [], total: 0 };
        }

        // For other errors, try to parse error response
        let errorMessage = 'Błąd podczas pobierania faktur';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.detail || error.message || `HTTP ${response.status}: ${response.statusText}`;
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch {
          // If parsing fails, use status-based message
          errorMessage = `HTTP ${response.status}: ${response.statusText || 'Błąd podczas pobierania faktur'}`;
        }
        throw new Error(errorMessage);
      }

      // Check if response has content before trying to parse JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Return empty response if not JSON
        return { invoices: [], total: 0 };
      }

      return await response.json();
    } catch (error) {
      // Re-throw if it's already an Error with message
      if (error instanceof Error) {
        throw error;
      }
      // Otherwise wrap in Error
      throw new Error('Błąd podczas pobierania faktur');
    }
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
      let errorMessage = 'Błąd podczas pobierania faktury';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.detail || error.message || `HTTP ${response.status}: ${response.statusText}`;
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText || 'Błąd podczas pobierania faktury'}`;
      }
      throw new Error(errorMessage);
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
   * Get invoices by reservation ID
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
      let errorMessage = 'Błąd podczas pobierania faktur';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.detail || error.message || `HTTP ${response.status}: ${response.statusText}`;
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText || 'Błąd podczas pobierania faktur'}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * List all invoices (admin only)
   */
  async listInvoices(skip: number = 0, limit: number = 1000): Promise<InvoiceResponse[]> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const response = await fetch(`${API_BASE_URL}/api/invoices?skip=${skip}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = 'Błąd podczas pobierania faktur';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.detail || error.message || `HTTP ${response.status}: ${response.statusText}`;
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText || 'Błąd podczas pobierania faktur'}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Get invoice by ID
   */
  async getById(invoiceId: number): Promise<InvoiceResponse> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const response = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = 'Błąd podczas pobierania faktury';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.detail || error.message || `HTTP ${response.status}: ${response.statusText}`;
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText || 'Błąd podczas pobierania faktury'}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Cancel an invoice
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
      let errorMessage = 'Błąd podczas anulowania faktury';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.detail || error.message || `HTTP ${response.status}: ${response.statusText}`;
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText || 'Błąd podczas anulowania faktury'}`;
      }
      throw new Error(errorMessage);
    }
  }
}

export const invoiceService = new InvoiceService();
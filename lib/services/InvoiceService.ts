/**
 * Invoice Service
 * Singleton service for managing invoices via API
 */
import { InvoiceGenerateRequest } from '@/types/invoiceGenerateRequest';
import { InvoiceListResponse } from '@/types/invoiceListResponse';
import { InvoiceResponse } from '@/types/invoiceResponse';
import { API_BASE_URL } from '@/utils/api-config';

import { authService } from './AuthService';

export type { InvoiceResponse, InvoiceListResponse, InvoiceGenerateRequest };

class InvoiceService {
  private static instance: InvoiceService;

  private constructor() {}

  static getInstance(): InvoiceService {
    if (!InvoiceService.instance) {
      InvoiceService.instance = new InvoiceService();
    }
    return InvoiceService.instance;
  }
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

export const invoiceService = InvoiceService.getInstance();


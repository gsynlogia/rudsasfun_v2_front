/**
 * Manual Payment Service
 * Service for managing manual payment entries
 */
import { authenticatedApiCall, authenticatedFetch } from '@/utils/api-auth';

import { authService } from './AuthService';

export interface ManualPaymentResponse {
  id: number;
  reservation_id: number;
  user_id: number;
  amount: number;
  description: string | null;
  payment_method: string | null;
  payment_date: string;
  attachment_path: string | null;
  attachment_filename: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

export interface ManualPaymentCreate {
  reservation_id: number;
  user_id: number;
  amount: number;
  description?: string | null;
  payment_method?: string | null;
  payment_date: string;
}

export interface ManualPaymentUpdate {
  amount?: number;
  description?: string | null;
  payment_method?: string | null;
  payment_date?: string;
}

class ManualPaymentService {
  /**
   * Get all manual payments for a reservation
   */
  async getByReservation(reservationId: number): Promise<ManualPaymentResponse[]> {
    return authenticatedApiCall<ManualPaymentResponse[]>(
      `/api/manual-payments/reservation/${reservationId}`,
    );
  }

  /**
   * Get all manual payments (admin only)
   * Used for bulk fetching to optimize frontend performance
   */
  async getAll(skip: number = 0, limit: number = 1000): Promise<ManualPaymentResponse[]> {
    return authenticatedApiCall<ManualPaymentResponse[]>(
      `/api/manual-payments?skip=${skip}&limit=${limit}`,
    );
  }

  /**
   * Get a specific manual payment by ID
   */
  async getById(paymentId: number): Promise<ManualPaymentResponse> {
    return authenticatedApiCall<ManualPaymentResponse>(
      `/api/manual-payments/${paymentId}`,
    );
  }

  /**
   * Create a new manual payment
   */
  async create(payment: ManualPaymentCreate): Promise<ManualPaymentResponse> {
    return authenticatedApiCall<ManualPaymentResponse>(
      '/api/manual-payments',
      {
        method: 'POST',
        body: JSON.stringify(payment),
      },
    );
  }

  /**
   * Update a manual payment
   */
  async update(paymentId: number, payment: ManualPaymentUpdate): Promise<ManualPaymentResponse> {
    return authenticatedApiCall<ManualPaymentResponse>(
      `/api/manual-payments/${paymentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payment),
      },
    );
  }

  /**
   * Delete a manual payment
   */
  async delete(paymentId: number): Promise<void> {
    return authenticatedApiCall<void>(
      `/api/manual-payments/${paymentId}`,
      {
        method: 'DELETE',
      },
    );
  }

  /**
   * Upload attachment for a manual payment
   */
  async uploadAttachment(paymentId: number, file: File): Promise<{ attachment_path: string; attachment_filename: string; message: string }> {
    const { API_BASE_URL } = await import('@/utils/api-config');

    const formData = new FormData();
    formData.append('file', file);

    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/manual-payments/${paymentId}/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Delete attachment from a manual payment
   */
  async deleteAttachment(paymentId: number): Promise<{ message: string }> {
    return authenticatedApiCall<{ message: string }>(
      `/api/manual-payments/${paymentId}/attachment`,
      {
        method: 'DELETE',
      },
    );
  }

  /**
   * Get attachment download URL
   */
  getAttachmentUrl(paymentId: number): string {
    // This will be used in a link, so we need to get the token and add it as a query param
    // or use authenticatedFetch in the onClick handler
    const _token = authService.getToken();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { API_BASE_URL } = require('@/utils/api-config');
    return `${API_BASE_URL}/api/manual-payments/${paymentId}/attachment`;
  }
}

export const manualPaymentService = new ManualPaymentService();
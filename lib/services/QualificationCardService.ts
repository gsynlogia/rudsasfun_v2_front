/**
 * Qualification Card Service
 * Singleton service for handling qualification card operations with backend API
 */

import type { QualificationCardDataResponse, QualificationCardDataUpdate } from '@/types/qualificationCardDataResponse';
import { QualificationCardResponse } from '@/types/qualificationCardResponse';
import { API_BASE_URL } from '@/utils/api-config';

export type { QualificationCardResponse };

class QualificationCardService {
  private static instance: QualificationCardService;

  private constructor() {}

  static getInstance(): QualificationCardService {
    if (!QualificationCardService.instance) {
      QualificationCardService.instance = new QualificationCardService();
    }
    return QualificationCardService.instance;
  }
  private API_URL = `${API_BASE_URL}/api/qualification-cards`;

  /**
   * Get qualification card PDF download URL
   * @param reservationId Reservation ID
   * @returns URL to download qualification card PDF
   */
  getQualificationCardDownloadUrl(reservationId: number): string {
    return `${this.API_URL}/${reservationId}`;
  }

  /**
   * Download qualification card PDF
   * Downloads the card that was automatically generated when reservation was created
   * @param reservationId Reservation ID
   */
  async downloadQualificationCard(reservationId: number): Promise<void> {
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(`${this.API_URL}/${reservationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }

      // Get blob and create download link
      const blob = await response.blob();
      this._downloadBlob(blob, reservationId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again in a moment.');
      }
      throw error;
    }
  }

  /**
   * Helper method to download blob
   */
  private _downloadBlob(blob: Blob, reservationId: number): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `karta_kwalifikacyjna_${reservationId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * List all qualification cards for the current user
   * @returns Array of qualification card information
   */
  async listMyQualificationCards(): Promise<QualificationCardResponse[]> {
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.API_URL}/my`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Generate qualification card for a reservation
   * @param reservationId Reservation ID
   * @returns Response with card path
   */
  async generateQualificationCard(reservationId: number): Promise<{ status: string; message: string; card_path: string }> {
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.API_URL}/${reservationId}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Check if qualification card exists for a reservation
   * @param reservationId Reservation ID
   * @returns QualificationCardResponse if exists, null otherwise
   */
  async getQualificationCard(reservationId: number): Promise<QualificationCardResponse | null> {
    try {
      const cards = await this.listMyQualificationCards();
      const card = cards.find(c => c.reservation_id === reservationId);
      return card || null;
    } catch {
      // If error, card doesn't exist
      return null;
    }
  }

  /**
   * Update qualification card status (admin only)
   * @param reservationId Reservation ID
   * @param status 'approved' or 'rejected'
   * @param rejectionReason Required if status is 'rejected'
   */
  async updateQualificationCardStatus(
    reservationId: number,
    status: 'approved' | 'rejected',
    rejectionReason?: string,
  ): Promise<{ status: string; message: string; qualification_card_status: string; rejection_reason?: string | null }> {
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const body: { status: string; rejection_reason?: string } = { status };
    if (status === 'rejected') {
      if (!rejectionReason || !rejectionReason.trim()) {
        throw new Error('Powód odrzucenia karty kwalifikacyjnej jest wymagany');
      }
      body.rejection_reason = rejectionReason.trim();
    }

    const response = await fetch(`${this.API_URL}/${reservationId}/status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Upload qualification card file (user can upload when card is rejected)
   * @param reservationId Reservation ID
   * @param file File to upload
   */
  async uploadQualificationCard(reservationId: number, file: File): Promise<{
    id: number;
    reservation_id: number;
    file_name: string;
    source: string;
    uploaded_at: string;
  }> {
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.API_URL}/${reservationId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get all qualification card files for a reservation (ordered by uploaded_at DESC)
   * @param reservationId Reservation ID
   */
  async getQualificationCardFiles(reservationId: number): Promise<Array<{
    id: number;
    reservation_id: number;
    file_name: string;
    file_path: string;
    source: string;
    uploaded_at: string;
    created_at: string;
  }>> {
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.API_URL}/${reservationId}/files`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get qualification card data for a reservation
   * @param reservationId Reservation ID
   */
  async getQualificationCardData(reservationId: number): Promise<QualificationCardDataResponse> {
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.API_URL}/${reservationId}/data`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Create or update qualification card data for a reservation
   * @param reservationId Reservation ID
   * @param data Qualification card data
   */
  async saveQualificationCardData(
    reservationId: number,
    data: QualificationCardDataUpdate,
  ): Promise<QualificationCardDataResponse> {
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.API_URL}/${reservationId}/data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Check if qualification card can be generated
   * @param reservationId Reservation ID
   */
  async canGenerateQualificationCard(reservationId: number): Promise<{ can_generate: boolean; message: string }> {
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.API_URL}/${reservationId}/can-generate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}

export const qualificationCardService = QualificationCardService.getInstance();

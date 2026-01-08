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
   * Get qualification card HTML URL for opening in new tab
   * @param reservationId Reservation ID
   * @returns URL to open qualification card HTML in new tab
   */
  getQualificationCardHtmlUrl(reservationId: number): string {
    const url = `${this.API_URL}/${reservationId}/html`;
    console.log('QualificationCard HTML URL:', url);
    return url;
  }

  /**
   * Download qualification card PDF
   * Downloads the card that was automatically generated when reservation was created
   * @param reservationId Reservation ID
   * @returns Blob of the PDF file
   */
  async downloadQualificationCard(reservationId: number): Promise<Blob> {
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
      return blob;
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
   * @param status 'pending', 'approved' or 'rejected'
   * @param rejectionReason Required if status is 'rejected'
   */
  async updateQualificationCardStatus(
    reservationId: number,
    status: 'pending' | 'approved' | 'rejected',
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
   * Download a specific qualification card file by ID
   * @param fileId Qualification card file ID
   */
  async downloadQualificationCardFile(fileId: number): Promise<Blob> {
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.API_URL}/file/${fileId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    // Get blob and create download link
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `karta_kwalifikacyjna_${fileId}.pdf`;
    if (contentDisposition) {
      // Try different patterns for Content-Disposition
      // Format: filename="file.pdf" or filename=file.pdf or filename*=UTF-8''file.pdf
      const patterns = [
        /filename\*?=['"]?([^'";]+)['"]?/i,
        /filename\*?=UTF-8''(.+)/i,
        /filename=(.+)/i
      ];
      
      for (const pattern of patterns) {
        const match = contentDisposition.match(pattern);
        if (match && match[1]) {
          filename = match[1].trim();
          // Remove any trailing quotes or semicolons
          filename = filename.replace(/['";]+$/, '');
          break;
        }
      }
    }
    
    // Ensure filename ends with .pdf
    if (!filename.toLowerCase().endsWith('.pdf')) {
      filename = filename.replace(/\.pdf_?$/i, '') + '.pdf';
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return blob;
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

    try {
      const url = `${this.API_URL}/${reservationId}/data`;
      console.log('[QualificationCardService] Fetching data from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[QualificationCardService] Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorText = await response.text();
          console.log('[QualificationCardService] Error response text:', errorText);
          
          if (errorText) {
            try {
              const error = JSON.parse(errorText);
              errorMessage = error.detail || error.message || errorMessage;
            } catch {
              // If JSON parsing fails, use the text as is
              errorMessage = errorText || errorMessage;
            }
          }
        } catch (parseError) {
          console.error('[QualificationCardService] Error parsing error response:', parseError);
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      console.log('[QualificationCardService] Response text:', responseText);
      
      if (!responseText) {
        throw new Error('Empty response from server');
      }

      try {
        const data = JSON.parse(responseText);
        console.log('[QualificationCardService] Parsed data:', data);
        return data;
      } catch (parseError) {
        console.error('[QualificationCardService] Error parsing response JSON:', parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
    } catch (error) {
      console.error('[QualificationCardService] Error in getQualificationCardData:', error);
      // Re-throw if it's already an Error with a message
      if (error instanceof Error) {
        throw error;
      }
      // Otherwise wrap in Error
      throw new Error(`Failed to fetch qualification card data: ${String(error)}`);
    }
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

  /**
   * Check if HTML qualification card file exists for a reservation
   * @param reservationId Reservation ID
   */
  async checkHtmlExists(reservationId: number): Promise<{ exists: boolean; reservation_id: number; reason?: string }> {
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.API_URL}/${reservationId}/html-exists`, {
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
   * Update reservation health info (accommodation, health questions, health details, additional notes, participant additional info)
   * @param reservationId Reservation ID
   * @param data Health info data
   */
  async updateReservationHealthInfo(
    reservationId: number,
    data: {
      accommodation_request?: string;
      health_questions?: {
        chronicDiseases: string;
        dysfunctions: string;
        psychiatric: string;
      };
      health_details?: {
        chronicDiseases: string;
        dysfunctions: string;
        psychiatric: string;
      };
      additional_notes?: string;
      participant_additional_info?: string;
    },
  ): Promise<void> {
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/api/reservations/${reservationId}/health-info`, {
      method: 'PATCH',
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
  }
}

export const qualificationCardService = QualificationCardService.getInstance();

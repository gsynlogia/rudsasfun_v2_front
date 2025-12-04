/**
 * Qualification Card Service
 * Service for managing qualification cards via API
 */
import { API_BASE_URL } from '@/utils/api-config';
import { authService } from './AuthService';

export interface QualificationCardResponse {
  id: number;
  reservation_id: number;
  file_path: string;
  file_name: string;
  uploaded_at: string;
  updated_at: string;
  file_url: string;
}

export interface QualificationCardUploadResponse {
  id: number;
  reservation_id: number;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

class QualificationCardService {
  /**
   * Upload qualification card PDF for a reservation
   */
  async uploadQualificationCard(reservationId: number, file: File): Promise<QualificationCardUploadResponse> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/qualification-cards/upload?reservation_id=${reservationId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas przesyłania karty kwalifikacyjnej' }));
      throw new Error(error.detail || 'Błąd podczas przesyłania karty kwalifikacyjnej');
    }

    return response.json();
  }

  /**
   * Get qualification card for a reservation
   * Returns null if card doesn't exist (404), throws error for other errors
   */
  async getQualificationCard(reservationId: number): Promise<QualificationCardResponse | null> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const response = await fetch(`${API_BASE_URL}/api/qualification-cards/reservation/${reservationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // 404 is expected if card doesn't exist yet - return null
      if (response.status === 404) {
        return null;
      }
      // For other errors, throw
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas pobierania karty kwalifikacyjnej' }));
      throw new Error(error.detail || 'Błąd podczas pobierania karty kwalifikacyjnej');
    }

    return response.json();
  }

  /**
   * Download qualification card PDF
   */
  async downloadQualificationCard(cardId: number): Promise<Blob> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const response = await fetch(`${API_BASE_URL}/api/qualification-cards/${cardId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas pobierania karty kwalifikacyjnej' }));
      throw new Error(error.detail || 'Błąd podczas pobierania karty kwalifikacyjnej');
    }

    return response.blob();
  }
}

export const qualificationCardService = new QualificationCardService();


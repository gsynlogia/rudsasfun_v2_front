/**
 * Certificate Service
 * Singleton service for managing certificates via API
 */
import { CertificateListResponse } from '@/types/certificateListResponse';
import { CertificateResponse } from '@/types/certificateResponse';
import { CertificateUploadResponse } from '@/types/certificateUploadResponse';
import { API_BASE_URL } from '@/utils/api-config';

import { authService } from './AuthService';

export type { CertificateResponse, CertificateUploadResponse, CertificateListResponse };

class CertificateService {
  private static instance: CertificateService;

  private constructor() {}

  static getInstance(): CertificateService {
    if (!CertificateService.instance) {
      CertificateService.instance = new CertificateService();
    }
    return CertificateService.instance;
  }
  /**
   * Upload certificate PDF for a reservation
   */
  async uploadCertificate(reservationId: number, file: File): Promise<CertificateUploadResponse> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/certificates/upload?reservation_id=${reservationId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas przesyłania zaświadczenia' }));
      throw new Error(error.detail || 'Błąd podczas przesyłania zaświadczenia');
    }

    return response.json();
  }

  /**
   * Get all certificates for a reservation
   */
  async getCertificates(reservationId: number): Promise<CertificateListResponse> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const response = await fetch(`${API_BASE_URL}/api/certificates/reservation/${reservationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas pobierania zaświadczeń' }));
      throw new Error(error.detail || 'Błąd podczas pobierania zaświadczeń');
    }

    return response.json();
  }

  /**
   * Download certificate PDF
   */
  async downloadCertificate(certificateId: number): Promise<Blob> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const response = await fetch(`${API_BASE_URL}/api/certificates/${certificateId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas pobierania zaświadczenia' }));
      throw new Error(error.detail || 'Błąd podczas pobierania zaświadczenia');
    }

    return response.blob();
  }

  /**
   * Delete a certificate
   */
  async deleteCertificate(certificateId: number): Promise<void> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Brak autoryzacji');
    }

    const response = await fetch(`${API_BASE_URL}/api/certificates/${certificateId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas usuwania zaświadczenia' }));
      throw new Error(error.detail || 'Błąd podczas usuwania zaświadczenia');
    }
  }
}

export const certificateService = CertificateService.getInstance();


/**
 * Contract Service
 * Service for handling contract operations with backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ContractService {
  private API_URL = `${API_BASE_URL}/api/contracts`;

  /**
   * Generate contract for a reservation
   * @param reservationId Reservation ID
   * @returns Response with contract path
   */
  async generateContract(reservationId: number): Promise<{ status: string; message: string; contract_path: string }> {
    // Import authService to get token
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
   * Get contract PDF download URL
   * @param reservationId Reservation ID
   * @returns URL to download contract PDF
   */
  getContractDownloadUrl(reservationId: number): string {
    // Import authService to get token
    const { authService } = require('@/lib/services/AuthService');
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    // Return URL with token in query (or use Authorization header in fetch)
    return `${this.API_URL}/${reservationId}`;
  }

  /**
   * Download contract PDF
   * @param reservationId Reservation ID
   */
  async downloadContract(reservationId: number): Promise<void> {
    // Import authService to get token
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    // First, try to get the contract (it will generate if doesn't exist)
    // But we need to handle the case where generation takes too long
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
        // If 404, try to generate first
        if (response.status === 404) {
          console.log('Contract not found, generating...');
          // Generate contract first
          await this.generateContract(reservationId);
          // Try again
          const retryResponse = await fetch(`${this.API_URL}/${reservationId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (!retryResponse.ok) {
            const error = await retryResponse.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(error.detail || `HTTP error! status: ${retryResponse.status}`);
          }
          
          // Get blob from retry response
          const blob = await retryResponse.blob();
          this._downloadBlob(blob, reservationId);
          return;
        }
        
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }

      // Get blob and create download link
      const blob = await response.blob();
      this._downloadBlob(blob, reservationId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - contract generation is taking too long. Please try again in a moment.');
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
    a.download = `umowa_${reservationId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const contractService = new ContractService();


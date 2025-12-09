/**
 * Contract Service
 * Service for handling contract operations with backend API
 */

import { API_BASE_URL } from '@/utils/api-config';

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
   * Get contract information for a reservation
   * @param reservationId Reservation ID
   * @returns Contract information or null if not found
   */
  async getContract(reservationId: number): Promise<{ contract_filename: string; created_at: string; contract_path: string } | null> {
    // Import authService to get token
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      // Try to get contract from /my endpoint
      const response = await fetch(`${this.API_URL}/my`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const contracts = await response.json();
      const contract = contracts.find((c: any) => c.reservation_id === reservationId);
      
      if (contract) {
        return {
          contract_filename: contract.contract_filename,
          created_at: contract.created_at,
          contract_path: contract.contract_path,
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching contract:', error);
      return null;
    }
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
   * Generates contract if it doesn't exist, then downloads it
   * @param reservationId Reservation ID
   */
  async downloadContract(reservationId: number): Promise<void> {
    // Import authService to get token
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    // First, generate contract (it will be created if doesn't exist)
    // This ensures contract is always generated on first click
    try {
      await this.generateContract(reservationId);
    } catch (error: any) {
      // If generation fails, try to download existing contract
      console.log('Contract generation failed, trying to download existing contract...');
    }

    // Now download the contract
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

  /**
   * List all contracts for the current user
   * @returns Array of contract information
   */
  async listMyContracts(): Promise<Array<{
    reservation_id: number;
    contract_filename: string;
    contract_path: string;
    created_at: string;
    camp_name: string | null;
    property_name: string | null;
    participant_first_name: string | null;
    participant_last_name: string | null;
    total_price: number;
  }>> {
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
   * Update contract status (admin only)
   * @param reservationId Reservation ID
   * @param status 'approved' or 'rejected'
   * @param rejectionReason Required if status is 'rejected'
   */
  async updateContractStatus(
    reservationId: number,
    status: 'approved' | 'rejected',
    rejectionReason?: string
  ): Promise<{ status: string; message: string; contract_status: string; rejection_reason?: string | null }> {
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const body: { status: string; rejection_reason?: string } = { status };
    if (status === 'rejected') {
      if (!rejectionReason || !rejectionReason.trim()) {
        throw new Error('Powód odrzucenia umowy jest wymagany');
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
   * Upload contract file (user can upload when contract is rejected)
   * @param reservationId Reservation ID
   * @param file File to upload
   */
  async uploadContract(reservationId: number, file: File): Promise<{
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
   * Get all contract files for a reservation (ordered by uploaded_at DESC)
   * @param reservationId Reservation ID
   */
  async getContractFiles(reservationId: number): Promise<Array<{
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
}

export const contractService = new ContractService();


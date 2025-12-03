/**
 * Payment Service
 * Service for handling payment operations with Tpay integration
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
import { authService } from '@/lib/services/AuthService';

export interface CreatePaymentRequest {
  amount: number;
  description: string;
  order_id: string;
  payer_email: string;
  payer_name?: string;
  channel_id?: number; // 64 for BLIK, 53 for cards, undefined for pay-by-link
  blik_code?: string; // 6-digit BLIK code
  success_url?: string;
  error_url?: string;
}

export interface CreatePaymentResponse {
  transaction_id: string;
  status: string;
  payment_url: string | null;
  title: string;
  order_id: string;
}

export interface PaymentStatusResponse {
  transaction_id: string;
  order_id: string | null;
  status: string;
  amount: number | null;
  paid_amount: number | null;
  payer_email: string | null;
  created_at: string | null;
  paid_at: string | null;
}

export interface PaymentResponse {
  id: number;
  transaction_id: string;
  order_id: string;
  amount: number;
  paid_amount: number | null;
  description: string | null;
  status: string;
  payer_email: string;
  payer_name: string | null;
  channel_id: number | null;
  payment_url: string | null;
  title: string | null;
  created_at: string;
  paid_at: string | null;
  webhook_received_at: string | null;
}

export interface PaymentMethodsResponse {
  banks: Array<{
    id: number;
    name: string;
    full_name: string;
    image: Record<string, string> | null;
    instant_redirection: boolean;
  }>;
  cards: Array<{
    id: number;
    name: string;
    full_name: string;
    image: Record<string, string> | null;
    instant_redirection: boolean;
  }>;
  wallets: Array<{
    id: number;
    name: string;
    full_name: string;
    image: Record<string, string> | null;
    instant_redirection: boolean;
  }>;
  installments: Array<{
    id: number;
    name: string;
    full_name: string;
    image: Record<string, string> | null;
    instant_redirection: boolean;
  }>;
  other: Array<{
    id: number;
    name: string;
    full_name: string;
    image: Record<string, string> | null;
    instant_redirection: boolean;
  }>;
}

class PaymentService {
  /**
   * Create a new payment
   */
  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      // Handle different error formats
      let errorMessage = 'Request failed';
      if (typeof error.detail === 'string') {
        errorMessage = error.detail;
      } else if (Array.isArray(error.detail)) {
        // Pydantic validation errors
        errorMessage = error.detail.map((e: any) => {
          if (typeof e === 'string') return e;
          if (e.msg) return `${e.loc?.join('.') || 'field'}: ${e.msg}`;
          return JSON.stringify(e);
        }).join(', ');
      } else if (error.detail && typeof error.detail === 'object') {
        errorMessage = JSON.stringify(error.detail);
      } else if (error.message) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    // Get auth token for authenticated request
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated. Please log in to get payment status.');
    }

    const response = await fetch(`${API_BASE_URL}/api/payments/${transactionId}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      // Handle different error formats
      let errorMessage = 'Request failed';
      if (typeof error.detail === 'string') {
        errorMessage = error.detail;
      } else if (Array.isArray(error.detail)) {
        // Pydantic validation errors
        errorMessage = error.detail.map((e: any) => {
          if (typeof e === 'string') return e;
          if (e.msg) return `${e.loc?.join('.') || 'field'}: ${e.msg}`;
          return JSON.stringify(e);
        }).join(', ');
      } else if (error.detail && typeof error.detail === 'object') {
        errorMessage = JSON.stringify(error.detail);
      } else if (error.message) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get available payment methods
   */
  async getPaymentMethods(): Promise<PaymentMethodsResponse> {
    // Get auth token for authenticated request
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated. Please log in to get payment methods.');
    }

    const response = await fetch(`${API_BASE_URL}/api/payments/methods`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      // Handle different error formats
      let errorMessage = 'Request failed';
      if (typeof error.detail === 'string') {
        errorMessage = error.detail;
      } else if (Array.isArray(error.detail)) {
        // Pydantic validation errors
        errorMessage = error.detail.map((e: any) => {
          if (typeof e === 'string') return e;
          if (e.msg) return `${e.loc?.join('.') || 'field'}: ${e.msg}`;
          return JSON.stringify(e);
        }).join(', ');
      } else if (error.detail && typeof error.detail === 'object') {
        errorMessage = JSON.stringify(error.detail);
      } else if (error.message) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Sync payment status from Tpay API (Sandbox)
   * Use this when webhook didn't work (e.g., in localhost environment)
   */
  async syncPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    // Get auth token for authenticated request
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated. Please log in to sync payment status.');
    }

    const response = await fetch(`${API_BASE_URL}/api/payments/${transactionId}/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      let errorMessage = 'Request failed';
      if (typeof error.detail === 'string') {
        errorMessage = error.detail;
      } else if (Array.isArray(error.detail)) {
        errorMessage = error.detail.map((e: any) => {
          if (typeof e === 'string') return e;
          if (e.msg) return `${e.loc?.join('.') || 'field'}: ${e.msg}`;
          return JSON.stringify(e);
        }).join(', ');
      } else if (error.detail && typeof error.detail === 'object') {
        errorMessage = JSON.stringify(error.detail);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * List all payments
   */
  async listPayments(skip: number = 0, limit: number = 100): Promise<PaymentResponse[]> {
    try {
      // Get auth token for authenticated request
      const token = authService.getToken();
      
      if (!token) {
        throw new Error('Not authenticated. Please log in to list payments.');
      }

      // Usuń trailing slash jeśli jest, aby uniknąć redirectu
      const baseUrl = API_BASE_URL.replace(/\/$/, '');
      const url = `${baseUrl}/api/payments?skip=${skip}&limit=${limit}`;
      console.log('📡 Fetching payments from:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        let errorMessage = 'Request failed';
        if (typeof error.detail === 'string') {
          errorMessage = error.detail;
        } else if (Array.isArray(error.detail)) {
          errorMessage = error.detail.map((e: any) => {
            if (typeof e === 'string') return e;
            if (e.msg) return `${e.loc?.join('.') || 'field'}: ${e.msg}`;
            return JSON.stringify(e);
          }).join(', ');
        } else if (error.detail && typeof error.detail === 'object') {
          errorMessage = JSON.stringify(error.detail);
        } else if (error.message) {
          errorMessage = error.message;
        }
        throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      // Handle network errors
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        throw new Error(`Nie można połączyć się z serwerem. Sprawdź czy backend działa na ${API_BASE_URL}`);
      }
      throw err;
    }
  }
}

export const paymentService = new PaymentService();


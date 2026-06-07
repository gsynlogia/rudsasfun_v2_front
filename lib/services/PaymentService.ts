/**
 * Payment Service
 * Serwis do obsługi płatności (ręcznych). Integracja Tpay wycofana (2026-03-19).
 * Dokumentacja Tpay: todos/TpaySystem/TPAY_INTEGRATION.md
 */

import { authService } from '@/lib/services/AuthService';
import { PaymentResponse } from '@/types/paymentResponse';
import { API_BASE_URL } from '@/utils/api-config';

export type { PaymentResponse };
// Typy Tpay przeniesione do todos/TpaySystem/
// export type { CreatePaymentRequest, CreatePaymentResponse, PaymentStatusResponse, PaymentMethodsResponse };

class PaymentService {
  private static instance: PaymentService;

  private constructor() {}

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * [WYŁĄCZONE] Tworzenie płatności online — Tpay wycofany (2026-03-19)
   */
  async createPayment(_request: any): Promise<any> {
    throw new Error('Płatności online są wyłączone.');
  }

  /**
   * [WYŁĄCZONE] Synchronizacja statusu płatności — Tpay wycofany (2026-03-19)
   */
  async syncPaymentStatus(_transactionId: string): Promise<any> {
    throw new Error('Płatności online są wyłączone.');
  }

  /**
   * List all payments
   */
  async listPayments(skip: number = 0, limit: number = 100): Promise<PaymentResponse[]> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('Not authenticated. Please log in to list payments.');
      }

      const baseUrl = API_BASE_URL.replace(/\/$/, '');
      // Trailing slash — router FastAPI registred at `/` so bez slash FastAPI robi 307 redirect,
      // w którym Location header ma http:// (backend nie zna X-Forwarded-Proto za nginx proxy).
      // Efekt: Mixed Content w browserze. Slash tu eliminuje redirect.
      const url = `${baseUrl}/api/payments/?skip=${skip}&limit=${limit}`;
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
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        throw new Error(`Nie można połączyć się z serwerem. Sprawdź czy backend działa na ${API_BASE_URL}`);
      }
      throw err;
    }
  }
}

export const paymentService = PaymentService.getInstance();

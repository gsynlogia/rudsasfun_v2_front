/**
 * Magic Link Service
 * Singleton service for handling passwordless authentication via email magic links
 */

import { MagicLinkRequest } from '@/types/magicLinkRequest';
import { MagicLinkResponse } from '@/types/magicLinkResponse';
import { MagicLinkVerifyResponse } from '@/types/magicLinkVerifyResponse';
import { API_BASE_URL } from '@/utils/api-config';

export type { MagicLinkRequest, MagicLinkResponse, MagicLinkVerifyResponse };

class MagicLinkService {
  private static instance: MagicLinkService;

  private constructor() {}

  static getInstance(): MagicLinkService {
    if (!MagicLinkService.instance) {
      MagicLinkService.instance = new MagicLinkService();
    }
    return MagicLinkService.instance;
  }
  /**
   * Request a magic link to be sent to the provided email
   */
  async requestMagicLink(email: string): Promise<MagicLinkResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/magic-link/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas wysyłania linku logowania' }));
      throw new Error(error.detail || 'Błąd podczas wysyłania linku logowania');
    }

    return response.json();
  }

  /**
   * Verify magic link token and get authentication token
   */
  async verifyMagicLink(token: string): Promise<MagicLinkVerifyResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Nieprawidłowy lub wygasły link logowania' }));
      throw new Error(error.detail || 'Nieprawidłowy lub wygasły link logowania');
    }

    return response.json();
  }
}

export const magicLinkService = MagicLinkService.getInstance();


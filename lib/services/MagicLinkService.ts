/**
 * Magic Link Service
 * Handles passwordless authentication via email magic links
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkResponse {
  message: string;
  success: boolean;
}

export interface MagicLinkVerifyResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    login: string;
    email?: string;
    user_type: string;
    groups: string[];
    accessible_sections: string[];
    created_at?: string;
    updated_at?: string;
  };
}

class MagicLinkService {
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
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas wysyłania magic link' }));
      throw new Error(error.detail || 'Błąd podczas wysyłania magic link');
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
      const error = await response.json().catch(() => ({ detail: 'Nieprawidłowy lub wygasły magic link' }));
      throw new Error(error.detail || 'Nieprawidłowy lub wygasły magic link');
    }

    return response.json();
  }
}

export const magicLinkService = new MagicLinkService();






/**
 * Magic Link Service
 * Handles passwordless authentication via email magic links
 */

import { API_BASE_URL } from '@/utils/api-config';

export interface MagicLinkRequest {
  email: string;
  redirect_url?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
  redirect_url?: string;
}

export interface LoginPasswordRequest {
  email: string;
  password: string;
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
  redirect_url?: string;
}

class MagicLinkService {
  /**
   * Request a magic link to be sent to the provided email
   * @param email - Email address to send magic link to
   * @param redirectUrl - Optional redirect URL after successful login
   */
  async requestMagicLink(email: string, redirectUrl?: string): Promise<MagicLinkResponse> {
    const body: MagicLinkRequest = { email };
    if (redirectUrl && redirectUrl !== '/' && redirectUrl.startsWith('/')) {
      body.redirect_url = redirectUrl;
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/magic-link/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

  /**
   * Register a new user (hasło obowiązkowe) i wyślij magic link
   */
  async register(
    email: string,
    password: string,
    passwordConfirm: string,
    redirectUrl?: string
  ): Promise<MagicLinkResponse> {
    const body: RegisterRequest = {
      email,
      password,
      password_confirm: passwordConfirm,
    };
    if (redirectUrl && redirectUrl !== '/' && redirectUrl.startsWith('/')) {
      body.redirect_url = redirectUrl;
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/magic-link/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Błąd podczas rejestracji' }));
      throw new Error(error.detail || 'Błąd podczas rejestracji');
    }
    return response.json();
  }

  /**
   * Logowanie klienta hasłem (Dual Auth)
   */
  async loginPassword(email: string, password: string): Promise<MagicLinkVerifyResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Nieprawidłowy e-mail lub hasło' }));
      throw new Error(error.detail || 'Nieprawidłowy e-mail lub hasło');
    }
    return response.json();
  }
}

export const magicLinkService = new MagicLinkService();
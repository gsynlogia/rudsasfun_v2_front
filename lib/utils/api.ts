/**
 * API Utilities
 * Helper functions for making authenticated API requests
 */
import { authService } from '@/lib/services/AuthService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';

export interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * Make an authenticated API request
 */
export async function authenticatedFetch(
  endpoint: string,
  options: FetchOptions = {},
): Promise<Response> {
  const { requireAuth = true, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {}),
  };

  // Add authorization header if required
  if (requireAuth) {
    const authHeader = authService.getAuthHeader();
    Object.assign(headers, authHeader);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // If unauthorized, redirect to login
  if (response.status === 401 && requireAuth) {
    authService.logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/admin-panel/login';
    }
  }

  return response;
}


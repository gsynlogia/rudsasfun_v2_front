/**
 * Authenticated API Utilities
 * Functions for making authenticated API calls to protected endpoints
 * Uses AuthService to include JWT token in requests
 */

import { authService } from '@/lib/services/AuthService';

import { getApiBaseUrlRuntime } from './api-config';

/**
 * Custom error class for backend unavailable errors
 */
export class BackendUnavailableError extends Error {
  constructor(message: string = 'Backend is unavailable') {
    super(message);
    this.name = 'BackendUnavailableError';
    Object.setPrototypeOf(this, BackendUnavailableError.prototype);
  }
}

/**
 * Make an authenticated fetch request
 * Automatically includes JWT token in Authorization header
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = authService.getToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  // Only set Content-Type if not FormData (FormData sets its own Content-Type with boundary)
  if (!(options.body instanceof FormData)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    return response;
  } catch (error) {
    console.error('[authenticatedFetch] Network error:', error);
    console.error('[authenticatedFetch] URL:', url);
    throw error;
  }
}

/** Formatuje detail z odpowiedzi API (422: tablica błędów walidacji) na czytelny tekst. */
function formatApiErrorDetail(statusCode: number, error: { detail?: unknown }): string {
  const d = error.detail;
  if (d == null) return `Błąd HTTP ${statusCode}`;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    const parts = d.map((e: { loc?: unknown[]; msg?: string }) => {
      const loc = Array.isArray(e.loc) ? e.loc.slice(1).join('.') : '';
      const msg = e.msg ?? '';
      return loc ? `${loc}: ${msg}` : msg;
    });
    return parts.length ? parts.join('; ') : `Błąd walidacji (${statusCode})`;
  }
  return `Błąd HTTP ${statusCode}`;
}

/**
 * Make authenticated API call and return JSON
 */
export async function authenticatedApiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  // Get API base URL at runtime (important for client-side)
  const API_BASE_URL = getApiBaseUrlRuntime();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  // Log for debugging
  console.log('[authenticatedApiCall] Calling:', url);
  console.log('[authenticatedApiCall] API_BASE_URL:', API_BASE_URL);

  try {
    const response = await authenticatedFetch(url, options);

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid - logout user
        authService.logout();
        throw new Error('Session expired. Please log in again.');
      }

      // For DELETE requests with 204 No Content, response is successful but has no body
      if (response.status === 204) {
        return null as T;
      }

      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      const msg = formatApiErrorDetail(response.status, error);
      throw new Error(msg);
    }

    // For DELETE requests with 204 No Content, response has no body
    if (response.status === 204) {
      return null as T;
    }

    // Check if response has content before trying to parse JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null as T;
    }

    return await response.json();
  } catch (error) {
    // Re-throw with more context if it's a network error
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      console.error('[authenticatedApiCall] Network error - is backend running?');
      console.error('[authenticatedApiCall] Attempted URL:', url);
      console.error('[authenticatedApiCall] API_BASE_URL:', API_BASE_URL);
      console.error('[authenticatedApiCall] Error details:', error);
      throw new Error(`Nie można połączyć się z serwerem. Sprawdź, czy backend jest uruchomiony na ${API_BASE_URL}`);
    }
    throw error;
  }
}
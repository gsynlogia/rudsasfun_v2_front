/**
 * API Fetch Utilities with Default Values
 * Functions for fetching data with fallback defaults
 */

import { BackendUnavailableError } from './api-auth';
import { API_BASE_URL } from './api-config';

/**
 * Fetch data from API with default fallback values
 * If the fetch fails (network error, backend unavailable), returns the default value
 *
 * @param endpoint - API endpoint (relative or absolute URL)
 * @param defaultValue - Default value to return if fetch fails
 * @param options - Fetch options (method, headers, etc.)
 * @returns Promise with fetched data or default value
 */
export async function fetchWithDefaults<T>(
  endpoint: string,
  defaultValue: T,
  options: RequestInit = {},
): Promise<T> {
  try {
    // Build full URL
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    // Make fetch request
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Check if response is ok
    if (!response.ok) {
      // If it's a server error (5xx) or network error, throw BackendUnavailableError
      if (response.status >= 500 || response.status === 0) {
        throw new BackendUnavailableError(`Backend unavailable: ${response.status}`);
      }
      // For other errors, throw regular error
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    // Parse and return response
    const data = await response.json();
    return data as T;
  } catch (error) {
    // If it's a network error or BackendUnavailableError, return default value
    if (
      error instanceof BackendUnavailableError ||
      (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) ||
      (error instanceof Error && error.message.includes('NetworkError'))
    ) {
      console.warn('[fetchWithDefaults] Backend unavailable, using default value:', error);
      throw new BackendUnavailableError('Backend is unavailable');
    }

    // Re-throw other errors
    throw error;
  }
}
/**
 * API Fetch Utilities with Default Values
 * Handles errors gracefully and provides default values when backend is unavailable
 */

import { getApiBaseUrlRuntime } from './api-config';
import { sendErrorToDiscord, BackendUnavailableError } from './api-auth';

/**
 * Fetch data from API with default values fallback
 * Shows "Zapraszamy ponownie później" when backend is unavailable
 */
export async function fetchWithDefaults<T>(
  endpoint: string,
  defaults: T,
  options: RequestInit = {}
): Promise<T> {
  const API_BASE_URL = getApiBaseUrlRuntime();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      // For 404 on list endpoints, return empty array/default
      if (response.status === 404) {
        const isListEndpoint = endpoint.endsWith('/') || endpoint.includes('?page') || endpoint.includes('?limit');
        if (isListEndpoint) {
          return defaults;
        }
      }

      // For other errors, throw to be caught below
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // If data is an array, return it; if it's an object with a list property, return that
    if (Array.isArray(data)) {
      return (data.length > 0 ? data : defaults) as T;
    }
    
    if (data && typeof data === 'object') {
      // Check for common list properties
      if ('camps' in data && Array.isArray(data.camps)) {
        return (data.camps.length > 0 ? data : defaults) as T;
      }
      if ('diets' in data && Array.isArray(data.diets)) {
        return (data.diets.length > 0 ? data : defaults) as T;
      }
      if ('addons' in data && Array.isArray(data.addons)) {
        return (data.addons.length > 0 ? data : defaults) as T;
      }
      if ('sources' in data && Array.isArray(data.sources)) {
        return (data.sources.length > 0 ? data : defaults) as T;
      }
      if ('documents' in data && Array.isArray(data.documents)) {
        return (data.documents.length > 0 ? data : defaults) as T;
      }
      
      // If object has data, return it; otherwise return defaults
      return (Object.keys(data).length > 0 ? data : defaults) as T;
    }

    return (data || defaults) as T;
  } catch (error) {
    // Handle network errors (backend unavailable)
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      console.error('[fetchWithDefaults] Backend unavailable:', endpoint);
      
      // Send to Discord
      sendErrorToDiscord(error as Error, {
        endpoint,
        url,
        apiBaseUrl: API_BASE_URL,
        component: 'fetchWithDefaults',
      });

      // Return defaults instead of throwing
      return defaults;
    }

    // Send other errors to Discord
    if (error instanceof Error) {
      sendErrorToDiscord(error, {
        endpoint,
        url,
        apiBaseUrl: API_BASE_URL,
        component: 'fetchWithDefaults',
      });
    }

    // For other errors, return defaults
    return defaults;
  }
}

/**
 * Check if backend is available
 */
export async function isBackendAvailable(): Promise<boolean> {
  const API_BASE_URL = getApiBaseUrlRuntime();
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}


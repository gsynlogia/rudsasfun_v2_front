/**
 * Authenticated API Utilities
 * Functions for making authenticated API calls to protected endpoints
 * Uses AuthService to include JWT token in requests
 */

import { authService } from '@/lib/services/AuthService';
import { getApiBaseUrlRuntime } from './api-config';
import { sendErrorToDiscord } from './discord-error';

// Custom error class for backend unavailable
export class BackendUnavailableError extends Error {
  constructor(message: string = 'Zapraszamy ponownie później.') {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}

// Re-export for convenience
export { sendErrorToDiscord };

/**
 * Make an authenticated fetch request
 * Automatically includes JWT token in Authorization header
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
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
    
    // Send to Discord if it's a network error (backend unavailable)
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      sendErrorToDiscord(error as Error, {
        url,
        component: 'authenticatedFetch',
        apiBaseUrl: getApiBaseUrlRuntime(),
      });
    }
    
    throw error;
  }
}

/**
 * Make authenticated API call and return JSON
 */
export async function authenticatedApiCall<T>(
  endpoint: string,
  options: RequestInit = {}
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
        // Token expired or invalid - logout user and redirect to login
        authService.logout();
        
        // Redirect to login page (only on client side)
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const isAdminPanel = currentPath.startsWith('/admin-panel');
          const loginPath = isAdminPanel ? '/admin-panel/login' : '/login';
          
          // Save current path for redirect after login
          if (currentPath !== loginPath) {
            window.location.href = `${loginPath}?redirect=${encodeURIComponent(currentPath)}`;
          } else {
            window.location.href = loginPath;
          }
        }
        
        throw new Error('Session expired. Please log in again.');
      }
      
      if (response.status === 404) {
        // Not found - for list endpoints, return empty result instead of throwing error
        // Check if this is a list endpoint (ends with / or contains ?page or ?limit)
        const isListEndpoint = endpoint.endsWith('/') || endpoint.includes('?page') || endpoint.includes('?limit') || endpoint.includes('/?');
        
        if (isListEndpoint) {
          // For list endpoints, return empty result structure
          const error = await response.json().catch(() => ({ detail: 'Not found' }));
          console.warn('[authenticatedApiCall] 404 for list endpoint, returning empty result:', endpoint);
          // Return empty list structure based on endpoint type
          if (endpoint.includes('general-diets')) {
            return { diets: [], total: 0, page: 1, limit: 100 } as T;
          }
          return [] as T;
        } else {
          // For single resource endpoints, throw error
          const error = await response.json().catch(() => ({ detail: 'Not found' }));
          throw new Error(error.detail || `Resource not found (404)`);
        }
      }
      
      // For DELETE/POST requests with 204 No Content, response is successful but has no body
      if (response.status === 204) {
        return null as T;
      }
      
      // Get status information before reading body
      const status = response.status || 0;
      const statusText = response.statusText || 'Unknown';
      
      // Try to get error details from response body
      let errorDetail = `HTTP error! status: ${status} ${statusText}`;
      let responseBody: any = null;
      
      try {
        // Clone response to read body without consuming original
        const clonedResponse = response.clone();
        const responseText = await clonedResponse.text();
        
        if (responseText && responseText.trim()) {
          try {
            responseBody = JSON.parse(responseText);
            errorDetail = responseBody.detail || responseBody.message || responseBody.error || errorDetail;
          } catch (parseError) {
            // Not JSON, use text as error detail
            errorDetail = responseText || errorDetail;
            responseBody = { raw_text: responseText };
          }
        } else {
          // Empty body
          responseBody = null;
        }
      } catch (readError) {
        // Response body already consumed or not readable
        console.warn('[authenticatedApiCall] Could not read response body:', readError);
        responseBody = { error: 'Could not read response body', readError: String(readError) };
      }
      
      // Log error with all available information
      const errorLog: any = {
        status: status,
        statusText: statusText,
        url: url,
        method: options.method || 'GET',
        body: responseBody
      };
      
      // Try to get headers if available
      try {
        errorLog.headers = Object.fromEntries(response.headers.entries());
      } catch (headerError) {
        errorLog.headers = 'Could not read headers';
      }
      
      // Log request body if available (for debugging)
      if (options.body) {
        try {
          if (typeof options.body === 'string') {
            errorLog.requestBody = JSON.parse(options.body);
          } else {
            errorLog.requestBody = options.body;
          }
        } catch {
          errorLog.requestBody = options.body;
        }
      }
      
      console.error('[authenticatedApiCall] Error response:', errorLog);
      
      // Log body details separately for better visibility
      if (responseBody) {
        console.error('[authenticatedApiCall] Error body details:', JSON.stringify(responseBody, null, 2));
      }
      
      throw new Error(errorDetail);
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
    // Handle network errors (backend unavailable)
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      console.error('[authenticatedApiCall] Network error - backend unavailable');
      console.error('[authenticatedApiCall] Attempted URL:', url);
      console.error('[authenticatedApiCall] API_BASE_URL:', API_BASE_URL);
      
      // Send to Discord
      sendErrorToDiscord(error as Error, {
        endpoint,
        url,
        apiBaseUrl: API_BASE_URL,
        component: 'authenticatedApiCall',
      });
      
      // Throw user-friendly error
      throw new BackendUnavailableError('Zapraszamy ponownie później.');
    }
    
    // Send other errors to Discord
    if (error instanceof Error) {
      sendErrorToDiscord(error, {
        endpoint,
        url,
        apiBaseUrl: API_BASE_URL,
        component: 'authenticatedApiCall',
      });
    }
    
    throw error;
  }
}










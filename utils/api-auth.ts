/**
 * Authenticated API Utilities
 * Functions for making authenticated API calls to protected endpoints
 * Uses AuthService to include JWT token in requests
 */

import { authService } from '@/lib/services/AuthService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Make authenticated API call and return JSON
 */
export async function authenticatedApiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const response = await authenticatedFetch(url, options);
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid - logout user
      authService.logout();
      throw new Error('Session expired. Please log in again.');
    }
    
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
}










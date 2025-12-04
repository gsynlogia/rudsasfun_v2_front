/**
 * Server-side API utilities
 * Used in Server Components to fetch data before rendering
 * This prevents hydration errors by ensuring data is available on initial render
 */

import { getApiBaseUrl } from './api-config';

// Use NEXT_PUBLIC_ prefix for client-side, or direct URL for server-side
// For server-side, we need to check environment differently
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || getApiBaseUrl();

/**
 * CampProperty interface - 1:1 with backend CampPropertyResponse
 * All fields match exactly with backend JSON response
 */
export interface CampProperty {
  id: number;
  camp_id: number;
  period: string; // "lato" | "zima"
  city: string;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  days_count: number;
  max_participants: number; // Maximum number of participants for this turnus
  use_default_diet?: boolean; // Whether to use default diets for this turnus
  registered_count?: number; // Number of registered participants (calculated dynamically)
  is_full?: boolean; // Whether turnus is full (registered_count >= max_participants)
  is_ended?: boolean; // Whether turnus has ended (end_date < today)
  created_at?: string | null; // ISO datetime string or null
  updated_at?: string | null; // ISO datetime string or null
}

/**
 * Camp interface - 1:1 with backend CampResponse
 * All fields match exactly with backend JSON response
 */
export interface Camp {
  id: number;
  name: string;
  created_at?: string | null; // ISO datetime string or null
  updated_at?: string | null; // ISO datetime string or null
  properties?: CampProperty[] | null; // Optional list of properties
}

/**
 * CampWithProperty interface - 1:1 with backend CampWithPropertyResponse
 * All fields match exactly with backend JSON response
 */
export interface CampWithProperty {
  camp: Camp;
  property: CampProperty;
}

/**
 * API Error Response interface - matches backend error format
 */
export interface ApiErrorResponse {
  detail: string;
}

/**
 * Get camp edition by camp ID and edition ID
 * Used for routing: /camps/{campId}/edition/{editionId}
 * 
 * Returns data with exists flag - if camp/edition doesn't exist,
 * returns 200 OK with empty/default data (not an error)
 */
export async function getCampEdition(
  campId: number,
  editionId: number
): Promise<CampWithProperty> {
  // Validate input parameters
  if (!campId || isNaN(campId) || campId < 1) {
    // Return empty data for invalid input (not an error)
    return {
      camp: {
        id: 0,
        name: "",
        created_at: null,
        updated_at: null,
        properties: null
      },
      property: {
        id: 0,
        camp_id: 0,
        period: "",
        city: "",
        start_date: "1970-01-01",
        end_date: "1970-01-01",
        days_count: 0,
        max_participants: 0,
        created_at: null,
        updated_at: null
      }
    };
  }
  if (!editionId || isNaN(editionId) || editionId < 1) {
    // Return empty data for invalid input (not an error)
    return {
      camp: {
        id: 0,
        name: "",
        created_at: null,
        updated_at: null,
        properties: null
      },
      property: {
        id: 0,
        camp_id: 0,
        period: "",
        city: "",
        start_date: "1970-01-01",
        end_date: "1970-01-01",
        days_count: 0,
        max_participants: 0,
        created_at: null,
        updated_at: null
      }
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds max
  
  try {
    const url = `${API_BASE_URL}/api/camps/${campId}/edition/${editionId}`;
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    // Only treat 5xx as errors, 4xx and 200 are handled normally
    if (response.status >= 500) {
      throw new Error(`Server error: Unable to fetch camp data. Please try again later.`);
    }
    
    const data: CampWithProperty = await response.json();
    
    // Validate response structure
    if (!data || !data.camp || !data.property) {
      // Return empty data if structure is invalid (not an error)
      return {
        camp: {
          id: 0,
          name: "",
          created_at: null,
          updated_at: null,
          properties: null
        },
        property: {
          id: 0,
          camp_id: 0,
          period: "",
          city: "",
          start_date: "1970-01-01",
          end_date: "1970-01-01",
          days_count: 0,
          max_participants: 0,
          created_at: null,
          updated_at: null
        }
      };
    }
    
    // Check if camp/edition exists (id = 0 means doesn't exist)
    if (!data.camp.id || data.camp.id === 0 || !data.property.id || data.property.id === 0) {
      // Camp or edition doesn't exist - return empty data (not an error)
      return data;
    }
    
    // Validate required fields for existing data
    if (!data.camp.name) {
      // Return empty data if name is missing (not an error)
      return {
        camp: {
          id: 0,
          name: "",
          created_at: null,
          updated_at: null,
          properties: null
        },
        property: {
          id: 0,
          camp_id: 0,
          period: "",
          city: "",
          start_date: "1970-01-01",
          end_date: "1970-01-01",
          days_count: 0,
          max_participants: 0,
          created_at: null,
          updated_at: null
        }
      };
    }
    
    // Ensure camp_id matches for existing data
    if (data.property.camp_id !== campId) {
      // Return empty data if mismatch (not an error)
      return {
        camp: {
          id: 0,
          name: "",
          created_at: null,
          updated_at: null,
          properties: null
        },
        property: {
          id: 0,
          camp_id: 0,
          period: "",
          city: "",
          start_date: "1970-01-01",
          end_date: "1970-01-01",
          days_count: 0,
          max_participants: 0,
          created_at: null,
          updated_at: null
        }
      };
    }
    if (data.property.id !== editionId) {
      // Return empty data if mismatch (not an error)
      return {
        camp: {
          id: 0,
          name: "",
          created_at: null,
          updated_at: null,
          properties: null
        },
        property: {
          id: 0,
          camp_id: 0,
          period: "",
          city: "",
          start_date: "1970-01-01",
          end_date: "1970-01-01",
          days_count: 0,
          max_participants: 0,
          created_at: null,
          updated_at: null
        }
      };
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout: Unable to fetch camp data within 10 seconds. Please check your connection and try again.`);
    }
    // Only re-throw actual errors (timeout, server errors)
    if (error instanceof Error) {
      if (error.message.includes('Server error') || error.message.includes('timeout')) {
        throw error;
      }
    }
    // For any other case, return empty data (not an error)
    return {
      camp: {
        id: 0,
        name: "",
        created_at: null,
        updated_at: null,
        properties: null
      },
      property: {
        id: 0,
        camp_id: 0,
        period: "",
        city: "",
        start_date: "1970-01-01",
        end_date: "1970-01-01",
        days_count: 0,
        max_participants: 0,
        created_at: null,
        updated_at: null
      }
    };
  }
}

/**
 * Get camp by ID
 */
export async function getCampById(campId: number): Promise<Camp> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/camps/${campId}`,
      {
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching camp ${campId}:`, error);
    throw error;
  }
}


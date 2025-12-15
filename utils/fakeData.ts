/**
 * Fake Data Utilities
 * Helper functions for development/testing with fake data
 */

/**
 * Check if fake data is enabled
 * Returns false by default (disabled in production)
 */
export function isFakeDataEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage?.getItem('fakeDataEnabled') === 'true';
}

/**
 * Get fake Step1 data for development/testing
 * Returns null if fake data is disabled
 */
export async function getFakeStep1Data(): Promise<any | null> {
  if (!isFakeDataEnabled()) {
    return null;
  }
  
  // Return null - fake data not implemented
  // This is just a placeholder to prevent build errors
  return null;
}


/**
 * Local Storage Utilities
 * Handles saving and loading data to localStorage
 * Used for data that should persist across browser tabs
 */

const STORAGE_KEYS = {
  MAGIC_LINK_REDIRECT: 'radsas_fanMagic Link Redirect',
} as const;

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save magic link redirect URL to localStorage
 * Key: "radsas_fanMagic Link Redirect" (works across browser tabs)
 */
export function saveMagicLinkRedirect(redirectUrl: string): void {
  if (!isStorageAvailable()) return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.MAGIC_LINK_REDIRECT, redirectUrl);
  } catch (error) {
    console.error('Error saving magic link redirect to localStorage:', error);
  }
}

/**
 * Load magic link redirect URL from localStorage
 * Key: "radsas_fanMagic Link Redirect"
 */
export function loadMagicLinkRedirect(): string | null {
  if (!isStorageAvailable()) return null;
  
  try {
    return localStorage.getItem(STORAGE_KEYS.MAGIC_LINK_REDIRECT);
  } catch (error) {
    console.error('Error loading magic link redirect from localStorage:', error);
    return null;
  }
}

/**
 * Clear magic link redirect URL from localStorage
 * Key: "radsas_fanMagic Link Redirect"
 */
export function clearMagicLinkRedirect(): void {
  if (!isStorageAvailable()) return;
  
  try {
    localStorage.removeItem(STORAGE_KEYS.MAGIC_LINK_REDIRECT);
  } catch (error) {
    console.error('Error clearing magic link redirect from localStorage:', error);
  }
}






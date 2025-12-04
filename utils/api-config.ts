/**
 * API Configuration
 * Automatically detects environment (localhost vs production) and sets correct API URL
 * 
 * Priority order (Next.js loads .env files in this order):
 * 1. .env.local (highest priority, not committed to git) - for local development
 * 2. .env.development / .env.production (based on NODE_ENV)
 * 3. .env (lowest priority, committed to git) - for production defaults
 * 
 * Rules:
 * 1. If NEXT_PUBLIC_API_URL is set in environment, use it (highest priority)
 *    - .env.local overrides .env for local development
 *    - .env contains production defaults
 * 2. If running on localhost (client-side), use https://rejestracja.radsasfun.system-app.pl
 * 3. If running on production domain, use production API URL
 * 4. Fallback to https://rejestracja.radsasfun.system-app.pl for development
 */

/**
 * Get API base URL based on current environment
 * - Localhost: uses https://rejestracja.radsasfun.system-app.pl (from .env.local)
 * - Production: uses https://rejestracja.radsasfun.system-app.pl (from .env)
 */
export function getApiBaseUrl(): string {
  // If NEXT_PUBLIC_API_URL is explicitly set, use it (highest priority)
  // This respects Next.js .env file priority:
  // - .env.local (local development) will override .env (production)
    // - .env.local should contain: NEXT_PUBLIC_API_URL=https://rejestracja.radsasfun.system-app.pl
    // - .env should contain: NEXT_PUBLIC_API_URL=https://rejestracja.radsasfun.system-app.pl
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL;
    
    // Force HTTPS for production domains to prevent Mixed Content errors
    if (url.includes('rejestracja.radsasfun.system-app.pl') && url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
    }
    
    return url;
  }

  // Auto-detect environment based on window.location (client-side only)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Localhost detection - use production API
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'https://rejestracja.radsasfun.system-app.pl';
    }
    
    // Production domains - use production API
    if (hostname.includes('rejestracja.radsasfun.system-app.pl')) {
      return 'https://rejestracja.radsasfun.system-app.pl';
    }
    
    // Vercel preview deployments - use production API
    if (hostname.includes('vercel.app')) {
      return 'https://rejestracja.radsasfun.system-app.pl';
    }
  }

  // Server-side: check if we're in production via environment
  // For server-side rendering, we need to rely on environment variables
  // or check if we're building for production
  if (process.env.NODE_ENV === 'production') {
    // In production build, default to production API
    return 'https://rejestracja.radsasfun.system-app.pl';
  }

  // Development fallback: use production API
  return 'https://rejestracja.radsasfun.system-app.pl';
}

/**
 * Get API base URL (exported function)
 * This ensures the URL is calculated at runtime, not at build time
 * For client components, this will be evaluated at runtime
 * For server components, this uses environment detection
 */
export function getApiBaseUrlRuntime(): string {
  return getApiBaseUrl();
}

/**
 * Get API base URL (exported constant)
 * Note: In Next.js, this is evaluated at build time for server components
 * For client components, use getApiBaseUrlRuntime() or access directly
 */
export const API_BASE_URL = typeof window !== 'undefined' 
  ? getApiBaseUrl() // Client-side: calculate at runtime
  : (process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl'); // Server-side: use env var


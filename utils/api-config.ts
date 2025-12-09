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
    
    // Localhost detection - use local API only if explicitly set
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Only use localhost if explicitly set in env, otherwise use production
      return process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
    }
    
    // Production domains - use production API
    if (hostname.includes('rejestracja.radsasfun.system-app.pl')) {
      return 'https://rejestracja.radsasfun.system-app.pl';
    }
    
    // Vercel preview deployments - use production API
    if (hostname.includes('vercel.app')) {
      return 'https://rejestracja.radsasfun.system-app.pl';
    }
    
    // Any other production domain - use production API
    return 'https://rejestracja.radsasfun.system-app.pl';
  }

  // Server-side: check if we're in production via environment
  // For server-side rendering, we need to rely on environment variables
  // or check if we're building for production
  if (process.env.NODE_ENV === 'production') {
    // In production build, default to production API
    return 'https://rejestracja.radsasfun.system-app.pl';
  }

  // Development fallback: use production API as default (can be overridden with .env.local)
  return process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl';
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
 * For client components, this uses runtime detection
 * 
 * IMPORTANT: Always defaults to production API to prevent CORS errors on Vercel
 */
export const API_BASE_URL = typeof window !== 'undefined' 
  ? getApiBaseUrl() // Client-side: calculate at runtime (will detect Vercel and use production)
  : (process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl'); // Server-side: use env var or production default

/**
 * Get full URL for static assets (icons, images, etc.)
 * Handles both relative paths (starting with /) and absolute URLs
 * Prevents double /static/ in URLs
 * @param iconUrl - Relative path (e.g., "/static/diet-icons/icon.svg", "diet-icons/icon.svg") or absolute URL
 * @returns Full URL that can be used in img src
 */
export function getStaticAssetUrl(iconUrl: string | null | undefined): string | undefined {
  if (!iconUrl) {
    return undefined;
  }
  
  // If already a full URL (http:// or https://), return as-is
  if (iconUrl.startsWith('http://') || iconUrl.startsWith('https://')) {
    return iconUrl;
  }
  
  const baseUrl = typeof window !== 'undefined' ? getApiBaseUrl() : (process.env.NEXT_PUBLIC_API_URL || 'https://rejestracja.radsasfun.system-app.pl');
  
  // If relative path starting with /, prepend API_BASE_URL (already has /static/ if needed)
  if (iconUrl.startsWith('/')) {
    // Remove double slashes (e.g., //static -> /static)
    const cleanPath = iconUrl.replace(/^\/+/, '/');
    return `${baseUrl}${cleanPath}`;
  }
  
  // If relative path without leading /, check if it already contains static/
  // Backend might return "diet-icons/..." or "static/diet-icons/..."
  let cleanPath = iconUrl;
  
  // Remove leading static/ if present (to avoid double /static/static/)
  if (cleanPath.startsWith('static/')) {
    cleanPath = cleanPath.replace(/^static\//, '');
  }
  
  // Add /static/ prefix and prepend API_BASE_URL
  return `${baseUrl}/static/${cleanPath}`;
}


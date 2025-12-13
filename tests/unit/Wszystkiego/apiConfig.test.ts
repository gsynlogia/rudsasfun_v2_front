/**
 * Unit tests for API Configuration utilities
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { getApiBaseUrl, getApiBaseUrlRuntime, getStaticAssetUrl, API_BASE_URL } from '@/utils/api-config';

describe('API Configuration Utilities', () => {
  const originalEnv = process.env;
  const originalWindow = global.window;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete (global as any).window;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.window = originalWindow;
  });

  test('should return API URL from NEXT_PUBLIC_API_URL environment variable', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://test-api.example.com';

    const url = getApiBaseUrl();

    expect(url).toBe('https://test-api.example.com');
  });

  test('should force HTTPS for production domains', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://rejestracja.radsasfun.system-app.pl';

    const url = getApiBaseUrl();

    expect(url).toBe('https://rejestracja.radsasfun.system-app.pl');
  });

  test('should return production URL for localhost when env is set', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://rejestracja.radsasfun.system-app.pl';
    global.window = {
      location: {
        hostname: 'localhost',
      },
    } as any;

    const url = getApiBaseUrl();

    expect(url).toBe('https://rejestracja.radsasfun.system-app.pl');
  });

  test('should return production URL for production domain', () => {
    global.window = {
      location: {
        hostname: 'rejestracja.radsasfun.system-app.pl',
      },
    } as any;

    const url = getApiBaseUrl();

    expect(url).toBe('https://rejestracja.radsasfun.system-app.pl');
  });

  test('should return production URL for Vercel deployments', () => {
    global.window = {
      location: {
        hostname: 'my-app.vercel.app',
      },
    } as any;

    const url = getApiBaseUrl();

    expect(url).toBe('https://rejestracja.radsasfun.system-app.pl');
  });

  test('should return production URL for server-side in production', () => {
    // Use Object.defineProperty to set NODE_ENV as it's read-only
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    });

    const url = getApiBaseUrl();

    expect(url).toBe('https://rejestracja.radsasfun.system-app.pl');
  });

  test('getApiBaseUrlRuntime should return same as getApiBaseUrl', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://test-api.example.com';

    const url1 = getApiBaseUrl();
    const url2 = getApiBaseUrlRuntime();

    expect(url2).toBe(url1);
  });

  test('getStaticAssetUrl should return undefined for null input', () => {
    const url = getStaticAssetUrl(null);

    expect(url).toBeUndefined();
  });

  test('getStaticAssetUrl should return undefined for undefined input', () => {
    const url = getStaticAssetUrl(undefined);

    expect(url).toBeUndefined();
  });

  test('getStaticAssetUrl should return full URL as-is for absolute URLs', () => {
    const absoluteUrl = 'https://example.com/image.png';

    const url = getStaticAssetUrl(absoluteUrl);

    expect(url).toBe(absoluteUrl);
  });

  test('getStaticAssetUrl should handle relative path starting with /', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    global.window = {
      location: {
        hostname: 'localhost',
      },
    } as any;

    const url = getStaticAssetUrl('/static/diet-icons/icon.svg');

    expect(url).toBe('https://api.example.com/static/diet-icons/icon.svg');
  });

  test('getStaticAssetUrl should add /static/ prefix for relative paths', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    global.window = {
      location: {
        hostname: 'localhost',
      },
    } as any;

    const url = getStaticAssetUrl('diet-icons/icon.svg');

    expect(url).toBe('https://api.example.com/static/diet-icons/icon.svg');
  });

  test('getStaticAssetUrl should remove duplicate static/ prefix', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    global.window = {
      location: {
        hostname: 'localhost',
      },
    } as any;

    const url = getStaticAssetUrl('static/diet-icons/icon.svg');

    expect(url).toBe('https://api.example.com/static/diet-icons/icon.svg');
  });

  test('API_BASE_URL should be defined', () => {
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
  });
});


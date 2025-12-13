/**
 * Unit tests for localStorage utilities
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import {
  saveMagicLinkRedirect,
  loadMagicLinkRedirect,
  clearMagicLinkRedirect,
} from '@/utils/localStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('localStorage Utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test('should save magic link redirect URL', () => {
    const redirectUrl = '/admin-panel/reservations';

    saveMagicLinkRedirect(redirectUrl);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'radsas_fanMagic Link Redirect',
      redirectUrl
    );
    expect(localStorageMock.getItem('radsas_fanMagic Link Redirect')).toBe(redirectUrl);
  });

  test('should load magic link redirect URL', () => {
    const redirectUrl = '/profil/aktualne-rezerwacje';
    localStorageMock.setItem('radsas_fanMagic Link Redirect', redirectUrl);

    const loadedUrl = loadMagicLinkRedirect();

    expect(loadedUrl).toBe(redirectUrl);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('radsas_fanMagic Link Redirect');
  });

  test('should return null when no redirect URL is stored', () => {
    const loadedUrl = loadMagicLinkRedirect();

    expect(loadedUrl).toBeNull();
  });

  test('should clear magic link redirect URL', () => {
    localStorageMock.setItem('radsas_fanMagic Link Redirect', '/some/path');

    clearMagicLinkRedirect();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('radsas_fanMagic Link Redirect');
    expect(localStorageMock.getItem('radsas_fanMagic Link Redirect')).toBeNull();
  });

  test('should handle multiple save and load operations', () => {
    const url1 = '/path1';
    const url2 = '/path2';
    const url3 = '/path3';

    saveMagicLinkRedirect(url1);
    expect(loadMagicLinkRedirect()).toBe(url1);

    saveMagicLinkRedirect(url2);
    expect(loadMagicLinkRedirect()).toBe(url2);

    saveMagicLinkRedirect(url3);
    expect(loadMagicLinkRedirect()).toBe(url3);
  });

  test('should handle long redirect URLs', () => {
    const longUrl = '/very/long/path/with/many/segments/and/parameters?param1=value1&param2=value2';

    saveMagicLinkRedirect(longUrl);
    const loadedUrl = loadMagicLinkRedirect();

    expect(loadedUrl).toBe(longUrl);
  });

  test('should handle special characters in redirect URL', () => {
    const specialUrl = '/path/with/special-chars?query=test&value=123#section';

    saveMagicLinkRedirect(specialUrl);
    const loadedUrl = loadMagicLinkRedirect();

    expect(loadedUrl).toBe(specialUrl);
  });
});


/**
 * Unit tests for API Fetch utilities (api-fetch.ts)
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { fetchWithDefaults, isBackendAvailable } from '@/utils/api-fetch';
import { sendErrorToDiscord } from '@/utils/discord-error';

// Mock fetch globally
global.fetch = jest.fn();

// Mock discord-error
jest.mock('@/utils/discord-error', () => ({
  sendErrorToDiscord: jest.fn(),
}));

// Mock api-config
jest.mock('@/utils/api-config', () => ({
  getApiBaseUrlRuntime: jest.fn(() => 'https://test-api.example.com'),
}));

describe('API Fetch Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchWithDefaults', () => {
    test('should fetch data successfully and return it', async () => {
      const mockData = { id: 1, name: 'Test' };
      const defaults = { id: 0, name: 'Default' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchWithDefaults('/api/test', defaults);

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/test',
        {}
      );
    });

    test('should return defaults for 404 on list endpoint', async () => {
      const defaults: any[] = [];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchWithDefaults('/api/test/', defaults);

      expect(result).toEqual(defaults);
    });

    test('should return defaults for empty array response', async () => {
      const defaults = [{ id: 0, name: 'Default' }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await fetchWithDefaults('/api/test', defaults);

      expect(result).toEqual(defaults);
    });

    test('should return data for non-empty array response', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      const defaults: any[] = [];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchWithDefaults('/api/test', defaults);

      expect(result).toEqual(mockData);
    });

    test('should return defaults for empty camps list', async () => {
      const defaults = { camps: [], total: 0 };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ camps: [], total: 0 }),
      });

      const result = await fetchWithDefaults('/api/camps', defaults);

      expect(result).toEqual(defaults);
    });

    test('should return data for non-empty camps list', async () => {
      const mockData = { camps: [{ id: 1, name: 'Camp 1' }], total: 1 };
      const defaults = { camps: [], total: 0 };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchWithDefaults('/api/camps', defaults);

      expect(result).toEqual(mockData);
    });

    test('should return defaults for empty object', async () => {
      const defaults = { id: 0, name: 'Default' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await fetchWithDefaults('/api/test', defaults);

      expect(result).toEqual(defaults);
    });

    test('should return data for non-empty object', async () => {
      const mockData = { id: 1, name: 'Test', value: 'data' };
      const defaults = { id: 0, name: 'Default' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchWithDefaults('/api/test', defaults);

      expect(result).toEqual(mockData);
    });

    test('should return defaults on network error', async () => {
      const defaults = { id: 0, name: 'Default' };

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      const result = await fetchWithDefaults('/api/test', defaults);

      expect(result).toEqual(defaults);
      expect(sendErrorToDiscord).toHaveBeenCalled();
    });

    test('should handle absolute URL', async () => {
      const mockData = { id: 1 };
      const defaults = { id: 0 };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await fetchWithDefaults('https://other-api.example.com/api/test', defaults);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://other-api.example.com/api/test',
        {}
      );
    });
  });

  describe('isBackendAvailable', () => {
    test('should return true when backend is available', async () => {
      // Mock AbortSignal.timeout if it doesn't exist
      if (!AbortSignal.timeout) {
        (AbortSignal as any).timeout = jest.fn((ms: number) => {
          const controller = new AbortController();
          // Don't actually timeout in test - return non-aborted signal
          return controller.signal;
        });
      }

      (global.fetch as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve({
          ok: true,
          status: 200,
        });
      });

      const result = await isBackendAvailable();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('https://test-api.example.com/health');
    });

    test('should return false when backend is not available', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const result = await isBackendAvailable();

      expect(result).toBe(false);
    });

    test('should return false on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      const result = await isBackendAvailable();

      expect(result).toBe(false);
    });
  });
});


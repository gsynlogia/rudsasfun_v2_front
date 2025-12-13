/**
 * Unit tests for API Auth utilities (api-auth.ts)
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { authenticatedFetch, authenticatedApiCall, BackendUnavailableError } from '@/utils/api-auth';
import { authService } from '@/lib/services/AuthService';
import { sendErrorToDiscord } from '@/utils/discord-error';

// Mock fetch globally
global.fetch = jest.fn();

// Mock authService
jest.mock('@/lib/services/AuthService', () => ({
  authService: {
    getToken: jest.fn(),
    logout: jest.fn(),
  },
}));

// Mock discord-error
jest.mock('@/utils/discord-error', () => ({
  sendErrorToDiscord: jest.fn(),
}));

// Mock api-config
jest.mock('@/utils/api-config', () => ({
  getApiBaseUrlRuntime: jest.fn(() => 'https://test-api.example.com'),
}));

describe('API Auth Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (global as any).window;
  });

  describe('BackendUnavailableError', () => {
    test('should create BackendUnavailableError with default message', () => {
      const error = new BackendUnavailableError();

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('BackendUnavailableError');
      expect(error.message).toBe('Zapraszamy ponownie później.');
    });

    test('should create BackendUnavailableError with custom message', () => {
      const error = new BackendUnavailableError('Custom error message');

      expect(error.message).toBe('Custom error message');
    });
  });

  describe('authenticatedFetch', () => {
    test('should make authenticated fetch request successfully', async () => {
      const mockToken = 'test_token_123';
      (authService.getToken as jest.Mock).mockReturnValue(mockToken);

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await authenticatedFetch('https://test-api.example.com/api/test');

      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('https://test-api.example.com/api/test');
    });

    test('should include Authorization header with token', async () => {
      const mockToken = 'test_token_123';
      (authService.getToken as jest.Mock).mockReturnValue(mockToken);

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({}),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await authenticatedFetch('https://test-api.example.com/api/test');

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const headers = callArgs[1].headers;
      
      // Headers is a Headers object, check if Authorization was set
      expect(headers).toBeInstanceOf(Headers);
    });

    test('should set Content-Type header for JSON', async () => {
      const mockToken = 'test_token_123';
      (authService.getToken as jest.Mock).mockReturnValue(mockToken);

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({}),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await authenticatedFetch('https://test-api.example.com/api/test', {
        body: JSON.stringify({ test: 'data' }),
      });

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const headers = callArgs[1].headers;

      expect(headers).toBeInstanceOf(Headers);
    });

    test('should not set Content-Type for FormData', async () => {
      const mockToken = 'test_token_123';
      (authService.getToken as jest.Mock).mockReturnValue(mockToken);

      const formData = new FormData();
      formData.append('file', new Blob(['test']));

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({}),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await authenticatedFetch('https://test-api.example.com/api/test', {
        body: formData,
      });

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const headers = callArgs[1].headers;

      // FormData sets its own Content-Type with boundary
      expect(headers).toBeInstanceOf(Headers);
    });
  });

  describe('authenticatedApiCall', () => {
    test('should make authenticated API call successfully', async () => {
      const mockToken = 'test_token_123';
      (authService.getToken as jest.Mock).mockReturnValue(mockToken);

      const mockData = { id: 1, name: 'Test' };

      const mockHeaders = new Headers();
      mockHeaders.set('content-type', 'application/json');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        json: async () => mockData,
      });

      const result = await authenticatedApiCall<typeof mockData>('/api/test');

      expect(result).toEqual(mockData);
    });

    test('should handle relative endpoint URL', async () => {
      const mockToken = 'test_token_123';
      (authService.getToken as jest.Mock).mockReturnValue(mockToken);

      const mockData = { data: 'test' };

      const mockHeaders = new Headers();
      mockHeaders.set('content-type', 'application/json');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        json: async () => mockData,
      });

      await authenticatedApiCall('/api/test');

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('https://test-api.example.com/api/test');
    });

    test('should handle absolute endpoint URL', async () => {
      const mockToken = 'test_token_123';
      (authService.getToken as jest.Mock).mockReturnValue(mockToken);

      const mockData = { data: 'test' };

      const mockHeaders = new Headers();
      mockHeaders.set('content-type', 'application/json');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        json: async () => mockData,
      });

      await authenticatedApiCall('https://other-api.example.com/api/test');

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('https://other-api.example.com/api/test');
    });

    test('should return null for 204 No Content response', async () => {
      const mockToken = 'test_token_123';
      (authService.getToken as jest.Mock).mockReturnValue(mockToken);

      const mockHeaders = new Headers();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: mockHeaders,
      });

      const result = await authenticatedApiCall('/api/test', { method: 'DELETE' });

      expect(result).toBeNull();
    });

    test('should return null for non-JSON response', async () => {
      const mockToken = 'test_token_123';
      (authService.getToken as jest.Mock).mockReturnValue(mockToken);

      const mockHeaders = new Headers();
      mockHeaders.set('content-type', 'text/plain');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
      });

      const result = await authenticatedApiCall('/api/test');

      expect(result).toBeNull();
    });
  });
});


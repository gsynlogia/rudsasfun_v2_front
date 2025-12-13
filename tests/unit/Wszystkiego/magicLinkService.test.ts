/**
 * Unit tests for MagicLinkService
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { magicLinkService } from '@/lib/services/MagicLinkService';
import { MagicLinkRequest } from '@/types/magicLinkRequest';
import { MagicLinkResponse } from '@/types/magicLinkResponse';
import { MagicLinkVerifyResponse } from '@/types/magicLinkVerifyResponse';

// Mock fetch globally
global.fetch = jest.fn();

describe('MagicLinkService - Singleton Pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return the same instance (singleton)', () => {
    const { magicLinkService: magicLinkService2 } = require('@/lib/services/MagicLinkService');
    
    expect(magicLinkService).toBe(magicLinkService2);
  });

  test('should request magic link successfully', async () => {
    const mockRequest: MagicLinkRequest = {
      email: 'test@example.com',
    };

    const mockResponse: MagicLinkResponse = {
      message: 'Magic link sent successfully',
      success: true,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await magicLinkService.requestMagicLink('test@example.com');

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/magic-link/request'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockRequest),
      })
    );
  });

  test('should verify magic link successfully', async () => {
    const mockToken = 'magic_link_token_12345';

    const mockResponse: MagicLinkVerifyResponse = {
      access_token: 'jwt_token_12345',
      token_type: 'bearer',
      user: {
        id: 1,
        login: 'testuser',
        email: 'test@example.com',
        user_type: 'client',
        groups: ['users'],
        accessible_sections: ['profile'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await magicLinkService.verifyMagicLink(mockToken);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/auth/magic-link/verify?token=${encodeURIComponent(mockToken)}`),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  });

  test('should handle special characters in magic link token', async () => {
    const mockToken = 'token+with/special=chars&more';

    const mockResponse: MagicLinkVerifyResponse = {
      access_token: 'jwt_token',
      token_type: 'bearer',
      user: {
        id: 1,
        login: 'user',
        email: 'user@example.com',
        user_type: 'client',
        groups: [],
        accessible_sections: [],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await magicLinkService.verifyMagicLink(mockToken);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`token=${encodeURIComponent(mockToken)}`),
      expect.anything()
    );
  });
});


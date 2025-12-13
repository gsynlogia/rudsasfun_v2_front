/**
 * Unit tests for AuthService
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { authService } from '@/lib/services/AuthService';
import { User } from '@/types/user';
import { LoginResponse } from '@/types/loginResponse';

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('AuthService - Singleton Pattern', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test('should return the same instance (singleton)', () => {
    // Import again to get the same instance
    const { authService: authService2 } = require('@/lib/services/AuthService');
    
    expect(authService).toBe(authService2);
  });

  test('should successfully login and store token', async () => {
    const mockLoginResponse: LoginResponse = {
      access_token: 'test_token_12345',
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
      json: async () => mockLoginResponse,
    });

    const result = await authService.login('testuser', 'password123');

    expect(result).toEqual(mockLoginResponse);
    expect(localStorageMock.getItem('radsasfun_auth_token')).toBe('test_token_12345');
    expect(localStorageMock.getItem('radsasfun_auth_user')).toBe(JSON.stringify(mockLoginResponse.user));
  });

  test('should successfully logout and clear token', async () => {
    // First login
    localStorageMock.setItem('radsasfun_auth_token', 'test_token');
    localStorageMock.setItem('radsasfun_auth_user', JSON.stringify({ id: 1, login: 'testuser' }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    });

    await authService.logout();

    expect(localStorageMock.getItem('radsasfun_auth_token')).toBeNull();
    expect(localStorageMock.getItem('radsasfun_auth_user')).toBeNull();
  });

  test('should get stored token', () => {
    localStorageMock.setItem('radsasfun_auth_token', 'stored_token_123');

    const token = authService.getToken();

    expect(token).toBe('stored_token_123');
  });

  test('should return null when no token is stored', () => {
    const token = authService.getToken();

    expect(token).toBeNull();
  });

  test('should get current user from localStorage', () => {
    const mockUser: User = {
      id: 1,
      login: 'testuser',
      email: 'test@example.com',
      user_type: 'client',
      groups: ['users'],
      accessible_sections: ['profile'],
    };

    localStorageMock.setItem('radsasfun_auth_user', JSON.stringify(mockUser));

    const user = authService.getCurrentUser();

    expect(user).toEqual(mockUser);
  });

  test('should return null when no user is stored', () => {
    const user = authService.getCurrentUser();

    expect(user).toBeNull();
  });

  test('should check if user is authenticated', () => {
    localStorageMock.setItem('radsasfun_auth_token', 'test_token');

    const isAuthenticated = authService.isAuthenticated();

    expect(isAuthenticated).toBe(true);
  });

  test('should return false when user is not authenticated', () => {
    const isAuthenticated = authService.isAuthenticated();

    expect(isAuthenticated).toBe(false);
  });

  test('should check if user is admin by user_type', () => {
    const mockAdminUser: User = {
      id: 1,
      login: 'admin',
      email: 'admin@example.com',
      user_type: 'admin',
      groups: [],
    };

    localStorageMock.setItem('radsasfun_auth_user', JSON.stringify(mockAdminUser));

    const isAdmin = authService.isAdmin();

    expect(isAdmin).toBe(true);
  });

  test('should check if user is admin by groups', () => {
    const mockAdminUser: User = {
      id: 1,
      login: 'admin',
      email: 'admin@example.com',
      user_type: 'client',
      groups: ['admin', 'users'],
    };

    localStorageMock.setItem('radsasfun_auth_user', JSON.stringify(mockAdminUser));

    const isAdmin = authService.isAdmin();

    expect(isAdmin).toBe(true);
  });

  test('should return false when user is not admin', () => {
    const mockUser: User = {
      id: 1,
      login: 'user',
      email: 'user@example.com',
      user_type: 'client',
      groups: ['users'],
    };

    localStorageMock.setItem('radsasfun_auth_user', JSON.stringify(mockUser));

    const isAdmin = authService.isAdmin();

    expect(isAdmin).toBe(false);
  });

  test('should check if user is client', () => {
    const mockClientUser: User = {
      id: 1,
      login: 'client',
      email: 'client@example.com',
      user_type: 'client',
      groups: [],
    };

    localStorageMock.setItem('radsasfun_auth_user', JSON.stringify(mockClientUser));

    const isClient = authService.isClient();

    expect(isClient).toBe(true);
  });

  test('should return false when user is not client', () => {
    const mockUser: User = {
      id: 1,
      login: 'admin',
      email: 'admin@example.com',
      user_type: 'admin',
      groups: [],
    };

    localStorageMock.setItem('radsasfun_auth_user', JSON.stringify(mockUser));

    const isClient = authService.isClient();

    expect(isClient).toBe(false);
  });

  test('should store magic link auth', () => {
    const mockToken = 'magic_link_token_123';
    const mockUser: User = {
      id: 1,
      login: 'user',
      email: 'user@example.com',
      user_type: 'client',
      groups: [],
    };

    authService.storeMagicLinkAuth(mockToken, mockUser);

    expect(localStorageMock.getItem('radsasfun_auth_token')).toBe(mockToken);
    expect(localStorageMock.getItem('radsasfun_auth_user')).toBe(JSON.stringify(mockUser));
  });

  test('should get authorization header with token', () => {
    localStorageMock.setItem('radsasfun_auth_token', 'test_token_123');

    const header = authService.getAuthHeader();

    expect(header).toEqual({ Authorization: 'Bearer test_token_123' });
  });

  test('should return empty object when no token', () => {
    const header = authService.getAuthHeader();

    expect(header).toEqual({});
  });

  test('should verify token successfully', async () => {
    const mockToken = 'valid_token_123';
    const mockUser: User = {
      id: 1,
      login: 'user',
      email: 'user@example.com',
      user_type: 'client',
      groups: [],
    };

    localStorageMock.setItem('radsasfun_auth_token', mockToken);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const user = await authService.verifyToken();

    expect(user).toEqual(mockUser);
    expect(localStorageMock.getItem('radsasfun_auth_user')).toBe(JSON.stringify(mockUser));
  });

  test('should return null when token verification fails', async () => {
    localStorageMock.setItem('radsasfun_auth_token', 'invalid_token');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    const user = await authService.verifyToken();

    expect(user).toBeNull();
    expect(localStorageMock.getItem('radsasfun_auth_token')).toBeNull();
  });
});


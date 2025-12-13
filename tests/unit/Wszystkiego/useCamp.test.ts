/**
 * Unit tests for useCamp hook
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { renderHook } from '@testing-library/react';
import { useCamp } from '@/hooks/useCamp';
import { getCurrentCamp } from '@/utils/api';
import { Camp } from '@/types/camp';

// Mock the API function
jest.mock('@/utils/api', () => ({
  getCurrentCamp: jest.fn(),
}));

describe('useCamp Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return correct hook structure', () => {
    const mockCamp: Camp = {
      id: 1,
      name: 'Test Camp',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      properties: null,
    };

    (getCurrentCamp as jest.Mock).mockResolvedValueOnce(mockCamp);

    const { result } = renderHook(() => useCamp());

    expect(result.current).toHaveProperty('camp');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  test('should call getCurrentCamp on mount', () => {
    const mockCamp: Camp = {
      id: 1,
      name: 'Test Camp',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      properties: null,
    };

    (getCurrentCamp as jest.Mock).mockResolvedValueOnce(mockCamp);

    renderHook(() => useCamp());

    expect(getCurrentCamp).toHaveBeenCalledTimes(1);
  });

  test('should have initial loading state as true', () => {
    const mockCamp: Camp = {
      id: 1,
      name: 'Test Camp',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      properties: null,
    };

    (getCurrentCamp as jest.Mock).mockResolvedValueOnce(mockCamp);

    const { result } = renderHook(() => useCamp());

    expect(result.current.loading).toBe(true);
    expect(result.current.camp).toBeNull();
    expect(result.current.error).toBeNull();
  });

  test('should have refetch function that is callable', () => {
    const mockCamp: Camp = {
      id: 1,
      name: 'Test Camp',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      properties: null,
    };

    (getCurrentCamp as jest.Mock).mockResolvedValueOnce(mockCamp);

    const { result } = renderHook(() => useCamp());

    expect(typeof result.current.refetch).toBe('function');
    expect(() => result.current.refetch()).not.toThrow();
  });
});

/**
 * Unit tests for API Server utilities (api-server.ts)
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { getCampEdition, getCampById } from '@/utils/api-server';
import { CampWithProperty } from '@/types/campWithProperty';
import { Camp } from '@/types/camp';

// Mock fetch globally
global.fetch = jest.fn();

// Mock api-config
jest.mock('@/utils/api-config', () => ({
  getApiBaseUrl: jest.fn(() => 'https://test-api.example.com'),
}));

describe('API Server Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getCampEdition', () => {
    test('should get camp edition successfully', async () => {
      const mockData: CampWithProperty = {
        camp: {
          id: 1,
          name: 'Test Camp',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          properties: null,
        },
        property: {
          id: 1,
          camp_id: 1,
          period: 'lato',
          city: 'Warszawa',
          start_date: '2024-07-01',
          end_date: '2024-07-14',
          days_count: 14,
          max_participants: 50,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: async () => mockData,
      });

      const promise = getCampEdition(1, 1);
      jest.advanceTimersByTime(1000);
      const result = await promise;

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/camps/1/edition/1'),
        expect.objectContaining({
          cache: 'no-store',
        })
      );
    });

    test('should return empty data for invalid campId', async () => {
      const result = await getCampEdition(0, 1);

      expect(result.camp.id).toBe(0);
      expect(result.property.id).toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should return empty data for invalid editionId', async () => {
      const result = await getCampEdition(1, 0);

      expect(result.camp.id).toBe(0);
      expect(result.property.id).toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should return empty data for NaN campId', async () => {
      const result = await getCampEdition(NaN, 1);

      expect(result.camp.id).toBe(0);
      expect(result.property.id).toBe(0);
    });

    test('should return empty data for negative campId', async () => {
      const result = await getCampEdition(-1, 1);

      expect(result.camp.id).toBe(0);
      expect(result.property.id).toBe(0);
    });
  });

  describe('getCampById', () => {
    test('should get camp by ID successfully', async () => {
      const mockCamp: Camp = {
        id: 1,
        name: 'Test Camp',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        properties: null,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCamp,
      });

      const result = await getCampById(1);

      expect(result).toEqual(mockCamp);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/camps/1'),
        expect.objectContaining({
          cache: 'no-store',
        })
      );
    });

    test('should get camp with properties', async () => {
      const mockCamp: Camp = {
        id: 1,
        name: 'Test Camp',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        properties: [
          {
            id: 1,
            camp_id: 1,
            period: 'lato',
            city: 'Warszawa',
            start_date: '2024-07-01',
            end_date: '2024-07-14',
            days_count: 14,
            max_participants: 50,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCamp,
      });

      const result = await getCampById(1);

      expect(result).toEqual(mockCamp);
      expect(result.properties).toHaveLength(1);
    });
  });
});


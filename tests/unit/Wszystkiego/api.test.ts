/**
 * Unit tests for API utilities (api.ts)
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { formatDate, formatDateRange, getCamps, getCampById, getCurrentCamp } from '@/utils/api';
import { Camp } from '@/types/camp';
import { CampListResponse } from '@/types/campListResponse';

// Mock fetch globally
global.fetch = jest.fn();

// Mock API_BASE_URL
jest.mock('@/utils/api-config', () => ({
  API_BASE_URL: 'https://test-api.example.com',
}));

describe('API Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatDate', () => {
    test('should format date to Polish format (DD.MM.YYYY)', () => {
      const dateString = '2024-07-15';
      const result = formatDate(dateString);

      expect(result).toBe('15.07.2024');
    });

    test('should format date with single digit day and month', () => {
      const dateString = '2024-01-05';
      const result = formatDate(dateString);

      expect(result).toBe('05.01.2024');
    });

    test('should format date for different year', () => {
      const dateString = '2025-12-31';
      const result = formatDate(dateString);

      expect(result).toBe('31.12.2025');
    });
  });

  describe('formatDateRange', () => {
    test('should format date range to Polish format (DD.MM - DD.MM.YYYY)', () => {
      const startDate = '2024-07-01';
      const endDate = '2024-07-14';
      const result = formatDateRange(startDate, endDate);

      expect(result).toBe('01.07 - 14.07.2024');
    });

    test('should format date range with single digit days', () => {
      const startDate = '2024-01-05';
      const endDate = '2024-01-10';
      const result = formatDateRange(startDate, endDate);

      expect(result).toBe('05.01 - 10.01.2024');
    });

    test('should format date range across different months', () => {
      const startDate = '2024-06-28';
      const endDate = '2024-07-14';
      const result = formatDateRange(startDate, endDate);

      expect(result).toBe('28.06 - 14.07.2024');
    });

    test('should format date range across different years', () => {
      const startDate = '2024-12-28';
      const endDate = '2025-01-05';
      const result = formatDateRange(startDate, endDate);

      expect(result).toBe('28.12 - 05.01.2025');
    });
  });

  describe('getCamps', () => {
    test('should get all camps successfully', async () => {
      const mockResponse: CampListResponse = {
        camps: [
          {
            id: 1,
            name: 'Test Camp 1',
            period: 'lato',
            city: 'Warszawa',
            start_date: '2024-07-01',
            end_date: '2024-07-14',
            days_count: 14,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            name: 'Test Camp 2',
            period: 'zima',
            city: 'Kraków',
            start_date: '2024-12-20',
            end_date: '2024-12-27',
            days_count: 7,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        total: 2,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getCamps();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://test-api.example.com/api/camps');
    });

    test('should return empty camps list', async () => {
      const mockResponse: CampListResponse = {
        camps: [],
        total: 0,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getCamps();

      expect(result).toEqual(mockResponse);
      expect(result.camps).toHaveLength(0);
    });
  });

  describe('getCampById', () => {
    test('should get camp by ID successfully', async () => {
      const mockCamp: Camp = {
        id: 1,
        name: 'Test Camp',
        period: 'lato',
        city: 'Warszawa',
        start_date: '2024-07-01',
        end_date: '2024-07-14',
        days_count: 14,
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
      expect(global.fetch).toHaveBeenCalledWith('https://test-api.example.com/api/camps/1');
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

  describe('getCurrentCamp', () => {
    test('should get current active camp successfully', async () => {
      const mockCamp: Camp = {
        id: 1,
        name: 'Current Camp',
        period: 'lato',
        city: 'Warszawa',
        start_date: '2024-07-01',
        end_date: '2024-07-14',
        days_count: 14,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        properties: null,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCamp,
      });

      const result = await getCurrentCamp();

      expect(result).toEqual(mockCamp);
      expect(global.fetch).toHaveBeenCalledWith('https://test-api.example.com/api/camps/current/active');
    });
  });
});


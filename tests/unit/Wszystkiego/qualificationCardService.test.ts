/**
 * Unit tests for QualificationCardService
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { qualificationCardService } from '@/lib/services/QualificationCardService';
import { QualificationCardResponse } from '@/types/qualificationCardResponse';
import { authService } from '@/lib/services/AuthService';

// Mock fetch globally
global.fetch = jest.fn();

// Mock authService
jest.mock('@/lib/services/AuthService', () => ({
  authService: {
    getToken: jest.fn(),
  },
}));

// Mock window.URL methods
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  window.URL.revokeObjectURL = jest.fn();
  
  const mockAnchor = {
    href: '',
    download: '',
    click: jest.fn(),
  };
  
  document.createElement = jest.fn((tag: string) => {
    if (tag === 'a') return mockAnchor as any;
    return {} as any;
  });
  
  document.body.appendChild = jest.fn();
  document.body.removeChild = jest.fn();
}

describe('QualificationCardService - Singleton Pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should return the same instance (singleton)', () => {
    const { qualificationCardService: qualificationCardService2 } = require('@/lib/services/QualificationCardService');
    
    expect(qualificationCardService).toBe(qualificationCardService2);
  });

  test('should get qualification card download URL', () => {
    const url = qualificationCardService.getQualificationCardDownloadUrl(1);

    expect(url).toContain('/api/qualification-cards/1');
  });

  test('should download qualification card successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockBlob = new Blob(['Card content'], { type: 'application/pdf' });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    const downloadPromise = qualificationCardService.downloadQualificationCard(1);
    
    // Fast-forward timers
    jest.advanceTimersByTime(1000);
    
    await downloadPromise;

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/qualification-cards/1'),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      })
    );
  });

  test('should list my qualification cards successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockCards: QualificationCardResponse[] = [
      {
        reservation_id: 1,
        card_filename: 'card_1.pdf',
        card_path: '/cards/card_1.pdf',
        created_at: '2024-01-01T00:00:00Z',
        camp_name: 'Test Camp',
        property_name: 'Test Property',
        participant_first_name: 'Anna',
        participant_last_name: 'Kowalska',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCards,
    });

    const result = await qualificationCardService.listMyQualificationCards();

    expect(result).toEqual(mockCards);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/qualification-cards/my'),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      })
    );
  });

  test('should generate qualification card successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockResponse = {
      status: 'success',
      message: 'Qualification card generated successfully',
      card_path: '/cards/card_1.pdf',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await qualificationCardService.generateQualificationCard(1);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/qualification-cards/1/generate'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      })
    );
  });

  test('should get qualification card successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockCards: QualificationCardResponse[] = [
      {
        reservation_id: 1,
        card_filename: 'card_1.pdf',
        card_path: '/cards/card_1.pdf',
        created_at: '2024-01-01T00:00:00Z',
        camp_name: 'Test Camp',
        property_name: 'Test Property',
        participant_first_name: 'Anna',
        participant_last_name: 'Kowalska',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCards,
    });

    const result = await qualificationCardService.getQualificationCard(1);

    expect(result).toEqual(mockCards[0]);
  });

  test('should return null when qualification card not found', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockCards: QualificationCardResponse[] = [
      {
        reservation_id: 2,
        card_filename: 'card_2.pdf',
        card_path: '/cards/card_2.pdf',
        created_at: '2024-01-01T00:00:00Z',
        camp_name: 'Test Camp',
        property_name: 'Test Property',
        participant_first_name: 'Anna',
        participant_last_name: 'Kowalska',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCards,
    });

    const result = await qualificationCardService.getQualificationCard(1);

    expect(result).toBeNull();
  });

  test('should update qualification card status successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockResponse = {
      status: 'success',
      message: 'Qualification card status updated',
      qualification_card_status: 'approved',
      rejection_reason: null,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await qualificationCardService.updateQualificationCardStatus(1, 'approved');

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/qualification-cards/1/status'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      })
    );
  });

  test('should upload qualification card successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockFile = new File(['card content'], 'card.pdf', { type: 'application/pdf' });

    const mockResponse = {
      id: 1,
      reservation_id: 1,
      file_name: 'card.pdf',
      source: 'user',
      uploaded_at: '2024-01-01T00:00:00Z',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await qualificationCardService.uploadQualificationCard(1, mockFile);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/qualification-cards/1/upload'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      })
    );
  });

  test('should get qualification card files successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockFiles = [
      {
        id: 1,
        reservation_id: 1,
        file_name: 'card_1.pdf',
        file_path: '/cards/card_1.pdf',
        source: 'generated',
        uploaded_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFiles,
    });

    const result = await qualificationCardService.getQualificationCardFiles(1);

    expect(result).toEqual(mockFiles);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/qualification-cards/1/files'),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      })
    );
  });
});


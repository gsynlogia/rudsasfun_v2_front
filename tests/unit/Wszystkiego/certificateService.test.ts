/**
 * Unit tests for CertificateService
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { certificateService } from '@/lib/services/CertificateService';
import { CertificateResponse } from '@/types/certificateResponse';
import { CertificateUploadResponse } from '@/types/certificateUploadResponse';
import { CertificateListResponse } from '@/types/certificateListResponse';
import { authService } from '@/lib/services/AuthService';

// Mock fetch globally
global.fetch = jest.fn();

// Mock authService
jest.mock('@/lib/services/AuthService', () => ({
  authService: {
    getToken: jest.fn(),
  },
}));

describe('CertificateService - Singleton Pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return the same instance (singleton)', () => {
    const { certificateService: certificateService2 } = require('@/lib/services/CertificateService');
    
    expect(certificateService).toBe(certificateService2);
  });

  test('should upload certificate successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockFile = new File(['certificate content'], 'certificate.pdf', { type: 'application/pdf' });

    const mockResponse: CertificateUploadResponse = {
      id: 1,
      reservation_id: 1,
      file_name: 'certificate.pdf',
      file_url: '/certificates/certificate_1.pdf',
      uploaded_at: '2024-01-01T00:00:00Z',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await certificateService.uploadCertificate(1, mockFile);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/certificates/upload?reservation_id=1'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      })
    );
  });

  test('should get certificates for reservation successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockResponse: CertificateListResponse = {
      certificates: [
        {
          id: 1,
          reservation_id: 1,
          file_path: '/certificates/certificate_1.pdf',
          file_name: 'certificate.pdf',
          uploaded_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          file_url: '/certificates/certificate_1.pdf',
        },
      ],
      total: 1,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await certificateService.getCertificates(1);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/certificates/reservation/1'),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      })
    );
  });

  test('should download certificate successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockBlob = new Blob(['Certificate content'], { type: 'application/pdf' });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    const result = await certificateService.downloadCertificate(1);

    expect(result).toBe(mockBlob);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/certificates/1/download'),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      })
    );
  });

  test('should delete certificate successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    });

    await certificateService.deleteCertificate(1);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/certificates/1'),
      expect.objectContaining({
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      })
    );
  });
});


/**
 * Unit tests for ContractService
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { contractService } from '@/lib/services/ContractService';
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

describe('ContractService - Singleton Pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return the same instance (singleton)', () => {
    const { contractService: contractService2 } = require('@/lib/services/ContractService');
    
    expect(contractService).toBe(contractService2);
  });

  test('should generate contract successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockResponse = {
      status: 'success',
      message: 'Contract generated successfully',
      contract_path: '/contracts/contract_1.pdf',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await contractService.generateContract(1);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/contracts/1/generate'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      })
    );
  });

  test('should get contract successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockContracts = [
      {
        reservation_id: 1,
        contract_filename: 'contract_1.pdf',
        contract_path: '/contracts/contract_1.pdf',
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockContracts,
    });

    const result = await contractService.getContract(1);

    expect(result).toEqual({
      contract_filename: 'contract_1.pdf',
      created_at: '2024-01-01T00:00:00Z',
      contract_path: '/contracts/contract_1.pdf',
    });
  });

  test('should return null when contract not found', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockContracts = [
      {
        reservation_id: 2,
        contract_filename: 'contract_2.pdf',
        contract_path: '/contracts/contract_2.pdf',
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockContracts,
    });

    const result = await contractService.getContract(1);

    expect(result).toBeNull();
  });

  test('should get contract download URL', () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const url = contractService.getContractDownloadUrl(1);

    expect(url).toContain('/api/contracts/1');
  });

  test('should download contract successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockBlob = new Blob(['Contract content'], { type: 'application/pdf' });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', message: 'Contract generated' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

    await contractService.downloadContract(1);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/contracts/1/generate'),
      expect.anything()
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/contracts/1'),
      expect.anything()
    );
  });

  test('should list my contracts successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockContracts = [
      {
        reservation_id: 1,
        contract_filename: 'contract_1.pdf',
        contract_path: '/contracts/contract_1.pdf',
        created_at: '2024-01-01T00:00:00Z',
        camp_name: 'Test Camp',
        property_name: 'Test Property',
        participant_first_name: 'Anna',
        participant_last_name: 'Kowalska',
        total_price: 1200,
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockContracts,
    });

    const result = await contractService.listMyContracts();

    expect(result).toEqual(mockContracts);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/contracts/my'),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      })
    );
  });

  test('should update contract status successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockResponse = {
      status: 'success',
      message: 'Contract status updated',
      contract_status: 'approved',
      rejection_reason: null,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await contractService.updateContractStatus(1, 'approved');

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/contracts/1/status'),
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

  test('should update contract status with rejection reason', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockResponse = {
      status: 'success',
      message: 'Contract status updated',
      contract_status: 'rejected',
      rejection_reason: 'Invalid data',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await contractService.updateContractStatus(1, 'rejected', 'Invalid data');

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/contracts/1/status'),
      expect.objectContaining({
        body: JSON.stringify({ status: 'rejected', rejection_reason: 'Invalid data' }),
      })
    );
  });

  test('should upload contract successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockFile = new File(['contract content'], 'contract.pdf', { type: 'application/pdf' });

    const mockResponse = {
      id: 1,
      reservation_id: 1,
      file_name: 'contract.pdf',
      source: 'user',
      uploaded_at: '2024-01-01T00:00:00Z',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await contractService.uploadContract(1, mockFile);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/contracts/1/upload'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      })
    );
  });

  test('should get contract files successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockFiles = [
      {
        id: 1,
        reservation_id: 1,
        file_name: 'contract_1.pdf',
        file_path: '/contracts/contract_1.pdf',
        source: 'generated',
        uploaded_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFiles,
    });

    const result = await contractService.getContractFiles(1);

    expect(result).toEqual(mockFiles);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/contracts/1/files'),
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


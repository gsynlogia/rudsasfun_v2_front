/**
 * Unit tests for InvoiceService
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { invoiceService } from '@/lib/services/InvoiceService';
import { InvoiceResponse } from '@/types/invoiceResponse';
import { InvoiceListResponse } from '@/types/invoiceListResponse';
import { InvoiceGenerateRequest } from '@/types/invoiceGenerateRequest';
import { authService } from '@/lib/services/AuthService';

// Mock fetch globally
global.fetch = jest.fn();

// Mock authService
jest.mock('@/lib/services/AuthService', () => ({
  authService: {
    getToken: jest.fn(),
  },
}));

describe('InvoiceService - Singleton Pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return the same instance (singleton)', () => {
    const { invoiceService: invoiceService2 } = require('@/lib/services/InvoiceService');
    
    expect(invoiceService).toBe(invoiceService2);
  });

  test('should generate invoice successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockRequest: InvoiceGenerateRequest = {
      reservation_id: 1,
      selected_items: ['item1', 'item2'],
      buyer_tax_no: '1234567890',
    };

    const mockResponse: InvoiceResponse = {
      id: 1,
      reservation_id: 1,
      user_id: 1,
      fakturownia_invoice_id: 12345,
      invoice_number: 'FV/2024/001',
      invoice_pdf_path: '/invoices/invoice_1.pdf',
      total_amount: 1200,
      net_amount: 975.61,
      tax_amount: 224.39,
      is_paid: false,
      paid_at: null,
      is_canceled: false,
      canceled_at: null,
      issue_date: '2024-01-01',
      sell_date: '2024-01-01',
      payment_to: '2024-01-15',
      buyer_name: 'Jan Kowalski',
      buyer_tax_no: '1234567890',
      buyer_email: 'jan@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await invoiceService.generateInvoice(mockRequest);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/invoices/generate'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`,
        },
        body: JSON.stringify(mockRequest),
      })
    );
  });

  test('should get my invoices successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockResponse: InvoiceListResponse = {
      invoices: [
        {
          id: 1,
          reservation_id: 1,
          user_id: 1,
          fakturownia_invoice_id: 12345,
          invoice_number: 'FV/2024/001',
          invoice_pdf_path: '/invoices/invoice_1.pdf',
          total_amount: 1200,
          net_amount: 975.61,
          tax_amount: 224.39,
          is_paid: true,
          paid_at: '2024-01-02T00:00:00Z',
          is_canceled: false,
          canceled_at: null,
          issue_date: '2024-01-01',
          sell_date: '2024-01-01',
          payment_to: '2024-01-15',
          buyer_name: 'Jan Kowalski',
          buyer_tax_no: '1234567890',
          buyer_email: 'jan@example.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await invoiceService.getMyInvoices();

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/invoices/my'),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      })
    );
  });

  test('should download invoice PDF successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    const result = await invoiceService.downloadInvoice(1);

    expect(result).toBe(mockBlob);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/invoices/1/pdf'),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      })
    );
  });

  test('should get invoice PDF URL', () => {
    const url = invoiceService.getInvoicePdfUrl(1);

    expect(url).toContain('/api/invoices/1/pdf');
  });

  test('should get invoices by reservation successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockResponse: InvoiceListResponse = {
      invoices: [],
      total: 0,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await invoiceService.getInvoicesByReservation(1);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/invoices/reservation/1'),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      })
    );
  });

  test('should cancel invoice successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    });

    await invoiceService.cancelInvoice(1);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/invoices/1'),
      expect.objectContaining({
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      })
    );
  });
});


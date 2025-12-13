/**
 * Unit tests for PaymentService
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { paymentService } from '@/lib/services/PaymentService';
import { CreatePaymentRequest } from '@/types/createPaymentRequest';
import { CreatePaymentResponse } from '@/types/createPaymentResponse';
import { PaymentStatusResponse } from '@/types/paymentStatusResponse';
import { PaymentMethodsResponse } from '@/types/paymentMethodsResponse';
import { PaymentResponse } from '@/types/paymentResponse';
import { authService } from '@/lib/services/AuthService';

// Mock fetch globally
global.fetch = jest.fn();

// Mock authService
jest.mock('@/lib/services/AuthService', () => ({
  authService: {
    getToken: jest.fn(),
  },
}));

describe('PaymentService - Singleton Pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return the same instance (singleton)', () => {
    // Import again to get the same instance
    const { paymentService: paymentService2 } = require('@/lib/services/PaymentService');
    
    expect(paymentService).toBe(paymentService2);
  });

  test('should create payment successfully', async () => {
    const mockRequest: CreatePaymentRequest = {
      amount: 1000,
      description: 'Test payment',
      order_id: 'order_123',
      payer_email: 'test@example.com',
      payer_name: 'Test User',
    };

    const mockResponse: CreatePaymentResponse = {
      transaction_id: 'trans_12345',
      status: 'pending',
      payment_url: 'https://tpay.com/pay/12345',
      title: 'Test Payment',
      order_id: 'order_123',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await paymentService.createPayment(mockRequest);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payments/create'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockRequest),
      })
    );
  });

  test('should get payment status successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockStatusResponse: PaymentStatusResponse = {
      transaction_id: 'trans_12345',
      order_id: 'order_123',
      status: 'paid',
      amount: 1000,
      paid_amount: 1000,
      payer_email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
      paid_at: '2024-01-01T01:00:00Z',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatusResponse,
    });

    const result = await paymentService.getPaymentStatus('trans_12345');

    expect(result).toEqual(mockStatusResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payments/trans_12345/status'),
      expect.objectContaining({
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      })
    );
  });

  test('should get payment methods successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockMethodsResponse: PaymentMethodsResponse = {
      banks: [
        {
          id: 1,
          name: 'PKO',
          full_name: 'PKO Bank Polski',
          image: { small: 'pkobp.png' },
          instant_redirection: true,
        },
      ],
      cards: [
        {
          id: 53,
          name: 'Card',
          full_name: 'Credit Card',
          image: { small: 'card.png' },
          instant_redirection: true,
        },
      ],
      wallets: [],
      installments: [],
      other: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMethodsResponse,
    });

    const result = await paymentService.getPaymentMethods();

    expect(result).toEqual(mockMethodsResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payments/methods'),
      expect.objectContaining({
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      })
    );
  });

  test('should sync payment status successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockPaymentResponse: PaymentResponse = {
      id: 1,
      transaction_id: 'trans_12345',
      order_id: 'order_123',
      amount: 1000,
      paid_amount: 1000,
      description: 'Test payment',
      status: 'paid',
      payer_email: 'test@example.com',
      payer_name: 'Test User',
      channel_id: 53,
      payment_url: null,
      title: 'Test Payment',
      created_at: '2024-01-01T00:00:00Z',
      paid_at: '2024-01-01T01:00:00Z',
      webhook_received_at: '2024-01-01T01:00:01Z',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentResponse,
    });

    const result = await paymentService.syncPaymentStatus('trans_12345');

    expect(result).toEqual(mockPaymentResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payments/trans_12345/sync'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      })
    );
  });

  test('should list payments successfully', async () => {
    const mockToken = 'test_token_123';
    (authService.getToken as jest.Mock).mockReturnValue(mockToken);

    const mockPayments: PaymentResponse[] = [
      {
        id: 1,
        transaction_id: 'trans_1',
        order_id: 'order_1',
        amount: 1000,
        paid_amount: 1000,
        description: 'Payment 1',
        status: 'paid',
        payer_email: 'test1@example.com',
        payer_name: 'User 1',
        channel_id: 53,
        payment_url: null,
        title: 'Payment 1',
        created_at: '2024-01-01T00:00:00Z',
        paid_at: '2024-01-01T01:00:00Z',
        webhook_received_at: null,
      },
      {
        id: 2,
        transaction_id: 'trans_2',
        order_id: 'order_2',
        amount: 2000,
        paid_amount: null,
        description: 'Payment 2',
        status: 'pending',
        payer_email: 'test2@example.com',
        payer_name: 'User 2',
        channel_id: null,
        payment_url: 'https://tpay.com/pay/2',
        title: 'Payment 2',
        created_at: '2024-01-02T00:00:00Z',
        paid_at: null,
        webhook_received_at: null,
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPayments,
    });

    const result = await paymentService.listPayments(0, 100);

    expect(result).toEqual(mockPayments);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payments?skip=0&limit=100'),
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


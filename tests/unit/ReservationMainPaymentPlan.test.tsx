/**
 * Unit tests for ReservationMain payment plan functionality
 * Tests payment installments logic with mocked data
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ReservationMain from '@/components/profile/ReservationMain';
import { reservationService } from '@/lib/services/ReservationService';
import { paymentService } from '@/lib/services/PaymentService';
import { contractService } from '@/lib/services/ContractService';
import { qualificationCardService } from '@/lib/services/QualificationCardService';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock services
jest.mock('@/lib/services/ReservationService');
jest.mock('@/lib/services/PaymentService');
jest.mock('@/lib/services/ContractService');
jest.mock('@/lib/services/QualificationCardService');

// Mock data
const MOCK_RESERVATION = {
  id: 1,
  camp_id: 1,
  property_id: 1,
  status: 'pending',
  total_price: 2550.0,
  deposit_amount: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  camp_name: 'Test Camp',
  property_name: 'Test Property',
  property_city: 'Gdańsk',
  property_period: 'Test Period',
  property_start_date: '2025-07-01',
  property_end_date: '2025-07-15',
  participant_first_name: 'Antek',
  participant_last_name: 'Guzik',
  participant_age: '10',
  participant_gender: 'M',
  participant_city: 'Gdańsk',
  parents_data: [
    {
      id: '1',
      firstName: 'Szymon',
      lastName: 'Guzik',
      email: 'test@example.com',
      phone: '+48',
      phoneNumber: '735048660',
      street: 'Test Street',
      postalCode: '80-180',
      city: 'Gdańsk',
    },
  ],
  invoice_type: 'private',
  invoice_first_name: 'Szymon',
  invoice_last_name: 'Guzik',
  invoice_email: 'test@example.com',
  invoice_phone: '+48735048660',
  invoice_company_name: null,
  invoice_nip: null,
  invoice_street: 'Test Street',
  invoice_postal_code: '80-180',
  invoice_city: 'Gdańsk',
  departure_type: 'zbiorowy',
  departure_city: 'Gdańsk',
  return_type: 'zbiorowy',
  return_city: 'Gdańsk',
  diet: null,
  diet_name: null,
  accommodation_request: null,
  selected_source: '1',
  source_name: null,
  selected_addons: null,
  selected_protection: null,
  contract_status: null,
  contract_rejection_reason: null,
  qualification_card_status: null,
  qualification_card_rejection_reason: null,
  payment_plan: null,
};

const MOCK_PAYMENTS = [
  {
    id: 1,
    transaction_id: 'TEST123',
    order_id: 'RES-1',
    amount: 600.0,
    paid_amount: 600.0,
    description: 'Test payment',
    status: 'success',
    payer_email: 'test@example.com',
    payer_name: 'Szymon Guzik',
    channel_id: 64,
    payment_url: 'https://secure.tpay.com/',
    title: 'Test Payment',
    created_at: '2025-01-01T00:00:00Z',
    paid_at: '2025-01-01T00:00:00Z',
    webhook_received_at: '2025-01-01T00:00:00Z',
  },
];

describe('ReservationMain Payment Plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock payment service
    (paymentService.listPayments as jest.Mock).mockResolvedValue(MOCK_PAYMENTS);
    
    // Mock contract service
    (contractService.listMyContracts as jest.Mock).mockResolvedValue([]);
    
    // Mock qualification card service
    (qualificationCardService.getQualificationCard as jest.Mock).mockResolvedValue(null);
    
    // Mock reservation service updatePaymentPlan
    (reservationService.updatePaymentPlan as jest.Mock).mockResolvedValue({
      ...MOCK_RESERVATION,
      payment_plan: 'full',
    });
    
    // Mock payment service createPayment
    (paymentService.createPayment as jest.Mock).mockResolvedValue({
      transaction_id: 'TEST123',
      status: 'pending',
      payment_url: 'https://secure.tpay.com/test',
      title: 'Test Payment',
      order_id: 'RES-1-1234567890',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should display detailed payment breakdown', async () => {
    const reservation = { ...MOCK_RESERVATION, payment_plan: null };
    
    render(
      <ReservationMain
        reservation={reservation}
        isDetailsExpanded={true}
        onToggleDetails={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Całkowity koszt:/i)).toBeInTheDocument();
      expect(screen.getByText(/Całkowite wpływy:/i)).toBeInTheDocument();
      expect(screen.getByText(/Pozostała kwota do zapłaty:/i)).toBeInTheDocument();
    });
  });

  it('should calculate remaining amount correctly', async () => {
    const reservation = { ...MOCK_RESERVATION, payment_plan: null };
    
    render(
      <ReservationMain
        reservation={reservation}
        isDetailsExpanded={true}
        onToggleDetails={jest.fn()}
      />
    );

    await waitFor(() => {
      // Total price: 2550, Paid: 600, Remaining: 1950
      expect(screen.getByText(/2550\.00 PLN/i)).toBeInTheDocument();
      expect(screen.getByText(/600\.00 PLN/i)).toBeInTheDocument();
      expect(screen.getByText(/1950\.00 PLN/i)).toBeInTheDocument();
    });
  });

  it('should show payment options based on remaining amount', async () => {
    const reservation = { ...MOCK_RESERVATION, payment_plan: null };
    
    render(
      <ReservationMain
        reservation={reservation}
        isDetailsExpanded={true}
        onToggleDetails={jest.fn()}
      />
    );

    await waitFor(() => {
      // Options should show amounts based on remaining (1950), not total (2550)
      expect(screen.getByText(/Pełna płatność \(1950\.00 zł\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Płatność w dwóch ratach \(po 975\.00 zł\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Płatność w trzech ratach \(po 650\.00 zł\)/i)).toBeInTheDocument();
    });
  });

  it('should save payment plan when option is selected', async () => {
    const reservation = { ...MOCK_RESERVATION, payment_plan: null };
    
    render(
      <ReservationMain
        reservation={reservation}
        isDetailsExpanded={true}
        onToggleDetails={jest.fn()}
      />
    );

    await waitFor(() => {
      const fullPaymentRadio = screen.getByLabelText(/Pełna płatność/i);
      expect(fullPaymentRadio).toBeInTheDocument();
    });

    const fullPaymentRadio = screen.getByLabelText(/Pełna płatność/i);
    fireEvent.click(fullPaymentRadio);

    // Wait for async update
    await waitFor(() => {
      expect(reservationService.updatePaymentPlan).toHaveBeenCalledWith(1, 'full');
    }, { timeout: 3000 });
  });

  it('should show payment button only after selecting payment method', async () => {
    const reservation = { ...MOCK_RESERVATION, payment_plan: null };
    
    render(
      <ReservationMain
        reservation={reservation}
        isDetailsExpanded={true}
        onToggleDetails={jest.fn()}
      />
    );

    await waitFor(() => {
      // Payment button should not be visible initially
      const payButton = screen.queryByText(/zapłać/i);
      expect(payButton).not.toBeInTheDocument();
    });

    // Select payment method
    await waitFor(() => {
      const fullPaymentRadio = screen.getByLabelText(/Pełna płatność/i);
      fireEvent.click(fullPaymentRadio);
    });

    await waitFor(() => {
      // Payment button should now be visible
      const payButton = screen.getByText(/zapłać/i);
      expect(payButton).toBeInTheDocument();
    });
  });

  it('should hide other options after first installment is paid', async () => {
    const reservation = { ...MOCK_RESERVATION, payment_plan: '2' }; // Already selected 2 installments
    
    render(
      <ReservationMain
        reservation={reservation}
        isDetailsExpanded={true}
        onToggleDetails={jest.fn()}
      />
    );

    await waitFor(() => {
      // Only option "2" should be visible, others should be hidden
      expect(screen.getByLabelText(/Płatność w dwóch ratach/i)).toBeInTheDocument();
      
      // Full payment and 3 installments should not be visible
      const fullPayment = screen.queryByLabelText(/Pełna płatność/i);
      const threeInstallments = screen.queryByLabelText(/Płatność w trzech ratach/i);
      
      // These should be disabled or not visible
      expect(fullPayment).not.toBeInTheDocument();
      expect(threeInstallments).not.toBeInTheDocument();
    });
  });

  it('should calculate payment amount correctly for full payment', async () => {
    const reservation = { ...MOCK_RESERVATION, payment_plan: null };
    
    render(
      <ReservationMain
        reservation={reservation}
        isDetailsExpanded={true}
        onToggleDetails={jest.fn()}
      />
    );

    await waitFor(() => {
      const fullPaymentRadio = screen.getByLabelText(/Pełna płatność/i);
      fireEvent.click(fullPaymentRadio);
    });

    await waitFor(() => {
      const payButton = screen.getByText(/zapłać/i);
      fireEvent.click(payButton);
    });

    await waitFor(() => {
      expect(paymentService.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1950.0, // Remaining amount, not total
        })
      );
    });
  });

  it('should calculate payment amount correctly for two installments', async () => {
    const reservation = { ...MOCK_RESERVATION, payment_plan: null };
    
    render(
      <ReservationMain
        reservation={reservation}
        isDetailsExpanded={true}
        onToggleDetails={jest.fn()}
      />
    );

    await waitFor(() => {
      const twoInstallmentsRadio = screen.getByLabelText(/Płatność w dwóch ratach/i);
      fireEvent.click(twoInstallmentsRadio);
    });

    await waitFor(() => {
      const payButton = screen.getByText(/zapłać/i);
      fireEvent.click(payButton);
    });

    await waitFor(() => {
      expect(paymentService.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 975.0, // Remaining amount / 2 = 1950 / 2 = 975
        })
      );
    });
  });

  it('should calculate payment amount correctly for three installments', async () => {
    const reservation = { ...MOCK_RESERVATION, payment_plan: null };
    
    render(
      <ReservationMain
        reservation={reservation}
        isDetailsExpanded={true}
        onToggleDetails={jest.fn()}
      />
    );

    await waitFor(() => {
      const threeInstallmentsRadio = screen.getByLabelText(/Płatność w trzech ratach/i);
      fireEvent.click(threeInstallmentsRadio);
    });

    await waitFor(() => {
      const payButton = screen.getByText(/zapłać/i);
      fireEvent.click(payButton);
    });

    await waitFor(() => {
      expect(paymentService.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 650.0, // Remaining amount / 3 = 1950 / 3 = 650
        })
      );
    });
  });

  it('should show fully paid message when total is paid', async () => {
    const fullyPaidReservation = {
      ...MOCK_RESERVATION,
      total_price: 600.0, // Same as paid amount
    };
    
    const fullyPaidPayments = [
      {
        ...MOCK_PAYMENTS[0],
        amount: 600.0,
        paid_amount: 600.0,
      },
    ];

    (paymentService.listPayments as jest.Mock).mockResolvedValue(fullyPaidPayments);
    
    render(
      <ReservationMain
        reservation={fullyPaidReservation}
        isDetailsExpanded={true}
        onToggleDetails={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Rezerwacja w pełni opłacona/i)).toBeInTheDocument();
    });
  });
});


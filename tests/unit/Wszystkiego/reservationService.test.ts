/**
 * Unit tests for ReservationService
 * All tests are positive (happy path)
 * All data is locked/mocked - no database usage
 */

import { reservationService, ReservationService } from '@/lib/services/ReservationService';
import { CreateReservationRequest } from '@/types/createReservationRequest';
import { ReservationResponse } from '@/types/reservationResponse';
import { Step1FormData } from '@/types/step1FormData';
import { Step2FormData } from '@/types/step2FormData';
import { Step3FormData } from '@/types/step3FormData';
import { Step4FormData } from '@/types/step4FormData';

// Mock fetch globally
global.fetch = jest.fn();

// Mock authenticatedApiCall
jest.mock('@/utils/api-auth', () => ({
  authenticatedApiCall: jest.fn(),
}));

import { authenticatedApiCall } from '@/utils/api-auth';

describe('ReservationService - Singleton Pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return the same instance (singleton)', () => {
    // Import again to get the same instance
    const { reservationService: reservationService2 } = require('@/lib/services/ReservationService');
    
    expect(reservationService).toBe(reservationService2);
  });

  test('should create reservation successfully', async () => {
    const mockRequest: CreateReservationRequest = {
      camp_id: 1,
      property_id: 1,
      step1: {
        parents: [
          {
            id: 'parent1',
            firstName: 'Jan',
            lastName: 'Kowalski',
            email: 'jan@example.com',
            phone: '+48',
            phoneNumber: '123456789',
            street: 'ul. Testowa 1',
            postalCode: '00-001',
            city: 'Warszawa',
          },
        ],
        participantData: {
          firstName: 'Anna',
          lastName: 'Kowalska',
          age: '10',
          gender: 'female',
          city: 'Warszawa',
          selectedParticipant: 'Anna Kowalska',
        },
        selectedDietId: 1,
        accommodationRequest: '',
        healthQuestions: {
          chronicDiseases: 'Nie',
          dysfunctions: 'Nie',
          psychiatric: 'Nie',
        },
        healthDetails: {
          chronicDiseases: '',
          dysfunctions: '',
          psychiatric: '',
        },
        additionalNotes: '',
      },
      step2: {
        selectedDiets: [1],
        selectedAddons: ['addon1'],
        selectedProtection: ['protection1'],
        selectedPromotion: '',
        promotionJustification: null,
        transportData: {
          departureType: 'zbiorowy',
          departureCity: 'Warszawa',
          returnType: 'zbiorowy',
          returnCity: 'Warszawa',
          differentCities: false,
        },
        selectedSource: 'internet',
        inneText: '',
      },
      step3: {
        invoiceType: 'private',
        privateData: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'jan@example.com',
          phone: '+48',
          street: 'ul. Testowa 1',
          postalCode: '00-001',
          city: 'Warszawa',
          nip: '',
        },
        deliveryType: 'electronic',
        deliveryDifferentAddress: false,
      },
      step4: {
        consent1: true,
        consent2: true,
        consent3: true,
        consent4: true,
      },
      total_price: 1200,
      deposit_amount: 600,
    };

    const mockResponse: ReservationResponse = {
      id: 1,
      camp_id: 1,
      property_id: 1,
      status: 'draft',
      total_price: 1200,
      deposit_amount: 600,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      camp_name: 'Test Camp',
      property_name: 'Test Property',
      property_city: 'Warszawa',
      property_period: 'lato',
      property_start_date: '2024-07-01',
      property_end_date: '2024-07-14',
      participant_first_name: 'Anna',
      participant_last_name: 'Kowalska',
      participant_age: '10',
      participant_gender: 'female',
      participant_city: 'Warszawa',
      parents_data: mockRequest.step1.parents.map(parent => ({
        ...parent,
        email: parent.email || '',
      })),
      invoice_type: 'private',
      invoice_first_name: 'Jan',
      invoice_last_name: 'Kowalski',
      invoice_email: 'jan@example.com',
      invoice_phone: '+48 123456789',
      invoice_company_name: null,
      invoice_nip: null,
      invoice_street: 'ul. Testowa 1',
      invoice_postal_code: '00-001',
      invoice_city: 'Warszawa',
      departure_type: 'zbiorowy',
      departure_city: 'Warszawa',
      return_type: 'zbiorowy',
      return_city: 'Warszawa',
      diet: 1,
      diet_name: 'Standard',
      accommodation_request: null,
      selected_source: 'internet',
      source_name: 'Internet',
      selected_addons: ['addon1'],
      selected_protection: ['protection1'],
      contract_status: null,
      contract_rejection_reason: null,
      qualification_card_status: null,
      qualification_card_rejection_reason: null,
      payment_plan: null,
    };

    (authenticatedApiCall as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await reservationService.createReservation(mockRequest);

    expect(result).toEqual(mockResponse);
    expect(authenticatedApiCall).toHaveBeenCalledWith(
      '/api/reservations/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(mockRequest),
      })
    );
  });

  test('should get reservation by ID successfully', async () => {
    const mockReservation: ReservationResponse = {
      id: 1,
      camp_id: 1,
      property_id: 1,
      status: 'confirmed',
      total_price: 1200,
      deposit_amount: 600,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      camp_name: 'Test Camp',
      property_name: 'Test Property',
      property_city: 'Warszawa',
      property_period: 'lato',
      property_start_date: '2024-07-01',
      property_end_date: '2024-07-14',
      participant_first_name: 'Anna',
      participant_last_name: 'Kowalska',
      participant_age: '10',
      participant_gender: 'female',
      participant_city: 'Warszawa',
      parents_data: null,
      invoice_type: null,
      invoice_first_name: null,
      invoice_last_name: null,
      invoice_email: null,
      invoice_phone: null,
      invoice_company_name: null,
      invoice_nip: null,
      invoice_street: null,
      invoice_postal_code: null,
      invoice_city: null,
      departure_type: null,
      departure_city: null,
      return_type: null,
      return_city: null,
      diet: null,
      diet_name: null,
      accommodation_request: null,
      selected_source: null,
      source_name: null,
      selected_addons: null,
      selected_protection: null,
      contract_status: null,
      contract_rejection_reason: null,
      qualification_card_status: null,
      qualification_card_rejection_reason: null,
      payment_plan: null,
    };

    (authenticatedApiCall as jest.Mock).mockResolvedValueOnce(mockReservation);

    const result = await reservationService.getReservation(1);

    expect(result).toEqual(mockReservation);
    expect(authenticatedApiCall).toHaveBeenCalledWith('/api/reservations/1');
  });

  test('should list reservations successfully', async () => {
    const mockReservations: ReservationResponse[] = [
      {
        id: 1,
        camp_id: 1,
        property_id: 1,
        status: 'confirmed',
        total_price: 1200,
        deposit_amount: 600,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        camp_name: 'Test Camp 1',
        property_name: 'Property 1',
        property_city: 'Warszawa',
        property_period: 'lato',
        property_start_date: '2024-07-01',
        property_end_date: '2024-07-14',
        participant_first_name: 'Anna',
        participant_last_name: 'Kowalska',
        participant_age: '10',
        participant_gender: 'female',
        participant_city: 'Warszawa',
        parents_data: null,
        invoice_type: null,
        invoice_first_name: null,
        invoice_last_name: null,
        invoice_email: null,
        invoice_phone: null,
        invoice_company_name: null,
        invoice_nip: null,
        invoice_street: null,
        invoice_postal_code: null,
        invoice_city: null,
        departure_type: null,
        departure_city: null,
        return_type: null,
        return_city: null,
        diet: null,
        diet_name: null,
        accommodation_request: null,
        selected_source: null,
        source_name: null,
        selected_addons: null,
        selected_protection: null,
        contract_status: null,
        contract_rejection_reason: null,
        qualification_card_status: null,
        qualification_card_rejection_reason: null,
        payment_plan: null,
      },
    ];

    (authenticatedApiCall as jest.Mock).mockResolvedValueOnce(mockReservations);

    const result = await reservationService.listReservations(0, 100);

    expect(result).toEqual(mockReservations);
    expect(authenticatedApiCall).toHaveBeenCalledWith('/api/reservations/?skip=0&limit=100');
  });

  test('should get my reservations successfully', async () => {
    const mockReservations: ReservationResponse[] = [];

    (authenticatedApiCall as jest.Mock).mockResolvedValueOnce(mockReservations);

    const result = await reservationService.getMyReservations(0, 100);

    expect(result).toEqual(mockReservations);
    expect(authenticatedApiCall).toHaveBeenCalledWith('/api/reservations/my?skip=0&limit=100');
  });

  test('should update payment plan successfully', async () => {
    const mockReservation: ReservationResponse = {
      id: 1,
      camp_id: 1,
      property_id: 1,
      status: 'confirmed',
      total_price: 1200,
      deposit_amount: 600,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      camp_name: 'Test Camp',
      property_name: 'Test Property',
      property_city: 'Warszawa',
      property_period: 'lato',
      property_start_date: '2024-07-01',
      property_end_date: '2024-07-14',
      participant_first_name: 'Anna',
      participant_last_name: 'Kowalska',
      participant_age: '10',
      participant_gender: 'female',
      participant_city: 'Warszawa',
      parents_data: null,
      invoice_type: null,
      invoice_first_name: null,
      invoice_last_name: null,
      invoice_email: null,
      invoice_phone: null,
      invoice_company_name: null,
      invoice_nip: null,
      invoice_street: null,
      invoice_postal_code: null,
      invoice_city: null,
      departure_type: null,
      departure_city: null,
      return_type: null,
      return_city: null,
      diet: null,
      diet_name: null,
      accommodation_request: null,
      selected_source: null,
      source_name: null,
      selected_addons: null,
      selected_protection: null,
      contract_status: null,
      contract_rejection_reason: null,
      qualification_card_status: null,
      qualification_card_rejection_reason: null,
      payment_plan: '2',
    };

    (authenticatedApiCall as jest.Mock).mockResolvedValueOnce(mockReservation);

    const result = await reservationService.updatePaymentPlan(1, '2');

    expect(result).toEqual(mockReservation);
    expect(authenticatedApiCall).toHaveBeenCalledWith(
      '/api/reservations/1/payment-plan',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ payment_plan: '2' }),
      })
    );
  });

  test('should prepare reservation request correctly', () => {
    const step1Data: Step1FormData = {
      parents: [
        {
          id: 'parent1',
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'jan@example.com',
          phone: '+48',
          phoneNumber: '123456789',
          street: 'ul. Testowa 1',
          postalCode: '00-001',
          city: 'Warszawa',
        },
      ],
      participantData: {
        firstName: 'Anna',
        lastName: 'Kowalska',
        age: '10',
        gender: 'female',
        city: 'Warszawa',
        selectedParticipant: 'Anna Kowalska',
      },
      selectedDietId: 1,
      accommodationRequest: '',
      healthQuestions: {
        chronicDiseases: 'Nie',
        dysfunctions: 'Nie',
        psychiatric: 'Nie',
      },
      healthDetails: {
        chronicDiseases: '',
        dysfunctions: '',
        psychiatric: '',
      },
      additionalNotes: '',
    };

    const step2Data: Step2FormData = {
      selectedDiets: [1],
      selectedAddons: ['addon1'],
      selectedProtection: ['protection1'],
      selectedPromotion: '',
      promotionJustification: {},
      transportData: {
        departureType: 'zbiorowy',
        departureCity: 'Warszawa',
        returnType: 'zbiorowy',
        returnCity: 'Warszawa',
        differentCities: false,
      },
      selectedSource: 'internet',
      inneText: '',
    };

    const step3Data: Step3FormData = {
      invoiceType: 'private',
      privateData: {
        firstName: 'Jan',
        lastName: 'Kowalski',
        email: 'jan@example.com',
        phone: '+48',
        street: 'ul. Testowa 1',
        postalCode: '00-001',
        city: 'Warszawa',
        nip: '',
      },
      companyData: {
        companyName: '',
        nip: '',
        street: '',
        postalCode: '',
        city: '',
      },
      deliveryType: 'electronic',
      differentAddress: false,
      deliveryAddress: {
        street: '',
        postalCode: '',
        city: '',
      },
    };

    const step4Data: Step4FormData = {
      selectAllConsents: true,
      consent1: true,
      consent2: true,
      consent3: true,
      consent4: true,
    };

    const result = ReservationService.prepareReservationRequest(
      step1Data,
      step2Data,
      step3Data,
      step4Data,
      1,
      1,
      1200,
      600
    );

    expect(result.camp_id).toBe(1);
    expect(result.property_id).toBe(1);
    expect(result.total_price).toBe(1200);
    expect(result.deposit_amount).toBe(600);
    expect(result.step1.parents).toHaveLength(1);
    expect(result.step2.selectedDiets).toEqual([1]);
    expect(result.step3.invoiceType).toBe('private');
    expect(result.step4.consent1).toBe(true);
  });
});


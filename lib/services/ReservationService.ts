/**
 * Reservation Service
 * Service for handling reservation operations with backend API
 */

import { API_BASE_URL } from '@/utils/api-config';
import { authenticatedApiCall } from '@/utils/api-auth';

// Import types from sessionStorage
import type {
  Step1FormData,
  Step2FormData,
  Step3FormData,
  Step4FormData,
} from '@/utils/sessionStorage';
import { authService } from '@/lib/services/AuthService';

export interface CreateReservationRequest {
  camp_id: number;
  property_id: number;
  step1: {
    parents: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      phoneNumber: string;
      street: string;
      postalCode: string;
      city: string;
    }>;
    participantData: {
      firstName: string;
      lastName: string;
      age: string;
      gender: string;
      city: string;
      selectedParticipant?: string;
    };
    selectedDietId: number | null;
    accommodationRequest?: string;
    healthQuestions?: {
      chronicDiseases: string;
      dysfunctions: string;
      psychiatric: string;
    };
    healthDetails?: {
      chronicDiseases: string;
      dysfunctions: string;
      psychiatric: string;
    };
    additionalNotes?: string;
  };
  step2: {
    selectedDiets?: number[];
    selectedAddons?: string[];
    selectedProtection?: string[]; // Array of protection IDs
    selectedPromotion?: string;
    promotionJustification?: Record<string, any> | null;
    transportData: {
      departureType: 'zbiorowy' | 'wlasny';
      departureCity?: string;
      returnType: 'zbiorowy' | 'wlasny';
      returnCity?: string;
      differentCities?: boolean;
    };
    selectedSource: string;
    inneText?: string;
  };
  step3: {
    invoiceType: 'private' | 'company';
    privateData?: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      street: string;
      postalCode: string;
      city: string;
      nip?: string;
    };
    companyData?: {
      companyName: string;
      nip: string;
      street: string;
      postalCode: string;
      city: string;
    };
    deliveryType: 'electronic' | 'paper';
    differentAddress: boolean;
    deliveryAddress?: {
      street: string;
      postalCode: string;
      city: string;
    };
  };
  step4: {
    consent1: boolean;
    consent2: boolean;
    consent3: boolean;
    consent4: boolean;
  };
  total_price: number;
  deposit_amount?: number;
}

export interface ReservationResponse {
  id: number;
  camp_id: number;
  property_id: number;
  status: string;
  total_price: number;
  deposit_amount: number | null;
  created_at: string;
  updated_at: string;
  camp_name: string | null;
  property_name: string | null;
  property_city: string | null;
  property_period: string | null;
  property_start_date?: string | null;
  property_end_date?: string | null;
  participant_first_name: string | null;
  participant_last_name: string | null;
  participant_age: string | null;
  participant_gender: string | null;
  participant_city: string | null;
  parents_data: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneNumber: string;
    street: string;
    postalCode: string;
    city: string;
  }> | null;
  invoice_type: string | null;
  invoice_first_name: string | null;
  invoice_last_name: string | null;
  invoice_email: string | null;
  invoice_phone: string | null;
  invoice_company_name: string | null;
  invoice_nip: string | null;
  invoice_street: string | null;
  invoice_postal_code: string | null;
  invoice_city: string | null;
  departure_type: string | null;
  departure_city: string | null;
  return_type: string | null;
  return_city: string | null;
  diet: number | null;
  diet_name: string | null;
  accommodation_request: string | null;
  selected_source: string | null;
  source_name: string | null;
  selected_addons?: string[] | null;
  selected_protection?: string[] | null;
  contract_status?: string | null;
  contract_rejection_reason?: string | null;
  qualification_card_status?: string | null;
  qualification_card_rejection_reason?: string | null;
  payment_plan?: string | null; // 'full', '2', '3' - selected payment method
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ValidationErrorResponse {
  error: string;
  details: ValidationErrorDetail[];
}

class ReservationService {
  private API_URL = `${API_BASE_URL}/api/reservations`;

  /**
   * Create a new reservation
   * @param data Reservation request data
   * @returns Reservation response data
   */
  async createReservation(data: CreateReservationRequest): Promise<ReservationResponse> {
    try {
      return await authenticatedApiCall<ReservationResponse>(
        '/api/reservations/',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
    } catch (error) {
      // Handle validation errors with better messages
      if (error instanceof Error && error.message.includes('422')) {
        // authenticatedApiCall already handles 401, but we can improve validation error messages
        throw error;
      }
      throw error;
    }
  }

  /**
   * Get reservation by ID
   * @param reservationId Reservation ID
   * @returns Reservation response data
   */
  async getReservation(reservationId: number): Promise<ReservationResponse> {
    return await authenticatedApiCall<ReservationResponse>(
      `/api/reservations/${reservationId}`
    );
  }

  /**
   * List all reservations
   * @param skip Number of records to skip
   * @param limit Maximum number of records to return
   * @returns Array of reservation responses
   */
  async listReservations(skip: number = 0, limit: number = 100): Promise<ReservationResponse[]> {
    return await authenticatedApiCall<ReservationResponse[]>(
      `/api/reservations/?skip=${skip}&limit=${limit}`
    );
  }

  /**
   * Get current user's reservations
   * @param skip Number of records to skip
   * @param limit Maximum number of records to return
   * @returns Array of reservation responses for the logged-in user
   */
  async getMyReservations(skip: number = 0, limit: number = 100): Promise<ReservationResponse[]> {
    return await authenticatedApiCall<ReservationResponse[]>(
      `/api/reservations/my?skip=${skip}&limit=${limit}`
    );
  }

  /**
   * Update payment plan for a reservation
   * @param reservationId Reservation ID
   * @param paymentPlan Payment plan: 'full', '2', or '3'
   * @returns Updated reservation response
   */
  async updatePaymentPlan(reservationId: number, paymentPlan: 'full' | '2' | '3'): Promise<ReservationResponse> {
    return await authenticatedApiCall<ReservationResponse>(
      `/api/reservations/${reservationId}/payment-plan`,
      {
        method: 'PATCH',
        body: JSON.stringify({ payment_plan: paymentPlan }),
      }
    );
  }

  /**
   * Convert frontend form data to backend request format
   * @param step1Data Step 1 form data
   * @param step2Data Step 2 form data
   * @param step3Data Step 3 form data
   * @param step4Data Step 4 form data
   * @param campId Camp ID
   * @param propertyId Property ID
   * @param totalPrice Total price
   * @param depositAmount Deposit amount (optional)
   * @returns CreateReservationRequest
   */
  static prepareReservationRequest(
    step1Data: Step1FormData,
    step2Data: Step2FormData,
    step3Data: Step3FormData,
    step4Data: Step4FormData,
    campId: number,
    propertyId: number,
    totalPrice: number,
    depositAmount?: number
  ): CreateReservationRequest {
    // Filter parents: include all parents that have required fields filled
    // First parent is always required (firstName, lastName, email, phoneNumber)
    // Second parent is optional but if present, must have firstName, lastName, phoneNumber (email is optional)
    const filteredParents = step1Data.parents.filter((parent, index) => {
      // Always include first parent (index 0) - required fields validated by backend
      if (index === 0) return true;
      
      // For second parent (index 1), include if has required fields (firstName, lastName, phoneNumber)
      // Email is optional for second parent according to schema
      if (index === 1) {
        const hasRequiredFields = 
          !!(parent.firstName?.trim()) && 
          !!(parent.lastName?.trim()) && 
          !!(parent.phoneNumber?.trim());
        
        // Include second parent if has required fields (email is optional)
        return hasRequiredFields;
      }
      return false;
    });

    return {
      camp_id: campId,
      property_id: propertyId,
      step1: {
        parents: filteredParents,
        participantData: step1Data.participantData,
        selectedDietId: step1Data.selectedDietId || null,
        accommodationRequest: step1Data.accommodationRequest,
        healthQuestions: step1Data.healthQuestions,
        healthDetails: step1Data.healthDetails,
        additionalNotes: step1Data.additionalNotes,
      },
      step2: {
        selectedDiets: step2Data.selectedDiets,
        selectedAddons: step2Data.selectedAddons,
        selectedProtection: step2Data.selectedProtection,
        selectedPromotion: step2Data.selectedPromotion,
        promotionJustification: step2Data.promotionJustification || null,
        transportData: {
          departureType: step2Data.transportData.departureType as 'zbiorowy' | 'wlasny',
          departureCity: step2Data.transportData.departureCity,
          returnType: step2Data.transportData.returnType as 'zbiorowy' | 'wlasny',
          returnCity: step2Data.transportData.returnCity,
          differentCities: step2Data.transportData.differentCities || false,
        },
        selectedSource: step2Data.selectedSource,
        inneText: step2Data.inneText,
      },
      step3: {
        invoiceType: step3Data.invoiceType,
        privateData: step3Data.invoiceType === 'private' ? step3Data.privateData : undefined,
        companyData: step3Data.invoiceType === 'company' ? step3Data.companyData : undefined,
        deliveryType: step3Data.deliveryType,
        differentAddress: step3Data.differentAddress,
        deliveryAddress: step3Data.deliveryType === 'paper' && step3Data.differentAddress 
          ? step3Data.deliveryAddress 
          : undefined,
      },
      step4: {
        consent1: step4Data.consent1,
        consent2: step4Data.consent2,
        consent3: step4Data.consent3,
        consent4: step4Data.consent4,
      },
      total_price: totalPrice,
      deposit_amount: depositAmount,
    };
  }
}

export const reservationService = new ReservationService();

// Export class for static methods
export { ReservationService };


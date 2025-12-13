/**
 * Reservation Service
 * Singleton service for handling reservation operations with backend API
 */

import { CreateReservationRequest } from '@/types/createReservationRequest';
import { ReservationResponse } from '@/types/reservationResponse';
import { Step1FormData } from '@/types/step1FormData';
import { Step2FormData } from '@/types/step2FormData';
import { Step3FormData } from '@/types/step3FormData';
import { Step4FormData } from '@/types/step4FormData';
import { ValidationErrorDetail } from '@/types/validationErrorDetail';
import { ValidationErrorResponse } from '@/types/validationErrorResponse';
import { authenticatedApiCall } from '@/utils/api-auth';
import { API_BASE_URL } from '@/utils/api-config';

export type { CreateReservationRequest, ReservationResponse, ValidationErrorDetail, ValidationErrorResponse };

class ReservationService {
  private static instance: ReservationService;

  private constructor() {}

  static getInstance(): ReservationService {
    if (!ReservationService.instance) {
      ReservationService.instance = new ReservationService();
    }
    return ReservationService.instance;
  }
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
        },
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
      `/api/reservations/${reservationId}`,
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
      `/api/reservations/?skip=${skip}&limit=${limit}`,
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
      `/api/reservations/my?skip=${skip}&limit=${limit}`,
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
      },
    );
  }

  /**
   * Add addon to reservation after payment
   * @param reservationId Reservation ID
   * @param addonId Addon ID to add
   * @returns Updated reservation response
   */
  async addAddonToReservation(reservationId: number, addonId: string): Promise<ReservationResponse> {
    return await authenticatedApiCall<ReservationResponse>(
      `/api/reservations/${reservationId}/addons`,
      {
        method: 'PATCH',
        body: JSON.stringify({ addon_id: addonId }),
      },
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
    depositAmount?: number,
  ): CreateReservationRequest {
    // Filter parents: include all parents that have required fields filled
    // First parent is always required (firstName, lastName, email, phoneNumber)
    // Second parent is optional but if present, must have firstName, lastName, phoneNumber (email is optional)
    const filteredParents = step1Data.parents
      .filter((parent, index) => {
        // Always include first parent (index 0) - required fields validated by backend
        if (index === 0) return true;

        // For second parent (index 1), include if has required fields (firstName, lastName, phoneNumber)
        // Email is optional for second parent according to schema
        if (index === 1) {
          const hasRequiredFields =
            !!(parent.firstName && parent.firstName.trim()) &&
            !!(parent.lastName && parent.lastName.trim()) &&
            !!(parent.phoneNumber && parent.phoneNumber.trim());

          // Include second parent if has required fields (email is optional)
          return hasRequiredFields;
        }
        return false;
      })
      .map((parent, index) => {
        // For second parent (index 1), if email is empty, null, undefined, or "BRAK", set it to null
        // This ensures backend doesn't try to validate "BRAK" or empty string as email
        if (index === 1) {
          const email = (parent.email || '').trim();
          if (!email || email === '' || email === 'BRAK') {
            return {
              ...parent,
              email: null, // Explicitly set to null for optional email
            };
          }
        }
        return parent;
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
        deliveryDifferentAddress: step3Data.differentAddress || false,
        deliveryStreet: step3Data.deliveryType === 'paper' && step3Data.differentAddress
          ? (step3Data.deliveryAddress?.street || undefined)
          : undefined,
        deliveryPostalCode: step3Data.deliveryType === 'paper' && step3Data.differentAddress
          ? (step3Data.deliveryAddress?.postalCode || undefined)
          : undefined,
        deliveryCity: step3Data.deliveryType === 'paper' && step3Data.differentAddress
          ? (step3Data.deliveryAddress?.city || undefined)
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

export const reservationService = ReservationService.getInstance();

// Export class for static methods
export { ReservationService };


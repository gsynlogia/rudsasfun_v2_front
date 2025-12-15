/**
 * Reservation Service
 * Service for handling reservation operations with backend API
 */

import { API_BASE_URL } from '@/utils/api-config';

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
    transportData: {
      departureType: 'zbiorowy' | 'wlasny';
      departureCity?: string;
      returnType: 'zbiorowy' | 'wlasny';
      returnCity?: string;
    };
    selectedSource: string;
    inneText?: string;
  };
  step3: {
    wantsInvoice: boolean;  // Whether client wants an invoice
    invoiceType?: 'private' | 'company';  // Only required if wantsInvoice === true
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
    deliveryType?: 'electronic' | 'paper';  // Only required if wantsInvoice === true
    differentAddress?: boolean;
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
  wants_invoice: boolean | null;
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
  payment_plan?: string | null;
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
    // Get auth token for authenticated request
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated. Please log in to create a reservation.');
    }

    const response = await fetch(`${this.API_URL}/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      
      // Handle validation errors
      if (response.status === 422 && error.detail) {
        let errorMessage = 'Błąd walidacji: ';
        
        if (error.detail.details && Array.isArray(error.detail.details)) {
          // Format: { error: "Validation Error", details: [...] }
          const messages = error.detail.details.map((d: ValidationErrorDetail) => 
            `${d.field}: ${d.message}`
          ).join(', ');
          errorMessage += messages;
        } else if (Array.isArray(error.detail)) {
          // Format: Pydantic validation errors array
          const messages = error.detail.map((e: any) => {
            const field = e.loc?.join('.') || 'field';
            const msg = e.msg || 'Validation error';
            return `${field}: ${msg}`;
          }).join(', ');
          errorMessage += messages;
        } else if (typeof error.detail === 'string') {
          errorMessage = error.detail;
        } else {
          errorMessage = JSON.stringify(error.detail);
        }
        
        throw new Error(errorMessage);
      }
      
      // Handle other errors
      let errorMessage = 'Request failed';
      if (typeof error.detail === 'string') {
        errorMessage = error.detail;
      } else if (error.detail && typeof error.detail === 'object') {
        errorMessage = JSON.stringify(error.detail);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get reservation by ID
   * @param reservationId Reservation ID
   * @returns Reservation response data
   */
  async getReservation(reservationId: number): Promise<ReservationResponse> {
    const response = await fetch(`${this.API_URL}/${reservationId}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get reservation by REZ-YYYY-XXX format number
   * @param reservationNumber Reservation number in format REZ-YYYY-XXX (e.g., REZ-2025-001)
   * @returns Reservation response data
   */
  async getReservationByNumber(reservationNumber: string): Promise<ReservationResponse> {
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.API_URL}/by-number/${reservationNumber}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * List all reservations
   * @param skip Number of records to skip
   * @param limit Maximum number of records to return
   * @returns Array of reservation responses
   */
  async listReservations(skip: number = 0, limit: number = 100): Promise<ReservationResponse[]> {
    const response = await fetch(`${this.API_URL}/?skip=${skip}&limit=${limit}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get current user's reservations
   * @param skip Number of records to skip
   * @param limit Maximum number of records to return
   * @returns Array of reservation responses for the logged-in user
   */
  async getMyReservations(skip: number = 0, limit: number = 100): Promise<ReservationResponse[]> {
    // Import authService to get token
    const { authService } = await import('@/lib/services/AuthService');
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.API_URL}/my?skip=${skip}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Update payment plan for a reservation
   * @param reservationId Reservation ID
   * @param paymentPlan Payment plan: 'full', '2', or '3'
   * @returns Updated reservation response
   */
  async updatePaymentPlan(reservationId: number, paymentPlan: 'full' | '2' | '3' | null): Promise<ReservationResponse> {
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated. Please log in.');
    }

    // Convert null to 'full' if needed
    const plan = paymentPlan || 'full';

    const response = await fetch(`${this.API_URL}/${reservationId}/payment-plan`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_plan: plan }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Add addon to reservation after payment
   * @param reservationId Reservation ID
   * @param addonId Addon ID (string)
   * @returns Updated reservation response
   */
  async addAddonToReservation(reservationId: number, addonId: string): Promise<ReservationResponse> {
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated. Please log in.');
    }

    const response = await fetch(`${this.API_URL}/${reservationId}/addons`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ addon_id: addonId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
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
    // Always send only the first parent/guardian (index 0)
    // Second parent data is not needed for payment processing
    const firstParentOnly = step1Data.parents.length > 0 ? [step1Data.parents[0]] : [];
    
    return {
      camp_id: campId,
      property_id: propertyId,
      step1: {
        parents: firstParentOnly,
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
        transportData: {
          departureType: step2Data.transportData.departureType as 'zbiorowy' | 'wlasny',
          departureCity: step2Data.transportData.departureCity,
          returnType: step2Data.transportData.returnType as 'zbiorowy' | 'wlasny',
          returnCity: step2Data.transportData.returnCity,
        },
        selectedSource: step2Data.selectedSource,
        inneText: step2Data.inneText,
      },
      step3: {
        wantsInvoice: step3Data.wantsInvoice || false,
        invoiceType: step3Data.wantsInvoice ? step3Data.invoiceType : undefined,
        privateData: step3Data.wantsInvoice && step3Data.invoiceType === 'private' ? step3Data.privateData : undefined,
        companyData: step3Data.wantsInvoice && step3Data.invoiceType === 'company' ? step3Data.companyData : undefined,
        deliveryType: step3Data.wantsInvoice ? (step3Data.deliveryType || 'electronic') : undefined,
        differentAddress: step3Data.wantsInvoice ? (step3Data.differentAddress || false) : false,
        deliveryAddress: step3Data.wantsInvoice && step3Data.deliveryType === 'paper' && step3Data.differentAddress 
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


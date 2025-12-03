/**
 * Reservation Service
 * Service for handling reservation operations with backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Import types from sessionStorage
import type {
  Step1FormData,
  Step2FormData,
  Step3FormData,
  Step4FormData,
} from '@/utils/sessionStorage';

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
    diet: 'standard' | 'vegetarian';
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
    selectedAddons?: string[];
    selectedProtection?: string;
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
  diet: string | null;
  accommodation_request: string | null;
  selected_source: string | null;
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
    const response = await fetch(`${this.API_URL}/`, {
      method: 'POST',
      headers: {
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
    return {
      camp_id: campId,
      property_id: propertyId,
      step1: {
        parents: step1Data.parents,
        participantData: step1Data.participantData,
        diet: step1Data.diet || 'standard',
        accommodationRequest: step1Data.accommodationRequest,
        healthQuestions: step1Data.healthQuestions,
        healthDetails: step1Data.healthDetails,
        additionalNotes: step1Data.additionalNotes,
      },
      step2: {
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


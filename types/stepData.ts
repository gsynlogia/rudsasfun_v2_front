/**
 * Type definitions with default values for step data
 * Replaces optional chaining with interfaces that have default values
 */

// Default values for Step1FormData
export const defaultStep1FormData = {
  parents: [] as Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneNumber: string;
    street: string;
    postalCode: string;
    city: string;
  }>,
  participantData: {
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    city: '',
    selectedParticipant: '',
  },
  selectedDietId: null as number | null,
  accommodationRequest: '',
  healthQuestions: {
    chronicDiseases: '',
    dysfunctions: '',
    psychiatric: '',
  },
  healthDetails: {
    chronicDiseases: '',
    dysfunctions: '',
    psychiatric: '',
  },
  additionalNotes: '',
};

// Default values for Step2FormData
export const defaultStep2FormData = {
  selectedDiets: [] as number[],
  selectedAddons: [] as string[],
  selectedProtection: [] as string[],
  selectedProtectionIds: [] as number[],
  selectedPromotion: '',
  promotionJustification: {} as Record<string, any>,
  transportData: {
    departureType: 'zbiorowy',
    departureCity: '',
    returnType: 'zbiorowy',
    returnCity: '',
    differentCities: false,
  },
  transportModalConfirmed: false,
  selectedSource: '',
  inneText: '',
};

// Default values for Step3FormData
export const defaultStep3FormData = {
  invoiceType: 'private' as 'private' | 'company',
  privateData: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    postalCode: '',
    city: '',
    nip: '',
  },
  companyData: {
    companyName: '',
    nip: '',
    street: '',
    postalCode: '',
    city: '',
  },
  deliveryType: 'electronic' as 'electronic' | 'paper',
  differentAddress: false,
  deliveryAddress: {
    street: '',
    postalCode: '',
    city: '',
  },
};

// Default values for ReservationStorageState
export const defaultReservationState = {
  basePrice: 0,
  items: [] as Array<{
    id: string;
    name: string;
    price: number;
    type: 'base' | 'diet' | 'accommodation' | 'addon' | 'protection' | 'promotion' | 'transport' | 'source' | 'other';
  }>,
  totalPrice: 0,
  camp: {
    id: 0,
    name: '',
    properties: {
      period: '',
      city: '',
      start_date: '',
      end_date: '',
    },
  },
};

// Helper function to merge with defaults
export function withDefaults<T>(data: T | null, defaults: T): T {
  if (!data) return defaults;
  return { ...defaults, ...data };
}






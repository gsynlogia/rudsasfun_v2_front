export interface CreateReservationRequest {
  camp_id: number;
  property_id: number;
  step1: {
    parents: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
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
    selectedProtection?: string[];
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
    deliveryDifferentAddress: boolean;
    deliveryStreet?: string;
    deliveryPostalCode?: string;
    deliveryCity?: string;
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


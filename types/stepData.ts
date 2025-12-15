/**
 * Default form data for reservation steps
 * Used to initialize forms and merge with saved data
 */

import type { Step1FormData, Step2FormData, Step3FormData } from '@/utils/sessionStorage';
import type { ReservationState } from '@/types/reservation';
import { withDefaults } from '@/types/defaults';

// Re-export withDefaults from defaults.ts
export { withDefaults };

/**
 * Default Step1 form data
 */
export const defaultStep1FormData: Step1FormData = {
  parents: [
    {
      id: '1',
      firstName: '',
      lastName: '',
      email: '',
      phone: '+48',
      phoneNumber: '',
      street: '',
      postalCode: '',
      city: '',
    },
  ],
  participantData: {
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    city: '',
    selectedParticipant: '',
  },
  selectedDietId: null,
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

/**
 * Default Step2 form data
 */
export const defaultStep2FormData: Step2FormData = {
  selectedDiets: [],
  selectedAddons: [],
  selectedProtection: [],
  selectedPromotion: '',
  transportData: {
    departureType: '',
    departureCity: '',
    returnType: '',
    returnCity: '',
  },
  transportModalConfirmed: false,
  selectedSource: '',
  inneText: '',
};

/**
 * Default Step3 form data
 */
export const defaultStep3FormData: Step3FormData = {
  wantsInvoice: true,
  invoiceType: 'private',
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
  deliveryType: 'electronic',
  differentAddress: false,
  deliveryAddress: {
    street: '',
    postalCode: '',
    city: '',
  },
};

/**
 * Default reservation state
 */
export const defaultReservationState: ReservationState = {
  basePrice: 2200,
  items: [
    {
      id: 'base',
      name: 'Cena podstawowa',
      price: 2200,
      type: 'base',
    },
  ],
  totalPrice: 2200,
};

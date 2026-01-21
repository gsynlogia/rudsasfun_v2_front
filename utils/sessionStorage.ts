/**
 * Session Storage Utilities
 * Handles saving and loading form data and reservation state to sessionStorage
 * Note: Magic link redirect is now handled in database (via API)
 */

const STORAGE_KEYS = {
  STEP1_FORM_DATA: 'radsasfun_step1_form_data',
  STEP2_FORM_DATA: 'radsasfun_step2_form_data',
  STEP3_FORM_DATA: 'radsasfun_step3_form_data',
  STEP4_FORM_DATA: 'radsasfun_step4_form_data',
  STEP5_FORM_DATA: 'radsasfun_step5_form_data',
  RESERVATION_STATE: 'radsasfun_reservation_state', // Stays in sessionStorage
} as const;

export interface Step1FormData {
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
    selectedParticipant: string;
  };
  selectedDietId: number | null; // ID of selected diet from database
  accommodationRequest: string;
  healthQuestions: {
    chronicDiseases: string;
    dysfunctions: string;
    psychiatric: string;
  };
  healthDetails: {
    chronicDiseases: string;
    dysfunctions: string;
    psychiatric: string;
  };
  additionalNotes: string;
  participantAdditionalInfo?: string; // Optional - additional info about participant (not health-related)
}

export interface ReservationStorageState {
  basePrice: number;
  items: Array<{
    id: string;
    name: string;
    price: number;
    type: 'base' | 'diet' | 'accommodation' | 'addon' | 'protection' | 'promotion' | 'transport' | 'source' | 'other';
  }>;
  totalPrice: number;
  camp?: {
    id: number;
    name: string;
    properties: {
      period: string;
      city: string;
      start_date: string;
      end_date: string;
    };
  };
  currentStep?: number;
  reservationNumber?: string | null;
}

/**
 * Check if sessionStorage is available
 */
function isStorageAvailable(): boolean {
  try {
    const test = '__sessionStorage_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save Step1 form data to sessionStorage
 */
export function saveStep1FormData(data: Step1FormData): void {
  if (!isStorageAvailable()) return;

  try {
    sessionStorage.setItem(STORAGE_KEYS.STEP1_FORM_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving Step1 form data to sessionStorage:', error);
  }
}

/**
 * Load Step1 form data from sessionStorage
 */
export function loadStep1FormData(): Step1FormData | null {
  if (!isStorageAvailable()) return null;

  try {
    const data = sessionStorage.getItem(STORAGE_KEYS.STEP1_FORM_DATA);
    if (!data) return null;
    return JSON.parse(data) as Step1FormData;
  } catch (error) {
    console.error('Error loading Step1 form data from sessionStorage:', error);
    return null;
  }
}

/**
 * Clear Step1 form data from sessionStorage
 */
export function clearStep1FormData(): void {
  if (!isStorageAvailable()) return;

  try {
    sessionStorage.removeItem(STORAGE_KEYS.STEP1_FORM_DATA);
  } catch (error) {
    console.error('Error clearing Step1 form data from sessionStorage:', error);
  }
}

/**
 * Save reservation state to sessionStorage
 */
export function saveReservationState(state: ReservationStorageState): void {
  if (!isStorageAvailable()) return;

  try {
    sessionStorage.setItem(STORAGE_KEYS.RESERVATION_STATE, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving reservation state to sessionStorage:', error);
  }
}

/**
 * Load reservation state from sessionStorage
 */
export function loadReservationState(): ReservationStorageState | null {
  if (!isStorageAvailable()) return null;

  try {
    const data = sessionStorage.getItem(STORAGE_KEYS.RESERVATION_STATE);
    if (!data) return null;
    const parsed = JSON.parse(data) as ReservationStorageState;
    // Backward compatibility defaults
    return {
      ...parsed,
      currentStep: parsed.currentStep ?? 1,
      reservationNumber: parsed.reservationNumber ?? null,
    };
  } catch (error) {
    console.error('Error loading reservation state from sessionStorage:', error);
    return null;
  }
}

/**
 * Clear reservation state from sessionStorage
 */
export function clearReservationState(): void {
  if (!isStorageAvailable()) return;

  try {
    sessionStorage.removeItem(STORAGE_KEYS.RESERVATION_STATE);
  } catch (error) {
    console.error('Error clearing reservation state from sessionStorage:', error);
  }
}

export interface Step2FormData {
  selectedDiets?: number[]; // Array of diet IDs
  selectedAddons: string[];
  selectedProtection: string[]; // Array of protection IDs (can select multiple)
  selectedProtectionIds?: number[]; // Array of protection IDs (numeric, for ProtectionsSection)
  selectedPromotion: string;
  promotionJustification?: Record<string, any>; // Justification data for promotion
  transportData: {
    departureType: string;
    departureCity: string;
    returnType: string;
    returnCity: string;
    differentCities?: boolean;
  };
  transportModalConfirmed?: boolean; // Whether the different cities modal has been confirmed
  selectedSource: string; // 'kolejna' | 'znajomi' | 'internet' | 'wycieczka' | 'inne' | ''
  inneText: string;
}

/**
 * Save Step2 form data to sessionStorage
 */
export function saveStep2FormData(data: Step2FormData): void {
  if (!isStorageAvailable()) return;

  try {
    sessionStorage.setItem(STORAGE_KEYS.STEP2_FORM_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving Step2 form data to sessionStorage:', error);
  }
}

/**
 * Load Step2 form data from sessionStorage
 */
export function loadStep2FormData(): Step2FormData | null {
  if (!isStorageAvailable()) return null;

  try {
    const data = sessionStorage.getItem(STORAGE_KEYS.STEP2_FORM_DATA);
    if (!data) return null;
    return JSON.parse(data) as Step2FormData;
  } catch (error) {
    console.error('Error loading Step2 form data from sessionStorage:', error);
    return null;
  }
}

/**
 * Clear Step2 form data from sessionStorage
 */
export function clearStep2FormData(): void {
  if (!isStorageAvailable()) return;

  try {
    sessionStorage.removeItem(STORAGE_KEYS.STEP2_FORM_DATA);
  } catch (error) {
    console.error('Error clearing Step2 form data from sessionStorage:', error);
  }
}

export interface Step3FormData {
  wantsInvoice: boolean; // Whether client wants an invoice
  invoiceType: 'private' | 'company';
  privateData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    postalCode: string;
    city: string;
    nip: string;
  };
  companyData: {
    companyName: string;
    nip: string;
    street: string;
    postalCode: string;
    city: string;
  };
  deliveryType: 'electronic' | 'paper';
  differentAddress: boolean;
  deliveryAddress: {
    street: string;
    postalCode: string;
    city: string;
  };
}

/**
 * Save Step3 form data to sessionStorage
 */
export function saveStep3FormData(data: Step3FormData): void {
  if (!isStorageAvailable()) return;

  try {
    sessionStorage.setItem(STORAGE_KEYS.STEP3_FORM_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving Step3 form data to sessionStorage:', error);
  }
}

/**
 * Load Step3 form data from sessionStorage
 */
export function loadStep3FormData(): Step3FormData | null {
  if (!isStorageAvailable()) return null;

  try {
    const data = sessionStorage.getItem(STORAGE_KEYS.STEP3_FORM_DATA);
    if (!data) return null;
    return JSON.parse(data) as Step3FormData;
  } catch (error) {
    console.error('Error loading Step3 form data from sessionStorage:', error);
    return null;
  }
}

/**
 * Clear Step3 form data from sessionStorage
 */
export function clearStep3FormData(): void {
  if (!isStorageAvailable()) return;

  try {
    sessionStorage.removeItem(STORAGE_KEYS.STEP3_FORM_DATA);
  } catch (error) {
    console.error('Error clearing Step3 form data from sessionStorage:', error);
  }
}

export interface Step4FormData {
  selectAllConsents: boolean;
  consent1: boolean; // Regulamin portalu i Polityka prywatności
  consent2: boolean; // Warunki uczestnictwa
  consent3: boolean; // Zgoda na zdjęcia
  consent4: boolean; // Składka na fundusze gwarancyjne
}

/**
 * Save Step4 form data to sessionStorage
 */
export function saveStep4FormData(data: Step4FormData): void {
  if (!isStorageAvailable()) return;

  try {
    sessionStorage.setItem(STORAGE_KEYS.STEP4_FORM_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving Step4 form data to sessionStorage:', error);
  }
}

/**
 * Load Step4 form data from sessionStorage
 */
export function loadStep4FormData(): Step4FormData | null {
  if (!isStorageAvailable()) return null;

  try {
    const data = sessionStorage.getItem(STORAGE_KEYS.STEP4_FORM_DATA);
    if (!data) return null;
    return JSON.parse(data) as Step4FormData;
  } catch (error) {
    console.error('Error loading Step4 form data from sessionStorage:', error);
    return null;
  }
}

/**
 * Clear Step4 form data from sessionStorage
 */
export function clearStep4FormData(): void {
  if (!isStorageAvailable()) return;

  try {
    sessionStorage.removeItem(STORAGE_KEYS.STEP4_FORM_DATA);
  } catch (error) {
    console.error('Error clearing Step4 form data from sessionStorage:', error);
  }
}

export interface Step5FormData {
  payNow: boolean;
  paymentMethod: 'online' | 'blik' | 'transfer' | '';
  paymentAmount: 'full' | 'deposit' | '';
  paymentInstallments?: 'full' | '2' | '3';
}

/**
 * Save Step5 form data to sessionStorage
 */
export function saveStep5FormData(data: Step5FormData): void {
  if (!isStorageAvailable()) return;

  try {
    sessionStorage.setItem(STORAGE_KEYS.STEP5_FORM_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving Step5 form data to sessionStorage:', error);
  }
}

/**
 * Load Step5 form data from sessionStorage
 */
export function loadStep5FormData(): Step5FormData | null {
  if (!isStorageAvailable()) return null;

  try {
    const data = sessionStorage.getItem(STORAGE_KEYS.STEP5_FORM_DATA);
    if (!data) return null;
    return JSON.parse(data) as Step5FormData;
  } catch (error) {
    console.error('Error loading Step5 form data from sessionStorage:', error);
    return null;
  }
}

/**
 * Clear Step5 form data from sessionStorage
 */
export function clearStep5FormData(): void {
  if (!isStorageAvailable()) return;

  try {
    sessionStorage.removeItem(STORAGE_KEYS.STEP5_FORM_DATA);
  } catch (error) {
    console.error('Error clearing Step5 form data from sessionStorage:', error);
  }
}

/**
 * Clear all application data from sessionStorage
 */
export function clearAllSessionData(): void {
  clearStep1FormData();
  clearStep2FormData();
  clearStep3FormData();
  clearStep4FormData();
  clearStep5FormData();
  clearReservationState();
}
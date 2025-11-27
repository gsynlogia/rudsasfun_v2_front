/**
 * Session Storage Utilities
 * Handles saving and loading form data and reservation state to sessionStorage
 */

const STORAGE_KEYS = {
  STEP1_FORM_DATA: 'radsasfun_step1_form_data',
  RESERVATION_STATE: 'radsasfun_reservation_state',
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
  diet: 'standard' | 'vegetarian' | null;
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
}

export interface ReservationStorageState {
  basePrice: number;
  items: Array<{
    id: string;
    name: string;
    price: number;
    type: 'base' | 'diet' | 'accommodation' | 'other';
  }>;
  totalPrice: number;
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
    return JSON.parse(data) as ReservationStorageState;
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

/**
 * Clear all application data from sessionStorage
 */
export function clearAllSessionData(): void {
  clearStep1FormData();
  clearReservationState();
}


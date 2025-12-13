/**
 * Session Storage Utilities
 * Handles saving and loading form data and reservation state to sessionStorage
 * Note: Magic link redirect is handled in utils/localStorage.ts
 */

import { ReservationStorageState } from '@/types/reservationStorageState';
import { Step1FormData } from '@/types/step1FormData';
import { Step2FormData } from '@/types/step2FormData';
import { Step3FormData } from '@/types/step3FormData';
import { Step4FormData } from '@/types/step4FormData';
import { Step5FormData } from '@/types/step5FormData';

export type { Step1FormData, Step2FormData, Step3FormData, Step4FormData, Step5FormData, ReservationStorageState };

const STORAGE_KEYS = {
  STEP1_FORM_DATA: 'radsasfun_step1_form_data',
  STEP2_FORM_DATA: 'radsasfun_step2_form_data',
  STEP3_FORM_DATA: 'radsasfun_step3_form_data',
  STEP4_FORM_DATA: 'radsasfun_step4_form_data',
  STEP5_FORM_DATA: 'radsasfun_step5_form_data',
  RESERVATION_STATE: 'radsasfun_reservation_state', // Stays in sessionStorage
} as const;

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


/**
 * Fake Data Utility
 * Loads and applies fake data from fake_data.json when NEXT_PUBLIC_FAKE_DATA=true
 */

import type { Step1FormData, Step2FormData } from './sessionStorage';

interface FakeData {
  step1: Partial<Step1FormData>;
  step2: Partial<Step2FormData>;
}

let cachedFakeData: FakeData | null = null;

/**
 * Check if fake data is enabled
 */
export function isFakeDataEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return process.env.NEXT_PUBLIC_FAKE_DATA === 'true';
}

/**
 * Load fake data from JSON file
 */
export async function loadFakeData(): Promise<FakeData | null> {
  if (!isFakeDataEnabled()) {
    return null;
  }

  if (cachedFakeData) {
    return cachedFakeData;
  }

  try {
    const response = await fetch('/fake_data.json');
    if (!response.ok) {
      console.warn('[FakeData] Could not load fake_data.json');
      return null;
    }
    const data = await response.json();
    cachedFakeData = data;
    return data;
  } catch (error) {
    console.error('[FakeData] Error loading fake data:', error);
    return null;
  }
}

/**
 * Get fake data for Step1
 */
export async function getFakeStep1Data(): Promise<Partial<Step1FormData> | null> {
  const fakeData = await loadFakeData();
  return fakeData?.step1 || null;
}

/**
 * Get fake data for Step2
 */
export async function getFakeStep2Data(): Promise<Partial<Step2FormData> | null> {
  const fakeData = await loadFakeData();
  return fakeData?.step2 || null;
}


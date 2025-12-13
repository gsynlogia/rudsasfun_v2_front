/**
 * API Utilities
 * Functions for communicating with the backend API
 */

import { Camp } from '@/types/camp';
import { CampListResponse } from '@/types/campListResponse';

import { API_BASE_URL } from './api-config';

export type { Camp, CampListResponse };

/**
 * Format date to Polish format (DD.MM.YYYY)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Format date range to Polish format (DD.MM - DD.MM.YYYY)
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startDay = start.getDate().toString().padStart(2, '0');
  const startMonth = (start.getMonth() + 1).toString().padStart(2, '0');
  const endDay = end.getDate().toString().padStart(2, '0');
  const endMonth = (end.getMonth() + 1).toString().padStart(2, '0');
  const year = end.getFullYear();
  return `${startDay}.${startMonth} - ${endDay}.${endMonth}.${year}`;
}

/**
 * Get all camps
 */
export async function getCamps(): Promise<CampListResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/camps`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching camps:', error);
    throw error;
  }
}

/**
 * Get camp by ID
 */
export async function getCampById(id: number): Promise<Camp> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/camps/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching camp ${id}:`, error);
    throw error;
  }
}

/**
 * Get current/active camp
 */
export async function getCurrentCamp(): Promise<Camp> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/camps/current/active`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching current camp:', error);
    throw error;
  }
}


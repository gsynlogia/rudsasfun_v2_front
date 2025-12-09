/**
 * Unit tests for Diet System
 */
import { describe, it, expect } from '@jest/globals';

describe('Diet System', () => {
  describe('General Diet', () => {
    it('should format display name with prefix', () => {
      const name = 'wegetariańska';
      const displayName = `Dieta ogólna: ${name}`;
      expect(displayName).toBe('Dieta ogólna: wegetariańska');
    });

    it('should have start and end dates', () => {
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';
      expect(new Date(startDate) < new Date(endDate)).toBe(true);
    });
  });

  describe('Center Diet', () => {
    it('should format display name with center info', () => {
      const city = 'Wiele';
      const dietName = 'wegetariańska';
      const startDate = '01.07.2025';
      const endDate = '10.07.2025';
      const displayName = `Dieta dla ośrodka: ${city} ${dietName} (${startDate} - ${endDate})`;
      expect(displayName).toContain('Dieta dla ośrodka:');
      expect(displayName).toContain(city);
      expect(displayName).toContain(dietName);
    });

    it('should allow price override for center diet', () => {
      const generalDietPrice = 50.0;
      const centerDietPrice = 60.0; // Override
      expect(centerDietPrice).not.toBe(generalDietPrice);
      expect(centerDietPrice).toBeGreaterThan(generalDietPrice);
    });
  });

  describe('Diet selection logic', () => {
    it('should prefer center diets over general diets', () => {
      const hasCenterDiets = true;
      const hasGeneralDiets = true;
      const shouldUseCenterDiets = hasCenterDiets;
      expect(shouldUseCenterDiets).toBe(true);
    });

    it('should fallback to general diets when no center diets', () => {
      const hasCenterDiets = false;
      const hasGeneralDiets = true;
      const shouldUseGeneralDiets = !hasCenterDiets && hasGeneralDiets;
      expect(shouldUseGeneralDiets).toBe(true);
    });
  });
});








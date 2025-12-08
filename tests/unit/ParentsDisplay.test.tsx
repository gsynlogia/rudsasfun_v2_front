/**
 * Unit tests for parents/guardians display in profile and admin panel
 * Tests that both guardians are displayed correctly
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import ReservationMain from '@/components/profile/ReservationMain';
import { ReservationResponse } from '@/lib/services/ReservationService';

// Mock Next.js components
jest.mock('next/image', () => {
  const React = require('react');
  return {
    default: ({ src, alt }: { src: string; alt: string }) => 
      React.createElement('img', { src, alt })
  };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('Parents Display', () => {
  const mockReservation: ReservationResponse = {
    id: 1,
    camp_id: 1,
    property_id: 1,
    status: 'pending',
    total_price: 2200,
    deposit_amount: 0,
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-01-01T00:00:00',
    camp_name: 'Test Camp',
    property_name: 'Test Property',
    property_city: 'Warszawa',
    property_period: 'lato',
    participant_first_name: 'Janek',
    participant_last_name: 'Kowalski',
    participant_age: '10',
    participant_gender: 'chłopiec',
    participant_city: 'Warszawa',
    parents_data: [
      {
        id: 'parent1',
        firstName: 'Jan',
        lastName: 'Kowalski',
        email: 'jan@example.com',
        phone: '+48',
        phoneNumber: '123456789',
        street: 'ul. Testowa 1',
        postalCode: '00-001',
        city: 'Warszawa'
      },
      {
        id: 'parent2',
        firstName: 'Anna',
        lastName: 'Kowalska',
        email: 'anna@example.com',
        phone: '+48',
        phoneNumber: '987654321',
        street: 'ul. Testowa 1',
        postalCode: '00-001',
        city: 'Warszawa'
      }
    ],
    invoice_type: 'private',
    invoice_first_name: 'Jan',
    invoice_last_name: 'Kowalski',
    invoice_email: 'jan@example.com',
    invoice_phone: '+48 123456789',
    invoice_street: 'ul. Testowa 1',
    invoice_postal_code: '00-001',
    invoice_city: 'Warszawa',
    departure_type: 'own',
    return_type: 'own',
    selected_source: 'inne',
    diet: null,
    accommodation_request: null,
    selected_diets: null,
    selected_addons: null,
    selected_protection: null,
    selected_promotion: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Profile Display', () => {
    it('should display both parents in profile', () => {
      render(
        <ReservationMain
          reservation={mockReservation}
          isDetailsExpanded={true}
          onToggleDetails={() => {}}
        />
      );

      // Check that both parents are displayed
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
      expect(screen.getByText('Anna Kowalska')).toBeInTheDocument();
      
      // Check that both emails are displayed
      expect(screen.getByText('jan@example.com')).toBeInTheDocument();
      expect(screen.getByText('anna@example.com')).toBeInTheDocument();
      
      // Check that both phone numbers are displayed
      expect(screen.getByText(/123456789/)).toBeInTheDocument();
      expect(screen.getByText(/987654321/)).toBeInTheDocument();
    });

    it('should display single parent in profile', () => {
      const singleParentReservation = {
        ...mockReservation,
        parents_data: [mockReservation.parents_data![0]]
      };

      render(
        <ReservationMain
          reservation={singleParentReservation}
          isDetailsExpanded={true}
          onToggleDetails={() => {}}
        />
      );

      // Check that only first parent is displayed
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
      expect(screen.queryByText('Anna Kowalska')).not.toBeInTheDocument();
    });

    it('should display second parent without email in profile', () => {
      const secondParentWithoutEmail = {
        ...mockReservation,
        parents_data: [
          mockReservation.parents_data![0],
          {
            ...mockReservation.parents_data![1],
            email: undefined
          }
        ]
      };

      render(
        <ReservationMain
          reservation={secondParentWithoutEmail}
          isDetailsExpanded={true}
          onToggleDetails={() => {}}
        />
      );

      // Check that both parents are displayed
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
      expect(screen.getByText('Anna Kowalska')).toBeInTheDocument();
      
      // Check that only first parent has email
      expect(screen.getByText('jan@example.com')).toBeInTheDocument();
      expect(screen.queryByText('anna@example.com')).not.toBeInTheDocument();
    });
  });
});




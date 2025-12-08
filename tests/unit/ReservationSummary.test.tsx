/**
 * Unit tests for ReservationSummary component
 * Tests navigation button functionality on all steps
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import ReservationSummary from '@/components/ReservationSummary';
import { ReservationProvider } from '@/context/ReservationContext';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: jest.fn(),
}));

// Mock Next.js Image component
jest.mock('next/image', () => {
  const React = require('react');
  return {
    default: ({ src, alt }: { src: string; alt: string }) => 
      React.createElement('img', { src, alt })
  };
});

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

describe('ReservationSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    (usePathname as jest.Mock).mockReturnValue('/camps/1/edition/1/step/1');
  });

  describe('Navigation button functionality', () => {
    it('should navigate to next step when clicked on step 1', async () => {
      (usePathname as jest.Mock).mockReturnValue('/camps/1/edition/1/step/1');
      
      render(
        <ReservationProvider>
          <ReservationSummary currentStep={1} />
        </ReservationProvider>
      );

      await waitFor(() => {
        const button = screen.getByText('przejdź dalej');
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByText('przejdź dalej');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/camps/1/edition/1/step/2');
      });
    });

    it('should navigate to next step when clicked on step 2', async () => {
      (usePathname as jest.Mock).mockReturnValue('/camps/1/edition/1/step/2');
      
      render(
        <ReservationProvider>
          <ReservationSummary currentStep={2} />
        </ReservationProvider>
      );

      await waitFor(() => {
        const button = screen.getByText('przejdź dalej');
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByText('przejdź dalej');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/camps/1/edition/1/step/3');
      });
    });

    it('should navigate to next step when clicked on step 3', async () => {
      (usePathname as jest.Mock).mockReturnValue('/camps/1/edition/1/step/3');
      
      render(
        <ReservationProvider>
          <ReservationSummary currentStep={3} />
        </ReservationProvider>
      );

      await waitFor(() => {
        const button = screen.getByText('przejdź dalej');
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByText('przejdź dalej');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/camps/1/edition/1/step/4');
      });
    });

    it('should navigate to next step when clicked on step 4', async () => {
      (usePathname as jest.Mock).mockReturnValue('/camps/1/edition/1/step/4');
      
      render(
        <ReservationProvider>
          <ReservationSummary currentStep={4} />
        </ReservationProvider>
      );

      await waitFor(() => {
        const button = screen.getByText('przejdź dalej');
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByText('przejdź dalej');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/camps/1/edition/1/step/5');
      });
    });

    it('should navigate to payment page when clicked on step 5 (last step)', async () => {
      (usePathname as jest.Mock).mockReturnValue('/camps/1/edition/1/step/5');
      
      render(
        <ReservationProvider>
          <ReservationSummary currentStep={5} />
        </ReservationProvider>
      );

      await waitFor(() => {
        const button = screen.getByText('Przejdź do płatności');
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByText('Przejdź do płatności');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profil/aktualne-rezerwacje');
      });
    });

    it('should use onNext handler when provided', async () => {
      const mockOnNext = jest.fn();
      (usePathname as jest.Mock).mockReturnValue('/camps/1/edition/1/step/2');
      
      render(
        <ReservationProvider>
          <ReservationSummary currentStep={2} onNext={mockOnNext} />
        </ReservationProvider>
      );

      await waitFor(() => {
        const button = screen.getByText('przejdź dalej');
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByText('przejdź dalej');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('should extract step from pathname when currentStep is not provided', async () => {
      (usePathname as jest.Mock).mockReturnValue('/camps/2/edition/3/step/3');
      
      render(
        <ReservationProvider>
          <ReservationSummary />
        </ReservationProvider>
      );

      await waitFor(() => {
        const button = screen.getByText('przejdź dalej');
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByText('przejdź dalej');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/camps/2/edition/3/step/4');
      });
    });

    it('should not navigate if pathname is invalid', async () => {
      (usePathname as jest.Mock).mockReturnValue('/invalid/path');
      
      render(
        <ReservationProvider>
          <ReservationSummary />
        </ReservationProvider>
      );

      await waitFor(() => {
        const button = screen.getByText('przejdź dalej');
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByText('przejdź dalej');
      fireEvent.click(button);

      // Wait a bit to ensure navigation doesn't happen
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Button text', () => {
    it('should show "przejdź dalej" on steps 1-4', async () => {
      (usePathname as jest.Mock).mockReturnValue('/camps/1/edition/1/step/3');
      
      render(
        <ReservationProvider>
          <ReservationSummary currentStep={3} />
        </ReservationProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('przejdź dalej')).toBeInTheDocument();
        expect(screen.queryByText('Przejdź do płatności')).not.toBeInTheDocument();
      });
    });

    it('should show "Przejdź do płatności" on step 5', async () => {
      (usePathname as jest.Mock).mockReturnValue('/camps/1/edition/1/step/5');
      
      render(
        <ReservationProvider>
          <ReservationSummary currentStep={5} />
        </ReservationProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Przejdź do płatności')).toBeInTheDocument();
        expect(screen.queryByText('przejdź dalej')).not.toBeInTheDocument();
      });
    });
  });
});


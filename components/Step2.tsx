'use client';

import { useEffect, useCallback } from 'react';

import type { StepComponentProps } from '@/types/reservation';
import { saveStep2FormData, loadStep2FormData, type Step2FormData } from '@/utils/sessionStorage';

import DashedLine from './DashedLine';
import AddonsSection from './step2/AddonsSection';
import PromotionsSection from './step2/PromotionsSection';
import ProtectionSection from './step2/ProtectionSection';
import SourceSection from './step2/SourceSection';
import TransportSection from './step2/TransportSection';

/**
 * Step2 Component - Reservation Details
 * Contains: Addons, Protection, Promotions, Transport, Source information
 */
export default function Step2({ onNext, onPrevious, disabled = false }: StepComponentProps) {
  // Combined validation function for Step2 (Transport + Source + Promotions)
  const validateStep2 = useCallback((): boolean => {
    // Validate transport section
    const validateTransport = (window as any).validateStep2;
    const transportValid = validateTransport ? validateTransport() : false;

    // Validate source section
    const validateSource = (window as any).validateSourceSection;
    const sourceValid = validateSource ? validateSource() : false;

    // Validate promotions section
    // IMPORTANT: If validation function is not loaded yet, return false to prevent bypassing validation
    const validatePromotions = (window as any).validatePromotionsSection;
    const promotionsValid = validatePromotions ? validatePromotions() : false;

    return transportValid && sourceValid && promotionsValid;
  }, []);

  // Expose combined validation function
  useEffect(() => {
    (window as any).validateStep2Combined = validateStep2;

    return () => {
      delete (window as any).validateStep2Combined;
    };
  }, [validateStep2]);

  // Load data from sessionStorage on mount
  useEffect(() => {
    const savedData = loadStep2FormData();
    if (savedData) {
      // Data will be loaded by individual components
      // This is just to ensure we have the structure
    }
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Addons Section - Only description and info block from database */}
      <AddonsSection />
      <DashedLine />

      {/* Protection Section */}
      <ProtectionSection />
      <DashedLine />

      {/* Promotions Section */}
      <PromotionsSection />
      <DashedLine />

      {/* Transport Section */}
      <TransportSection />
      <DashedLine />

      {/* Source Section */}
      <SourceSection />
    </div>
  );
}
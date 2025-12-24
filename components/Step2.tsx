'use client';

import { useEffect, useCallback } from 'react';
import DashedLine from './DashedLine';
import AddonsSection from './step2/AddonsSection';
import ProtectionSection from './step2/ProtectionSection';
import PromotionsSection from './step2/PromotionsSection';
import TransportSection from './step2/TransportSection';
import SourceSection from './step2/SourceSection';
import type { StepComponentProps } from '@/types/reservation';
import { saveStep2FormData, loadStep2FormData, type Step2FormData } from '@/utils/sessionStorage';

/**
 * Step2 Component - Reservation Details
 * Contains: Addons, Protection, Promotions, Transport, Source information
 */
export default function Step2({ onNext, onPrevious, disabled = false }: StepComponentProps) {
  // Combined validation function for Step2 (Transport + Source + Promotions)
  const validateStep2 = useCallback((): boolean => {
    // Validate transport section
    const validateTransport = (window as any).validateStep2;
    const transportValid = validateTransport ? validateTransport() : true;
    
    // Validate source section
    const validateSource = (window as any).validateSourceSection;
    const sourceValid = validateSource ? validateSource() : true;
    
    // Validate promotions section
    const validatePromotions = (window as any).validatePromotionsSection;
    const promotionsValid = validatePromotions ? validatePromotions() : true;
    
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

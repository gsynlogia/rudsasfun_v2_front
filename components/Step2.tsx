'use client';

import { useEffect } from 'react';
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
      {/* Addons Section */}
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

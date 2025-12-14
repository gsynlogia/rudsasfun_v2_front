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
import { isFakeDataEnabled, getFakeStep2Data } from '@/utils/fakeData';

/**
 * Step2 Component - Reservation Details
 * Contains: Addons, Protection, Promotions, Transport, Source information
 */
export default function Step2({ onNext, onPrevious, disabled = false }: StepComponentProps) {
  // Combined validation function for Step2 (Transport + Source)
  const validateStep2 = useCallback((): boolean => {
    // Validate transport section
    const validateTransport = (window as any).validateStep2;
    const transportValid = validateTransport ? validateTransport() : true;
    
    // Validate source section
    const validateSource = (window as any).validateSourceSection;
    const sourceValid = validateSource ? validateSource() : true;
    
    return transportValid && sourceValid;
  }, []);

  // Expose combined validation function
  useEffect(() => {
    (window as any).validateStep2Combined = validateStep2;

    return () => {
      delete (window as any).validateStep2Combined;
    };
  }, [validateStep2]);

  // Load data from sessionStorage or fake data on mount
  useEffect(() => {
    const loadData = async () => {
      let savedData = loadStep2FormData();

      // If fake data is enabled and no saved data exists (or empty), load fake data
      if (isFakeDataEnabled()) {
        const hasExistingData = savedData && (
          (savedData.selectedAddons && savedData.selectedAddons.length > 0) ||
          (savedData.selectedPromotion && savedData.selectedPromotion !== '') ||
          (savedData.transportData && savedData.transportData.departureCity !== '')
        );
        
        if (!hasExistingData) {
          const fakeData = await getFakeStep2Data();
          if (fakeData) {
            // Merge fake data with saved data (fake data takes priority)
            // Ensure transportData is properly merged with all required fields
            const defaultTransportData = {
              departureType: 'zbiorowy',
              departureCity: '',
              returnType: 'zbiorowy',
              returnCity: '',
              differentCities: false,
            };
            
            // Ensure all required fields are defined
            const mergedData: Step2FormData = {
              selectedDiets: fakeData.selectedDiets || savedData?.selectedDiets || [],
              selectedAddons: fakeData.selectedAddons || savedData?.selectedAddons || [],
              selectedProtection: fakeData.selectedProtection || savedData?.selectedProtection || [],
              selectedProtectionIds: fakeData.selectedProtectionIds || savedData?.selectedProtectionIds || [],
              selectedPromotion: fakeData.selectedPromotion !== undefined ? fakeData.selectedPromotion : (savedData?.selectedPromotion ?? ''),
              promotionJustification: fakeData.promotionJustification || savedData?.promotionJustification || {},
              transportData: {
                ...defaultTransportData,
                ...(savedData?.transportData || {}),
                ...(fakeData.transportData || {}),
              },
              transportModalConfirmed: fakeData.transportModalConfirmed !== undefined ? fakeData.transportModalConfirmed : (savedData?.transportModalConfirmed ?? false),
              selectedSource: fakeData.selectedSource !== undefined ? fakeData.selectedSource : (savedData?.selectedSource ?? ''),
              inneText: fakeData.inneText !== undefined ? fakeData.inneText : (savedData?.inneText ?? ''),
            };
            
            savedData = mergedData;
            // Save fake data to sessionStorage immediately
            saveStep2FormData(savedData as Step2FormData);
            
            // Force a re-render by triggering a custom event that components can listen to
            window.dispatchEvent(new CustomEvent('fakeDataLoaded', { detail: savedData }));
          }
        }
      }

      if (savedData) {
        // Data will be loaded by individual components
        // This is just to ensure we have the structure
      }
    };
    loadData();
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

'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';

import type { StepComponentProps } from '@/types/reservation';
import { loadStep2FormData, saveStep2FormData, loadStep3FormData } from '@/utils/sessionStorage';

import DashedLine from './DashedLine';
import AddonsSection from './step2/AddonsSection';
import PromotionsAndRabatySection, { type PromotionAndCodeSelection } from './step2/PromotionsAndRabatySection';
import ProtectionSection from './step2/ProtectionSection';
import SourceSection from './step2/SourceSection';
import TransportSection from './step2/TransportSection';

/**
 * Step2 Component - Reservation Details
 * Contains: Addons, Protection, Promotions, Transport, Source information
 */
export default function Step2({ onNext: _onNext, onPrevious: _onPrevious, disabled: _disabled = false }: StepComponentProps) {
  const pathname = usePathname();

  // propertyId wyciągany z URL: /camps/{campId}/edition/{editionId}/property/{propertyId}/step/2
  const propertyId = useMemo<number | null>(() => {
    const parts = (pathname || '').split('/');
    const idx = parts.indexOf('property');
    if (idx !== -1 && idx + 1 < parts.length) {
      const v = parseInt(parts[idx + 1], 10);
      return Number.isFinite(v) ? v : null;
    }
    // fallback: /camps/{campId}/edition/{editionId}/step/{step} — propertyId z editionId
    const editionIdx = parts.indexOf('edition');
    if (editionIdx !== -1 && editionIdx + 1 < parts.length) {
      const v = parseInt(parts[editionIdx + 1], 10);
      return Number.isFinite(v) ? v : null;
    }
    return null;
  }, [pathname]);

  // userEmail z zapisanego Step 3 (jeśli klient wrócił z dalszego kroku)
  const userEmail = useMemo<string | null>(() => {
    const step3 = loadStep3FormData();
    if (step3?.privateData?.email) return step3.privateData.email;
    return null;
  }, []);

  // Initial selection z sessionStorage (po powrocie do Step 2)
  const initialSelection = useMemo<Partial<PromotionAndCodeSelection>>(() => {
    const s = loadStep2FormData();
    if (!s) return {};
    return {
      promotion_v2_id: s.promotionV2Id ?? null,
      promotion_v2_custom_values: s.promotionV2CustomValues ?? null,
      promo_code_id: s.promoCodeId ?? null,
      promo_code_result: s.promoCodeResult ?? null,
    };
  }, []);

  // Persystencja wyboru promocji/kodu v2 do sessionStorage po zmianie w komponencie
  const handlePromotionsChange = useCallback((sel: PromotionAndCodeSelection) => {
    const current = loadStep2FormData();
    const base = current || {
      selectedAddons: [],
      selectedProtection: [],
      selectedPromotion: '',
      transportData: {
        departureType: '',
        departureCity: '',
        returnType: '',
        returnCity: '',
      },
      selectedSource: '',
      inneText: '',
    };
    saveStep2FormData({
      ...base,
      promotionV2Id: sel.promotion_v2_id,
      promotionV2CustomValues: sel.promotion_v2_custom_values,
      promoCodeId: sel.promo_code_id,
      promoCodeResult: sel.promo_code_result,
    });
  }, []);

  // Combined validation function for Step2 (Transport + Source + Promotions)
  const validateStep2 = useCallback((): boolean => {
    // Validate transport section
    const validateTransport = (window as any).validateStep2;
    const transportValid = validateTransport ? validateTransport() : false;

    // Validate source section
    const validateSource = (window as any).validateSourceSection;
    const sourceValid = validateSource ? validateSource() : false;

    // Promocje/kody v2 — sekcja sama waliduje przez disabled buttony; brak globalnego blocker'a
    return transportValid && sourceValid;
  }, []);

  // Expose combined validation function
  useEffect(() => {
    (window as any).validateStep2Combined = validateStep2;

    return () => {
      delete (window as any).validateStep2Combined;
    };
  }, [validateStep2]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Addons Section - Only description and info block from database */}
      <AddonsSection />
      <DashedLine />

      {/* Protection Section */}
      <ProtectionSection />
      <DashedLine />

      {/* Promocje i Rabaty (promocje v2 + kody rabatowe) */}
      {propertyId !== null && (
        <PromotionsAndRabatySection
          propertyId={propertyId}
          userEmail={userEmail}
          initial={initialSelection}
          onChange={handlePromotionsChange}
        />
      )}
      <DashedLine />

      {/* Transport Section */}
      <TransportSection />
      <DashedLine />

      {/* Source Section */}
      <SourceSection />
    </div>
  );
}
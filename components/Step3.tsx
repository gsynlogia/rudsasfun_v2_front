'use client';

import { useEffect } from 'react';
import DashedLine from './DashedLine';
import InvoiceTypeSection from './step3/InvoiceTypeSection';
import InvoiceDataSection from './step3/InvoiceDataSection';
import InvoiceDeliverySection from './step3/InvoiceDeliverySection';
import type { StepComponentProps } from '@/types/reservation';
import { saveStep3FormData, loadStep3FormData, type Step3FormData } from '@/utils/sessionStorage';

/**
 * Step3 Component - Invoices
 * Contains: Invoice type selection, Invoice data form, Invoice delivery options
 */
export default function Step3({ onNext, onPrevious, disabled = false }: StepComponentProps) {
  // Load data from sessionStorage on mount
  useEffect(() => {
    const savedData = loadStep3FormData();
    if (savedData) {
      // Data will be loaded by individual components
      // This is just to ensure we have the structure
    }
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Invoice Type Section */}
      <InvoiceTypeSection />
      <DashedLine />

      {/* Invoice Data Section */}
      <InvoiceDataSection />
      <DashedLine />

      {/* Invoice Delivery Section */}
      <InvoiceDeliverySection />
    </div>
  );
}


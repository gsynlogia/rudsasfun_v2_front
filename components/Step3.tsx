'use client';

import { useEffect, useCallback, useState } from 'react';

import { useReservation } from '@/context/ReservationContext';
import type { StepComponentProps, ReservationItem } from '@/types/reservation';
import { saveStep3FormData, loadStep3FormData, type Step3FormData } from '@/utils/sessionStorage';
import { loadStep1FormData } from '@/utils/sessionStorage';

import DashedLine from './DashedLine';
import InvoiceDataSection from './step3/InvoiceDataSection';
import PrivateInvoiceDataSection from './step3/PrivateInvoiceDataSection';
import InvoiceDeliverySection from './step3/InvoiceDeliverySection';
import InvoiceTypeSection from './step3/InvoiceTypeSection';
import WantsInvoiceSection from './step3/WantsInvoiceSection';

/**
 * Step3 Component - Invoices
 * Contains: Invoice type selection, Invoice data form (only for company), Invoice delivery options (only for company)
 * For private person: only type selection is shown, no invoice data fields
 */
export default function Step3({ onNext: _onNext, onPrevious: _onPrevious, disabled: _disabled = false }: StepComponentProps) {
  const [wantsInvoice, setWantsInvoice] = useState<boolean>(false);
  const [invoiceType, setInvoiceType] = useState<'private' | 'company'>('private');
  const { reservation, removeReservationItem } = useReservation();

  // Load wantsInvoice and invoiceType from sessionStorage
  useEffect(() => {
    const savedData = loadStep3FormData();
    if (savedData) {
      if (savedData.wantsInvoice !== undefined) {
        setWantsInvoice(savedData.wantsInvoice);
      }
      if (savedData.invoiceType) {
        setInvoiceType(savedData.invoiceType);
      }
    }
  }, []);

  // Monitor wantsInvoice and invoiceType changes from components (via sessionStorage)
  // Also auto-fill private person data when switching to private
  useEffect(() => {
    const checkInvoiceData = () => {
      const savedData = loadStep3FormData();
      if (savedData) {
        if (savedData.wantsInvoice !== undefined && savedData.wantsInvoice !== wantsInvoice) {
          setWantsInvoice(savedData.wantsInvoice);
        }
        if (savedData.invoiceType && savedData.invoiceType !== invoiceType) {
          setInvoiceType(savedData.invoiceType);
        }

        // If switching to private, clear company data (but don't auto-fill private data)
        if (savedData.invoiceType === 'private') {
          // Remove paper invoice (30 PLN) from reservation when switching to private person
          const paperInvoiceItem = reservation.items.find(
            (item: ReservationItem) => item.type === 'other' && item.name === 'Faktura papierowa',
          );
          if (paperInvoiceItem) {
            removeReservationItem(paperInvoiceItem.id);
          }

          // Clear company data when switching to private (but don't auto-fill private data)
          const formData: Step3FormData = {
            ...savedData,
            wantsInvoice: savedData?.wantsInvoice ?? false,
            invoiceType: 'private',
            // Keep existing privateData if it exists, otherwise leave it undefined
            privateData: savedData.privateData || undefined,
            // Clear company data when switching to private
            companyData: {
              companyName: '',
              nip: '',
              street: '',
              postalCode: '',
              city: '',
            },
            // Reset delivery type to electronic (no paper invoice for private person)
            deliveryType: 'electronic',
            differentAddress: false,
            deliveryAddress: { street: '', postalCode: '', city: '' },
          };

          saveStep3FormData(formData);
        }
      }
    };

    // Check periodically for changes
    const interval = setInterval(checkInvoiceData, 500);

    return () => clearInterval(interval);
  }, [wantsInvoice, invoiceType, reservation.items, removeReservationItem]);

  // Combined validation function for Step3 (InvoiceData + InvoiceDelivery)
  // If wantsInvoice is false, no validation needed
  // For company: validate invoice data and delivery sections
  // For private person: validate invoice data (required fields only) and delivery if paper version is selected
  const validateStep3 = useCallback((): boolean => {
    // If client doesn't want invoice, no validation needed
    if (!wantsInvoice) {
      return true;
    }

    // Always validate delivery section (for both private and company, if paper version is selected)
    const validateDelivery = (window as any).validateInvoiceDeliverySection;
    const deliveryValid = validateDelivery ? validateDelivery() : true;

    // If private person, validate private invoice data section
    if (invoiceType === 'private') {
      const validatePrivateInvoiceData = (window as any).validatePrivateInvoiceDataSection;
      const privateInvoiceDataValid = validatePrivateInvoiceData ? validatePrivateInvoiceData() : true;
      return privateInvoiceDataValid && deliveryValid;
    }

    // If company, validate both invoice data and delivery sections
    const validateInvoiceData = (window as any).validateInvoiceDataSection;
    const invoiceDataValid = validateInvoiceData ? validateInvoiceData() : true;

    return invoiceDataValid && deliveryValid;
  }, [wantsInvoice, invoiceType]);

  // Expose combined validation function
  useEffect(() => {
    (window as any).validateStep3Combined = validateStep3;

    return () => {
      delete (window as any).validateStep3Combined;
    };
  }, [validateStep3]);

  // Monitor invoiceType changes and remove paper invoice when switching to private
  useEffect(() => {
    if (invoiceType === 'private') {
      // Remove paper invoice (30 PLN) from reservation when invoiceType is private
      const paperInvoiceItem = reservation.items.find(
        (item: ReservationItem) => item.type === 'other' && item.name === 'Faktura papierowa',
      );
      if (paperInvoiceItem) {
        removeReservationItem(paperInvoiceItem.id);
      }
    }
  }, [invoiceType, reservation.items, removeReservationItem]);

  // Note: Private person data is NOT auto-filled from Step1
  // User can manually fill it using the button in PrivateInvoiceDataSection

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Wants Invoice Section - Always shown first */}
      <WantsInvoiceSection />

      {/* Invoice Type Section - Only show if wantsInvoice is true */}
      {wantsInvoice && (
        <>
          <DashedLine />
          <InvoiceTypeSection />
        </>
      )}

      {/* Invoice Data Section - Show for both private and company if wantsInvoice is true */}
      {wantsInvoice && invoiceType === 'private' && (
        <>
          <DashedLine />
          <PrivateInvoiceDataSection />
        </>
      )}

      {/* Invoice Data Section - Only show for company and if wantsInvoice is true */}
      {wantsInvoice && invoiceType === 'company' && (
        <>
          <DashedLine />
          <InvoiceDataSection invoiceType={invoiceType} />
        </>
      )}

      {/* Invoice Delivery Section - Only show for company and if wantsInvoice is true */}
      {wantsInvoice && invoiceType === 'company' && (
        <>
          <DashedLine />
          <InvoiceDeliverySection />
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useCallback, useState } from 'react';

import { useReservation } from '@/context/ReservationContext';
import type { StepComponentProps, ReservationItem } from '@/types/reservation';
import { saveStep3FormData, loadStep3FormData, type Step3FormData } from '@/utils/sessionStorage';
import { loadStep1FormData } from '@/utils/sessionStorage';

import DashedLine from './DashedLine';
import InvoiceDataSection from './step3/InvoiceDataSection';
import InvoiceDeliverySection from './step3/InvoiceDeliverySection';
import InvoiceTypeSection from './step3/InvoiceTypeSection';
import WantsInvoiceSection from './step3/WantsInvoiceSection';

/**
 * Step3 Component - Invoices
 * Contains: Invoice type selection, Invoice data form (only for company), Invoice delivery options (only for company)
 * For private person: only type selection is shown, no invoice data fields
 */
export default function Step3({ onNext: _onNext, onPrevious: _onPrevious, disabled: _disabled = false }: StepComponentProps) {
  const [invoiceType, setInvoiceType] = useState<'private' | 'company'>('private');
  const [wantsInvoice, setWantsInvoice] = useState<boolean>(false);
  const { reservation, removeReservationItem } = useReservation();

  // Load invoice type and wantsInvoice from sessionStorage
  useEffect(() => {
    const savedData = loadStep3FormData();
    if (savedData) {
      if (savedData.invoiceType) {
        setInvoiceType(savedData.invoiceType);
      }
      if (savedData.wantsInvoice !== undefined) {
        setWantsInvoice(savedData.wantsInvoice);
      }
    }
  }, []);

  // Monitor wantsInvoice changes from WantsInvoiceSection (via sessionStorage)
  useEffect(() => {
    const checkWantsInvoice = () => {
      const savedData = loadStep3FormData();
      if (savedData && savedData.wantsInvoice !== undefined && savedData.wantsInvoice !== wantsInvoice) {
        setWantsInvoice(savedData.wantsInvoice);
      }
    };

    // Check periodically for changes
    const interval = setInterval(checkWantsInvoice, 500);

    return () => clearInterval(interval);
  }, [wantsInvoice]);

  // Monitor invoice type changes from InvoiceTypeSection (via sessionStorage)
  // Also auto-fill private person data when switching to private
  useEffect(() => {
    const checkInvoiceType = () => {
      const savedData = loadStep3FormData();
      if (savedData && savedData.invoiceType && savedData.invoiceType !== invoiceType) {
        setInvoiceType(savedData.invoiceType);

        // If switching to private, auto-fill from Step1 and clear company data
        if (savedData.invoiceType === 'private') {
          // Remove paper invoice (30 PLN) from reservation when switching to private person
          const paperInvoiceItem = reservation.items.find(
            (item: ReservationItem) => item.type === 'other' && item.name === 'Faktura papierowa',
          );
          if (paperInvoiceItem) {
            removeReservationItem(paperInvoiceItem.id);
          }

          const step1Data = loadStep1FormData();
          if (step1Data && step1Data.parents && step1Data.parents.length > 0) {
            const firstParent = step1Data.parents[0];
            const privateData = {
              firstName: firstParent.firstName || '',
              lastName: firstParent.lastName || '',
              email: firstParent.email || '',
              phone: firstParent.phone || '+48',
              street: firstParent.street || '',
              postalCode: firstParent.postalCode || '',
              city: firstParent.city || '',
              nip: '', // NIP is optional for private person
            };

            const formData: Step3FormData = {
              ...savedData,
              invoiceType: 'private',
              privateData,
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
          } else {
            // Even if no Step1 data, clear company data and reset delivery
            const formData: Step3FormData = {
              ...savedData,
              invoiceType: 'private',
              companyData: {
                companyName: '',
                nip: '',
                street: '',
                postalCode: '',
                city: '',
              },
              deliveryType: 'electronic',
              differentAddress: false,
              deliveryAddress: { street: '', postalCode: '', city: '' },
            };
            saveStep3FormData(formData);
          }
        }
      }
    };

    // Check periodically for changes
    const interval = setInterval(checkInvoiceType, 500);

    return () => clearInterval(interval);
  }, [invoiceType, reservation.items, removeReservationItem]);

  // Combined validation function for Step3 (InvoiceData + InvoiceDelivery)
  // For company: validate invoice data and delivery sections
  // For private person: only validate delivery if paper version is selected
  const validateStep3 = useCallback((): boolean => {
    // Always validate delivery section (for both private and company, if paper version is selected)
    const validateDelivery = (window as any).validateInvoiceDeliverySection;
    const deliveryValid = validateDelivery ? validateDelivery() : true;

    // If private person, only validate delivery (no invoice data required)
    if (invoiceType === 'private') {
      return deliveryValid;
    }

    // If company, validate both invoice data and delivery sections
    const validateInvoiceData = (window as any).validateInvoiceDataSection;
    const invoiceDataValid = validateInvoiceData ? validateInvoiceData() : true;

    return invoiceDataValid && deliveryValid;
  }, [invoiceType]);

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

  // Load data from sessionStorage on mount and auto-fill private person data from Step1
  useEffect(() => {
    const savedData = loadStep3FormData();
    const step1Data = loadStep1FormData();

    // If private person is selected and we have Step1 data, auto-fill from first parent
    if (invoiceType === 'private' && step1Data && step1Data.parents && step1Data.parents.length > 0) {
      const firstParent = step1Data.parents[0];

      // Only update if privateData is not already filled
      const currentPrivateData = savedData ? savedData.privateData : null;
      const needsUpdate = !currentPrivateData ||
        !currentPrivateData.firstName ||
        !currentPrivateData.lastName ||
        !currentPrivateData.email;

      if (needsUpdate) {
        const privateData = {
          firstName: firstParent.firstName || '',
          lastName: firstParent.lastName || '',
          email: firstParent.email || '',
          phone: firstParent.phone || '+48',
          street: firstParent.street || '',
          postalCode: firstParent.postalCode || '',
          city: firstParent.city || '',
          nip: '', // NIP is optional for private person
        };

        const formData: Step3FormData = {
          ...savedData,
          wantsInvoice: (savedData && savedData.wantsInvoice !== undefined) ? savedData.wantsInvoice : true,
          invoiceType: 'private',
          privateData,
          companyData: (savedData && savedData.companyData) ? savedData.companyData : {
            companyName: '',
            nip: '',
            street: '',
            postalCode: '',
            city: '',
          },
          deliveryType: (savedData && savedData.deliveryType) ? savedData.deliveryType : 'electronic',
          differentAddress: (savedData && savedData.differentAddress !== undefined) ? savedData.differentAddress : false,
          deliveryAddress: (savedData && savedData.deliveryAddress) ? savedData.deliveryAddress : { street: '', postalCode: '', city: '' },
        };

        saveStep3FormData(formData);
      }
    }
  }, [invoiceType]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* First: Ask if client wants invoice */}
      <WantsInvoiceSection />

      {/* Only show invoice sections if wantsInvoice is true */}
      {wantsInvoice && (
        <>
          <DashedLine />

          {/* Invoice Type Section */}
          <InvoiceTypeSection />

          {/* Invoice Data Section - Only show for company */}
          {invoiceType === 'company' && (
            <>
              <DashedLine />
              <InvoiceDataSection invoiceType={invoiceType} />
            </>
          )}

          {/* Invoice Delivery Section - Only show for company */}
          {invoiceType === 'company' && (
            <>
              <DashedLine />
              <InvoiceDeliverySection />
            </>
          )}
        </>
      )}
    </div>
  );
}
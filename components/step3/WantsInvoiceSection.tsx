'use client';

import { FileText } from 'lucide-react';
import { useState, useEffect } from 'react';

import { loadStep3FormData, saveStep3FormData } from '@/utils/sessionStorage';

/**
 * WantsInvoiceSection Component
 * Displays question: "Do you want an invoice?" (Yes/No)
 * If Yes, then InvoiceTypeSection will be shown
 */
export default function WantsInvoiceSection() {
  const [wantsInvoice, setWantsInvoice] = useState<boolean>(false);

  // Load data from sessionStorage on mount
  useEffect(() => {
    const loadData = () => {
      const savedData = loadStep3FormData();
      if (savedData && savedData.wantsInvoice !== undefined) {
        setWantsInvoice(savedData.wantsInvoice);
      }
    };

    // Load immediately
    loadData();

    // Also listen for focus events (when user switches back to this tab/step)
    const handleFocus = () => {
      loadData();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Save to sessionStorage whenever wantsInvoice changes
  useEffect(() => {
    const savedData = loadStep3FormData();
    const formData = {
      ...savedData,
      wantsInvoice,
      // If wantsInvoice is false, clear invoice type and data
      ...(wantsInvoice === false && {
        invoiceType: undefined,
        privateData: undefined,
        companyData: undefined,
        deliveryType: undefined,
        differentAddress: false,
        deliveryAddress: undefined,
      }),
    };
    saveStep3FormData(formData as any);
  }, [wantsInvoice]);

  const handleWantsInvoiceChange = (value: boolean) => {
    setWantsInvoice(value);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Czy klient chce fakturę?
      </h2>
      <section className="bg-white p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Yes Option */}
          <button
            type="button"
            onClick={() => handleWantsInvoiceChange(true)}
            className={`p-4 sm:p-6 border-2 transition-all text-left ${
              wantsInvoice === true
                ? 'border-[#03adf0] bg-[#03adf0] text-white'
                : 'border-gray-300 bg-gray-100 text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
              <FileText className={`w-6 h-6 sm:w-8 sm:h-8 ${wantsInvoice === true ? 'text-white' : 'text-[#03adf0]'}`} />
              <span className="text-base sm:text-lg font-semibold">
                Tak
              </span>
            </div>
            <p className="text-xs sm:text-sm opacity-90">
              Klient chce otrzymać fakturę
            </p>
          </button>

          {/* No Option */}
          <button
            type="button"
            onClick={() => handleWantsInvoiceChange(false)}
            className={`p-4 sm:p-6 border-2 transition-all text-left ${
              wantsInvoice === false
                ? 'border-[#03adf0] bg-[#03adf0] text-white'
                : 'border-gray-300 bg-gray-100 text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
              <FileText className={`w-6 h-6 sm:w-8 sm:h-8 ${wantsInvoice === false ? 'text-white' : 'text-[#03adf0]'}`} />
              <span className="text-base sm:text-lg font-semibold">
                Nie
              </span>
            </div>
            <p className="text-xs sm:text-sm opacity-90">
              Klient nie chce faktury
            </p>
          </button>
        </div>
      </section>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Building2, User } from 'lucide-react';
import { loadStep3FormData, saveStep3FormData } from '@/utils/sessionStorage';

/**
 * InvoiceTypeSection Component
 * Displays invoice type selection (Private person vs Company)
 */
export default function InvoiceTypeSection() {
  const [invoiceType, setInvoiceType] = useState<'private' | 'company'>('private');

  // Load data from sessionStorage on mount and whenever component is visible
  useEffect(() => {
    const loadData = () => {
      const savedData = loadStep3FormData();
      if (savedData && savedData.invoiceType) {
        setInvoiceType(savedData.invoiceType);
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

  // Save to sessionStorage whenever invoice type changes
  useEffect(() => {
    const savedData = loadStep3FormData();
    const formData = {
      ...savedData,
      invoiceType,
    };
    saveStep3FormData(formData as any);
  }, [invoiceType]);

  const handleTypeChange = (type: 'private' | 'company') => {
    setInvoiceType(type);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Rezerwacja dla
      </h2>
      <section className="bg-white p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Private Person Option */}
          <button
            type="button"
            onClick={() => handleTypeChange('private')}
            className={`p-4 sm:p-6 border-2 transition-all text-left ${
              invoiceType === 'private'
                ? 'border-[#03adf0] bg-[#03adf0] text-white'
                : 'border-gray-300 bg-gray-100 text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
              <User className={`w-6 h-6 sm:w-8 sm:h-8 ${invoiceType === 'private' ? 'text-white' : 'text-[#03adf0]'}`} />
              <span className="text-base sm:text-lg font-semibold">
                Osoba prywatna
              </span>
            </div>
            <p className="text-xs sm:text-sm opacity-90">
              Rezerwacja dla osoby prywatnej
            </p>
          </button>

          {/* Company Option */}
          <button
            type="button"
            onClick={() => handleTypeChange('company')}
            className={`p-4 sm:p-6 border-2 transition-all text-left ${
              invoiceType === 'company'
                ? 'border-[#03adf0] bg-[#03adf0] text-white'
                : 'border-gray-300 bg-gray-100 text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
              <Building2 className={`w-6 h-6 sm:w-8 sm:h-8 ${invoiceType === 'company' ? 'text-white' : 'text-[#03adf0]'}`} />
              <span className="text-base sm:text-lg font-semibold">
                Firma
              </span>
            </div>
            <p className="text-xs sm:text-sm opacity-90">
              Rezerwacja dla firmy
            </p>
          </button>
        </div>
      </section>
    </div>
  );
}


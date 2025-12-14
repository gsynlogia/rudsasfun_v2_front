'use client';

import { User, MapPin, Copy } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

import { loadStep3FormData, saveStep3FormData, loadStep1FormData } from '@/utils/sessionStorage';

import DashedLine from '../DashedLine';

/**
 * PrivateInvoiceDataSection Component
 * Displays invoice data form for private person
 * Required fields: firstName, lastName, street, postalCode, city
 * Optional fields: email, phone
 */
export default function PrivateInvoiceDataSection() {
  // Private person fields - only required fields
  const [privateData, setPrivateData] = useState({
    firstName: '',
    lastName: '',
    email: '', // Optional
    phone: '', // Optional
    street: '',
    postalCode: '',
    city: '',
    nip: '', // Optional
  });

  // Validation errors
  const [privateErrors, setPrivateErrors] = useState<Record<string, string>>({});
  const validationAttemptedRef = useRef(false);

  // Load data from sessionStorage on mount
  useEffect(() => {
    const loadData = () => {
      const savedData = loadStep3FormData();
      if (savedData && savedData.privateData) {
        setPrivateData(prev => {
          // Only update if there's actual data in sessionStorage
          const hasData = Object.values(savedData.privateData!).some(val => val && val.trim() !== '');
          return hasData ? savedData.privateData! : prev;
        });
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

  // Save to sessionStorage whenever data changes
  useEffect(() => {
    const savedData = loadStep3FormData() || {} as any;
    const formData = {
      wantsInvoice: savedData.wantsInvoice ?? true,  // If invoice data is being filled, wantsInvoice should be true
      invoiceType: 'private',
      privateData,
      companyData: savedData.companyData || undefined,
      deliveryType: savedData.deliveryType || 'electronic',
      differentAddress: savedData.differentAddress || false,
      deliveryAddress: savedData.deliveryAddress || { street: '', postalCode: '', city: '' },
    };
    saveStep3FormData(formData as any);
  }, [privateData]);

  // Validate private person fields - only required fields
  const validatePrivate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!privateData.firstName || privateData.firstName.trim() === '') {
      errors.firstName = 'Pole obowiązkowe';
    }
    if (!privateData.lastName || privateData.lastName.trim() === '') {
      errors.lastName = 'Pole obowiązkowe';
    }
    if (!privateData.street || privateData.street.trim() === '') {
      errors.street = 'Pole obowiązkowe';
    }
    if (!privateData.postalCode || privateData.postalCode.trim() === '') {
      errors.postalCode = 'Pole obowiązkowe';
    }
    if (!privateData.city || privateData.city.trim() === '') {
      errors.city = 'Pole obowiązkowe';
    }

    // Optional fields - validate format if provided
    if (privateData.email && privateData.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privateData.email)) {
      errors.email = 'Nieprawidłowy adres e-mail';
    }

    setPrivateErrors(errors);
    return Object.keys(errors).length === 0;
  }, [privateData]);

  // Expose validation function for external use (e.g., Step3 validation)
  useEffect(() => {
    (window as any).validatePrivateInvoiceDataSection = () => {
      validationAttemptedRef.current = true;
      return validatePrivate();
    };

    return () => {
      delete (window as any).validatePrivateInvoiceDataSection;
    };
  }, [validatePrivate]);

  const updatePrivateField = (field: keyof typeof privateData, value: string) => {
    setPrivateData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (privateErrors[field]) {
      setPrivateErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Fill data from first guardian (button click)
  const fillFromFirstGuardian = () => {
    const step1Data = loadStep1FormData();
    if (step1Data && step1Data.parents && step1Data.parents.length > 0) {
      const firstParent = step1Data.parents[0];
      setPrivateData({
        firstName: firstParent.firstName || '',
        lastName: firstParent.lastName || '',
        email: firstParent.email || '', // Optional
        phone: firstParent.phone || '+48', // Optional
        street: firstParent.street || '',
        postalCode: firstParent.postalCode || '',
        city: firstParent.city || '',
        nip: '', // NIP is optional for private person
      });
      // Clear errors when filling
      setPrivateErrors({});
    }
  };

  // Check if first guardian data is available
  const canFillFromGuardian = () => {
    const step1Data = loadStep1FormData();
    return step1Data && step1Data.parents && step1Data.parents.length > 0 && step1Data.parents[0].firstName;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          Dane do faktury
        </h2>
        {canFillFromGuardian() && (
          <button
            type="button"
            onClick={fillFromFirstGuardian}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-[#03adf0] border border-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Wypełnij danymi pierwszego opiekuna</span>
            <span className="sm:hidden">Wypełnij</span>
          </button>
        )}
      </div>
      <section className="bg-white p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {/* First Name */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Imię <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
              <input
                type="text"
                value={privateData.firstName}
                onChange={(e) => updatePrivateField('firstName', e.target.value)}
                placeholder="Imię"
                className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                  privateErrors.firstName ? 'border-red-500' : 'border-gray-400'
                }`}
              />
            </div>
            {privateErrors.firstName && (
              <p className="text-xs text-red-500 mt-1">{privateErrors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Nazwisko <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
              <input
                type="text"
                value={privateData.lastName}
                onChange={(e) => updatePrivateField('lastName', e.target.value)}
                placeholder="Nazwisko"
                className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                  privateErrors.lastName ? 'border-red-500' : 'border-gray-400'
                }`}
              />
            </div>
            {privateErrors.lastName && (
              <p className="text-xs text-red-500 mt-1">{privateErrors.lastName}</p>
            )}
          </div>

          {/* Street */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Ulica i numer <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
              <input
                type="text"
                value={privateData.street}
                onChange={(e) => updatePrivateField('street', e.target.value)}
                placeholder="Ulica i numer"
                className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                  privateErrors.street ? 'border-red-500' : 'border-gray-400'
                }`}
              />
            </div>
            {privateErrors.street && (
              <p className="text-xs text-red-500 mt-1">{privateErrors.street}</p>
            )}
          </div>

          {/* Postal Code and City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Kod pocztowy <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                <input
                  type="text"
                  value={privateData.postalCode}
                  onChange={(e) => updatePrivateField('postalCode', e.target.value)}
                  placeholder="np. 00-000"
                  className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                    privateErrors.postalCode ? 'border-red-500' : 'border-gray-400'
                  }`}
                />
              </div>
              {privateErrors.postalCode && (
                <p className="text-xs text-red-500 mt-1">{privateErrors.postalCode}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Miejscowość <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                <input
                  type="text"
                  value={privateData.city}
                  onChange={(e) => updatePrivateField('city', e.target.value)}
                  placeholder="Miejscowość"
                  className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                    privateErrors.city ? 'border-red-500' : 'border-gray-400'
                  }`}
                />
              </div>
              {privateErrors.city && (
                <p className="text-xs text-red-500 mt-1">{privateErrors.city}</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

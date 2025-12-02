'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Building2, User, Mail, Phone, MapPin, FileText, Info, Download } from 'lucide-react';
import { loadStep3FormData, saveStep3FormData } from '@/utils/sessionStorage';
import DashedLine from '../DashedLine';

/**
 * InvoiceDataSection Component
 * Displays invoice data form (different fields for private person vs company)
 */
export default function InvoiceDataSection() {
  const [invoiceType, setInvoiceType] = useState<'private' | 'company'>('private');
  
  // Private person fields
  const [privateData, setPrivateData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    postalCode: '',
    city: '',
    nip: '',
  });

  // Company fields
  const [companyData, setCompanyData] = useState({
    companyName: '',
    nip: '',
    street: '',
    postalCode: '',
    city: '',
  });

  // Validation errors
  const [privateErrors, setPrivateErrors] = useState<Record<string, string>>({});
  const [companyErrors, setCompanyErrors] = useState<Record<string, string>>({});
  const validationAttemptedRef = useRef(false);

  // Load data from sessionStorage on mount and whenever component is visible
  useEffect(() => {
    const loadData = () => {
      const savedData = loadStep3FormData();
      if (savedData) {
        // Always load invoice type from sessionStorage
        if (savedData.invoiceType) {
          setInvoiceType(savedData.invoiceType);
        }
        // Load private data if it exists
        if (savedData.privateData) {
          setPrivateData(prev => {
            // Only update if there's actual data in sessionStorage
            const hasData = Object.values(savedData.privateData).some(val => val && val.trim() !== '');
            return hasData ? savedData.privateData : prev;
          });
        }
        // Load company data if it exists
        if (savedData.companyData) {
          setCompanyData(prev => {
            // Only update if there's actual data in sessionStorage
            const hasData = Object.values(savedData.companyData).some(val => val && val.trim() !== '');
            return hasData ? savedData.companyData : prev;
          });
        }
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

  // Update invoice type when it changes (from InvoiceTypeSection via sessionStorage)
  // Check periodically for changes from other components
  useEffect(() => {
    const checkInvoiceType = () => {
      const savedData = loadStep3FormData();
      if (savedData && savedData.invoiceType && savedData.invoiceType !== invoiceType) {
        setInvoiceType(savedData.invoiceType);
      }
    };

    // Check periodically for changes
    const interval = setInterval(checkInvoiceType, 500);

    return () => clearInterval(interval);
  }, [invoiceType]);

  // Save to sessionStorage whenever data changes
  useEffect(() => {
    const savedData = loadStep3FormData() || {} as any;
    const formData = {
      invoiceType,
      privateData: invoiceType === 'private' ? privateData : (savedData.privateData || privateData),
      companyData: invoiceType === 'company' ? companyData : (savedData.companyData || companyData),
      deliveryType: savedData.deliveryType || 'electronic',
      differentAddress: savedData.differentAddress || false,
      deliveryAddress: savedData.deliveryAddress || { street: '', postalCode: '', city: '' },
    };
    saveStep3FormData(formData as any);
  }, [invoiceType, privateData, companyData]);

  // Validate private person fields
  const validatePrivate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!privateData.firstName || privateData.firstName.trim() === '') {
      errors.firstName = 'Pole obowiązkowe';
    }
    if (!privateData.lastName || privateData.lastName.trim() === '') {
      errors.lastName = 'Pole obowiązkowe';
    }
    if (!privateData.email || privateData.email.trim() === '') {
      errors.email = 'Pole obowiązkowe';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privateData.email)) {
      errors.email = 'Nieprawidłowy adres e-mail';
    }
    if (!privateData.phone || privateData.phone.trim() === '') {
      errors.phone = 'Pole obowiązkowe';
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

    setPrivateErrors(errors);
    return Object.keys(errors).length === 0;
  }, [privateData]);

  // Validate company fields
  const validateCompany = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!companyData.companyName || companyData.companyName.trim() === '') {
      errors.companyName = 'Pole obowiązkowe';
    }
    if (!companyData.nip || companyData.nip.trim() === '') {
      errors.nip = 'Pole obowiązkowe';
    }
    if (!companyData.street || companyData.street.trim() === '') {
      errors.street = 'Pole obowiązkowe';
    }
    if (!companyData.postalCode || companyData.postalCode.trim() === '') {
      errors.postalCode = 'Pole obowiązkowe';
    }
    if (!companyData.city || companyData.city.trim() === '') {
      errors.city = 'Pole obowiązkowe';
    }

    setCompanyErrors(errors);
    return Object.keys(errors).length === 0;
  }, [companyData]);

  // Combined validation
  const validateInvoiceData = useCallback((): boolean => {
    if (invoiceType === 'private') {
      return validatePrivate();
    } else {
      return validateCompany();
    }
  }, [invoiceType, validatePrivate, validateCompany]);

  // Expose validation function for external use (e.g., Step3 validation)
  useEffect(() => {
    (window as any).validateInvoiceDataSection = () => {
      validationAttemptedRef.current = true;
      return validateInvoiceData();
    };

    return () => {
      delete (window as any).validateInvoiceDataSection;
    };
  }, [validateInvoiceData]);

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

  const updateCompanyField = (field: keyof typeof companyData, value: string) => {
    setCompanyData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (companyErrors[field]) {
      setCompanyErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
        Dane do faktury
      </h2>
      <section className="bg-white p-4 sm:p-6">
        {/* Information block with regulation button */}
        <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg mb-4 sm:mb-6">
          <Info className="w-5 h-5 text-[#03adf0] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs sm:text-sm text-gray-600 mb-2">
              Radsas Fun wystawia FV marża po pełnej wpłacie
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              Aby dowiedzieć się więcej, pobierz regulamin wystawiania faktur.
            </p>
            <button className="flex items-center gap-2 px-4 sm:px-6 py-2 border-2 border-[#03adf0] text-[#03adf0] hover:bg-[#03adf0] hover:text-white transition-colors text-xs sm:text-sm font-medium">
              <Download className="w-4 h-4" />
              Regulamin Faktury VAT
            </button>
          </div>
        </div>

        <DashedLine />

        {invoiceType === 'private' ? (
          // Private Person Form
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Adres e-mail <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                <input
                  type="email"
                  value={privateData.email}
                  onChange={(e) => updatePrivateField('email', e.target.value)}
                  placeholder="Adres e-mail"
                  className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                    privateErrors.email ? 'border-red-500' : 'border-gray-400'
                  }`}
                />
              </div>
              {privateErrors.email && (
                <p className="text-xs text-red-500 mt-1">{privateErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Numer telefonu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                <input
                  type="tel"
                  value={privateData.phone}
                  onChange={(e) => updatePrivateField('phone', e.target.value)}
                  placeholder="+48"
                  className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                    privateErrors.phone ? 'border-red-500' : 'border-gray-400'
                  }`}
                />
              </div>
              {privateErrors.phone && (
                <p className="text-xs text-red-500 mt-1">{privateErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Ulica i numer budynku/mieszkania <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                <input
                  type="text"
                  value={privateData.street}
                  onChange={(e) => updatePrivateField('street', e.target.value)}
                  placeholder="Ulica i numer budynku/mieszkania"
                  className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                    privateErrors.street ? 'border-red-500' : 'border-gray-400'
                  }`}
                />
              </div>
              {privateErrors.street && (
                <p className="text-xs text-red-500 mt-1">{privateErrors.street}</p>
              )}
            </div>

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

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                NIP (opcjonalnie)
              </label>
              <div className="relative">
                <FileText className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                <input
                  type="text"
                  value={privateData.nip}
                  onChange={(e) => updatePrivateField('nip', e.target.value)}
                  placeholder="NIP"
                  className="w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                />
              </div>
            </div>
          </div>
        ) : (
          // Company Form
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Nazwa firmy <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                <input
                  type="text"
                  value={companyData.companyName}
                  onChange={(e) => updateCompanyField('companyName', e.target.value)}
                  placeholder="Nazwa firmy"
                  className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                    companyErrors.companyName ? 'border-red-500' : 'border-gray-400'
                  }`}
                />
              </div>
              {companyErrors.companyName && (
                <p className="text-xs text-red-500 mt-1">{companyErrors.companyName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                NIP <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                <input
                  type="text"
                  value={companyData.nip}
                  onChange={(e) => updateCompanyField('nip', e.target.value)}
                  placeholder="NIP"
                  className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                    companyErrors.nip ? 'border-red-500' : 'border-gray-400'
                  }`}
                />
              </div>
              {companyErrors.nip && (
                <p className="text-xs text-red-500 mt-1">{companyErrors.nip}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Ulica i numer budynku/mieszkania <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                <input
                  type="text"
                  value={companyData.street}
                  onChange={(e) => updateCompanyField('street', e.target.value)}
                  placeholder="Ulica i numer budynku/mieszkania"
                  className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                    companyErrors.street ? 'border-red-500' : 'border-gray-400'
                  }`}
                />
              </div>
              {companyErrors.street && (
                <p className="text-xs text-red-500 mt-1">{companyErrors.street}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Kod pocztowy <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#03adf0]" />
                  <input
                    type="text"
                    value={companyData.postalCode}
                    onChange={(e) => updateCompanyField('postalCode', e.target.value)}
                    placeholder="np. 00-000"
                    className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                      companyErrors.postalCode ? 'border-red-500' : 'border-gray-400'
                    }`}
                  />
                </div>
                {companyErrors.postalCode && (
                  <p className="text-xs text-red-500 mt-1">{companyErrors.postalCode}</p>
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
                    value={companyData.city}
                    onChange={(e) => updateCompanyField('city', e.target.value)}
                    placeholder="Miejscowość"
                    className={`w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0] ${
                      companyErrors.city ? 'border-red-500' : 'border-gray-400'
                    }`}
                  />
                </div>
                {companyErrors.city && (
                  <p className="text-xs text-red-500 mt-1">{companyErrors.city}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}


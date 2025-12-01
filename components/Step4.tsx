'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import DashedLine from './DashedLine';
import type { StepComponentProps } from '@/types/reservation';
import { saveStep4FormData, loadStep4FormData, type Step4FormData } from '@/utils/sessionStorage';

/**
 * Step4 Component - Consents and Regulations
 * Contains: Consent checkboxes and downloadable documents
 */
export default function Step4({ onNext, onPrevious, disabled = false }: StepComponentProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Initialize state from sessionStorage or defaults
  const getInitialState = (): Step4FormData => {
    const savedData = loadStep4FormData();
    if (savedData) {
      return savedData;
    }
    return {
      selectAllConsents: false,
      consent1: false,
      consent2: false,
      consent3: false,
      consent4: false,
    };
  };

  const [formData, setFormData] = useState<Step4FormData>(getInitialState);
  const [validationError, setValidationError] = useState<string>('');
  const validationAttemptedRef = useRef(false);

  // Load data from sessionStorage on mount
  useEffect(() => {
    const savedData = loadStep4FormData();
    if (savedData) {
      setFormData(savedData);
    }
  }, []);

  // Validate consents - check if all are checked
  const validateConsents = (): boolean => {
    return formData.consent1 && formData.consent2 && formData.consent3 && formData.consent4;
  };

  // Monitor pathname changes - if user navigates to step 5 without validation, redirect back
  useEffect(() => {
    if (pathname.includes('/step/5')) {
      if (!validateConsents()) {
        setValidationError('Wszystkie zgody są wymagane. Proszę zaznaczyć wszystkie pola przed przejściem do następnego kroku.');
        validationAttemptedRef.current = true;
        // Redirect back to step 4
        const pathParts = pathname.split('/').filter(Boolean);
        const campIdIndex = pathParts.indexOf('camps');
        if (campIdIndex !== -1 && campIdIndex + 1 < pathParts.length) {
          const campId = pathParts[campIdIndex + 1];
          const editionId = pathParts[campIdIndex + 3];
          router.replace(`/camps/${campId}/edition/${editionId}/step/4`);
        }
      }
    }
  }, [pathname, formData, router]);

  // Update selectAllConsents when individual consents change
  useEffect(() => {
    const allChecked = formData.consent1 && formData.consent2 && formData.consent3 && formData.consent4;
    if (formData.selectAllConsents !== allChecked) {
      setFormData(prev => ({ ...prev, selectAllConsents: allChecked }));
    }
  }, [formData.consent1, formData.consent2, formData.consent3, formData.consent4]);

  // Save data to sessionStorage whenever formData changes
  useEffect(() => {
    saveStep4FormData(formData);
  }, [formData]);

  // Handle select all consents checkbox
  const handleSelectAll = (checked: boolean) => {
    setFormData({
      selectAllConsents: checked,
      consent1: checked,
      consent2: checked,
      consent3: checked,
      consent4: checked,
    });
    setValidationError('');
  };

  // Handle individual consent checkbox
  const handleConsentChange = (consentKey: keyof Step4FormData, checked: boolean) => {
    setFormData(prev => ({ ...prev, [consentKey]: checked }));
    setValidationError('');
  };

  // Clear validation error when all consents are checked
  useEffect(() => {
    if (validateConsents() && validationError) {
      setValidationError('');
      validationAttemptedRef.current = false;
    }
  }, [formData.consent1, formData.consent2, formData.consent3, formData.consent4]);

  // Expose validation function for external use (e.g., NavigationButtons)
  useEffect(() => {
    // Store validation function in window for LayoutClient to access if needed
    (window as any).validateStep4 = () => {
      const isValid = validateConsents();
      if (!isValid) {
        setValidationError('Wszystkie zgody są wymagane. Proszę zaznaczyć wszystkie pola przed przejściem do następnego kroku.');
        validationAttemptedRef.current = true;
      }
      return isValid;
    };

    return () => {
      delete (window as any).validateStep4;
    };
  }, [formData]);

  // Handle document download
  const handleDocumentDownload = (documentName: string) => {
    // For now, we'll use placeholder links
    // In production, these should point to actual document files
    const documentLinks: Record<string, string> = {
      'Regulamin portalu Radsas Fun': '#',
      'Polityka prywatności': '#',
      'Szczegółowy regulamin Imprez turystycznych oraz warunki uczestnictwa w imprezach turystycznych RADSAS FUN': '#',
      'Regulamin Usług Turystycznych i Ubezpieczeń': '#',
      'Przykładowy regulamin': '#',
    };

    const link = documentLinks[documentName];
    if (link && link !== '#') {
      window.open(link, '_blank');
    } else {
      // Placeholder - in production, this should download actual file
      console.log(`Downloading: ${documentName}`);
    }
  };

  const documents = [
    'Regulamin portalu Radsas Fun',
    'Polityka prywatności',
    'Szczegółowy regulamin Imprez turystycznych oraz warunki uczestnictwa w imprezach turystycznych RADSAS FUN',
    'Regulamin Usług Turystycznych i Ubezpieczeń',
    'Przykładowy regulamin',
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Zgody i regulaminy
        </h2>
        <section className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
          {/* Select All Consents */}
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 pl-0">
            <input
              type="checkbox"
              id="selectAllConsents"
              checked={formData.selectAllConsents}
              onChange={(e) => handleSelectAll(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex-shrink-0"
            />
            <label
              htmlFor="selectAllConsents"
              className="text-sm sm:text-base font-semibold text-gray-900 cursor-pointer"
            >
              Zaznacz wszystkie zgody
            </label>
          </div>

          {/* Individual Consents */}
          <div className="space-y-3 sm:space-y-4 pl-4 sm:pl-6 md:pl-8">
            {/* Consent 1 */}
            <div className="flex items-start gap-2 sm:gap-3">
              <input
                type="checkbox"
                id="consent1"
                checked={formData.consent1}
                onChange={(e) => handleConsentChange('consent1', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 flex-shrink-0"
              />
              <label
                htmlFor="consent1"
                className="text-xs sm:text-sm text-gray-700 cursor-pointer flex-1 leading-relaxed"
              >
                Zapoznałem się z{' '}
                <a
                  href="#"
                  className="text-[#03adf0] underline hover:text-[#0288c7] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDocumentDownload('Regulamin portalu Radsas Fun');
                  }}
                >
                  Regulaminem portalu
                </a>{' '}
                oraz{' '}
                <a
                  href="#"
                  className="text-[#03adf0] underline hover:text-[#0288c7] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDocumentDownload('Polityka prywatności');
                  }}
                >
                  Polityką prywatności
                </a>{' '}
                i akceptuję ich postanowienia.
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            {/* Consent 2 */}
            <div className="flex items-start gap-2 sm:gap-3">
              <input
                type="checkbox"
                id="consent2"
                checked={formData.consent2}
                onChange={(e) => handleConsentChange('consent2', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 flex-shrink-0"
              />
              <label
                htmlFor="consent2"
                className="text-xs sm:text-sm text-gray-700 cursor-pointer flex-1 leading-relaxed"
              >
                Zapoznałem się z{' '}
                <a
                  href="#"
                  className="text-[#03adf0] underline hover:text-[#0288c7] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDocumentDownload('Szczegółowy regulamin Imprez turystycznych oraz warunki uczestnictwa w imprezach turystycznych RADSAS FUN');
                  }}
                >
                  Warunkami uczestnictwa
                </a>{' '}
                i akceptuję ich postanowienia.
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            {/* Consent 3 */}
            <div className="flex items-start gap-2 sm:gap-3">
              <input
                type="checkbox"
                id="consent3"
                checked={formData.consent3}
                onChange={(e) => handleConsentChange('consent3', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 flex-shrink-0"
              />
              <label
                htmlFor="consent3"
                className="text-xs sm:text-sm text-gray-700 cursor-pointer flex-1 leading-relaxed"
              >
                Zgoda na zdjęcia i ich udostępnianie - obecne i dodawane zgody do opracowania przez Zamawiającego.
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            {/* Consent 4 */}
            <div className="flex items-start gap-2 sm:gap-3">
              <input
                type="checkbox"
                id="consent4"
                checked={formData.consent4}
                onChange={(e) => handleConsentChange('consent4', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 flex-shrink-0"
              />
              <label
                htmlFor="consent4"
                className="text-xs sm:text-sm text-gray-700 cursor-pointer flex-1 leading-relaxed"
              >
                Radsas Fun w ramach ceny odprowadza składkę w kwocie 2,00 PLN na rzecz Turystycznego Funduszu Gwarancyjnego oraz 2 PLN na rzecz Ubezpieczeniowego Funduszu Gwarancyjnego zgodnie z ustawą.
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
          )}

          {/* Separator Line */}
          <div className="mt-6 sm:mt-8 mb-6 sm:mb-8">
            <DashedLine />
          </div>

          {/* Documents Section */}
          <div>
            {/* Documents Header */}
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 pl-0">
              <svg
                className="w-5 h-5 text-gray-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 16v-4M12 8h.01"
                />
              </svg>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Dokumenty do pobrania
              </h3>
            </div>

            {/* Documents List */}
            <div className="space-y-0 pl-4 sm:pl-6 md:pl-8">
              {documents.map((docName, index) => (
                <div key={index}>
                  <div
                    className="flex items-center justify-between py-3 sm:py-4 px-0 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleDocumentDownload(docName)}
                  >
                    <span className="text-xs sm:text-sm text-gray-700 flex-1">
                      {docName}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDocumentDownload(docName);
                      }}
                      className="ml-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#EAF6FE] hover:bg-[#D0ECFD] flex items-center justify-center transition-colors flex-shrink-0"
                      aria-label={`Pobierz ${docName}`}
                    >
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </button>
                  </div>
                  {index < documents.length - 1 && (
                    <hr className="border-gray-200" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

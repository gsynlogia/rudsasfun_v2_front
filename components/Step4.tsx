'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { ContractForm } from '@/components/profile/ContractForm';
import type { StepComponentProps } from '@/types/reservation';
import { buildContractFormDataFromSteps } from '@/lib/buildContractPreviewFromSteps';
import { API_BASE_URL } from '@/utils/api-config';
import { saveStep4FormData, loadStep4FormData, loadStep1FormData, loadStep2FormData, loadStep3FormData, loadReservationState, type Step4FormData } from '@/utils/sessionStorage';

import DashedLine from './DashedLine';

/**
 * Step4 Component - Consents and Regulations
 * Contains: Consent checkboxes and downloadable documents
 */
export default function Step4({ onNext: _onNext, onPrevious: _onPrevious, disabled = false }: StepComponentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const safePathname = pathname || '';

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
  const [consentErrors, setConsentErrors] = useState<Record<string, string>>({});
  const validationAttemptedRef = useRef(false);
  const [documents, setDocuments] = useState<Map<string, { display_name: string; file_url: string }>>(new Map());

  // Fetch public documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/documents/public`);
        if (!response.ok) return;
        const data = await response.json();
        const docsMap = new Map<string, { display_name: string; file_url: string }>();
        (data.documents || []).forEach((doc: { name: string; display_name: string; file_url: string | null }) => {
          if (doc.file_url) {
            docsMap.set(doc.name, { display_name: doc.display_name, file_url: doc.file_url });
          }
        });
        setDocuments(docsMap);
      } catch (err) {
        console.error('[Step4] Error fetching documents:', err);
      }
    };
    fetchDocuments();
  }, []);

  // Load data from sessionStorage on mount
  useEffect(() => {
    const savedData = loadStep4FormData();
    if (savedData) {
      // Ensure all fields are defined to avoid controlled/uncontrolled input warning
      setFormData({
        selectAllConsents: savedData.selectAllConsents ?? false,
        consent1: savedData.consent1 ?? false,
        consent2: savedData.consent2 ?? false,
        consent3: savedData.consent3 ?? false,
        consent4: savedData.consent4 ?? false,
      });
    }
  }, []);

  // Validate consents - check if all are checked
  const validateConsents = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.consent1) {
      errors.consent1 = 'Pole obowiązkowe';
    }
    if (!formData.consent2) {
      errors.consent2 = 'Pole obowiązkowe';
    }
    if (!formData.consent3) {
      errors.consent3 = 'Pole obowiązkowe';
    }
    if (!formData.consent4) {
      errors.consent4 = 'Pole obowiązkowe';
    }

    setConsentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Monitor pathname changes - if user navigates to step 5 without validation, redirect back
  useEffect(() => {
    if (safePathname.includes('/step/5')) {
      if (!validateConsents()) {
        setValidationError('Wszystkie zgody są wymagane. Proszę zaznaczyć wszystkie pola przed przejściem do następnego kroku.');
        validationAttemptedRef.current = true;
        // Redirect back to step 4
        const pathParts = safePathname.split('/').filter(Boolean);
        const campIdIndex = pathParts.indexOf('camps');
        if (campIdIndex !== -1 && campIdIndex + 1 < pathParts.length) {
          const campId = pathParts[campIdIndex + 1];
          const editionId = pathParts[campIdIndex + 3];
          router.replace(`/camps/${campId}/edition/${editionId}/step/4`);
        }
      }
    }
  }, [safePathname, formData, router]);

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
    // Clear all errors when all are selected
    if (checked) {
      setConsentErrors({});
    }
  };

  // Handle individual consent checkbox
  const handleConsentChange = (consentKey: keyof Step4FormData, checked: boolean) => {
    setFormData(prev => ({ ...prev, [consentKey]: checked }));
    setValidationError('');
    // Clear error for this consent when checked
    if (checked && consentErrors[consentKey]) {
      setConsentErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[consentKey];
        return newErrors;
      });
    }
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
    const doc = documents.get(documentName);
    if (doc && doc.file_url) {
      window.open(doc.file_url, '_blank');
    }
  };

  // Get document URL by name or by display name (for backward compatibility)
  const getDocumentUrl = (documentNameOrDisplayName: string): string | null => {
    // First try exact name match
    const docByName = documents.get(documentNameOrDisplayName);
    if (docByName) {
      return docByName.file_url;
    }

    // Then try to find by display name (case-insensitive, partial match)
    for (const [_name, doc] of documents.entries()) {
      if (doc.display_name.toLowerCase().includes(documentNameOrDisplayName.toLowerCase()) ||
          documentNameOrDisplayName.toLowerCase().includes(doc.display_name.toLowerCase())) {
        return doc.file_url;
      }
    }

    return null;
  };

  // Get document by name or display name
  const getDocument = (documentNameOrDisplayName: string): { name: string; display_name: string; file_url: string } | null => {
    // First try exact name match
    const docByName = documents.get(documentNameOrDisplayName);
    if (docByName) {
      return { name: documentNameOrDisplayName, ...docByName };
    }

    // Then try to find by display name (case-insensitive, partial match)
    for (const [name, doc] of documents.entries()) {
      if (doc.display_name.toLowerCase().includes(documentNameOrDisplayName.toLowerCase()) ||
          documentNameOrDisplayName.toLowerCase().includes(doc.display_name.toLowerCase())) {
        return { name, ...doc };
      }
    }

    return null;
  };

  // Get list of documents to display (all public documents from API)
  const getDocumentsList = () => {
    return Array.from(documents.entries())
      .filter(([_name, doc]) => doc.file_url) // Only documents with files
      .map(([name, doc]) => ({
        name,
        display_name: doc.display_name,
        file_url: doc.file_url,
      }));
  };

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
              checked={formData.selectAllConsents ?? false}
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
                className={`w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 flex-shrink-0 ${
                  consentErrors.consent1 ? 'border-red-500' : 'border-gray-400'
                }`}
              />
              <div className="flex-1">
                <label
                  htmlFor="consent1"
                  className={`text-xs sm:text-sm cursor-pointer flex-1 leading-relaxed ${
                    consentErrors.consent1 ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  Zapoznałem się z{' '}
                  {getDocumentUrl('Regulamin portalu') || getDocumentUrl('portal_regulation') ? (
                    <a
                      href="#"
                      className="text-[#03adf0] underline hover:text-[#0288c7] transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        const doc = getDocument('Regulamin portalu') || getDocument('portal_regulation');
                        if (doc) handleDocumentDownload(doc.name);
                      }}
                    >
                      Regulaminem portalu
                    </a>
                  ) : (
                    <span className="text-gray-500">Regulaminem portalu</span>
                  )}{' '}
                  oraz{' '}
                  {getDocumentUrl('Polityka prywatności') || getDocumentUrl('privacy_policy') ? (
                    <a
                      href="#"
                      className="text-[#03adf0] underline hover:text-[#0288c7] transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        const doc = getDocument('Polityka prywatności') || getDocument('privacy_policy');
                        if (doc) handleDocumentDownload(doc.name);
                      }}
                    >
                      Polityką prywatności
                    </a>
                  ) : (
                    <span className="text-gray-500">Polityką prywatności</span>
                  )}{' '}
                  i akceptuję ich postanowienia.
                  <span className="text-red-500 ml-1">*</span>
                </label>
                {consentErrors.consent1 && (
                  <p className="text-xs text-red-500 mt-1">{consentErrors.consent1}</p>
                )}
              </div>
            </div>

            {/* Consent 2 */}
            <div className="flex items-start gap-2 sm:gap-3">
              <input
                type="checkbox"
                id="consent2"
                checked={formData.consent2}
                onChange={(e) => handleConsentChange('consent2', e.target.checked)}
                disabled={disabled}
                className={`w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 flex-shrink-0 ${
                  consentErrors.consent2 ? 'border-red-500' : 'border-gray-400'
                }`}
              />
              <div className="flex-1">
                <label
                  htmlFor="consent2"
                  className={`text-xs sm:text-sm cursor-pointer flex-1 leading-relaxed ${
                    consentErrors.consent2 ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  Zapoznałem się z{' '}
                  {getDocumentUrl('Warunki uczestnictwa') || getDocumentUrl('tourist_events_regulations') ? (
                    <a
                      href="#"
                      className="text-[#03adf0] underline hover:text-[#0288c7] transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        const doc = getDocument('Warunki uczestnictwa') || getDocument('tourist_events_regulations');
                        if (doc) handleDocumentDownload(doc.name);
                      }}
                    >
                      Warunkami uczestnictwa
                    </a>
                  ) : (
                    <span className="text-gray-500">Warunkami uczestnictwa</span>
                  )}{' '}
                  i akceptuję ich postanowienia.
                  <span className="text-red-500 ml-1">*</span>
                </label>
                {consentErrors.consent2 && (
                  <p className="text-xs text-red-500 mt-1">{consentErrors.consent2}</p>
                )}
              </div>
            </div>

            {/* Consent 3 */}
            <div className="flex items-start gap-2 sm:gap-3">
              <input
                type="checkbox"
                id="consent3"
                checked={formData.consent3}
                onChange={(e) => handleConsentChange('consent3', e.target.checked)}
                disabled={disabled}
                className={`w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 flex-shrink-0 ${
                  consentErrors.consent3 ? 'border-red-500' : 'border-gray-400'
                }`}
              />
              <div className="flex-1">
                <label
                  htmlFor="consent3"
                  className={`text-xs sm:text-sm cursor-pointer flex-1 leading-relaxed ${
                    consentErrors.consent3 ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  Zgoda na zdjęcia i ich udostępnianie - obecne i dodawane zgody do opracowania przez Zamawiającego.
                  <span className="text-red-500 ml-1">*</span>
                </label>
                {consentErrors.consent3 && (
                  <p className="text-xs text-red-500 mt-1">{consentErrors.consent3}</p>
                )}
              </div>
            </div>

            {/* Consent 4 */}
            <div className="flex items-start gap-2 sm:gap-3">
              <input
                type="checkbox"
                id="consent4"
                checked={formData.consent4}
                onChange={(e) => handleConsentChange('consent4', e.target.checked)}
                disabled={disabled}
                className={`w-4 h-4 sm:w-5 sm:h-5 text-[#03adf0] focus:ring-[#03adf0] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 flex-shrink-0 ${
                  consentErrors.consent4 ? 'border-red-500' : 'border-gray-400'
                }`}
              />
              <div className="flex-1">
                <label
                  htmlFor="consent4"
                  className={`text-xs sm:text-sm cursor-pointer flex-1 leading-relaxed ${
                    consentErrors.consent4 ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  Radsas Fun w ramach ceny odprowadza składkę w kwocie 2,00 PLN na rzecz Turystycznego Funduszu Gwarancyjnego oraz 2 PLN na rzecz Ubezpieczeniowego Funduszu Gwarancyjnego zgodnie z ustawą.
                  <span className="text-red-500 ml-1">*</span>
                </label>
                {consentErrors.consent4 && (
                  <p className="text-xs text-red-500 mt-1">{consentErrors.consent4}</p>
                )}
              </div>
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
            <div className="mb-4 sm:mb-6 pl-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Dokumenty do pobrania
              </h3>
            </div>

            {/* Documents List */}
            <div className="space-y-0 pl-4 sm:pl-6 md:pl-8">
              {getDocumentsList().length > 0 ? (
                getDocumentsList().map((doc, index) => {
                  // Skip "Regulamin wejścia Watt" if exists
                  if (doc.name === 'watt_input_regulation' || doc.display_name.toLowerCase().includes('watt')) {
                    return null;
                  }
                  return (
                    <div key={doc.name}>
                      <div
                        className="flex items-center justify-between py-3 sm:py-4 px-0 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleDocumentDownload(doc.name)}
                      >
                        <span className="text-xs sm:text-sm text-gray-700 flex-1 font-bold">
                          {doc.display_name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDocumentDownload(doc.name);
                          }}
                          className="ml-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#EAF6FE] hover:bg-[#D0ECFD] flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                          aria-label={`Pobierz ${doc.display_name}`}
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
                      {index < getDocumentsList().length - 1 && (
                        <svg className="w-full h-2" xmlns="http://www.w3.org/2000/svg">
                          <line x1="0" y1="1" x2="100%" y2="1" stroke="#d1d5db" strokeWidth="1" strokeDasharray="16 4"></line>
                        </svg>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs sm:text-sm text-gray-500 py-3 sm:py-4">
                  Brak dokumentów do pobrania
                </p>
              )}
            </div>
          </div>

          {/* Podgląd umowy – dane z kroków 1–3 (bez zapisu do bazy) */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              Podgląd umowy
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-3">
              Poniżej widzisz treść umowy na podstawie danych z poprzednich kroków. Numer rezerwacji zostanie nadany po kliknięciu „Potwierdzam i zamawiam”.
            </p>
            <div className="max-h-[70vh] overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 p-4">
              <ContractForm
                reservationData={buildContractFormDataFromSteps(
                  loadStep1FormData(),
                  loadStep2FormData(),
                  loadStep3FormData(),
                  loadReservationState(),
                )}
                previewOnly
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
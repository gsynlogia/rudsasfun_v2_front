'use client';

import { useState, useEffect, useRef } from 'react';

import { API_BASE_URL } from '@/utils/api-config';

interface EditReservationStep4Props {
  data: {
    consent1?: boolean | null;
    consent2?: boolean | null;
    consent3?: boolean | null;
    consent4?: boolean | null;
  };
  onChange: (data: any) => void;
}

interface Document {
  name: string;
  display_name: string;
  file_url: string;
}

export default function EditReservationStep4({ data, onChange }: EditReservationStep4Props) {
  const [consents, setConsents] = useState({
    consent1: data.consent1 ?? false,
    consent2: data.consent2 ?? false,
    consent3: data.consent3 ?? false,
    consent4: data.consent4 ?? false,
  });
  const [selectAllConsents, setSelectAllConsents] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Fetch documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/documents/public`);
        if (response.ok) {
          const data = await response.json();
          setDocuments((data.documents || []).filter((doc: any) => doc.file_url));
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
      }
    };
    fetchDocuments();
  }, []);

  // Update selectAllConsents when individual consents change
  useEffect(() => {
    const allChecked = consents.consent1 && consents.consent2 && consents.consent3 && consents.consent4;
    setSelectAllConsents(allChecked);
  }, [consents]);

  // Notify parent of changes - use useRef to track previous values and only call onChange when actually changed
  const prevDataRef = useRef<any>(null);

  useEffect(() => {
    const newData = {
      consent1: consents.consent1,
      consent2: consents.consent2,
      consent3: consents.consent3,
      consent4: consents.consent4,
    };

    // Only call onChange if data actually changed
    if (JSON.stringify(prevDataRef.current) !== JSON.stringify(newData)) {
      prevDataRef.current = newData;
      onChange(newData);
    }
  }, [consents, onChange]);

  const handleSelectAll = (checked: boolean) => {
    setConsents({
      consent1: checked,
      consent2: checked,
      consent3: checked,
      consent4: checked,
    });
  };

  const handleDocumentDownload = (docName: string) => {
    const doc = documents.find(d => d.name === docName || d.display_name.toLowerCase().includes(docName.toLowerCase()));
    if (doc && doc.file_url) {
      window.open(doc.file_url, '_blank');
    }
  };

  const getDocumentUrl = (documentName: string): string | null => {
    const doc = documents.find(d =>
      d.name === documentName ||
      d.display_name.toLowerCase().includes(documentName.toLowerCase()),
    );
    return doc?.file_url || null;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Krok 4: Zgody i regulaminy</h2>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Select All */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="selectAllConsents"
            checked={selectAllConsents}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="selectAllConsents" className="text-sm font-semibold text-gray-900 cursor-pointer">
            Zaznacz wszystkie zgody
          </label>
        </div>

        {/* Individual Consents */}
        <div className="space-y-4">
          {/* Consent 1 */}
          <div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consents.consent1}
                onChange={(e) => setConsents({ ...consents, consent1: e.target.checked })}
                className="w-4 h-4 mt-1 flex-shrink-0"
              />
              <span className="text-sm text-gray-700">
                Zapoznałem się z{' '}
                {getDocumentUrl('Regulamin portalu') ? (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDocumentDownload('Regulamin portalu');
                    }}
                    className="text-[#03adf0] underline hover:text-[#0288c7]"
                  >
                    Regulaminem portalu
                  </a>
                ) : (
                  <span className="text-gray-500">Regulaminem portalu</span>
                )}{' '}
                oraz{' '}
                {getDocumentUrl('Polityka prywatności') ? (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDocumentDownload('Polityka prywatności');
                    }}
                    className="text-[#03adf0] underline hover:text-[#0288c7]"
                  >
                    Polityką prywatności
                  </a>
                ) : (
                  <span className="text-gray-500">Polityką prywatności</span>
                )}{' '}
                i akceptuję ich postanowienia. *
              </span>
            </label>
          </div>

          {/* Consent 2 */}
          <div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consents.consent2}
                onChange={(e) => setConsents({ ...consents, consent2: e.target.checked })}
                className="w-4 h-4 mt-1 flex-shrink-0"
              />
              <span className="text-sm text-gray-700">
                Zapoznałem się z{' '}
                {getDocumentUrl('Warunki uczestnictwa') ? (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDocumentDownload('Warunki uczestnictwa');
                    }}
                    className="text-[#03adf0] underline hover:text-[#0288c7]"
                  >
                    Warunkami uczestnictwa
                  </a>
                ) : (
                  <span className="text-gray-500">Warunkami uczestnictwa</span>
                )}{' '}
                i akceptuję je. *
              </span>
            </label>
          </div>

          {/* Consent 3 */}
          <div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consents.consent3}
                onChange={(e) => setConsents({ ...consents, consent3: e.target.checked })}
                className="w-4 h-4 mt-1 flex-shrink-0"
              />
              <span className="text-sm text-gray-700">
                Wyrażam zgodę na wykonywanie i udostępnianie zdjęć oraz filmów z udziałem uczestnika. *
              </span>
            </label>
          </div>

          {/* Consent 4 */}
          <div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consents.consent4}
                onChange={(e) => setConsents({ ...consents, consent4: e.target.checked })}
                className="w-4 h-4 mt-1 flex-shrink-0"
              />
              <span className="text-sm text-gray-700">
                Zapoznałem się z informacją o składkach na fundusze gwarancyjne i akceptuję je. *
              </span>
            </label>
          </div>
        </div>

        {/* Documents to download */}
        {documents.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Dokumenty do pobrania</h3>
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <div key={doc.name}>
                  <div
                    className="flex items-center justify-between py-3 px-0 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleDocumentDownload(doc.name)}
                  >
                    <span className="text-sm font-bold text-gray-700 flex-1">
                      {doc.display_name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDocumentDownload(doc.name);
                      }}
                      className="ml-4 w-8 h-8 rounded-full bg-[#EAF6FE] hover:bg-[#D0ECFD] flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                      aria-label={`Pobierz ${doc.display_name}`}
                    >
                      <svg
                        className="w-4 h-4 text-[#03adf0]"
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
                    <svg className="w-full h-2" xmlns="http://www.w3.org/2000/svg">
                      <line x1="0" y1="1" x2="100%" y2="1" stroke="#d1d5db" strokeWidth="1" strokeDasharray="16 4"></line>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
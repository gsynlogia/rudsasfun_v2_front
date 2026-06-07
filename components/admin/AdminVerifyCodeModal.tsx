'use client';

import { KeyRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AdminVerifyCodeModalProps {
  isOpen: boolean;
  documentType: 'qualification_card' | 'contract';
  // Callbacki:
  onSubmit: (code: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

/**
 * Modal admin wpisuje kod SMS podyktowany przez klienta telefonicznie (REZ-1828, 2026-05-24).
 *
 * UX: admin NIE widzi kodu wygenerowanego w bazie — wpisuje to co klient powie.
 * Po wpisaniu prawidłowego kodu backend ustawia sms_verified_at (jak gdyby klient sam wpisał).
 * Następnie admin osobno klika "Zaakceptuj" w UI rezerwacji (drugi krok).
 */
export default function AdminVerifyCodeModal({
  isOpen,
  documentType,
  onSubmit,
  onCancel,
  isLoading = false,
  errorMessage = null,
}: AdminVerifyCodeModalProps) {
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const docLabel = documentType === 'qualification_card' ? 'karty kwalifikacyjnej' : 'umowy';
  const docNoun = documentType === 'qualification_card' ? 'Karta kwalifikacyjna' : 'Umowa';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(onlyDigits);
  };

  const canSubmit = code.length >= 4 && !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit(code);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onCancel}
    >
      <div
        className="bg-white shadow-2xl max-w-md w-full animate-scaleIn"
        style={{ borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0">
              <KeyRound className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Weryfikacja telefoniczna {docLabel}
              </h2>
            </div>
          </div>

          <p className="text-sm text-gray-700 mb-3">
            <strong>Wysłaliśmy klientowi nowy SMS</strong> z 4-cyfrowym kodem do podpisu {docLabel}.
            Poproś klienta o podyktowanie kodu z <strong>najnowszego</strong> SMS-a i wpisz go poniżej.
          </p>

          <p className="text-xs text-gray-500 mb-4">
            Po wpisaniu prawidłowego kodu dokument zostanie oznaczony jako podpisany SMS-em
            (tak jakby klient wpisał go sam). Następnie możesz osobno kliknąć „Zaakceptuj".
          </p>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Kod podyktowany przez klienta
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={code}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmit) handleSubmit();
              }}
              placeholder="np. 6845"
              maxLength={6}
              className="w-full px-3 py-3 text-2xl font-mono tracking-widest text-center border-2 border-gray-300 focus:outline-none focus:border-blue-500"
              style={{ borderRadius: 0 }}
              disabled={isLoading}
            />
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 0, cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border-2 border-blue-600 hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 0, cursor: !canSubmit ? 'not-allowed' : 'pointer' }}
            >
              {isLoading ? 'Weryfikuję…' : 'Zweryfikuj kod'}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}

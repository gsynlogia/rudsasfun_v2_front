'use client';

import { AlertCircle, Check, X } from 'lucide-react';
import { useState } from 'react';

interface ForceAcceptConfirmModalProps {
  isOpen: boolean;
  documentType: 'qualification_card' | 'contract';
  // Stan dokumentu (do wyświetlenia w modalu — admin musi widzieć CO akceptuje):
  hasPayload: boolean;       // czy klient wypełnił treść (payload nie pusty)
  createdAt?: string | null;  // kiedy klient wczytał + kliknął "Podpisz" (SMS code wygenerowany)
  smsCode?: string | null;    // wygenerowany kod SMS (admin może powiedzieć klientowi przez tel.)
  smsVerifiedAt?: string | null; // czy klient wpisał SMS (NULL = nie)
  // Callbacki:
  onConfirm: (reason: string) => void;  // przekazuje powód (opcjonalny tekst) do PATCH payload
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Modal potwierdzenia akceptacji dokumentu mimo braku weryfikacji SMS (REZ-1828 fix).
 * Wzorowany na DeleteConfirmationModal (spójność design systemu).
 *
 * Pokazuje stan dokumentu PRZED akceptacją:
 *  - Treść dokumentu (wypełniona przez klienta) ✓ / ✗
 *  - Czas wczytania + wygenerowany kod SMS
 *  - Weryfikacja SMS klienta ✗
 *
 * Plus opcjonalne pole "Powód" — np. "Klient potwierdził tel. — SMS nie doszedł, telefon nieaktywny".
 */
export default function ForceAcceptConfirmModal({
  isOpen,
  documentType,
  hasPayload,
  createdAt,
  smsCode,
  smsVerifiedAt,
  onConfirm,
  onCancel,
  isLoading = false,
}: ForceAcceptConfirmModalProps) {
  const [reason, setReason] = useState('');
  if (!isOpen) return null;

  const docLabel = documentType === 'qualification_card' ? 'kartę kwalifikacyjną' : 'umowę';
  const docNoun = documentType === 'qualification_card' ? 'Karta kwalifikacyjna' : 'Umowa';

  const formatDate = (iso?: string | null): string => {
    if (!iso) return '–';
    try {
      const d = new Date(iso);
      return d.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return iso;
    }
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
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Akceptacja bez weryfikacji SMS
              </h2>
            </div>
          </div>

          {/* Stan dokumentu — admin musi widzieć CO akceptuje */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              {hasPayload ? (
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <span className="text-gray-700">
                <strong>{docNoun}</strong> {hasPayload ? 'wypełniona przez klienta' : 'BRAK treści (klient nie wypełnił)'}
              </span>
            </div>
            {createdAt && (
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  Klient kliknął <strong>„Podpisz"</strong>: <strong>{formatDate(createdAt)}</strong>
                  {smsCode ? <> (wysłano kod SMS: <code className="bg-white px-1.5 py-0.5 border border-gray-300 text-xs">{smsCode}</code>)</> : null}
                </span>
              </div>
            )}
            <div className="flex items-start gap-2">
              {smsVerifiedAt ? (
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <span className="text-gray-700">
                {smsVerifiedAt
                  ? <>Klient wpisał kod SMS: <strong>{formatDate(smsVerifiedAt)}</strong></>
                  : <>Klient <strong>NIE wpisał</strong> kodu SMS — dokument niepodpisany</>}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-700 mb-3">
            Czy chcesz mimo to zaakceptować {docLabel}? (np. po telefonicznej weryfikacji z klientem)
          </p>

          {/* Opcjonalne pole "Powód" — audyt w SystemEvent */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Powód akceptacji manualnej <span className="text-gray-400">(opcjonalne — zostanie zapisane w historii)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="np. Klient potwierdził telefonicznie — SMS nie doszedł, telefon nieaktywny"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-amber-500"
              style={{ borderRadius: 0 }}
              disabled={isLoading}
            />
          </div>

          <p className="text-xs text-gray-500 mb-6">
            Akcja zostanie odnotowana w historii rezerwacji (sekcja „Zdarzenia") z informacją że
            akceptacja nastąpiła bez weryfikacji SMS klienta. Audyt obejmuje datę, czas, pracownika
            {reason ? ' i podany powód' : ''}.
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 0, cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              Anuluj
            </button>
            <button
              onClick={() => onConfirm(reason.trim())}
              disabled={isLoading || !hasPayload}
              title={!hasPayload ? 'Nie można zaakceptować pustego dokumentu — klient musi go najpierw wypełnić' : ''}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border-2 border-amber-600 hover:bg-amber-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 0, cursor: (isLoading || !hasPayload) ? 'not-allowed' : 'pointer' }}
            >
              {isLoading ? 'Akceptuję...' : 'Akceptuj mimo to'}
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

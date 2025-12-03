'use client';

import { CheckCircle } from 'lucide-react';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  reservationName: string;
  participantName: string;
  totalAmount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Payment Confirmation Modal Component
 * Modal for manually confirming payment for an invoice
 */
export default function PaymentConfirmationModal({
  isOpen,
  reservationName,
  participantName,
  totalAmount,
  onConfirm,
  onCancel,
  isLoading = false,
}: PaymentConfirmationModalProps) {
  if (!isOpen) return null;

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
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Potwierdź płatność</h2>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Czy na pewno chcesz potwierdzić ręczną płatność dla rezerwacji <strong>{reservationName}</strong>?
          </p>
          
          <div className="bg-gray-50 rounded p-3 mb-4">
            <p className="text-xs text-gray-500 mb-1">Uczestnik:</p>
            <p className="text-sm font-medium text-gray-900">{participantName}</p>
            <p className="text-xs text-gray-500 mb-1 mt-2">Kwota:</p>
            <p className="text-sm font-medium text-gray-900">{totalAmount.toFixed(2)} PLN</p>
          </div>

          <p className="text-xs text-gray-500 mb-6">
            Po potwierdzeniu faktura zostanie oznaczona jako opłacona.
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
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border-2 border-green-600 hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 0, cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              {isLoading ? 'Potwierdzanie...' : 'Potwierdź płatność'}
            </button>
          </div>
        </div>
      </div>

      {/* Animations CSS */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}









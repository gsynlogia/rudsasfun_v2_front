'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';

interface RefundConfirmationModalProps {
  isOpen: boolean;
  itemName: string;
  amount: number;
  isFinalConfirmation: boolean; // First modal (return request) or second modal (confirm return)
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Refund Confirmation Modal Component
 * Modal for confirming refund of funds for a paid payment item
 */
export default function RefundConfirmationModal({
  isOpen,
  itemName,
  amount,
  isFinalConfirmation,
  onConfirm,
  onCancel,
  isLoading = false,
}: RefundConfirmationModalProps) {
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
              {isFinalConfirmation ? (
                <RotateCcw className="w-8 h-8 text-purple-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-purple-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isFinalConfirmation ? 'Potwierdź zwrot środków' : 'Zwrot środków'}
              </h2>
            </div>
          </div>

          {isFinalConfirmation ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Czy na pewno środki zostały zwrócone dla elementu <strong>{itemName}</strong>?
              </p>
              <div className="bg-purple-50 border-l-4 border-purple-400 p-3 mb-4">
                <p className="text-xs text-purple-700">
                  Po potwierdzeniu element zostanie oznaczony jako "Zwrócone" i nie będzie można go już zmienić.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Czy chcesz zwrócić środki dla elementu <strong>{itemName}</strong>?
              </p>
              <div className="bg-gray-50 rounded p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Element:</p>
                <p className="text-sm font-medium text-gray-900">{itemName}</p>
                <p className="text-xs text-gray-500 mb-1 mt-2">Kwota do zwrotu:</p>
                <p className="text-sm font-medium text-gray-900">{amount.toFixed(2)} PLN</p>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
                <p className="text-xs text-blue-700">
                  Element zostanie oznaczony jako "W trakcie zwrotu". Następnie będziesz mógł potwierdzić zwrot środków.
                </p>
              </div>
            </>
          )}

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
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 border-2 border-purple-600 hover:bg-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 0, cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              {isLoading ? 'Przetwarzanie...' : (isFinalConfirmation ? 'Potwierdź zwrot' : 'Zwróć środki')}
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












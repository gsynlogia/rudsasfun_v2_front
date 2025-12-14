'use client';

import { AlertCircle } from 'lucide-react';

export type DeleteItemType = 'camp' | 'turnus' | 'reservation' | 'payment' | 'transport' | 'diet' | 'other';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  itemType: DeleteItemType;
  itemName: string;
  itemId: number;
  additionalInfo?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Universal Delete Confirmation Modal Component
 * Reusable component for confirming deletion of various items
 * 
 * @param isOpen - Whether the modal is visible
 * @param itemType - Type of item being deleted (camp, edition, etc.)
 * @param itemName - Name/title of the item being deleted
 * @param itemId - ID of the item being deleted
 * @param additionalInfo - Optional additional warning information
 * @param onConfirm - Callback when user confirms deletion
 * @param onCancel - Callback when user cancels deletion
 * @param isLoading - Whether deletion is in progress
 */
export default function DeleteConfirmationModal({
  isOpen,
  itemType,
  itemName,
  itemId,
  additionalInfo,
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  const getItemTypeLabel = (type: DeleteItemType): string => {
    switch (type) {
      case 'camp':
        return 'obóz';
      case 'turnus':
        return 'turnus obozu';
      case 'reservation':
        return 'rezerwację';
      case 'payment':
        return 'płatność';
      case 'transport':
        return 'przypisanie transportu';
      case 'diet':
        return 'przypisanie diety';
      default:
        return 'element';
    }
  };

  const getDefaultWarning = (type: DeleteItemType): string => {
    switch (type) {
      case 'camp':
        return 'Ta operacja jest nieodwracalna. Wszystkie turnusy tego obozu również zostaną usunięte.';
      case 'turnus':
        return 'Ta operacja jest nieodwracalna.';
      case 'reservation':
        return 'Ta operacja jest nieodwracalna.';
      case 'payment':
        return 'Ta operacja jest nieodwracalna.';
      case 'transport':
        return 'Przypisanie transportu do tego turnusu zostanie usunięte. Transport pozostanie w systemie i będzie dostępny do przypisania do innych turnusów.';
      case 'diet':
        return 'Przypisanie diety do tego turnusu zostanie usunięte. Dieta pozostanie w systemie i będzie dostępna do przypisania do innych turnusów.';
      default:
        return 'Ta operacja jest nieodwracalna.';
    }
  };

  const warningText = additionalInfo || getDefaultWarning(itemType);
  const itemTypeLabel = getItemTypeLabel(itemType);

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
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Potwierdź usunięcie</h2>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Czy na pewno chcesz usunąć {itemTypeLabel} <strong>{itemName}</strong>?
          </p>
          <p className="text-xs text-gray-500 mb-6">
            {warningText}
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
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border-2 border-red-600 hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 0, cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              {isLoading ? 'Usuwanie...' : 'Usuń'}
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


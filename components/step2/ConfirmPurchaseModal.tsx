'use client';

import UniversalModal from '@/components/admin/UniversalModal';

/**
 * Modal potwierdzenia dokupienia (Trello 355, punkt 1) — używany w kreatorze przy zaznaczaniu
 * atrakcji dodatkowej i ubezpieczenia: „czy na pewno dokupujesz wybraną opcję?".
 */
interface ConfirmPurchaseModalProps {
  isOpen: boolean;
  itemName: string;
  price?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmPurchaseModal({
  isOpen,
  itemName,
  price,
  onConfirm,
  onCancel,
}: ConfirmPurchaseModalProps) {
  return (
    <UniversalModal isOpen={isOpen} onClose={onCancel} title="Potwierdzenie dokupienia" maxWidth="sm">
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-800">
          Czy na pewno dokupujesz wybraną opcję: <span className="font-semibold">„{itemName}"</span>
          {typeof price === 'number' && price > 0 ? ` (+${price} PLN)` : ''}?
        </p>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-5 py-2 bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-[#03adf0] text-white font-medium hover:bg-[#0288c7] transition-colors"
          >
            Tak, dokupuję
          </button>
        </div>
      </div>
    </UniversalModal>
  );
}

'use client';

import { Clock } from 'lucide-react';

import UniversalModal from './UniversalModal';

/**
 * Modal informacyjny — pokazuje sie gdy admin probowal wyslac reminder do rezerwacji
 * gdzie reminder zostal wyslany ≤2 dni temu Warsaw (recent = blue tlo wiersza).
 *
 * Cz. 7 v2 widoku Dokumenty (2026-05-31): defensywa backendu (HTTP 400 + recently_reminded=true).
 *
 * Trigger: backend zwrocil 400 z detail.recently_reminded=true → DocumentReminderButtons
 * wywoluje onRecentlyReminded() → parent (DocumentsOverviewTable) otwiera ten modal.
 */

export interface RecentlyRemindedInfoModalProps {
  isOpen: boolean;
  reservationNumber: string | null;
  onClose: () => void;
}

export default function RecentlyRemindedInfoModal({
  isOpen,
  reservationNumber,
  onClose,
}: RecentlyRemindedInfoModalProps) {
  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Niedawno wysłano przypomnienie"
      maxWidth="md"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          <Clock className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-800">
              Przypomnienie zostało wysłane w ostatnich 3 dniach (dziś / wczoraj / przedwczoraj)
              {reservationNumber ? (
                <> dla rezerwacji <span className="font-semibold">{reservationNumber}</span></>
              ) : null}
              . Aby uniknąć spamowania klienta, system zablokował wysyłkę.
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Jeśli mimo to chcesz wysłać ponownie — zaznacz w nagłówku checkbox
              <span className="font-semibold"> „Odblokuj zablokowane przypomnienia"</span> i spróbuj jeszcze raz.
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            OK, rozumiem
          </button>
        </div>
      </div>
    </UniversalModal>
  );
}

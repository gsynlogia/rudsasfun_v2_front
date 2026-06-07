'use client';

import { CheckCircle2 } from 'lucide-react';

import UniversalModal from './UniversalModal';

/**
 * Modal informacyjny — pokazuje sie gdy admin probowal wyslac przypomnienie do rezerwacji
 * gdzie OBA dokumenty (umowa + karta) sa juz podpisane SMS-em przez klienta.
 *
 * Cz. 5 widoku Dokumenty (2026-05-31), Krok 4: defensywa backendu (HTTP 400 + already_signed=true)
 * jest pokazywana userowi jako INFO (nie blad) — przypomnienie nie jest potrzebne, klient juz podpisal.
 *
 * Trigger: backend zwrocil 400 z detail.already_signed=true → DocumentReminderButtons wywoluje
 * onAlreadySigned() → parent (DocumentsOverviewTable) ustawia state otwarcia tego modalu.
 */

export interface AlreadySignedInfoModalProps {
  isOpen: boolean;
  reservationNumber: string | null;
  onClose: () => void;
}

export default function AlreadySignedInfoModal({
  isOpen,
  reservationNumber,
  onClose,
}: AlreadySignedInfoModalProps) {
  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Nie trzeba — dokumenty już podpisane"
      maxWidth="md"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-800">
              Przypomnienie nie jest potrzebne — klient już podpisał umowę i kartę kwalifikacyjną SMS-em
              {reservationNumber ? (
                <> dla rezerwacji <span className="font-semibold">{reservationNumber}</span></>
              ) : null}
              .
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Rezerwacje z oboma dokumentami podpisanymi SMS-em znajdziesz w widoku „Skuteczne powiadomienia”.
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

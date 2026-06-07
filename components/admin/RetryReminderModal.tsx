'use client';

import { Mail, MessageSquare, Send, Phone, XCircle } from 'lucide-react';

import UniversalModal from './UniversalModal';
import DocumentReminderButtons from './DocumentReminderButtons';

/**
 * Modal "Błąd — wyślij raz jeszcze" — pokazuje sie po kliku przycisku w kolumnie
 * "Ostatnia data przypomnienia" gdy channel='failed'.
 *
 * Cz. 7 v4 widoku Dokumenty (2026-05-31).
 *
 * Reuse: ten sam DocumentReminderButtons co per row — 4 opcje Email/SMS/Email+SMS/Tel.
 * Allow recent = true (admin explicit chce retry mimo niedawnego failed wpisu).
 */

export interface RetryReminderModalProps {
  isOpen: boolean;
  reservationNumber: string | null;
  onClose: () => void;
  /** Callback po sukcesie — parent aktualizuje wiersz w state (live update + zamyka modal). */
  onReminderSent?: (rezNumber: string, channel: 'email' | 'sms' | 'both' | 'failed' | 'phone_call', at: string) => void;
}

export default function RetryReminderModal({
  isOpen,
  reservationNumber,
  onClose,
  onReminderSent,
}: RetryReminderModalProps) {
  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Błąd wysyłki — spróbuj ponownie"
      maxWidth="md"
    >
      <div className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <XCircle className="w-6 h-6 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-800">
              Poprzednia próba wysyłki przypomnienia dla rezerwacji
              {reservationNumber ? (
                <> <span className="font-semibold">{reservationNumber}</span></>
              ) : null}
              {' '}zakończyła się błędem (klient nic nie dostał). Wybierz sposób ponownej akcji:
            </p>
          </div>
        </div>

        {/* Reuse DocumentReminderButtons — ten sam komponent z 4 opcjami */}
        {reservationNumber && (
          <div className="flex flex-col items-stretch gap-3">
            <DocumentReminderButtons
              reservationNumber={reservationNumber}
              documentType="both"
              allowRecentReminders={true}
              onReminderSent={(channel, at) => {
                onReminderSent?.(reservationNumber, channel, at);
                onClose();
              }}
            />
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Anuluj
          </button>
        </div>
      </div>
    </UniversalModal>
  );
}

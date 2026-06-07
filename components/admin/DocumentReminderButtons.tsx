'use client';

import { useState, useCallback } from 'react';
import { Mail, MessageSquare, Send, Phone } from 'lucide-react';

import { useToast } from '@/components/ToastContainer';
import { authenticatedFetch } from '@/utils/api-auth';
import { getApiBaseUrlRuntime } from '@/utils/api-config';

/**
 * 3 przyciski wysyłki przypomnienia o podpisaniu dokumentów (email / SMS / email+SMS).
 *
 * REUSE backend: POST /api/reservations/by-number/{reservation_number}/remind-sign
 * Body: { send_sms: bool, send_email: bool, document_type: 'contract'|'qualification_card'|'both' }
 *
 * Cz. 5 (2026-05-31):
 *  - callback `onReminderSent` po sukcesie → parent moze zaktualizowac UI bez F5 (live update)
 *  - callback `onAlreadySigned` gdy backend zwroci 400 z `already_signed: true`
 *    → parent pokazuje modal informacyjny "Dokumenty juz podpisane"
 *  - prop `disabled` + tooltip override (np. dla mode='effective' w tabeli Skuteczne)
 *  - uzywa authenticatedFetch zamiast authenticatedApiCall zeby moc parsowac body 400
 *    (authenticatedApiCall throwuje Error ze sformatowanym stringem — gubimy `already_signed`)
 */

type ReminderChannel = 'email' | 'sms' | 'both' | 'phone_call';

export interface DocumentReminderButtonsProps {
  reservationNumber: string;
  documentType?: 'contract' | 'qualification_card' | 'both';
  /** Cz. 5: callback po sukcesie. Parent uzywa do live update wiersza (data + kanal + kolor). */
  onReminderSent?: (channel: 'email' | 'sms' | 'both' | 'failed' | 'phone_call', at: string) => void;
  /** Cz. 5: callback gdy backend zwroci 400 z already_signed=true. Parent pokazuje modal informacyjny. */
  onAlreadySigned?: () => void;
  /** Cz. 5: wymusza disabled state niezalezne od loading (np. w mode='effective' modal Skuteczne). */
  disabled?: boolean;
  /** Cz. 5: niestandardowy tooltip dla disabled state. */
  disabledTooltip?: string;
  /** Cz. 7 v2 (2026-05-31): przekazuje allow_recent_reminders do body /remind-sign — pozwala wyslac mimo niedawnego. */
  allowRecentReminders?: boolean;
  /** Cz. 7 v2: callback gdy backend zwroci 400 z recently_reminded=true. */
  onRecentlyReminded?: () => void;
}

interface RemindSignResponse {
  ok: boolean;
  sent_sms: boolean;
  sent_email: boolean;
  errors: string[] | null;
}

interface AlreadySignedDetail {
  ok: false;
  already_signed: true;
  errors: string[];
  sent_sms: false;
  sent_email: false;
}

interface RecentlyRemindedDetail {
  ok: false;
  recently_reminded: true;
  errors: string[];
  sent_sms: false;
  sent_email: false;
}

const CHANNEL_LABELS: Record<ReminderChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  both: 'Email+SMS',
  phone_call: 'Tel.',
};

export default function DocumentReminderButtons({
  reservationNumber,
  documentType = 'both',
  onReminderSent,
  onAlreadySigned,
  disabled = false,
  disabledTooltip,
  allowRecentReminders = false,
  onRecentlyReminded,
}: DocumentReminderButtonsProps) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState<ReminderChannel | null>(null);

  const sendReminder = useCallback(
    async (channel: ReminderChannel) => {
      if (!reservationNumber || disabled) return;
      setLoading(channel);
      try {
        const url = `${getApiBaseUrlRuntime()}/api/reservations/by-number/${encodeURIComponent(reservationNumber)}/remind-sign`;
        const response = await authenticatedFetch(url, {
          method: 'POST',
          body: JSON.stringify({
            send_sms: channel === 'sms' || channel === 'both',
            send_email: channel === 'email' || channel === 'both',
            document_type: documentType,
            // Cz. 7 v2 (2026-05-31): allow_recent_reminders — gdy true backend pozwala wyslac mimo niedawnego
            allow_recent_reminders: allowRecentReminders,
            // Cz. 7 v4 (2026-05-31): phone_call=true → backend NIE wysyla, tylko zapisuje event
            phone_call: channel === 'phone_call',
          }),
        });

        // Cz. 5 (2026-05-31): obsluga defensywy backend — 400 + already_signed
        if (response.status === 400) {
          const errorBody = await response.json().catch(() => null);
          const rawDetail = errorBody?.detail;
          // Backend FastAPI HTTPException(detail=dict) zwraca STRING'a (Pythonowy repr) w detail.
          // Sprawdzamy markery w stringu detail (already_signed / recently_reminded).
          const detailStr = typeof rawDetail === 'string' ? rawDetail : JSON.stringify(rawDetail || '');
          if (detailStr.includes('already_signed') && detailStr.includes('True')) {
            onAlreadySigned?.();
            return;
          }
          if (detailStr.includes('recently_reminded') && detailStr.includes('True')) {
            // Cz. 7 v2: niedawno wyslane → modal informacyjny "Odblokuj zeby wyslac"
            onRecentlyReminded?.();
            return;
          }
          // Inny 400 — fallback do toastu bledu
          showError(`REZ ${reservationNumber}: ${detailStr.slice(0, 200)}`);
          return;
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({ detail: 'Request failed' }));
          const msg = typeof errorBody?.detail === 'string' ? errorBody.detail : `Blad HTTP ${response.status}`;
          showError(`REZ ${reservationNumber}: ${msg}`);
          return;
        }

        const body = (await response.json()) as RemindSignResponse & { phone_call?: boolean };

        if (body.ok) {
          // Cz. 7 v4 (2026-05-31): phone_call ma priorytet (admin oznaczyl jako powiadomiony tel.)
          let actualChannel: 'email' | 'sms' | 'both' | 'failed' | 'phone_call';
          if ((body as { phone_call?: boolean }).phone_call) {
            actualChannel = 'phone_call';
            showSuccess(`Oznaczono jako powiadomiony telefonicznie — REZ ${reservationNumber}`);
          } else {
            const parts: string[] = [];
            if (body.sent_email) parts.push('email');
            if (body.sent_sms) parts.push('SMS');
            const summary = parts.length > 0 ? parts.join(', ') : 'kanał';
            showSuccess(`Przypomnienie wysłane (${summary}) — REZ ${reservationNumber}`);
            if (body.sent_email && body.sent_sms) actualChannel = 'both';
            else if (body.sent_email) actualChannel = 'email';
            else if (body.sent_sms) actualChannel = 'sms';
            else actualChannel = 'failed';
          }
          onReminderSent?.(actualChannel, new Date().toISOString());
        } else {
          const errMsg = body.errors?.join('; ') || 'Wysylka zakonczona bledem';
          showError(`REZ ${reservationNumber}: ${errMsg}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Nieznany blad wysylki';
        showError(`REZ ${reservationNumber}: ${msg}`);
      } finally {
        setLoading(null);
      }
    },
    [reservationNumber, documentType, disabled, showSuccess, showError, onReminderSent, onAlreadySigned],
  );

  const isDisabled = loading !== null || disabled;
  const baseBtn =
    'inline-flex items-center justify-center px-2 py-1 text-xs font-medium border cursor-pointer ' +
    'disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

  return (
    <div className="flex flex-col gap-1" style={{ minWidth: 140 }}>
      <button
        type="button"
        onClick={() => sendReminder('email')}
        disabled={isDisabled}
        className={`${baseBtn} bg-white border-gray-300 text-gray-700 hover:bg-gray-50`}
        title={disabled && disabledTooltip ? disabledTooltip : `Wyślij przypomnienie ${CHANNEL_LABELS.email}`}
      >
        <Mail className="w-3.5 h-3.5 mr-1.5" />
        {loading === 'email' ? 'Wysyłanie…' : 'Email'}
      </button>
      <button
        type="button"
        onClick={() => sendReminder('sms')}
        disabled={isDisabled}
        className={`${baseBtn} bg-white border-gray-300 text-gray-700 hover:bg-gray-50`}
        title={disabled && disabledTooltip ? disabledTooltip : `Wyślij przypomnienie ${CHANNEL_LABELS.sms}`}
      >
        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
        {loading === 'sms' ? 'Wysyłanie…' : 'SMS'}
      </button>
      <button
        type="button"
        onClick={() => sendReminder('both')}
        disabled={isDisabled}
        className={`${baseBtn} bg-slate-700 border-slate-700 text-white hover:bg-slate-800`}
        title={disabled && disabledTooltip ? disabledTooltip : `Wyślij przypomnienie ${CHANNEL_LABELS.both}`}
      >
        <Send className="w-3.5 h-3.5 mr-1.5" />
        {loading === 'both' ? 'Wysyłanie…' : 'Email + SMS'}
      </button>
      {/* Cz. 7 v4 (2026-05-31): 4. opcja — admin oznaczyl jako "powiadomiony telefonicznie" (bez wysylki) */}
      <button
        type="button"
        onClick={() => sendReminder('phone_call')}
        disabled={isDisabled}
        className={`${baseBtn} bg-teal-50 border-teal-300 text-teal-800 hover:bg-teal-100`}
        title={disabled && disabledTooltip ? disabledTooltip : 'Oznacz jako powiadomiony telefonicznie (bez wysylki SMS/email)'}
      >
        <Phone className="w-3.5 h-3.5 mr-1.5" />
        {loading === 'phone_call' ? 'Zapisywanie…' : 'Tel.'}
      </button>
    </div>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

import { authenticatedFetch } from '@/utils/api-auth';
import { getApiBaseUrlRuntime } from '@/utils/api-config';

import UniversalModal from './UniversalModal';

/**
 * Modal "Bulk reminder" — wysyla przypomnienia (email/SMS/email+SMS) dla N rezerwacji.
 *
 * Cz. 6 widoku Dokumenty (2026-05-31).
 *
 * Strategia: backend POST /api/reservations/bulk-remind-sign w BATCHACH po BATCH_SIZE.
 * Pozwala na:
 *  - progress bar (po kazdym batchu)
 *  - live update wierszy w parent komponencie (callback onRowUpdated)
 *  - anulowanie w trakcie (przycisk Stop — fire-and-forget, w toku batch dokonczony)
 *
 * Defensywa already_signed (oba dokumenty podpisane SMS-em) zwracana per-id przez backend
 * → wyswietlana w UI jako "Juz podpisane" (nie blad — informacja).
 */

// Cz. 7 v3 (2026-05-31): BATCH_SIZE=1 dla LIVE progress (1/N, 2/N, ...) zamiast 50/50 naraz.
// Backend wysyla 1 email/sec (Mailtrap free limit) — sekwencyjne requesty per-id sa naturalnie
// rate-limited przez backend asyncio.sleep(1.2). Total czas: N × ~1.5s = N rezerwacji × 1.5s.
const BATCH_SIZE = 1;

type Channel = 'email' | 'sms' | 'both';

export interface BulkRemindModalProps {
  isOpen: boolean;
  reservationIds: number[];
  channel: Channel;
  onClose: () => void;
  /** Callback po sukcesie kazdej pojedynczej rezerwacji — parent uaktualnia wiersz w state. */
  onRowUpdated: (rezId: number, actualChannel: 'email' | 'sms' | 'both' | 'failed', at: string) => void;
  /** Cz. 7 v2 (2026-05-31): allow_recent_reminders dla bulk — bez tego backend skipuje recent. */
  allowRecentReminders?: boolean;
}

interface BulkResultItem {
  reservation_id: number;
  reservation_number: string | null;
  ok: boolean;
  sent_sms: boolean;
  sent_email: boolean;
  already_signed: boolean;
  // Cz. 7 v2 (2026-05-31): rezerwacja pominieta bo niedawno wyslano reminder
  recently_reminded: boolean;
  error: string | null;
}

const CHANNEL_LABELS: Record<Channel, string> = {
  email: 'Email',
  sms: 'SMS',
  both: 'Email + SMS',
};

export default function BulkRemindModal({
  isOpen,
  reservationIds,
  channel,
  onClose,
  onRowUpdated,
  allowRecentReminders = false,
}: BulkRemindModalProps) {
  const [processed, setProcessed] = useState(0);
  const [results, setResults] = useState<BulkResultItem[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0); // 0 = pierwsza próba, 1+ = retry
  const [retryRemaining, setRetryRemaining] = useState(0); // ile zostaje w retry
  const cancelRef = useRef(false);
  // Cz. 7 v3 (2026-05-31): startedRef dedupe — Strict Mode + parent re-render generowal 2 petle
  // naraz → progres skakal "1/16, 2/16, 1/16, 3/16". Teraz tylko PIERWSZE wywolanie startuje.
  const startedRef = useRef(false);

  const total = reservationIds.length;
  const okCount = results.filter((r) => r.ok).length;
  const alreadySignedCount = results.filter((r) => r.already_signed).length;
  // Cz. 7 v2 (2026-05-31): "recently reminded" = pominiete bo niedawno wyslano
  const recentlyRemindedCount = results.filter((r) => r.recently_reminded).length;
  const errorCount = results.filter((r) => !r.ok && !r.already_signed && !r.recently_reminded).length;

  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setProcessed(0);
      setResults([]);
      setIsFinished(false);
      setIsCancelling(false);
      setRetryAttempt(0);
      setRetryRemaining(0);
      cancelRef.current = false;
      startedRef.current = false;
      return;
    }
    // Cz. 7 v3 (2026-05-31): dedupe Strict Mode + parent re-render → tylko PIERWSZE wywolanie
    if (startedRef.current) return;
    startedRef.current = true;

    if (total === 0) {
      setIsFinished(true);
      return;
    }

    const sendSms = channel === 'sms' || channel === 'both';
    const sendEmail = channel === 'email' || channel === 'both';
    const MAX_RETRIES = 2; // 1 oryginalna + 2 retry = max 3 proby

    // Wywoluje per-id /bulk-remind-sign (BATCH_SIZE=1). Zwraca pojedynczy item lub error fallback.
    const sendOne = async (id: number): Promise<BulkResultItem> => {
      try {
        const url = `${getApiBaseUrlRuntime()}/api/reservations/bulk-remind-sign`;
        const resp = await authenticatedFetch(url, {
          method: 'POST',
          body: JSON.stringify({
            reservation_ids: [id],
            send_sms: sendSms,
            send_email: sendEmail,
            document_type: 'both',
            allow_recent_reminders: allowRecentReminders,
          }),
        });
        if (!resp.ok) {
          return { reservation_id: id, reservation_number: null, ok: false, sent_sms: false,
            sent_email: false, already_signed: false, recently_reminded: false, error: `HTTP ${resp.status}` };
        }
        const body = (await resp.json()) as { results: BulkResultItem[] };
        return body.results[0];
      } catch (err) {
        return { reservation_id: id, reservation_number: null, ok: false, sent_sms: false,
          sent_email: false, already_signed: false, recently_reminded: false,
          error: err instanceof Error ? err.message : 'Network error' };
      }
    };

    // Decyduje czy item powinien byc retry (failed = nie ok + nie already_signed + nie recently_reminded)
    const shouldRetry = (item: BulkResultItem): boolean =>
      !item.ok && !item.already_signed && !item.recently_reminded;

    (async () => {
      // Pierwsza proba — pelna lista
      const allResults: BulkResultItem[] = [];
      for (const id of reservationIds) {
        if (cancelRef.current) break;
        const item = await sendOne(id);
        allResults.push(item);
        // Live update wiersza (callback do parent) — tylko sukces
        if (item.ok && !item.already_signed && !item.recently_reminded) {
          let actualChannel: 'email' | 'sms' | 'both' | 'failed';
          if (item.sent_email && item.sent_sms) actualChannel = 'both';
          else if (item.sent_email) actualChannel = 'email';
          else if (item.sent_sms) actualChannel = 'sms';
          else actualChannel = 'failed';
          onRowUpdated(item.reservation_id, actualChannel, new Date().toISOString());
        }
        setResults([...allResults]);
        setProcessed(allResults.length);
      }

      // Auto-retry — TYLKO failed (nie already_signed, nie recently_reminded)
      let attempt = 0;
      while (attempt < MAX_RETRIES && !cancelRef.current) {
        const failedItems = allResults.filter(shouldRetry);
        if (failedItems.length === 0) break;
        attempt++;
        setRetryAttempt(attempt);
        setRetryRemaining(failedItems.length);

        for (const failedItem of failedItems) {
          if (cancelRef.current) break;
          const newItem = await sendOne(failedItem.reservation_id);
          // Zamien w allResults na nowy wynik (w tym samym miejscu)
          const idx = allResults.findIndex((r) => r.reservation_id === failedItem.reservation_id);
          if (idx !== -1) allResults[idx] = newItem;
          // Live update jesli teraz sukces
          if (newItem.ok && !newItem.already_signed && !newItem.recently_reminded) {
            let actualChannel: 'email' | 'sms' | 'both' | 'failed';
            if (newItem.sent_email && newItem.sent_sms) actualChannel = 'both';
            else if (newItem.sent_email) actualChannel = 'email';
            else if (newItem.sent_sms) actualChannel = 'sms';
            else actualChannel = 'failed';
            onRowUpdated(newItem.reservation_id, actualChannel, new Date().toISOString());
          }
          setResults([...allResults]);
          setRetryRemaining((prev) => Math.max(0, prev - 1));
        }
      }

      setIsFinished(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const cancel = () => {
    cancelRef.current = true;
    setIsCancelling(true);
  };

  const progressPct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const channelIcon = channel === 'email' ? Mail : channel === 'sms' ? MessageSquare : Send;
  const ChannelIcon = channelIcon;

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={isFinished ? onClose : () => { /* nie pozwalaj zamknac w trakcie */ }}
      title={`Wysyłka przypomnień: ${CHANNEL_LABELS[channel]} (${total} rezerwacji)`}
      maxWidth="2xl"
      closeOnOverlayClick={isFinished}
      closeOnEscape={isFinished}
      showCloseButton={isFinished}
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <ChannelIcon className="w-6 h-6 text-slate-600" />
          <div className="text-sm text-gray-700">
            {isFinished ? (
              <span className="font-semibold text-gray-900">Zakończono</span>
            ) : retryAttempt > 0 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                <span className="text-orange-700 font-medium">Ponowna próba {retryAttempt}/2</span> — {retryRemaining} rezerwacji do retry…
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                Wysyłanie {processed} z {total}…
                {isCancelling && <span className="ml-2 text-orange-600">(anulowanie po bieżącym)</span>}
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 h-3 mb-3">
          <div
            className="bg-orange-500 h-3 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mb-4">
          {processed} / {total} ({progressPct}%)
        </div>

        {/* Stats */}
        {processed > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-4 text-sm">
            <div className="bg-green-50 border border-green-200 px-3 py-2">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-semibold">{okCount}</span>
              </div>
              <div className="text-xs text-green-700 mt-0.5">Wysłane pomyślnie</div>
            </div>
            <div className="bg-cyan-50 border border-cyan-200 px-3 py-2">
              <div className="flex items-center gap-2 text-cyan-800">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-semibold">{alreadySignedCount}</span>
              </div>
              <div className="text-xs text-cyan-700 mt-0.5">Już podpisane (pominięte)</div>
            </div>
            {/* Cz. 7 v2 (2026-05-31): nowy kafelek "niedawno wysłano — pominięte" */}
            <div className="bg-orange-50 border border-orange-200 px-3 py-2">
              <div className="flex items-center gap-2 text-orange-800">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-semibold">{recentlyRemindedCount}</span>
              </div>
              <div className="text-xs text-orange-700 mt-0.5">Niedawno wysłano (pominięte)</div>
            </div>
            <div className="bg-red-50 border border-red-200 px-3 py-2">
              <div className="flex items-center gap-2 text-red-800">
                <XCircle className="w-4 h-4" />
                <span className="font-semibold">{errorCount}</span>
              </div>
              <div className="text-xs text-red-700 mt-0.5">Błędy wysyłki</div>
            </div>
          </div>
        )}

        {/* Lista bledow (jesli sa) */}
        {errorCount > 0 && (
          <details className="mb-4 text-xs">
            <summary className="cursor-pointer text-red-700 font-medium">Pokaż błędy ({errorCount})</summary>
            <div className="mt-2 max-h-40 overflow-y-auto border border-red-200 bg-red-50 p-2 space-y-1">
              {results.filter((r) => !r.ok && !r.already_signed).map((r) => (
                <div key={r.reservation_id} className="text-red-800">
                  <span className="font-medium">{r.reservation_number || `#${r.reservation_id}`}</span>: {r.error}
                </div>
              ))}
            </div>
          </details>
        )}

        <div className="flex justify-end gap-2">
          {!isFinished && (
            <button
              type="button"
              onClick={cancel}
              disabled={isCancelling}
              className="px-4 py-2 text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
            >
              {isCancelling ? 'Anulowanie…' : 'Anuluj'}
            </button>
          )}
          {isFinished && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 cursor-pointer"
            >
              Zamknij
            </button>
          )}
        </div>
      </div>
    </UniversalModal>
  );
}

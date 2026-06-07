'use client';

import { useEffect, useState } from 'react';
import { Mail, MessageSquare, Send, XCircle, RefreshCw, Phone } from 'lucide-react';

import { authenticatedApiCall } from '@/utils/api-auth';

import UniversalModal from './UniversalModal';

/**
 * Modal "Informacje" — pokazuje historie WSZYSTKICH przypomnien (sign_reminder_sent)
 * dla danej rezerwacji. Cz. 7 widoku Dokumenty (2026-05-31).
 *
 * Dane: GET /api/reservations/by-number/{rez}/reminder-history
 * URL state: parent (DocumentsOverviewTable) zarzadza ?info_modal=<rez_number>
 * Po podaniu linku z URL `?info_modal=REZ-XXX` — modal otwiera sie automatycznie.
 *
 * Scroll: tabela wewnatrz modalu ma max-h-[60vh] overflow-y-auto.
 */

interface HistoryItem {
  id: number;
  created_at: string;
  channel: 'email' | 'sms' | 'both' | 'failed' | 'phone_call';
  sent_sms: boolean;
  sent_email: boolean;
  document_type: string | null;
  bulk: boolean;
  actor_id: number | null;
  actor_type: string | null;
}

interface HistoryResponse {
  items: HistoryItem[];
  total: number;
}

export interface ReminderHistoryModalProps {
  isOpen: boolean;
  reservationNumber: string | null;
  onClose: () => void;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const hasTzInfo = iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso);
  const normalized = hasTzInfo ? iso : iso + 'Z';
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d).replace(',', '');
}

function channelBadge(channel: HistoryItem['channel']) {
  switch (channel) {
    case 'both':
      return { label: 'Email + SMS', className: 'bg-green-100 text-green-800', Icon: Send };
    case 'email':
      return { label: 'Email', className: 'bg-blue-100 text-blue-800', Icon: Mail };
    case 'sms':
      return { label: 'SMS', className: 'bg-purple-100 text-purple-800', Icon: MessageSquare };
    case 'phone_call':
      // Cz. 7 v4 (2026-05-31): admin osobiscie zadzwonil
      return { label: 'Powiadomiony tel.', className: 'bg-teal-100 text-teal-800', Icon: Phone };
    case 'failed':
      return { label: 'Próba — błąd', className: 'bg-gray-100 text-gray-600', Icon: XCircle };
  }
}

function docTypeLabel(t: string | null): string {
  if (t === 'both') return 'Umowa + Karta';
  if (t === 'contract') return 'Umowa';
  if (t === 'qualification_card') return 'Karta kwalif.';
  return '—';
}

export default function ReminderHistoryModal({
  isOpen,
  reservationNumber,
  onClose,
}: ReminderHistoryModalProps) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !reservationNumber) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const body = await authenticatedApiCall<HistoryResponse>(
          `/api/reservations/by-number/${encodeURIComponent(reservationNumber)}/reminder-history`,
        );
        if (!cancelled) setData(body);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Nieznany błąd');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, reservationNumber]);

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={reservationNumber
        ? `Historia przypomnień — ${reservationNumber}${data ? ` (${data.total})` : ''}`
        : 'Historia przypomnień'}
      maxWidth="2xl"
    >
      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Ładowanie historii…
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-800">
            Błąd: {error}
          </div>
        )}
        {!loading && !error && data && data.total === 0 && (
          <div className="p-6 text-center text-gray-500 text-sm">
            Brak przypomnień dla tej rezerwacji.
          </div>
        )}
        {!loading && !error && data && data.total > 0 && (
          <div className="max-h-[60vh] overflow-y-auto border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">LP</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Data</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Kanał</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Dokumenty</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Rodzaj</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((item, idx) => {
                  const b = channelBadge(item.channel);
                  const Icon = b.Icon;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-500 tabular-nums">{idx + 1}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${b.className}`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {b.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {docTypeLabel(item.document_type)}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">
                        {item.bulk ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-800">
                            Bulk
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Pojedynczo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </UniversalModal>
  );
}

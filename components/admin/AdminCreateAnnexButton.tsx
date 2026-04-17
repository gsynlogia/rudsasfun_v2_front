'use client';

import { useState } from 'react';
import { FileText, X, Save } from 'lucide-react';

import { authenticatedApiCall } from '@/utils/api-auth';

interface Props {
  reservationId: number;
  /** Status umowy — przycisk tworzenia aneksu widoczny tylko gdy umowa zaakceptowana */
  contractStatus?: string | null;
  /** Callback po pomyślnym utworzeniu — rodzic odświeża listę aneksów / snapshot */
  onCreated?: () => void;
}

/**
 * §16.C3 — admin tworzy aneks promocyjny do podpisanej umowy.
 * Widoczny tylko gdy `contract_status === 'accepted'` (nie ma sensu tworzyć aneksu
 * bez podpisanej umowy).
 *
 * Aneks = HTML + snapshot w `signed_documents`, email do opiekuna1 (BEZ SMS, BEZ PDF).
 * Zgodnie z §14.12.
 */
export default function AdminCreateAnnexButton({ reservationId, contractStatus, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (contractStatus !== 'accepted') return null;

  const closeModal = () => {
    setOpen(false);
    setSummary('');
    setMessage(null);
  };

  const handleCreate = async () => {
    const trimmed = summary.trim();
    if (trimmed.length < 5) {
      setMessage({ type: 'err', text: 'Opis zmiany musi mieć co najmniej 5 znaków.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await authenticatedApiCall<{ ok: boolean; annex_id: number; recipient: string }>(
        '/api/annexes/promotion-annex',
        {
          method: 'POST',
          body: JSON.stringify({ reservation_id: reservationId, change_summary: trimmed }),
        },
      );
      setMessage({ type: 'ok', text: `Aneks utworzony (ID ${res.annex_id}). Email wysłany do: ${res.recipient}.` });
      onCreated?.();
      setTimeout(() => closeModal(), 2000);
    } catch (e: unknown) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Błąd tworzenia aneksu' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-[#00adee] text-white rounded-md hover:bg-[#0099d6] text-sm font-medium flex items-center gap-2"
      >
        <FileText className="w-4 h-4" /> Utwórz aneks promocyjny
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
            <div className="sticky top-0 bg-blue-50 border-b-2 border-[#00adee] px-6 py-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00adee]" /> Nowy aneks promocyjny
              </h2>
              <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-600">
                Aneks zostanie dodany do podpisanej umowy klienta. Email z linkiem akceptacji zostanie wysłany do opiekuna 1 (bez SMS).
                Nie zmienia widoku istniejącej umowy.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opis zmiany <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={5}
                  placeholder="np. Dodany kod rabatowy 2KOTY — 120 zł do wykorzystania w sklepiku Radsas Fun"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#00adee] min-h-[100px]"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 5 znaków.</p>
              </div>
              {message && (
                <p className={`text-sm ${message.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                  {message.text}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                disabled={saving}
              >
                Anuluj
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || summary.trim().length < 5}
                className="px-4 py-2 bg-[#00adee] text-white rounded-md hover:bg-[#0099d6] text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Tworzenie…' : 'Utwórz aneks'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

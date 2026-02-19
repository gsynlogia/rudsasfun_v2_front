'use client';

import { useState } from 'react';

import { authenticatedApiCall } from '@/utils/api-auth';

export interface RejectDocumentPanelContentProps {
  documentId: number;
  onSuccess: () => void;
  onCancel: () => void;
  notifyEmail?: boolean;
  notifySms?: boolean;
}

/** Formularz uzasadnienia odrzucenia dokumentu (umowa lub karta) – wyświetlany w prawym panelu. */
export function RejectDocumentPanelContent({
  documentId,
  onSuccess,
  onCancel,
  notifyEmail,
  notifySms,
}: RejectDocumentPanelContentProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      alert('Podaj uzasadnienie odrzucenia');
      return;
    }
    if (trimmed.length < 5) {
      alert('Uzasadnienie musi mieć co najmniej 5 znaków');
      return;
    }
    setSubmitting(true);
    try {
      const body: { status: string; rejection_reason: string; notify_email: boolean; notify_sms: boolean } = {
        status: 'rejected',
        rejection_reason: trimmed,
        notify_email: notifyEmail !== false,
        notify_sms: notifySms === true,
      };
      await authenticatedApiCall(`/api/signed-documents/${documentId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd podczas odrzucania dokumentu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <label className="block text-sm font-medium text-gray-700">Uzasadnienie odrzucenia</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Podaj uzasadnienie odrzucenia..."
        className="w-full h-32 p-2 border border-gray-300 rounded text-gray-900"
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 cursor-pointer"
        >
          Anuluj
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Zapisywanie...' : 'Zapisz'}
        </button>
      </div>
    </div>
  );
}
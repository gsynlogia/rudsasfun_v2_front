'use client';

import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { authenticatedFetch } from '@/lib/utils/api';

/**
 * Przycisk „Wyjazd przed zakończeniem" w detalu rezerwacji (Trello 344) — z ŁADNYM modalem (spójnym
 * z listami transportowymi), zamiast natywnego window.prompt. Oznaczenie → modal z powodem; Odznaczenie
 * → od razu (bez pytania). Zapisuje to samo pole co listy (transport_early_leave + _note), endpoint wspólny.
 */
export default function EarlyLeaveButton({
  reservationId, active, onChanged,
}: {
  reservationId: number;
  active: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const apply = async (early: boolean, reason: string | null) => {
    setSaving(true);
    try {
      await authenticatedFetch(`/api/transport-lists/reservations/${reservationId}/early-leave`, {
        method: 'PATCH',
        body: JSON.stringify({ early_leave: early, note: reason }),
      });
      await onChanged();
      setOpen(false);
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  const handleClick = () => {
    if (active) apply(false, null);          // odznacz — bez pytania o powód
    else { setNote(''); setOpen(true); }     // oznacz — ładny modal z powodem
  };

  return (
    <>
      <button
        type="button"
        data-testid="early-leave-toggle"
        onClick={handleClick}
        disabled={saving}
        className={`rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
          active
            ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            : 'bg-red-600 text-white hover:bg-red-700'}`}
      >
        {active ? 'Odznacz' : 'Oznacz wyjazd przed zakończeniem'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="early-leave-modal">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="text-base font-semibold text-gray-800">Wyjazd przed zakończeniem</h3>
            </div>
            <div className="px-5 py-4">
              <p className="mb-3 text-sm text-gray-600">Uczestnik zostanie wykluczony z transportu powrotnego. Podaj powód:</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                autoFocus
                placeholder="np. odbiór rodzica w trakcie turnusu"
                className="w-full rounded border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40"
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
              <button type="button" onClick={() => setOpen(false)} disabled={saving}
                className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                Anuluj
              </button>
              <button type="button" data-testid="early-leave-confirm" onClick={() => apply(true, note.trim() || null)} disabled={saving}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Zapisywanie…' : 'Oznacz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

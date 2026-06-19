'use client';

/**
 * Modal „Dodaj połączenie" (Nr 30) — wybór turnusów/tagów + kierunek + data (TagConnectionModal z makiety).
 * Połączenie = kombinacja turnusów jednego kierunku (U7: nie mieszamy przyjazdu z powrotem). Nazwa = tagi złączone „+".
 */
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { Connection, Direction } from '@/lib/types/transportLists';
import { getAvailableTags, createConnection } from '@/lib/services/transportListsApi';

interface Props {
  defaultDirection: Direction;
  onClose: () => void;
  onCreated: (conn: Connection) => void;
}

export default function AddConnectionModal({ defaultDirection, onClose, onCreated }: Props) {
  const [tags, setTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [direction, setDirection] = useState<Direction>(defaultDirection);
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getAvailableTags().then(setTags).catch(() => setTags([])); }, []);

  const name = useMemo(() => [...selected].join('+'), [selected]);

  const toggle = (tag: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  async function handleSave() {
    setError(null);
    if (selected.size === 0) { setError('Wybierz co najmniej jeden turnus.'); return; }
    setSaving(true);
    try {
      const conn = await createConnection({
        name, tags: [...selected].join(','), direction, date: date || null,
      });
      onCreated(conn);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd tworzenia połączenia');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="connection-modal">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Dodaj połączenie</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">Kierunek</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDirection('arrival')}
              className={`flex-1 rounded-md border px-2 py-1.5 text-sm ${
                direction === 'arrival' ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-gray-300 text-gray-700'}`}>
              Przyjazd do ośrodka
            </button>
            <button type="button" onClick={() => setDirection('return')}
              className={`flex-1 rounded-md border px-2 py-1.5 text-sm ${
                direction === 'return' ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-gray-300 text-gray-700'}`}>
              Powrót z ośrodka
            </button>
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">Turnusy</label>
          <div className="flex flex-wrap gap-1.5" data-testid="tag-options">
            {tags.map((t) => (
              <button key={t} type="button" onClick={() => toggle(t)}
                className={`rounded-md border px-2.5 py-1 text-sm ${
                  selected.has(t) ? 'border-sky-600 bg-sky-600 text-white' : 'border-gray-300 text-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">Data (opcjonalnie)</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </div>

        {name && <p className="mb-2 text-sm text-gray-500">Nazwa połączenia: <span className="font-semibold">{name}</span></p>}
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Anuluj</button>
          <button type="button" onClick={handleSave} disabled={saving} data-testid="connection-save"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? 'Tworzenie…' : 'Dodaj połączenie'}
          </button>
        </div>
      </div>
    </div>
  );
}

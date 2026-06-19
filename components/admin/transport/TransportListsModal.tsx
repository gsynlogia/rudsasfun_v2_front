'use client';

/**
 * Modal „Listy" (Nr 34) — historia wypuszczonych list (TransportListsModal z makiety).
 * Filtry: szukaj (ID/nagłówek), kierunek (DO/POWRÓT), status (robocza/zatwierdzona). Akcja: usuń listę (delete — dorobione).
 */
import { X, Trash2, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { TransportListSummary } from '@/lib/types/transportLists';
import { listHistory, deleteList } from '@/lib/services/transportListsApi';

export default function TransportListsModal({ onClose }: { onClose: () => void }) {
  const [lists, setLists] = useState<TransportListSummary[]>([]);
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLists(await listHistory({ search: search || undefined, direction: direction || undefined, status: status || undefined }));
    } catch { setLists([]); }
    setLoading(false);
  }, [search, direction, status]);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(id: number) {
    await deleteList(id);
    await load();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="lists-modal">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold">Listy transportowe — historia</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
          <div className="flex flex-1 items-center gap-1 rounded border border-gray-300 px-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj po ID / nagłówku"
              className="flex-1 py-1.5 text-sm outline-none" data-testid="lists-search" />
          </div>
          <select value={direction} onChange={(e) => setDirection(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm">
            <option value="">Kierunek: wszystkie</option>
            <option value="arrival">DO ośrodka</option>
            <option value="return">POWRÓT</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm">
            <option value="">Status: wszystkie</option>
            <option value="robocza">Robocza</option>
            <option value="zatwierdzona">Zatwierdzona</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto px-5 py-3">
          {loading && <p className="py-6 text-center text-gray-500">Ładowanie…</p>}
          {!loading && lists.length === 0 && (
            <p className="py-6 text-center text-gray-400" data-testid="lists-empty">Brak wypuszczonych list.</p>
          )}
          <ul className="flex flex-col gap-2">
            {lists.map((l) => (
              <li key={l.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2"
                data-testid="list-row">
                <div>
                  <div className="font-mono text-sm font-medium text-gray-800">{l.list_id ?? `lista-${l.id}`}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                    <span className={`rounded px-1.5 py-0.5 ${l.direction === 'return' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                      {l.direction === 'return' ? 'POWRÓT' : 'DO ośrodka'}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 ${l.status === 'zatwierdzona' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {l.status === 'zatwierdzona' ? '✓ Zatwierdzona' : 'Robocza'}
                    </span>
                    <span>{l.created_at?.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                </div>
                <button type="button" onClick={() => void handleDelete(l.id)} data-testid="list-delete"
                  title="Usuń listę" className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

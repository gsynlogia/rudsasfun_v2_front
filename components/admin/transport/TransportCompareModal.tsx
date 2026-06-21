'use client';

/**
 * Widok „Porównaj" (Nr 35) — zestawienie DOKŁADNIE 2 połączeń obok siebie (rozkaz Pana: max 2).
 * Krok 1: wybór 2 połączeń checkboxami (limit 2). Krok 2: tabele liczb per miasto side-by-side.
 */
import { X, GitCompare } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Connection, CompareEntry } from '@/lib/types/transportLists';
import { listConnections, compareConnections } from '@/lib/services/transportListsApi';
import { boundedToggle } from '@/lib/utils/transportSelection';

const COMPARE_MAX = 2;   // rozkaz Pana 2026-06-21: porównanie ograniczone do max 2

export default function TransportCompareModal({ onClose }: { onClose: () => void }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<CompareEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { listConnections().then(setConnections).catch(() => setConnections([])); }, []);

  const toggle = (id: number) => setSelected((prev) => boundedToggle(prev, id, COMPARE_MAX));

  async function handleCompare() {
    setError(null);
    try { setResult(await compareConnections([...selected])); }
    catch (e) { setError(e instanceof Error ? e.message : 'Błąd porównania'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="compare-modal">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <GitCompare className="h-5 w-5 text-violet-600" /> Porównanie połączeń
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {!result ? (
            <>
              <p className="mb-2 text-sm text-gray-600">Zaznacz dokładnie 2 połączenia do porównania (max 2):</p>
              <ul className="flex flex-col gap-1.5" data-testid="compare-options">
                {connections.map((c) => {
                  const limitReached = selected.size >= COMPARE_MAX && !selected.has(c.id);
                  return (
                  <li key={c.id}>
                    <label className={`flex items-center gap-2 rounded border border-gray-200 px-3 py-2 text-sm ${limitReached ? 'opacity-40' : ''}`}>
                      <input type="checkbox" checked={selected.has(c.id)} disabled={limitReached} onChange={() => toggle(c.id)} />
                      <span className="font-medium">{c.name}</span>
                      <span className={`rounded px-1.5 py-0.5 text-xs ${c.direction === 'return' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                        {c.direction === 'return' ? 'POWRÓT' : 'DO ośrodka'}
                      </span>
                      {c.date && <span className="text-xs text-gray-500">{c.date}</span>}
                    </label>
                  </li>
                  );
                })}
              </ul>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${result.length}, minmax(220px, 1fr))` }}
              data-testid="compare-grid">
              {result.map((e) => {
                const total = e.cities.reduce((s, c) => s + c.razem, 0);
                return (
                  <div key={e.connection_id} className="rounded-lg border border-gray-200">
                    <div className="border-b bg-gray-50 px-3 py-2">
                      <div className="font-semibold">{e.name}</div>
                      <div className="text-xs text-gray-500">{e.direction === 'return' ? 'POWRÓT' : 'DO ośrodka'} · ŁĄCZNIE {total}</div>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500"><th className="px-2 py-1">Przystanek</th><th className="px-2 py-1 text-right">Łącznie</th></tr>
                      </thead>
                      <tbody>
                        {e.cities.map((c) => (
                          <tr key={c.transport_city_id ?? c.city} className="border-t border-gray-50">
                            <td className="px-2 py-1">{c.city}</td>
                            <td className="px-2 py-1 text-right font-medium tabular-nums">{c.razem}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          {result
            ? <button type="button" onClick={() => setResult(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Wróć do wyboru</button>
            : (
              <button type="button" onClick={() => void handleCompare()} disabled={selected.size < 2} data-testid="compare-run"
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                Porównaj ({selected.size})
              </button>
            )}
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Zamknij</button>
        </div>
      </div>
    </div>
  );
}

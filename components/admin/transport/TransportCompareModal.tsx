'use client';

/**
 * Widok „Porównaj" (Nr 35) — zestawienie DOKŁADNIE 2 połączeń obok siebie (rozkaz Pana: max 2).
 * Krok 1: wybór 2 połączeń checkboxami (limit 2). Krok 2: tabele liczb per miasto side-by-side.
 */
import { X, GitCompare, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // BUG 016: przekładanie kolumn (←/→) i usuwanie kolumny z porównania (X). Usunięcie ostatniej → powrót do wyboru.
  const moveColumn = (idx: number, dir: -1 | 1) => setResult((r) => {
    if (!r) return r;
    const j = idx + dir;
    if (j < 0 || j >= r.length) return r;
    const n = [...r]; [n[idx], n[j]] = [n[j], n[idx]]; return n;
  });
  const removeColumn = (idx: number) => setResult((r) => {
    if (!r) return r;
    const n = r.filter((_, i) => i !== idx);
    return n.length ? n : null;
  });

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
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${result.length}, minmax(240px, 1fr))` }}
              data-testid="compare-grid">
              {result.map((e, idx) => {
                const total = e.cities.reduce((s, c) => s + c.razem, 0);
                const isReturn = e.direction === 'return';
                return (
                  <div key={e.connection_id} data-testid="compare-column"
                    className={`overflow-hidden rounded-lg border-2 ${isReturn ? 'border-amber-200' : 'border-sky-200'}`}>
                    <div className={`flex items-start justify-between gap-1 border-b px-3 py-2 ${isReturn ? 'bg-amber-50' : 'bg-sky-50'}`}>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900">{e.name}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                          <span className={`rounded px-1.5 py-0.5 font-medium ${isReturn ? 'bg-amber-200 text-amber-800' : 'bg-sky-200 text-sky-800'}`}>
                            {isReturn ? 'POWRÓT' : 'DO ośrodka'}
                          </span>
                          <span className="font-bold tabular-nums text-gray-700">ŁĄCZNIE {total}</span>
                        </div>
                      </div>
                      {/* BUG 016: przekładanie + usuwanie kolumny porównania */}
                      <div className="flex shrink-0 gap-0.5">
                        <button type="button" onClick={() => moveColumn(idx, -1)} disabled={idx === 0}
                          data-testid="compare-move-left" title="Przesuń w lewo"
                          className="rounded p-1 text-gray-500 hover:bg-white disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                        <button type="button" onClick={() => moveColumn(idx, 1)} disabled={idx === result.length - 1}
                          data-testid="compare-move-right" title="Przesuń w prawo"
                          className="rounded p-1 text-gray-500 hover:bg-white disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                        <button type="button" onClick={() => removeColumn(idx)}
                          data-testid="compare-remove" title="Usuń z porównania"
                          className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" /></button>
                      </div>
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

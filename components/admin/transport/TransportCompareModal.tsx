'use client';

/**
 * Widok „Porównaj" (Nr 35 + karta „11. Porównaj") — zestawienie 2..6 połączeń obok siebie.
 * Karta Radka/Krzysztofa: porównaj 3+ transporty, miasta w kolejności trasowej (display_order),
 * kolory per miasto, „0 gdy transport nie występuje — miasta na tym samym poziomie" (wyrównane wiersze).
 */
import { X, GitCompare, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Connection, CompareEntry } from '@/lib/types/transportLists';
import { listConnections, compareConnections } from '@/lib/services/transportListsApi';
import { boundedToggle, swapAdjacent, removeAt } from '@/lib/utils/transportSelection';
import { routeRowClasses } from '@/lib/utils/transportRouteColors';

const COMPARE_MAX = 6;   // Szymon 2026-09-14: 3+ transporty (zdjęty stary limit 2 z 2026-06-21). Górny 6 = czytelność UI.

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
  // Czysta logika w pure helperach swapAdjacent/removeAt (transportSelection — testowane jednostkowo).
  const moveColumn = (idx: number, dir: -1 | 1) => setResult((r) => (r ? swapAdjacent(r, idx, dir) : r));
  const removeColumn = (idx: number) => setResult((r) => {
    if (!r) return r;
    const n = removeAt(r, idx);
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
              <p className="mb-2 text-sm text-gray-600">Zaznacz od 2 do {COMPARE_MAX} połączeń do porównania:</p>
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
            (() => {
              // Karta „11. Porównaj" (wzór Radka): jedna wyrównana tabela — miasta w wierszach w kolejności
              // trasowej (display_order), z kolorami per miasto; każde połączenie w osobnej kolumnie pokazuje
              // liczbę lub „0" (miasta na tym samym poziomie). Wiersz RAZEM na dole.
              const cityMeta = new Map<string, { order: number; color: string | null }>();
              result.forEach((e) => e.cities.forEach((c) => {
                if (!cityMeta.has(c.city)) cityMeta.set(c.city, { order: c.display_order ?? 9999, color: c.route_color });
              }));
              const allCities = [...cityMeta.entries()]
                .sort((a, b) => (a[1].order - b[1].order) || a[0].localeCompare(b[0], 'pl'))
                .map(([city]) => city);
              const countFor = (e: CompareEntry, city: string) => e.cities.find((c) => c.city === city)?.razem ?? 0;
              const colTotal = (e: CompareEntry) => e.cities.reduce((s, c) => s + c.razem, 0);
              return (
                <div className="overflow-auto" data-testid="compare-grid">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-semibold text-gray-700">Miasto</th>
                        {result.map((e, idx) => {
                          const isReturn = e.direction === 'return';
                          return (
                            <th key={e.connection_id} data-testid="compare-column"
                              className={`px-2 py-2 text-center align-top ${isReturn ? 'bg-amber-50' : 'bg-sky-50'}`}>
                              <div className="flex items-center justify-center gap-0.5">
                                <button type="button" onClick={() => moveColumn(idx, -1)} disabled={idx === 0}
                                  data-testid="compare-move-left" title="W lewo"
                                  className="rounded p-0.5 text-gray-500 hover:bg-white disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" /></button>
                                <span className="max-w-[150px] truncate font-semibold text-gray-900">{e.name}</span>
                                <button type="button" onClick={() => moveColumn(idx, 1)} disabled={idx === result.length - 1}
                                  data-testid="compare-move-right" title="W prawo"
                                  className="rounded p-0.5 text-gray-500 hover:bg-white disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => removeColumn(idx)}
                                  data-testid="compare-remove" title="Usuń z porównania"
                                  className="rounded p-0.5 text-gray-500 hover:bg-red-50 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                              </div>
                              <div className="mt-0.5">
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${isReturn ? 'bg-amber-200 text-amber-800' : 'bg-sky-200 text-sky-800'}`}>
                                  {isReturn ? 'POWRÓT' : 'DO ośrodka'}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {allCities.map((city) => {
                        const bg = routeRowClasses(cityMeta.get(city)?.color, false);
                        return (
                          <tr key={city} className={`border-t border-gray-100 ${bg}`}>
                            <td className="sticky left-0 z-10 bg-inherit px-2 py-1 font-medium text-gray-800">{city}</td>
                            {result.map((e) => {
                              const n = countFor(e, city);
                              return (
                                <td key={e.connection_id}
                                  className={`px-2 py-1 text-center tabular-nums ${n === 0 ? 'text-gray-300' : 'font-medium text-gray-900'}`}>
                                  {n}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 font-bold">
                        <td className="sticky left-0 z-10 bg-white px-2 py-1.5 text-gray-800">RAZEM</td>
                        {result.map((e) => (
                          <td key={e.connection_id} className="px-2 py-1.5 text-center tabular-nums text-gray-900">{colTotal(e)}</td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()
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

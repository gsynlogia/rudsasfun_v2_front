'use client';

/**
 * Panel ŚRODKOWY „Uczestnicy" (Nr 25) — imienna lista z 5 kolumnami + filtr i sort na każdej (U3).
 * Kolumny: UCZESTNIK | TEMAT OBOZU | PRZYSTANEK | TAG | REGION. Nieprzypisani u góry, przypisani wyszarzeni.
 * Drag&drop + „przenieś do taboru" + select-by-theme = Nr 26.
 */
import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ParticipantRow } from '@/lib/types/transportLists';

type SortDir = 'asc' | 'desc';

interface Column {
  key: string;
  label: string;
  get: (p: ParticipantRow) => string;
}

const COLUMNS: Column[] = [
  { key: 'uczestnik', label: 'Uczestnik', get: (p) => `${p.last_name ?? ''} ${p.first_name ?? ''}`.trim() },
  { key: 'temat', label: 'Temat obozu', get: (p) => p.topic ?? '' },
  { key: 'przystanek', label: 'Przystanek', get: (p) => p.city ?? '' },
  { key: 'tag', label: 'Tag', get: (p) => p.tag ?? '' },
  { key: 'region', label: 'Region', get: (p) => p.region ?? '' },
];

export default function ParticipantsPanel({ participants }: { participants: ParticipantRow[] }) {
  const [sortKey, setSortKey] = useState<string>('uczestnik');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const toggleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const rows = useMemo(() => {
    const col = (k: string) => COLUMNS.find((c) => c.key === k)!;
    const filtered = participants.filter((p) =>
      COLUMNS.every((c) => {
        const f = (filters[c.key] ?? '').trim().toLowerCase();
        return !f || c.get(p).toLowerCase().includes(f);
      }));
    const sc = col(sortKey);
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      // nieprzypisani u góry (U3), potem wg wybranej kolumny
      if (a.is_assigned !== b.is_assigned) return a.is_assigned ? 1 : -1;
      return sc.get(a).localeCompare(sc.get(b), 'pl') * dir;
    });
  }, [participants, filters, sortKey, sortDir]);

  if (participants.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Brak uczestników dla tego połączenia.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 text-xs text-gray-500" data-testid="participants-count">
        Uczestników: <span className="font-semibold">{rows.length}</span> / {participants.length}
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm" data-testid="participants-table">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-2 py-2">
                  <button type="button" onClick={() => toggleSort(c.key)}
                    className="flex items-center gap-1 hover:text-gray-800">
                    {c.label}
                    {sortKey === c.key
                      ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
                      : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                  </button>
                </th>
              ))}
            </tr>
            <tr className="border-b border-gray-100">
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-1 pb-1">
                  <input type="text" placeholder="filtr…"
                    value={filters[c.key] ?? ''}
                    onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                    className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs font-normal" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={`${p.reservation_id}`}
                className={`border-b border-gray-50 hover:bg-sky-50 ${p.is_assigned ? 'opacity-60' : ''}`}>
                <td className="px-2 py-1.5 font-medium text-gray-800">
                  {p.last_name} {p.first_name}
                </td>
                <td className="px-2 py-1.5 text-gray-700">{p.topic ?? '—'}</td>
                <td className="px-2 py-1.5 text-gray-700">{p.city ?? '—'}</td>
                <td className="px-2 py-1.5">
                  {p.tag && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-700">{p.tag}</span>}
                </td>
                <td className="px-2 py-1.5 text-xs text-gray-500">{p.region ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

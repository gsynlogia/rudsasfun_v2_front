'use client';

/**
 * Panel ŚRODKOWY „Uczestnicy" (Nr 25-26) — imienna lista 5 kolumn + filtr/sort + wsadzanie do taboru.
 * Nr 25: kolumny UCZESTNIK|TEMAT|PRZYSTANEK|TAG|REGION + filtr i sort na każdej; nieprzypisani u góry, przypisani wyszarzeni.
 * Nr 26: gdy tabor otwarty (assignMode) → checkboxy zaznaczania + „Przenieś do taboru (N)" + „Zaznacz tematami" + drag&drop.
 */
import { ChevronsUpDown, ChevronUp, ChevronDown, MoveRight, AlertTriangle } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ParticipantRow } from '@/lib/types/transportLists';

type SortDir = 'asc' | 'desc';

interface Column { key: string; label: string; get: (p: ParticipantRow) => string; }

const COLUMNS: Column[] = [
  { key: 'uczestnik', label: 'Uczestnik', get: (p) => `${p.last_name ?? ''} ${p.first_name ?? ''}`.trim() },
  { key: 'temat', label: 'Temat obozu', get: (p) => p.topic ?? '' },
  { key: 'przystanek', label: 'Przystanek', get: (p) => p.city ?? '' },
  { key: 'tag', label: 'Tag', get: (p) => p.tag ?? '' },
  { key: 'region', label: 'Region', get: (p) => p.region ?? '' },
];

interface Props {
  participants: ParticipantRow[];
  assignMode: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (rid: number) => void;
  onAssignSelected: () => void;
  onEarlyLeave: (rid: number) => void;
}

export default function ParticipantsPanel(
  { participants, assignMode, selectedIds, onToggleSelect, onAssignSelected, onEarlyLeave }: Props,
) {
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
      if (a.is_assigned !== b.is_assigned) return a.is_assigned ? 1 : -1; // nieprzypisani u góry
      return sc.get(a).localeCompare(sc.get(b), 'pl') * dir;
    });
  }, [participants, filters, sortKey, sortDir]);

  const unassignedVisible = rows.filter((p) => !p.is_assigned);
  const themes = useMemo(
    () => Array.from(new Set(unassignedVisible.map((p) => p.topic).filter(Boolean))) as string[],
    [unassignedVisible],
  );

  const selectAllUnassigned = () => {
    unassignedVisible.forEach((p) => { if (!selectedIds.has(p.reservation_id)) onToggleSelect(p.reservation_id); });
  };
  const selectByTheme = (theme: string) => {
    unassignedVisible.forEach((p) => {
      if (p.topic === theme && !selectedIds.has(p.reservation_id)) onToggleSelect(p.reservation_id);
    });
  };

  if (participants.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Brak uczestników dla tego połączenia.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500" data-testid="participants-count">
          Uczestników: <span className="font-semibold">{rows.length}</span> / {participants.length}
        </span>
        {assignMode && (
          <div className="flex items-center gap-2">
            <select className="rounded border border-gray-300 px-1.5 py-1 text-xs" defaultValue=""
              data-testid="select-by-theme"
              onChange={(e) => { if (e.target.value) { selectByTheme(e.target.value); e.target.value = ''; } }}>
              <option value="">Zaznacz tematami…</option>
              {themes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="button" onClick={onAssignSelected} disabled={selectedIds.size === 0}
              data-testid="assign-selected"
              className="flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">
              <MoveRight className="h-3.5 w-3.5" /> Przenieś do taboru ({selectedIds.size})
            </button>
          </div>
        )}
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm" data-testid="participants-table">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              {assignMode && (
                <th className="px-1 py-2">
                  <input type="checkbox" aria-label="Zaznacz wszystkich nieprzypisanych"
                    checked={unassignedVisible.length > 0 && unassignedVisible.every((p) => selectedIds.has(p.reservation_id))}
                    onChange={selectAllUnassigned} />
                </th>
              )}
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-2 py-2">
                  <button type="button" onClick={() => toggleSort(c.key)} className="flex items-center gap-1 hover:text-gray-800">
                    {c.label}
                    {sortKey === c.key
                      ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
                      : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                  </button>
                </th>
              ))}
              {!assignMode && <th className="px-2 py-2 text-right">Akcja</th>}
            </tr>
            <tr className="border-b border-gray-100">
              {assignMode && <th />}
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-1 pb-1">
                  <input type="text" placeholder="filtr…" value={filters[c.key] ?? ''}
                    onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                    className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs font-normal" />
                </th>
              ))}
              {!assignMode && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={`${p.reservation_id}`}
                draggable={assignMode && !p.is_assigned}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', String(p.reservation_id))}
                className={`border-b border-gray-50 hover:bg-sky-50 ${p.is_assigned ? 'opacity-60' : ''} ${
                  assignMode && !p.is_assigned ? 'cursor-grab' : ''}`}>
                {assignMode && (
                  <td className="px-1 py-1.5">
                    {!p.is_assigned && (
                      <input type="checkbox" aria-label={`Zaznacz ${p.last_name} ${p.first_name}`}
                        checked={selectedIds.has(p.reservation_id)}
                        onChange={() => onToggleSelect(p.reservation_id)} />
                    )}
                  </td>
                )}
                <td className="px-2 py-1.5 font-medium text-gray-800">{p.last_name} {p.first_name}</td>
                <td className="px-2 py-1.5 text-gray-700">{p.topic ?? '—'}</td>
                <td className="px-2 py-1.5 text-gray-700">{p.city ?? '—'}</td>
                <td className="px-2 py-1.5">
                  {p.tag && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-700">{p.tag}</span>}
                </td>
                <td className="px-2 py-1.5 text-xs text-gray-500">{p.region ?? '—'}</td>
                {!assignMode && (
                  <td className="px-2 py-1.5 text-right">
                    <button type="button" title="Wyjazd przed zakończeniem" data-testid="early-leave-btn"
                      onClick={() => onEarlyLeave(p.reservation_id)}
                      className="rounded bg-red-600 px-1.5 py-1 text-white hover:bg-red-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

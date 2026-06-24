'use client';

/**
 * Panel ŚRODKOWY „Uczestnicy" — 1:1 z makietą Figma (ParticipantsPanel.tsx).
 * Trzy stany (jak makieta):
 *  1. PUSTY — gdy nic nie zaznaczone i brak otwartego taboru („Zaznacz miasto lub ośrodek...").
 *  2. CYFRY — wielka liczba ŁĄCZNIE zaznaczonych (panelMode='numbers').
 *  3. UCZESTNICY — tabela UCZESTNIK|TEMAT OBOZU|PRZYSTANEK|MIASTO|TAG + floating badge ŁĄCZNIE.
 * Tabor otwarty (assignMode) → checkboxy zaznaczania + „Przenieś do taboru" + drag&drop (Nr 26).
 * Dane realne z bazy; mock makiety ignorowany. MIASTO = participant_city (zamieszkania).
 */
import { Filter, ChevronsUpDown, ChevronUp, ChevronDown, MoveRight, AlertTriangle } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ParticipantRow } from '@/lib/types/transportLists';
import {
  canReassignParticipant, distinctSorted, idsToToggleForMaster, compareDefaultTransportOrder,
} from '@/lib/utils/transportSelection';

type SortDir = 'asc' | 'desc';
type PanelMode = 'numbers' | 'participants';

// BUG 006: domyślny tryb sortowania = przystanek → Beaver/Sawa/Limba → nazwisko (gdy admin nic nie kliknął).
const DEFAULT_SORT = '__default__';

interface Column { key: string; label: string; get: (p: ParticipantRow) => string; }

const COLUMNS: Column[] = [
  { key: 'uczestnik', label: 'Uczestnik', get: (p) => `${p.last_name ?? ''} ${p.first_name ?? ''}`.trim() },
  { key: 'temat', label: 'Temat obozu', get: (p) => p.topic ?? '' },
  { key: 'przystanek', label: 'Przystanek', get: (p) => p.city ?? '' },
  { key: 'miasto', label: 'Miasto', get: (p) => p.participant_city ?? '' },
  { key: 'tag', label: 'Tag', get: (p) => p.tag ?? '' },
  // Dodatkowe kolumny z procesu rezerwacji (domyślnie ukryte — włączane w „Tabeli").
  { key: 'rocznik', label: 'Rocznik', get: (p) => (p.age != null ? String(p.age) : '') },
  { key: 'plec', label: 'Płeć', get: (p) => p.gender ?? '' },
  { key: 'opiekun', label: 'Opiekun', get: (p) => p.guardian ?? '' },
  { key: 'kontakt', label: 'Kontakt', get: (p) => p.guardian_contact ?? '' },
  { key: 'uwagi', label: 'Uwagi', get: (p) => p.additional_info ?? '' },
];

// Konfiguracja kolumn („Tabela", localStorage). Wszystkie dostępne; domyślnie widoczne tylko pierwsze 5.
export const PARTICIPANT_COLUMN_META = COLUMNS.map((c) => ({ key: c.key, label: c.label }));
export const DEFAULT_VISIBLE_COLUMNS = ['uczestnik', 'temat', 'przystanek', 'miasto', 'tag'];

/** Kolor tagu wg makiety: B*→zielony, S*→niebieski, L*→pomarańczowy. */
function tagColor(tag: string | null): string {
  const t = (tag ?? '').toUpperCase();
  if (t.startsWith('B')) return 'bg-[#228629]';
  if (t.startsWith('S')) return 'bg-[#00adee]';
  if (t.startsWith('L')) return 'bg-[#ff8c00]';
  return 'bg-gray-500';
}

interface Props {
  participants: ParticipantRow[];        // już przefiltrowani do zaznaczenia (lub wszyscy w assignMode)
  panelMode: PanelMode;
  hasSelection: boolean;
  selectedTotal: number;
  assignMode: boolean;
  selectedIds: Set<number>;
  transferCities: Set<string>;           // G01: przystanki oznaczone jako przesiadkowe (hub Toruń)
  visibleColumns: string[];              // „Tabela": klucze widocznych kolumn
  onToggleSelect: (rid: number) => void;
  onAssignSelected: () => void;
  onEarlyLeave: (rid: number) => void;
  onOpenReservation: (reservationNumber: string | null) => void;
}

export default function ParticipantsPanel({
  participants, panelMode, hasSelection, selectedTotal, assignMode, selectedIds, transferCities,
  visibleColumns, onToggleSelect, onAssignSelected, onEarlyLeave, onOpenReservation,
}: Props) {
  const [sortKey, setSortKey] = useState<string>(DEFAULT_SORT);   // BUG 006: domyślnie przystanek→resort→nazwisko
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const toggleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Filtr = lista rozwijana (film): wybrana wartość = DOKŁADNE dopasowanie (nie substring).
  const columnOptions = useMemo(() => {
    const opts: Record<string, string[]> = {};
    for (const c of COLUMNS) opts[c.key] = distinctSorted(participants.map((p) => c.get(p)));
    return opts;
  }, [participants]);

  const rows = useMemo(() => {
    const col = (k: string) => COLUMNS.find((c) => c.key === k)!;
    const filtered = participants.filter((p) =>
      COLUMNS.every((c) => {
        const f = (filters[c.key] ?? '').trim();
        return !f || c.get(p).trim() === f;
      }));
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (a.is_assigned !== b.is_assigned) return a.is_assigned ? 1 : -1; // nieprzypisani u góry
      // BUG 006: bez ręcznie wybranej kolumny — domyślne sortowanie przystanek→Beaver/Sawa/Limba→nazwisko.
      if (sortKey === DEFAULT_SORT) return compareDefaultTransportOrder(a, b);
      return col(sortKey).get(a).localeCompare(col(sortKey).get(b), 'pl') * dir;
    });
  }, [participants, filters, sortKey, sortDir]);

  // STAN 1 — pusty (makieta: Filter 48px + tekst). Gdy tabor otwarty pokazujemy tabelę mimo braku zaznaczenia.
  if (!hasSelection && !assignMode) {
    return (
      <div className="flex h-full items-center justify-center py-20" data-testid="participants-empty">
        <div className="text-center">
          <Filter size={48} className="mx-auto mb-2 text-gray-400" />
          <p className="font-medium text-gray-500">Zaznacz miasto lub ośrodek po lewej stronie</p>
          <p className="text-sm text-gray-400">aby wyświetlić szczegóły</p>
        </div>
      </div>
    );
  }

  // STAN 2 — Cyfry (makieta: ŁĄCZNIE + wielka liczba). Tylko gdy brak otwartego taboru.
  if (panelMode === 'numbers' && !assignMode) {
    return (
      <div className="flex h-full items-center justify-center py-20" data-testid="participants-numbers">
        <div className="text-center">
          <p className="mb-4 font-medium text-gray-500">ŁĄCZNIE</p>
          <div className="text-8xl font-bold text-[#00adee]" data-testid="selected-total">{selectedTotal}</div>
          <p className="mt-4 text-sm text-gray-400">uczestników</p>
        </div>
      </div>
    );
  }

  // STAN 3 — Uczestnicy (tabela)
  // G01 (film E2): przesiadkowy uczestnik (przystanek ∈ transferCities) może trafić na 2 listy →
  // pozostaje wsadzalny (drag + checkbox) mimo „wyszarzenia" po pierwszym przypisaniu.
  const canAssign = (p: ParticipantRow) => canReassignParticipant(p.is_assigned, p.city, transferCities);
  const unassignedVisible = rows.filter((p) => !p.is_assigned);
  const cols = COLUMNS.filter((c) => visibleColumns.includes(c.key));   // „Tabela": tylko widoczne kolumny
  const show = (key: string) => visibleColumns.includes(key);

  return (
    <div className="relative flex h-full flex-col">
      {assignMode && (
        <div className="mb-2 flex items-center justify-end">
          <button type="button" onClick={onAssignSelected} disabled={selectedIds.size === 0}
            data-testid="assign-selected"
            className="flex items-center gap-1 rounded bg-green-500 px-3 py-1 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50">
            <MoveRight className="h-3.5 w-3.5" /> Przenieś do taboru ({selectedIds.size})
          </button>
        </div>
      )}
      {/* Floating badge ŁĄCZNIE — absolute względem panelu (relative parent), by NIE „uciekał" przy scrollu strony */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-40" data-testid="total-badge">
        <div className="rounded-xl border-2 border-white bg-gradient-to-br from-[#00adee] to-[#0099d6] px-5 py-3 text-white shadow-xl">
          <p className="mb-0.5 text-xs font-medium opacity-90">ŁĄCZNIE</p>
          <div className="text-3xl font-bold leading-none">{selectedTotal}</div>
          <p className="mt-0.5 text-xs opacity-75">uczestników</p>
        </div>
      </div>
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
        <table className="w-full text-sm" data-testid="participants-table">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-700 text-left text-xs font-semibold uppercase tracking-wide text-white">
              {assignMode && (
                <th className="px-3 py-3 text-center" style={{ width: '3rem' }}>
                  {/* BUG 009: master działa w obie strony — drugi klik ODZNACZA wszystkich. */}
                  <input type="checkbox" aria-label="Zaznacz wszystkich nieprzypisanych" data-testid="assign-master"
                    checked={unassignedVisible.length > 0 && unassignedVisible.every((p) => selectedIds.has(p.reservation_id))}
                    onChange={() => idsToToggleForMaster(selectedIds, unassignedVisible.map((p) => p.reservation_id)).forEach(onToggleSelect)} />
                </th>
              )}
              {cols.map((c) => (
                <th key={c.key} className="relative px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => toggleSort(c.key)} className="hover:opacity-80">{c.label.toUpperCase()}</button>
                    <button type="button" onClick={() => setOpenFilter(openFilter === c.key ? null : c.key)}
                      className="rounded p-0.5 hover:bg-white/20" aria-label={`Filtruj ${c.label}`}>
                      <Filter size={14} />
                    </button>
                    <button type="button" onClick={() => toggleSort(c.key)} className="rounded p-0.5 hover:bg-white/20" aria-label={`Sortuj ${c.label}`}>
                      {sortKey === c.key
                        ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)
                        : <ChevronsUpDown size={14} />}
                    </button>
                  </div>
                  {openFilter === c.key && (
                    <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
                      {/* film: „lista rozwijana, a nie taka wyszukiwarka" */}
                      <select autoFocus value={filters[c.key] ?? ''} data-testid={`filter-select-${c.key}`}
                        onChange={(e) => { setFilters((f) => ({ ...f, [c.key]: e.target.value })); setOpenFilter(null); }}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-normal text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00adee]">
                        <option value="">— wszystkie —</option>
                        {columnOptions[c.key].map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  )}
                </th>
              ))}
              {!assignMode && <th className="px-2 py-3 text-right" style={{ width: '3rem' }} />}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const isSelected = selectedIds.has(p.reservation_id);
              return (
                <tr key={p.reservation_id}
                  draggable={assignMode && canAssign(p)}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', String(p.reservation_id))}
                  data-testid={p.early_leave ? 'early-leave-row' : undefined}
                  className={`border-b transition-colors ${
                    p.early_leave
                      ? 'border-red-300 bg-red-100 ring-1 ring-inset ring-red-400'  // G05: raziło po oczach
                      : `border-gray-200 ${p.is_assigned ? 'bg-gray-100 opacity-60' : isSelected ? 'bg-blue-50' : 'hover:bg-blue-50'}`} ${
                    assignMode && canAssign(p) ? 'cursor-grab' : ''}`}>
                  {assignMode && (
                    <td className="px-3 py-3 text-center">
                      {canAssign(p) && (
                        <input type="checkbox"
                          aria-label={`Zaznacz ${p.last_name} ${p.first_name}`}
                          title={p.is_assigned ? 'Przesiadka — można wsadzić na drugą listę' : undefined}
                          data-testid={p.is_assigned ? 'transfer-reassign' : undefined}
                          checked={isSelected} onChange={() => onToggleSelect(p.reservation_id)} />
                      )}
                    </td>
                  )}
                  {show('uczestnik') && (
                  <td className="px-3 py-3 font-medium">
                    <button type="button" onClick={() => onOpenReservation(p.reservation_number)}
                      className="text-[#00adee] hover:underline" data-testid="participant-link">
                      {`${p.last_name ?? ''} ${p.first_name ?? ''}`.trim() || `#${p.reservation_id}`}
                    </button>
                  </td>
                  )}
                  {show('temat') && <td className="px-3 py-3 text-gray-600">{p.topic || '—'}</td>}
                  {show('przystanek') && <td className="px-3 py-3 text-gray-600">{p.city || '—'}</td>}
                  {show('miasto') && <td className="px-3 py-3 text-gray-600">{p.participant_city || '—'}</td>}
                  {show('tag') && (
                  <td className="px-3 py-3">
                    {p.tag && <span className={`rounded-md px-3 py-1 text-xs font-medium text-white ${tagColor(p.tag)}`}>{p.tag}</span>}
                  </td>
                  )}
                  {show('rocznik') && <td className="px-3 py-3 text-gray-600">{p.age ?? '—'}</td>}
                  {show('plec') && <td className="px-3 py-3 text-gray-600">{p.gender ?? '—'}</td>}
                  {show('opiekun') && <td className="px-3 py-3 text-gray-600">{p.guardian ?? '—'}</td>}
                  {show('kontakt') && <td className="px-3 py-3 text-gray-600">{p.guardian_contact ?? '—'}</td>}
                  {show('uwagi') && <td className="max-w-[220px] truncate px-3 py-3 text-gray-600" title={p.additional_info ?? ''}>{p.additional_info ?? '—'}</td>}
                  {!assignMode && (
                    <td className="px-2 py-3 text-right">
                      <button type="button" title="Wyjazd przed zakończeniem" data-testid="early-leave-btn"
                        onClick={() => onEarlyLeave(p.reservation_id)}
                        className="rounded bg-red-600 p-1 text-white hover:bg-red-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import type { SeasonPeriod } from '@/lib/types/seasons';

/** Przełącznik Aktualne / Archiwalne / Wszystkie — te same wartości co `archive_filter` w API. */
export type ArchiveScope = 'active' | 'archived' | 'all';

export const ARCHIVE_SCOPE_OPTIONS: ReadonlyArray<{ value: ArchiveScope; label: string }> = [
  { value: 'active', label: 'Aktualne' },
  { value: 'archived', label: 'Archiwalne' },
  { value: 'all', label: 'Wszystkie' },
];

export const SEASON_PERIOD_OPTIONS: ReadonlyArray<{ value: SeasonPeriod; label: string }> = [
  { value: 'lato', label: 'Lato' },
  { value: 'zima', label: 'Zima' },
];

/** Wartość z URL → zakres; brak albo nieznana wartość = 'active' (jak na liście Rezerwacji). */
export function parseArchiveScope(value: string | null | undefined): ArchiveScope {
  return value === 'archived' || value === 'all' ? value : 'active';
}

/** Czy turnus mieści się w zakresie przełącznika — turnus bez sezonu traktujemy jak bieżący. */
export function inArchiveScope(seasonArchived: boolean | undefined, scope: ArchiveScope): boolean {
  if (scope === 'all') return true;
  return scope === 'archived' ? seasonArchived === true : seasonArchived !== true;
}

/** ID sezonu z URL — tylko same cyfry (RULES_FRONTEND: liczba z URL po pełnym dopasowaniu). */
export function parseSeasonId(value: string | null | undefined): number | null {
  return value && /^[0-9]{1,9}$/.test(value) ? Number(value) : null;
}
/**
 * Rodzaje statystyk (select rodzaju + routing /admin-panel/statystyka/<slug>).
 * Jedno źródło prawdy — używane przez wszystkie podstrony statystyk (DRY).
 */
export interface StatisticType {
  slug: string;
  label: string;
}

export const STAT_TYPES: StatisticType[] = [
  { slug: 'statystyka-obecnosci', label: 'Statystyka obecności' },
  { slug: 'statystyka-rezerwacji', label: 'Statystyka rezerwacji' },
  { slug: 'statystyka-platnosci', label: 'Statystyka płatności' },
];

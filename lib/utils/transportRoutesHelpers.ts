/**
 * G02 — pure helpers panelu zarządzania destynacjami (trasami).
 * Logika „które miasta są jeszcze nieprzypisane do żadnej trasy" — testowalna bez DOM/Next.
 */
import type { TransportRoute } from '@/lib/types/transportLists';

/** Zbiór nazw miast (lower) przypisanych do JAKIEJKOLWIEK trasy. */
export function assignedCityNames(routes: TransportRoute[]): Set<string> {
  const s = new Set<string>();
  for (const r of routes) {
    for (const c of r.cities) s.add(c.trim().toLowerCase());
  }
  return s;
}

/**
 * Miasta z sezonu (allCityNames) jeszcze NIEprzypisane do żadnej destynacji — kandydaci do dodania.
 * Zachowuje oryginalną pisownię z `allCityNames`, sortuje alfabetycznie (pl).
 */
export function unassignedCities(allCityNames: string[], routes: TransportRoute[]): string[] {
  const assigned = assignedCityNames(routes);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of allCityNames) {
    const key = name.trim().toLowerCase();
    if (!assigned.has(key) && !seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  }
  return out.sort((a, b) => a.localeCompare(b, 'pl'));
}

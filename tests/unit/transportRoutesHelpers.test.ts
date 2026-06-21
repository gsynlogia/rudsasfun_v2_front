/**
 * G02 — testy jednostkowe helperów panelu destynacji (pure).
 */
import { assignedCityNames, unassignedCities } from '@/lib/utils/transportRoutesHelpers';
import type { TransportRoute } from '@/lib/types/transportLists';

const routes: TransportRoute[] = [
  { id: 1, name: 'Warszawa', color_key: 'blue', display_order: 1, cities: ['Warszawa'] },
  { id: 2, name: 'Łódź', color_key: 'orange', display_order: 2, cities: ['Łódź', 'Włocławek'] },
];

describe('transportRoutesHelpers', () => {
  it('assignedCityNames zbiera wszystkie miasta (lower) ze wszystkich tras', () => {
    const s = assignedCityNames(routes);
    expect(s.has('warszawa')).toBe(true);
    expect(s.has('włocławek')).toBe(true);
    expect(s.size).toBe(3);
  });

  it('unassignedCities zwraca tylko miasta spoza tras, alfabetycznie', () => {
    const all = ['Toruń', 'Warszawa', 'Łódź', 'Gdańsk'];
    expect(unassignedCities(all, routes)).toEqual(['Gdańsk', 'Toruń']);
  });

  it('unassignedCities deduplikuje i ignoruje wielkość liter', () => {
    const all = ['Gdańsk', 'gdańsk', 'GDAŃSK'];
    expect(unassignedCities(all, routes)).toEqual(['Gdańsk']);
  });

  it('unassignedCities: brak tras → wszystkie miasta dostępne', () => {
    expect(unassignedCities(['B', 'A'], [])).toEqual(['A', 'B']);
  });
});

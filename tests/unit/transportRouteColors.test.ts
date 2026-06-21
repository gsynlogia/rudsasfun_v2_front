/**
 * G02 — testy jednostkowe palety kolorów destynacji (pure, bez DOM).
 * Gwarantuje: kolory z bazy mapują się na statyczne klasy Tailwind, nieznany/null kolor = brak tła.
 */
import {
  ROUTE_PALETTE, ROUTE_COLOR_KEYS, isRouteColorKey, routeRowClasses,
} from '@/lib/utils/transportRouteColors';

describe('transportRouteColors', () => {
  it('paleta ma 12 kluczy (1:1 z backendem RouteColorKey)', () => {
    expect(ROUTE_COLOR_KEYS).toHaveLength(12);
    expect(ROUTE_COLOR_KEYS).toEqual(
      expect.arrayContaining(['blue', 'orange', 'green', 'gray', 'red', 'yellow',
        'teal', 'pink', 'indigo', 'sky', 'violet', 'purple']));
  });

  it('każdy klucz ma pełne literały Tailwind (purge-safe)', () => {
    for (const key of ROUTE_COLOR_KEYS) {
      const c = ROUTE_PALETTE[key];
      expect(c.base).toMatch(/^bg-[a-z]+-\d{3}$/);
      expect(c.hover).toMatch(/^hover:bg-[a-z]+-\d{3}$/);
      expect(c.active).toMatch(/^bg-[a-z]+-\d{3}$/);
    }
  });

  it('isRouteColorKey rozpoznaje realne klucze i odrzuca śmieci', () => {
    expect(isRouteColorKey('blue')).toBe(true);
    expect(isRouteColorKey('magenta')).toBe(false);
    expect(isRouteColorKey(null)).toBe(false);
    expect(isRouteColorKey(undefined)).toBe(false);
  });

  it('routeRowClasses: znany kolor zwraca base + hover', () => {
    const cls = routeRowClasses('blue', false);
    expect(cls).toContain('bg-blue-100');
    expect(cls).toContain('hover:bg-blue-200');
    expect(cls).not.toContain('bg-blue-300');
  });

  it('routeRowClasses: isActive zwraca active zamiast base', () => {
    const cls = routeRowClasses('orange', true);
    expect(cls).toContain('bg-orange-300');
    expect(cls).toContain('hover:bg-orange-200');
    expect(cls).not.toContain('bg-orange-100');
  });

  it('routeRowClasses: brak/nieznany kolor = pusty string (miasto bez destynacji)', () => {
    expect(routeRowClasses(null, false)).toBe('');
    expect(routeRowClasses('magenta', true)).toBe('');
  });
});

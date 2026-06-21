/**
 * G02 — paleta kolorów destynacji (tras) panelu Miasta.
 * Kolor każdego miasta pochodzi z BAZY (CityCounts.route_color = color_key), a NIE z hardcoded ROUTE_OF.
 * Tu trzymamy tylko mapowanie color_key -> konkretne klasy Tailwind (base/hover/active).
 *
 * Dlaczego statyczny obiekt literałów, a nie `bg-${key}-100`? Tailwind JIT skanuje kod statycznie i
 * usuwa (purge) klasy budowane z runtime-stringów. Pełne literały poniżej gwarantują, że klasy trafią
 * do bundla. Zbiór kluczy = RouteColorKey (walidowany też po stronie backendu — Literal).
 *
 * Pure function — testowalna bez DOM/Next (rozkaz Pana: każda funkcjonalność z testem jednostkowym).
 */
import type { RouteColorKey } from '@/lib/types/transportLists';

export interface RouteColorClasses { base: string; hover: string; active: string; }

export const ROUTE_PALETTE: Record<RouteColorKey, RouteColorClasses> = {
  blue:   { base: 'bg-blue-100',   hover: 'hover:bg-blue-200',   active: 'bg-blue-300' },
  orange: { base: 'bg-orange-100', hover: 'hover:bg-orange-200', active: 'bg-orange-300' },
  green:  { base: 'bg-green-100',  hover: 'hover:bg-green-200',  active: 'bg-green-300' },
  gray:   { base: 'bg-gray-200',   hover: 'hover:bg-gray-300',   active: 'bg-gray-400' },
  red:    { base: 'bg-red-100',    hover: 'hover:bg-red-200',    active: 'bg-red-300' },
  yellow: { base: 'bg-yellow-100', hover: 'hover:bg-yellow-200', active: 'bg-yellow-300' },
  teal:   { base: 'bg-teal-100',   hover: 'hover:bg-teal-200',   active: 'bg-teal-300' },
  pink:   { base: 'bg-pink-100',   hover: 'hover:bg-pink-200',   active: 'bg-pink-300' },
  indigo: { base: 'bg-indigo-100', hover: 'hover:bg-indigo-200', active: 'bg-indigo-300' },
  sky:    { base: 'bg-sky-100',    hover: 'hover:bg-sky-200',    active: 'bg-sky-300' },
  violet: { base: 'bg-violet-100', hover: 'hover:bg-violet-200', active: 'bg-violet-300' },
  purple: { base: 'bg-purple-100', hover: 'hover:bg-purple-200', active: 'bg-purple-300' },
};

/** Lista kluczy palety (do selektora koloru w panelu CRUD). */
export const ROUTE_COLOR_KEYS = Object.keys(ROUTE_PALETTE) as RouteColorKey[];

/** Czy dany string jest poprawnym kluczem palety (miasto może mieć route_color = null/nieznany). */
export function isRouteColorKey(key: string | null | undefined): key is RouteColorKey {
  return key != null && key in ROUTE_PALETTE;
}

/**
 * Zwraca className tła wiersza miasta dla danego color_key z bazy.
 * - brak/nieznany kolor → '' (miasto nieprzypisane do destynacji = bez tła, neutralne),
 * - isActive=true → odcień -300/-400 (podświetlenie całej trasy przy hover),
 * - zawsze dokleja klasę hover.
 */
export function routeRowClasses(colorKey: string | null | undefined, isActive: boolean): string {
  if (!isRouteColorKey(colorKey)) return '';
  const c = ROUTE_PALETTE[colorKey];
  return `${isActive ? c.active : c.base} ${c.hover}`;
}

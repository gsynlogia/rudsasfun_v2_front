/**
 * Sortowanie wg polskiego alfabetu (collation PL).
 *
 * Domyślne `Array.sort()` w JS porównuje po kodzie UTF-16, więc polskie litery (ą ć ę ł ń ó ś ź ż)
 * lądują NA KOŃCU listy zamiast w alfabetycznym miejscu (np. "Łódź" po "Wrocław", a powinno być po "Lublin").
 * Tu używamy Intl.Collator z lokalizacją 'pl' — standard CLDR ustawia ł tuż po l, ó po o, ś po s itd.
 *
 * Spójne z backendowym `app/utils/polish_sort.py` (filter_options są już sortowane po stronie API;
 * tu sortujemy listy budowane po stronie klienta, np. fallback wartości filtra z bieżącej strony).
 */
const collator = new Intl.Collator('pl', { numeric: true, sensitivity: 'variant' });

export function polishCompare(a: string, b: string): number {
  return collator.compare(a ?? '', b ?? '');
}

export function polishSort(values: string[]): string[] {
  return [...values].sort(polishCompare);
}

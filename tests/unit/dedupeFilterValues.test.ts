/**
 * Unit test helpera `dedupeFilterValues` — bug Trello gsOJQywn.
 *
 * Filtr kolumn "Transport wyjazd"/"Transport powrót" ładuje wartości stronami z
 * /filter-search. Z powodu wstawiania sentinela "Własny" na offset=0 (fix 4ERzXvnf)
 * granica stron powodowała powrót tego samego miasta w dwóch batchach (np. "Kraków" 2×)
 * → React "Encountered two children with the same key, `Kraków`".
 *
 * Fix frontend-only: dedup listy wartości filtra po znormalizowanym kluczu
 * (trim + locale-lowercase) — NIE po surowym stringu (rozkaz właściciela: "nie po stringu",
 * Kraków może być z małej/dużej litery). Zachowuje pierwsze wystąpienie (oryginalny zapis).
 */
import { dedupeFilterValues } from '../../lib/utils/dedupeFilterValues';

describe('dedupeFilterValues — bug gsOJQywn', () => {
  it('usuwa dokładny duplikat z paginacji ("Kraków" 2×) zachowując kolejność', () => {
    expect(dedupeFilterValues([
      'Kołobrzeg', 'Kraków', 'Kraków', 'Leszno',
    ])).toEqual(['Kołobrzeg', 'Kraków', 'Leszno']);
  });

  it('scala warianty wielkości liter (nie po stringu) — pierwsze wystąpienie wygrywa', () => {
    expect(dedupeFilterValues(['Kraków', 'kraków', 'KRAKÓW'])).toEqual(['Kraków']);
  });

  it('scala warianty z whitespace', () => {
    expect(dedupeFilterValues(['Kraków', ' Kraków ', 'Kraków  '])).toEqual(['Kraków']);
  });

  it('zachowuje wszystkie różne miasta + sentinel "Własny"', () => {
    const input = ['Własny', 'Bydgoszcz', 'Kraków', 'Kraków', 'Łódź'];
    expect(dedupeFilterValues(input)).toEqual(['Własny', 'Bydgoszcz', 'Kraków', 'Łódź']);
  });

  it('pusta lista → pusta lista', () => {
    expect(dedupeFilterValues([])).toEqual([]);
  });

  it('brak duplikatów → lista bez zmian', () => {
    const input = ['Gdańsk', 'Gdynia', 'Poznań'];
    expect(dedupeFilterValues(input)).toEqual(['Gdańsk', 'Gdynia', 'Poznań']);
  });

  it('nie gubi pustego stringu jeśli jest jedyny (defensywnie, choć backend go filtruje)', () => {
    expect(dedupeFilterValues(['-', '-'])).toEqual(['-']);
  });
});

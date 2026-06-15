/**
 * Unit test helpera `computeTransportDifferentCities` — bug Trello DwhFUHiq (#156).
 *
 * Pure logic test bez DB, bez Next runtime, bez auth — zgodnie z krytyczną zasadą
 * CLAUDE.md "dekorator-pattern dla testowalności": helper to czysta funkcja w `lib/utils/`.
 *
 * Reguła wiążąca (rozkaz właściciela):
 *   identity = 'OWN' gdy type=='wlasny', inaczej miasto.
 *   ptaszek zaznaczony ⟺ identity(wyjazd) ≠ identity(powrót).
 */
import { computeTransportDifferentCities } from '../../lib/utils/computeTransportDifferentCities';

describe('computeTransportDifferentCities — reguła karty DwhFUHiq', () => {
  it('własny + własny → NIE zaznaczony', () => {
    expect(computeTransportDifferentCities(
      { type: 'wlasny', city: null },
      { type: 'wlasny', city: null },
    )).toBe(false);
  });

  it('własny + własny z różnymi miastami w bazie (śmieci) → NADAL NIE (OWN ignoruje miasto)', () => {
    expect(computeTransportDifferentCities(
      { type: 'wlasny', city: 'Szczecin' },
      { type: 'wlasny', city: 'Gdańsk' },
    )).toBe(false);
  });

  it('zbiorowy(X) + własny → zaznaczony', () => {
    expect(computeTransportDifferentCities(
      { type: 'zbiorowy', city: 'Szczecin' },
      { type: 'wlasny', city: null },
    )).toBe(true);
  });

  it('własny + zbiorowy(Y) → zaznaczony', () => {
    expect(computeTransportDifferentCities(
      { type: 'wlasny', city: null },
      { type: 'zbiorowy', city: 'Lębork' },
    )).toBe(true);
  });

  it('zbiorowy(X) + zbiorowy(Y), różne miasta → zaznaczony', () => {
    expect(computeTransportDifferentCities(
      { type: 'zbiorowy', city: 'Gniezno' },
      { type: 'zbiorowy', city: 'Lębork' },
    )).toBe(true);
  });

  it('zbiorowy(X) + zbiorowy(X), te same miasto → NIE zaznaczony', () => {
    expect(computeTransportDifferentCities(
      { type: 'zbiorowy', city: 'Szczecin' },
      { type: 'zbiorowy', city: 'Szczecin' },
    )).toBe(false);
  });

  // Próbki z karty Trello (zrzuty dowodowe)
  it('PRÓBKA Krzysztof: Zbiorowy Szczecin + Własny → zaznaczony', () => {
    expect(computeTransportDifferentCities(
      { type: 'zbiorowy', city: 'Szczecin' },
      { type: 'wlasny', city: null },
    )).toBe(true);
  });

  it('PRÓBKA WhatsApp: Zbiorowy Gniezno + Zbiorowy Lębork → zaznaczony', () => {
    expect(computeTransportDifferentCities(
      { type: 'zbiorowy', city: 'Gniezno' },
      { type: 'zbiorowy', city: 'Lębork' },
    )).toBe(true);
  });

  // Edge cases — odporność na brak danych
  it('null type po obu stronach → traktowane jak nie-zbiorowy, równe miasta null → NIE', () => {
    expect(computeTransportDifferentCities(
      { type: null, city: null },
      { type: null, city: null },
    )).toBe(false);
  });

  it('zbiorowy z whitespace w mieście vs to samo miasto → NIE (trim)', () => {
    expect(computeTransportDifferentCities(
      { type: 'zbiorowy', city: ' Szczecin ' },
      { type: 'zbiorowy', city: 'Szczecin' },
    )).toBe(false);
  });
});

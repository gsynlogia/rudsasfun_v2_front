import { describe, expect, it } from 'vitest';

import {
  ARCHIVE_SCOPE_OPTIONS,
  SEASON_PERIOD_OPTIONS,
  inArchiveScope,
  parseArchiveScope,
  parseSeasonId,
} from '@/lib/utils/seasons';
import { qualificationCardSeason } from '@/lib/qualificationSeasonTexts';

describe('przełącznik Aktualne / Archiwalne / Wszystkie', () => {
  it.each([
    ['archived', 'archived'],
    ['all', 'all'],
    ['active', 'active'],
    [null, 'active'],
    [undefined, 'active'],
    ['', 'active'],
    ['ARCHIVED', 'active'],
    ['cokolwiek', 'active'],
  ])('parseArchiveScope(%s) = %s', (value, expected) => {
    expect(parseArchiveScope(value)).toBe(expected);
  });

  it.each([
    [true, 'active', false],
    [false, 'active', true],
    [undefined, 'active', true],
    [true, 'archived', true],
    [false, 'archived', false],
    [undefined, 'archived', false],
    [true, 'all', true],
    [false, 'all', true],
    [undefined, 'all', true],
  ] as const)('turnus archiwalny=%s w zakresie %s → %s', (archived, scope, expected) => {
    expect(inArchiveScope(archived, scope)).toBe(expected);
  });

  it('opcje przełącznika i okresów', () => {
    expect(ARCHIVE_SCOPE_OPTIONS.map((o) => [o.value, o.label])).toEqual([['active', 'Aktualne'], ['archived', 'Archiwalne'], ['all', 'Wszystkie']]);
    expect(SEASON_PERIOD_OPTIONS.map((o) => [o.value, o.label])).toEqual([['lato', 'Lato'], ['zima', 'Zima']]);
  });
});

describe('sezon z adresu i wersja karty', () => {
  it.each([
    ['7', 7],
    ['123456789', 123456789],
    ['1234567890', null],
    ['0x1', null],
    ['7a', null],
    [' 7', null],
    ['-1', null],
    ['', null],
    [null, null],
    [undefined, null],
  ])('parseSeasonId(%s) = %s', (value, expected) => {
    expect(parseSeasonId(value)).toBe(expected);
  });

  it.each([
    ['zima', 'ZIMA'],
    ['lato', 'LATO'],
    ['ZIMA', 'LATO'],
    [null, 'LATO'],
    [undefined, 'LATO'],
  ])('karta dla okresu %s = %s', (period, expected) => {
    expect(qualificationCardSeason(period)).toBe(expected);
  });
});
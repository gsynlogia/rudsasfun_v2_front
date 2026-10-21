import { describe, expect, it } from 'vitest';

import { guardiansToSubmit } from '@/lib/utils/guardians';

const first = { id: '1', noSecondParent: false, limitedRights: false };
const second = { id: '2', noSecondParent: false, limitedRights: false };

describe('guardiansToSubmit — opiekunowie wysyłani w rezerwacji', () => {
  it('wysyła obu opiekunów, gdy żaden checkbox nie jest zaznaczony', () => {
    expect(guardiansToSubmit([first, second])).toEqual([first, second]);
  });

  it('pomija opiekuna 2 przy „Brak drugiego opiekuna”', () => {
    expect(guardiansToSubmit([first, { ...second, noSecondParent: true }])).toEqual([first]);
  });

  it('pomija opiekuna 2 przy „Ograniczone prawa rodzicielskie”', () => {
    expect(guardiansToSubmit([first, { ...second, limitedRights: true }])).toEqual([first]);
  });

  it('opiekun 1 zostaje zawsze, nawet z zaznaczoną flagą', () => {
    expect(guardiansToSubmit([{ ...first, noSecondParent: true, limitedRights: true }])).toHaveLength(1);
  });

  it('flagi bez wartości traktuje jak niezaznaczone, pusta lista daje pustą listę', () => {
    expect(guardiansToSubmit([{ id: '1' }, { id: '2' }])).toHaveLength(2);
    expect(guardiansToSubmit([])).toEqual([]);
  });

  it('nie zmienia listy z formularza', () => {
    const parents = [first, { ...second, noSecondParent: true }];
    guardiansToSubmit(parents);
    expect(parents).toHaveLength(2);
  });
});
/**
 * Testy czystej logiki edycji bufora listy transportowej (film: „muszę mieć przycisk dodania/usunięcia
 * osoby... nie chcę ingerować w bazę"). Dodanie/usunięcie wiersza z renumeracją LP — bez DOM/DB.
 */
import {
  renumberLp, removeParticipantAt, addBlankParticipant,
} from '@/lib/utils/transportListPayload';
import type { ListPayload, ListPayloadParticipant } from '@/lib/types/transportLists';

function p(lp: number, last: string, rid = lp): ListPayloadParticipant {
  return {
    lp, reservation_id: rid, first_name: 'X', last_name: last, rocznik: 2012,
    opiekun: null, kontakt: null, turnus: 'B1', przystanek: 'Warszawa', miejsce_zbiorki: '', is_transfer: false,
  };
}
function payload(parts: ListPayloadParticipant[], direction: 'arrival' | 'return' = 'arrival'): ListPayload {
  return { direction, tabor: {}, participants: parts };
}

describe('transportListPayload — renumberLp', () => {
  it('przepisuje LP na 1..n niezależnie od poprzednich wartości', () => {
    const out = renumberLp([p(5, 'A'), p(3, 'B'), p(9, 'C')]);
    expect(out.map((x) => x.lp)).toEqual([1, 2, 3]);
    expect(out.map((x) => x.last_name)).toEqual(['A', 'B', 'C']); // kolejność zachowana
  });
});

describe('transportListPayload — removeParticipantAt', () => {
  it('usuwa wskazany wiersz i renumeruje LP bez luki', () => {
    const out = removeParticipantAt(payload([p(1, 'A'), p(2, 'B'), p(3, 'C')]), 1);
    expect(out.participants.map((x) => x.last_name)).toEqual(['A', 'C']);
    expect(out.participants.map((x) => x.lp)).toEqual([1, 2]);
  });

  it('idx poza zakresem → bez zmian (poza renumeracją)', () => {
    const out = removeParticipantAt(payload([p(1, 'A')]), 9);
    expect(out.participants.map((x) => x.last_name)).toEqual(['A']);
  });
});

describe('transportListPayload — addBlankParticipant', () => {
  it('dodaje pusty wiersz ręczny (reservation_id=0, puste imię/nazwisko) na końcu + LP', () => {
    const out = addBlankParticipant(payload([p(1, 'A')]), false);
    expect(out.participants).toHaveLength(2);
    const blank = out.participants[1];
    expect(blank.reservation_id).toBe(0);
    expect(blank.first_name).toBe('');
    expect(blank.last_name).toBe('');
    expect(blank.lp).toBe(2);
    expect('upowaznienia' in blank).toBe(false); // arrival bez kolumny upoważnień
  });

  it('dla powrotu pusty wiersz MA pole upowaznienia', () => {
    const out = addBlankParticipant(payload([], 'return'), true);
    expect(out.participants[0].upowaznienia).toBe('');
  });
});

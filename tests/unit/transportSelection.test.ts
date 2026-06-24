/**
 * Testy czystej logiki zaznaczania miast/resortów w „Listach transportowych" (makieta Figma 1:1).
 * Trzy poziomy: MASTER, per MIASTO (selectedCities), per KOMÓRKA RESORTU (selectedResortCells).
 * Logika odtworzona z AdminPanel.tsx makiety (isCityFullySelected / isResortCellSelected /
 * toggleCitySelection / toggleResortCellSelection / hasAnySelection / calculateSelectedTotal).
 */
import {
  emptySelection, isCityFullySelected, isResortCellSelected, hasAnySelection,
  toggleCity, toggleResortCell, toggleMaster, calculateSelectedTotal, isParticipantSelected,
  isTransferParticipant, canReassignParticipant, distinctSorted, toggleColumnKey, boundedToggle,
  reorderList, selectDisplayedParticipants, idsToToggleForMaster, resortRank,
  compareDefaultTransportOrder, toggleArrayValue, rowMatchesMultiFilters,
  swapAdjacent, removeAt,
  type Resort,
} from '@/lib/utils/transportSelection';

const RESORTS: Resort[] = ['beaver', 'sawa', 'limba'];
// cityData wzór (realne liczby sezonu arrival): Warszawa B=300 S=85 L=59 razem=444, Łódź B=135 S=21 L=12 razem=168
const CITIES = [
  { city: 'Warszawa', beaver: 300, sawa: 85, limba: 59, razem: 444 },
  { city: 'Łódź', beaver: 135, sawa: 21, limba: 12, razem: 168 },
];

describe('transportSelection — stan pusty', () => {
  it('pusty stan nie ma żadnego zaznaczenia', () => {
    const s = emptySelection();
    expect(hasAnySelection(s)).toBe(false);
    expect(isCityFullySelected(s, 'Warszawa')).toBe(false);
    expect(isResortCellSelected(s, 'Warszawa', 'beaver')).toBe(false);
    expect(calculateSelectedTotal(s, CITIES)).toBe(0);
  });
});

describe('transportSelection — zaznaczenie całego miasta', () => {
  it('toggleCity zaznacza całe miasto: wszystkie resorty zaznaczone', () => {
    const s = toggleCity(emptySelection(), 'Warszawa');
    expect(hasAnySelection(s)).toBe(true);
    expect(isCityFullySelected(s, 'Warszawa')).toBe(true);
    expect(isResortCellSelected(s, 'Warszawa', 'beaver')).toBe(true);
    expect(isResortCellSelected(s, 'Warszawa', 'sawa')).toBe(true);
    expect(isResortCellSelected(s, 'Warszawa', 'limba')).toBe(true);
    expect(calculateSelectedTotal(s, CITIES)).toBe(444);
  });

  it('toggleCity drugi raz odznacza miasto', () => {
    let s = toggleCity(emptySelection(), 'Warszawa');
    s = toggleCity(s, 'Warszawa');
    expect(hasAnySelection(s)).toBe(false);
    expect(isCityFullySelected(s, 'Warszawa')).toBe(false);
  });
});

describe('transportSelection — komórka resortu (częściowe)', () => {
  it('toggleResortCell na pustym zaznacza jeden resort (miasto częściowe, nie pełne)', () => {
    const s = toggleResortCell(emptySelection(), 'Warszawa', 'beaver', RESORTS);
    expect(isResortCellSelected(s, 'Warszawa', 'beaver')).toBe(true);
    expect(isResortCellSelected(s, 'Warszawa', 'sawa')).toBe(false);
    expect(isCityFullySelected(s, 'Warszawa')).toBe(false);
    expect(hasAnySelection(s)).toBe(true);
    expect(calculateSelectedTotal(s, CITIES)).toBe(300); // tylko beaver
  });

  it('zaznaczenie wszystkich resortów scala do pełnego miasta', () => {
    let s = toggleResortCell(emptySelection(), 'Warszawa', 'beaver', RESORTS);
    s = toggleResortCell(s, 'Warszawa', 'sawa', RESORTS);
    s = toggleResortCell(s, 'Warszawa', 'limba', RESORTS);
    expect(isCityFullySelected(s, 'Warszawa')).toBe(true);
    expect(calculateSelectedTotal(s, CITIES)).toBe(444);
  });

  it('klik resortu na pełnym mieście odznacza tylko ten resort (reszta zostaje)', () => {
    let s = toggleCity(emptySelection(), 'Warszawa'); // pełne
    s = toggleResortCell(s, 'Warszawa', 'sawa', RESORTS); // odznacz Sawa
    expect(isResortCellSelected(s, 'Warszawa', 'sawa')).toBe(false);
    expect(isResortCellSelected(s, 'Warszawa', 'beaver')).toBe(true);
    expect(isResortCellSelected(s, 'Warszawa', 'limba')).toBe(true);
    expect(isCityFullySelected(s, 'Warszawa')).toBe(false);
    expect(calculateSelectedTotal(s, CITIES)).toBe(300 + 59); // beaver+limba
  });

  it('odznaczenie ostatniej komórki usuwa miasto z zaznaczenia', () => {
    let s = toggleResortCell(emptySelection(), 'Warszawa', 'beaver', RESORTS);
    s = toggleResortCell(s, 'Warszawa', 'beaver', RESORTS);
    expect(hasAnySelection(s)).toBe(false);
  });
});

describe('transportSelection — master', () => {
  it('toggleMaster zaznacza wszystkie miasta', () => {
    const all = CITIES.map((c) => c.city);
    const s = toggleMaster(emptySelection(), all);
    expect(isCityFullySelected(s, 'Warszawa')).toBe(true);
    expect(isCityFullySelected(s, 'Łódź')).toBe(true);
    expect(calculateSelectedTotal(s, CITIES)).toBe(444 + 168);
  });

  it('toggleMaster gdy wszystko zaznaczone — czyści', () => {
    const all = CITIES.map((c) => c.city);
    let s = toggleMaster(emptySelection(), all);
    s = toggleMaster(s, all);
    expect(hasAnySelection(s)).toBe(false);
  });
});

describe('transportSelection — filtr uczestników', () => {
  it('uczestnik z pełnego miasta jest zaznaczony niezależnie od regionu', () => {
    const s = toggleCity(emptySelection(), 'Warszawa');
    expect(isParticipantSelected(s, 'Warszawa', 'BEAVER')).toBe(true);
    expect(isParticipantSelected(s, 'Warszawa', 'SAWA')).toBe(true);
    expect(isParticipantSelected(s, 'Łódź', 'BEAVER')).toBe(false);
  });

  it('uczestnik z częściowego miasta tylko gdy region pasuje do zaznaczonego resortu', () => {
    const s = toggleResortCell(emptySelection(), 'Warszawa', 'beaver', RESORTS);
    expect(isParticipantSelected(s, 'Warszawa', 'BEAVER')).toBe(true);
    expect(isParticipantSelected(s, 'Warszawa', 'SAWA')).toBe(false);
  });
});

describe('transportSelection — przesiadka is_transfer (G01, film E2/E3)', () => {
  // E2: uczestnik z miasta przesiadkowego (hub Toruń) musi móc trafić na DWIE listy → is_transfer=true.
  it('uczestnik z miasta przesiadkowego → is_transfer=true', () => {
    const transfer = new Set(['Toruń', 'Warszawa']);
    expect(isTransferParticipant('Warszawa', transfer)).toBe(true);
    expect(isTransferParticipant('Toruń', transfer)).toBe(true);
  });

  it('uczestnik z miasta nieprzesiadkowego → false (zwykłe wsadzenie, blokada po 1 raz)', () => {
    const transfer = new Set(['Toruń']);
    expect(isTransferParticipant('Łódź', transfer)).toBe(false);
  });

  it('brak miasta uczestnika → false (nie przesiadka)', () => {
    expect(isTransferParticipant(null, new Set(['Toruń']))).toBe(false);
    expect(isTransferParticipant('', new Set(['Toruń']))).toBe(false);
  });

  it('pusty zbiór przesiadek (E3: nikomu nie dano przesiadki) → false', () => {
    expect(isTransferParticipant('Toruń', new Set())).toBe(false);
  });
});

describe('transportSelection — canReassignParticipant (G01, R1 „zły autobus")', () => {
  const transfer = new Set(['Toruń']);

  it('nieprzypisany uczestnik → zawsze wsadzalny', () => {
    expect(canReassignParticipant(false, 'Łódź', transfer)).toBe(true);
    expect(canReassignParticipant(false, 'Toruń', transfer)).toBe(true);
  });

  it('przypisany NIE-przesiadkowy → ZABLOKOWANY (nie wejdzie 2× przez pomyłkę)', () => {
    expect(canReassignParticipant(true, 'Łódź', transfer)).toBe(false);
  });

  it('przypisany przesiadkowy → wsadzalny ponownie (druga lista, hub Toruń)', () => {
    expect(canReassignParticipant(true, 'Toruń', transfer)).toBe(true);
  });
});

describe('transportSelection — distinctSorted (filtr = lista rozwijana, film: „nie wyszukiwarka")', () => {
  it('puste wejście → pusta lista', () => {
    expect(distinctSorted([])).toEqual([]);
    expect(distinctSorted([null, undefined, '', '   '])).toEqual([]);
  });

  it('usuwa duplikaty + puste, sortuje po polsku (Łódź po L, nie na końcu)', () => {
    expect(distinctSorted(['Bełchatów', 'Łódź', 'Bełchatów', '', 'Warszawa', null]))
      .toEqual(['Bełchatów', 'Łódź', 'Warszawa']);
  });

  it('przycina białe znaki i traktuje jak tę samą wartość', () => {
    expect(distinctSorted([' Akrobatyka ', 'Akrobatyka'])).toEqual(['Akrobatyka']);
  });
});

describe('transportSelection — toggleColumnKey (konfiguracja kolumn „Tabela", film: localStorage)', () => {
  it('odznacza widoczną kolumnę', () => {
    expect(toggleColumnKey(['uczestnik', 'temat', 'tag'], 'temat')).toEqual(['uczestnik', 'tag']);
  });
  it('dodaje wcześniej ukrytą kolumnę', () => {
    expect(toggleColumnKey(['uczestnik'], 'tag')).toEqual(['uczestnik', 'tag']);
  });
});

describe('transportSelection — boundedToggle (Porównaj max 2, rozkaz Pana)', () => {
  it('dodaje gdy poniżej limitu', () => {
    expect([...boundedToggle(new Set<number>(), 5, 2)]).toEqual([5]);
    expect([...boundedToggle(new Set([1]), 2, 2)]).toEqual([1, 2]);
  });
  it('NIE dodaje 3. elementu gdy limit=2', () => {
    const r = boundedToggle(new Set([1, 2]), 3, 2);
    expect(r.size).toBe(2);
    expect(r.has(3)).toBe(false);
  });
  it('zawsze pozwala odznaczyć (nawet przy pełnym limicie)', () => {
    expect([...boundedToggle(new Set([1, 2]), 1, 2)]).toEqual([2]);
  });
});

describe('transportSelection — reorderList (drag&drop dzieci w taborze, film H12)', () => {
  it('przenosi element na pozycję docelową (w przód)', () => {
    expect(reorderList([1, 2, 3, 4], 1, 3)).toEqual([2, 3, 1, 4]);
  });
  it('przenosi element w tył', () => {
    expect(reorderList([1, 2, 3, 4], 4, 2)).toEqual([1, 4, 2, 3]);
  });
  it('id spoza listy lub równe → kopia bez zmian', () => {
    expect(reorderList([1, 2, 3], 9, 2)).toEqual([1, 2, 3]);
    expect(reorderList([1, 2, 3], 2, 2)).toEqual([1, 2, 3]);
  });
  it('nie mutuje wejścia', () => {
    const src = [1, 2, 3];
    reorderList(src, 1, 3);
    expect(src).toEqual([1, 2, 3]);
  });
});

// ---- BUG 004 (Krzysztof 2026-06-24): filtr miasta MUSI działać też przy otwartym taborze ----
describe('selectDisplayedParticipants — filtr miasta działa także w assignMode (BUG 004)', () => {
  const P = (reservation_id: number, city: string, region: string) =>
    ({ reservation_id, city, region } as { reservation_id: number; city: string | null; region: string | null });
  const parts = [P(1, 'Warszawa', 'BEAVER'), P(2, 'Łódź', 'SAWA'), P(3, 'Warszawa', 'SAWA')];

  it('poza assignMode bez zaznaczenia → pusto', () => {
    expect(selectDisplayedParticipants(false, false, parts, emptySelection())).toEqual([]);
  });
  it('w assignMode bez zaznaczenia → wszyscy (można wsadzać kogokolwiek)', () => {
    expect(selectDisplayedParticipants(true, false, parts, emptySelection())).toHaveLength(3);
  });
  it('w assignMode Z zaznaczeniem miasta → TYLKO z tego miasta (rdzeń bug 004)', () => {
    const s = toggleCity(emptySelection(), 'Warszawa');
    const out = selectDisplayedParticipants(true, true, parts, s);
    expect(out.map((p) => p.reservation_id).sort()).toEqual([1, 3]);
  });
  it('poza assignMode z zaznaczeniem → filtruje (bez regresji)', () => {
    const s = toggleCity(emptySelection(), 'Łódź');
    expect(selectDisplayedParticipants(false, true, parts, s).map((p) => p.reservation_id)).toEqual([2]);
  });
});

// ---- BUG 009 (Krzysztof 2026-06-24): „zaznacz wszystkich" musi się dać ODKLIKNĄĆ ----
describe('idsToToggleForMaster — toggle master działa w obie strony (BUG 009)', () => {
  it('nic nie zaznaczone → zwraca wszystkie do zaznaczenia', () => {
    expect(idsToToggleForMaster(new Set<number>(), [1, 2, 3])).toEqual([1, 2, 3]);
  });
  it('częściowo zaznaczone → tylko brakujące', () => {
    expect(idsToToggleForMaster(new Set([1]), [1, 2, 3])).toEqual([2, 3]);
  });
  it('WSZYSCY zaznaczeni → zwraca wszystkie do ODZNACZENIA (rdzeń bug 009)', () => {
    expect(idsToToggleForMaster(new Set([1, 2, 3]), [1, 2, 3])).toEqual([1, 2, 3]);
  });
  it('pusta lista nieprzypisanych → nic', () => {
    expect(idsToToggleForMaster(new Set([9]), [])).toEqual([]);
  });
});

// ---- BUG 006 (Krzysztof 2026-06-24): domyślne sortowanie przystanek → Beaver/Sawa/Limba → alfabet ----
describe('resortRank + compareDefaultTransportOrder — sortowanie domyślne (BUG 006)', () => {
  it('resortRank: Beaver<Sawa<Limba, fallback z tagu, nieznane=99', () => {
    expect(resortRank('BEAVER', null)).toBe(0);
    expect(resortRank('SAWA', null)).toBe(1);
    expect(resortRank('LIMBA', null)).toBe(2);
    expect(resortRank(null, 'B1')).toBe(0);
    expect(resortRank(null, 'S3')).toBe(1);
    expect(resortRank(null, 'L2')).toBe(2);
    expect(resortRank(null, null)).toBe(99);
  });

  const P = (city: string, region: string, tag: string, last: string) =>
    ({ city, region, tag, last_name: last, first_name: '', is_assigned: false });

  it('sortuje: najpierw przystanek (alfabet), potem Beaver→Sawa, potem alfabet nazwisko', () => {
    const rows = [
      P('Warszawa', 'SAWA', 'S1', 'Zielińska'),
      P('Łódź', 'BEAVER', 'B1', 'Kowalski'),
      P('Warszawa', 'BEAVER', 'B1', 'Nowak'),
      P('Warszawa', 'BEAVER', 'B1', 'Adamiak'),
    ];
    const out = [...rows].sort(compareDefaultTransportOrder).map((r) => `${r.city}/${r.region}/${r.last_name}`);
    expect(out).toEqual([
      'Łódź/BEAVER/Kowalski',       // Łódź < Warszawa
      'Warszawa/BEAVER/Adamiak',    // Warszawa: Beaver przed Sawa, w Beaver alfabet
      'Warszawa/BEAVER/Nowak',
      'Warszawa/SAWA/Zielińska',
    ]);
  });
});

// ---- BUG 010 (Krzysztof 2026-06-24): filtry kolumn = checkboxy multi-select (kilka wartości naraz) ----
describe('toggleArrayValue + rowMatchesMultiFilters — filtry wielokrotne (BUG 010)', () => {
  it('toggleArrayValue dodaje i usuwa wartość', () => {
    expect(toggleArrayValue([], 'B1')).toEqual(['B1']);
    expect(toggleArrayValue(['B1', 'S1'], 'B1')).toEqual(['S1']);
    expect(toggleArrayValue(['B1'], 'S1')).toEqual(['B1', 'S1']);
  });

  it('brak filtra (pusta tablica) → przepuszcza wszystko', () => {
    expect(rowMatchesMultiFilters((k) => ({ tag: 'B1', temat: 'Akro' }[k] ?? ''), {})).toBe(true);
    expect(rowMatchesMultiFilters((k) => ({ tag: 'B1' }[k] ?? ''), { tag: [] })).toBe(true);
  });

  it('filtr wielokrotny przepuszcza wiersz gdy wartość ∈ wybrane (OR w obrębie kolumny)', () => {
    const get = (k: string) => ({ tag: 'S1', temat: 'Akrobatyka' }[k] ?? '');
    expect(rowMatchesMultiFilters(get, { tag: ['B1', 'S1'] })).toBe(true);   // S1 ∈ {B1,S1}
    expect(rowMatchesMultiFilters(get, { tag: ['B1', 'B2'] })).toBe(false);  // S1 ∉ {B1,B2}
  });

  it('wiele kolumn = AND (każda kolumna musi pasować)', () => {
    const get = (k: string) => ({ tag: 'B1', temat: 'Akrobatyka' }[k] ?? '');
    expect(rowMatchesMultiFilters(get, { tag: ['B1'], temat: ['Akrobatyka'] })).toBe(true);
    expect(rowMatchesMultiFilters(get, { tag: ['B1'], temat: ['Piłka'] })).toBe(false);
  });
});

// ---- BUG 016 (Krzysztof 2026-06-24): Porównaj — przekładanie (←/→) i usuwanie kolumn ----
describe('swapAdjacent + removeAt — reorder/usuwanie kolumn porównania (BUG 016)', () => {
  it('swapAdjacent przesuwa w prawo (zamiana z następnym)', () => {
    expect(swapAdjacent(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });
  it('swapAdjacent przesuwa w lewo (zamiana z poprzednim)', () => {
    expect(swapAdjacent(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
  });
  it('swapAdjacent poza zakresem → kopia bez zmian', () => {
    expect(swapAdjacent(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(swapAdjacent(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
  it('removeAt usuwa wskazany indeks', () => {
    expect(removeAt(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
    expect(removeAt(['a'], 0)).toEqual([]);
  });
  it('nie mutuje wejścia', () => {
    const src = ['a', 'b', 'c'];
    swapAdjacent(src, 0, 1);
    removeAt(src, 0);
    expect(src).toEqual(['a', 'b', 'c']);
  });
});

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
  reorderList,
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

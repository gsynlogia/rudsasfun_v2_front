/**
 * Czysta logika zaznaczania miast/resortów w „Listach transportowych" (makieta Figma 1:1).
 * Pure functions (bez React/DOM) — testowalne w izolacji (tests/unit/transportSelection.test.ts).
 *
 * Trzy poziomy zaznaczania (wzór: AdminPanel.tsx makiety):
 *  - MASTER  — zaznacz/odznacz wszystkie miasta naraz,
 *  - MIASTO  — całe miasto (wszystkie resorty),  selectedCities,
 *  - RESORT  — pojedyncza komórka Beaver/Sawa/Limba danego miasta,  selectedResortCells.
 *
 * Reguła „pełne vs częściowe": miasto w `cities` BEZ wpisów w `cells` = PEŁNE (wszystkie resorty).
 * Miasto w `cities` Z wpisami w `cells` = tylko te konkretne resorty.
 */

export type Resort = 'beaver' | 'sawa' | 'limba';

export interface ResortCell {
  city: string;
  resort: Resort;
}

export interface SelectionState {
  cities: string[];      // miasta z jakimkolwiek zaznaczeniem (pełnym lub częściowym)
  cells: ResortCell[];   // konkretne komórki resortów (gdy zaznaczenie częściowe)
}

/** Liczby per miasto do sumowania (lustro CityCounts). */
export interface CityLike {
  city: string;
  beaver: number;
  sawa: number;
  limba: number;
  razem: number;
}

export function emptySelection(): SelectionState {
  return { cities: [], cells: [] };
}

/** Miasto „w pełni zaznaczone" = jest w cities i nie ma dla niego żadnej pojedynczej komórki. */
export function isCityFullySelected(s: SelectionState, city: string): boolean {
  return s.cities.includes(city) && !s.cells.some((c) => c.city === city);
}

/** Komórka resortu zaznaczona = miasto pełne LUB ta konkretna komórka jest na liście. */
export function isResortCellSelected(s: SelectionState, city: string, resort: Resort): boolean {
  return isCityFullySelected(s, city) || s.cells.some((c) => c.city === city && c.resort === resort);
}

export function hasAnySelection(s: SelectionState): boolean {
  return s.cities.length > 0 || s.cells.length > 0;
}

/** Toggle całego miasta: dodaje pełne lub usuwa (wraz z jego komórkami). */
export function toggleCity(s: SelectionState, city: string): SelectionState {
  if (s.cities.includes(city)) {
    return {
      cities: s.cities.filter((c) => c !== city),
      cells: s.cells.filter((c) => c.city !== city),
    };
  }
  return {
    cities: [...s.cities, city],
    cells: s.cells.filter((c) => c.city !== city), // pełne = brak komórek
  };
}

/**
 * Toggle pojedynczej komórki resortu. `visibleResorts` = resorty obecne w danych (do scalenia w pełne).
 *  - miasto pełne → klik resortu odznacza ten resort (reszta zostaje jako komórki),
 *  - komórka istnieje → odznacz (gdy ostatnia, usuń miasto),
 *  - komórka nie istnieje → zaznacz (gdy zebrały się wszystkie resorty → scal do pełnego).
 */
export function toggleResortCell(
  s: SelectionState, city: string, resort: Resort, visibleResorts: Resort[],
): SelectionState {
  if (isCityFullySelected(s, city)) {
    const others = visibleResorts.filter((r) => r !== resort);
    return {
      cities: s.cities.includes(city) ? s.cities : [...s.cities, city],
      cells: [...s.cells.filter((c) => c.city !== city), ...others.map((r) => ({ city, resort: r }))],
    };
  }

  const exists = s.cells.some((c) => c.city === city && c.resort === resort);
  if (exists) {
    const cells = s.cells.filter((c) => !(c.city === city && c.resort === resort));
    const cityStillHasCells = cells.some((c) => c.city === city);
    return {
      cities: cityStillHasCells ? s.cities : s.cities.filter((c) => c !== city),
      cells,
    };
  }

  const cells = [...s.cells, { city, resort }];
  const cellsForCity = cells.filter((c) => c.city === city).map((c) => c.resort);
  const allResortsSelected = visibleResorts.every((r) => cellsForCity.includes(r));
  return {
    cities: s.cities.includes(city) ? s.cities : [...s.cities, city],
    cells: allResortsSelected ? cells.filter((c) => c.city !== city) : cells, // scal → pełne
  };
}

/** MASTER: gdy wszystkie miasta pełne → wyczyść; inaczej zaznacz wszystkie. */
export function toggleMaster(s: SelectionState, allCities: string[]): SelectionState {
  const allFull = allCities.length > 0 && allCities.every((c) => isCityFullySelected(s, c));
  if (allFull) return emptySelection();
  return { cities: [...allCities], cells: [] };
}

/** Suma uczestników zaznaczonych miast/resortów (makieta: calculateSelectedTotal). */
export function calculateSelectedTotal(s: SelectionState, cities: CityLike[]): number {
  let total = 0;
  for (const c of cities) {
    if (isCityFullySelected(s, c.city)) {
      total += c.razem;
    } else {
      if (isResortCellSelected(s, c.city, 'beaver')) total += c.beaver;
      if (isResortCellSelected(s, c.city, 'sawa')) total += c.sawa;
      if (isResortCellSelected(s, c.city, 'limba')) total += c.limba;
    }
  }
  return total;
}

/**
 * G01 (film E2/E3): czy uczestnik kwalifikuje się jako PRZESIADKOWY.
 * Miasto-przystanek uczestnika jest oznaczone checkboxem ⇄ (transferCities). Przesiadkowy uczestnik
 * (hub Toruń) może trafić na DWIE listy transportowe — flaga is_transfer pozwala backendowi na duplikat
 * i odblokowuje ponowne wsadzenie mimo „wyszarzenia" (już przypisany raz). Bez przesiadki = blokada po 1 raz.
 */
export function isTransferParticipant(
  participantCity: string | null, transferCities: Set<string>,
): boolean {
  if (!participantCity) return false;
  return transferCities.has(participantCity);
}

/**
 * G01 (film E2, R1 „pomyłka = zły autobus"): czy uczestnik może zostać (po)wsadzony do taboru.
 * Nieprzypisany — zawsze. Przypisany — TYLKO gdy przesiadkowy (hub Toruń → druga lista).
 * Przypisany NIE-przesiadkowy = zablokowany („wyszarzony"), by nie trafił 2× przez pomyłkę.
 */
export function canReassignParticipant(
  isAssigned: boolean, participantCity: string | null, transferCities: Set<string>,
): boolean {
  return !isAssigned || isTransferParticipant(participantCity, transferCities);
}

/**
 * Filtr panelu Uczestnicy = LISTA ROZWIJANA (film: „konkretne tematy i przystanki to powinna być
 * lista rozwijana, a nie taka wyszukiwarka"). Zwraca unikalne, niepuste, posortowane po polsku
 * wartości kolumny — do wypełnienia <select>.
 */
export function distinctSorted(values: (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const t = (v ?? '').trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pl'));
}

/**
 * Konfiguracja kolumn panelu Uczestnicy („Tabela", film: „widoki na poziomie local storage zaznaczasz").
 * Przełącza widoczność kolumny po kluczu (toggle w liście widocznych).
 */
export function toggleColumnKey(visible: string[], key: string): string[] {
  return visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key];
}

/**
 * Reorder listy id: przenosi `fromId` na pozycję `toId` (drag&drop dzieci w taborze, film H12).
 * Zwraca nową tablicę (bez mutacji). Gdy któreś id spoza listy lub równe — zwraca kopię bez zmian.
 */
export function reorderList(ids: number[], fromId: number, toId: number): number[] {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return [...ids];
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, fromId);
  return next;
}

/**
 * Toggle id w zbiorze z górnym limitem (Nr 35 „Porównaj" — max 2, rozkaz Pana 2026-06-21).
 * Odznaczenie zawsze możliwe; zaznaczenie tylko gdy rozmiar < max (inaczej zwraca zbiór bez zmian).
 */
export function boundedToggle(set: Set<number>, id: number, max: number): Set<number> {
  const next = new Set(set);
  if (next.has(id)) { next.delete(id); return next; }
  if (next.size >= max) return next;        // limit osiągnięty — nie dodawaj
  next.add(id);
  return next;
}

/** Czy uczestnik (po przystanku=mieście i regionie) należy do bieżącego zaznaczenia. */
export function isParticipantSelected(
  s: SelectionState, participantCity: string | null, participantRegion: string | null,
): boolean {
  if (!participantCity) return false;
  if (isCityFullySelected(s, participantCity)) return true;
  const resort = (participantRegion || '').toLowerCase();
  if (resort !== 'beaver' && resort !== 'sawa' && resort !== 'limba') return false;
  return isResortCellSelected(s, participantCity, resort as Resort);
}

/**
 * BUG 004 (Krzysztof 2026-06-24): „klik miasta po lewej NIE filtruje uczestników gdy tabor otwarty".
 * Reguła: gdy jest JAKIEKOLWIEK zaznaczenie → ZAWSZE filtruj (również w trybie wsadzania do taboru).
 * Gdy brak zaznaczenia → w trybie taboru pokaż wszystkich (żeby móc wsadzić kogokolwiek), poza nim pusto.
 * Wcześniej `assignMode` bezwarunkowo zwracał wszystkich → ignorował filtr miasta (root cause).
 */
export function selectDisplayedParticipants<
  T extends { city: string | null; region: string | null },
>(assignMode: boolean, hasSelection: boolean, participants: T[], selection: SelectionState): T[] {
  if (!hasSelection) return assignMode ? participants : [];
  return participants.filter((p) => isParticipantSelected(selection, p.city, p.region));
}

/**
 * BUG 009 (Krzysztof 2026-06-24): „zaznacz wszystkich" w taborze — nie dało się ODKLIKNĄĆ.
 * Zwraca id, które trzeba przełączyć (flip) by master zadziałał w obie strony:
 * - wszyscy nieprzypisani już zaznaczeni → wszystkie do odznaczenia,
 * - inaczej → tylko brakujące do zaznaczenia.
 */
export function idsToToggleForMaster(selectedIds: Set<number>, unassignedIds: number[]): number[] {
  const allChecked = unassignedIds.length > 0 && unassignedIds.every((id) => selectedIds.has(id));
  if (allChecked) return unassignedIds.filter((id) => selectedIds.has(id));   // odznacz wszystkich
  return unassignedIds.filter((id) => !selectedIds.has(id));                  // zaznacz brakujących
}

/**
 * BUG 006 (Krzysztof 2026-06-24): ranga resortu do sortowania „w obrębie przystanku Beaver→Sawa→Limba".
 * Bierze z region (BEAVER/SAWA/LIMBA), a gdy brak — z pierwszej litery tagu (B/S/L). Nieznane = 99 (na koniec).
 */
const RESORT_RANK: Record<string, number> = { beaver: 0, sawa: 1, limba: 2 };
export function resortRank(region: string | null, tag: string | null): number {
  const r = (region ?? '').trim().toLowerCase();
  if (r in RESORT_RANK) return RESORT_RANK[r];
  const t = (tag ?? '').trim().toUpperCase()[0];
  if (t === 'B') return 0;
  if (t === 'S') return 1;
  if (t === 'L') return 2;
  return 99;
}

/**
 * BUG 010 (Krzysztof 2026-06-24): filtry kolumn to checkboxy multi-select — toggle wartości w tablicy.
 */
export function toggleArrayValue(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

/**
 * BUG 010: wiersz przechodzi filtry gdy dla KAŻDEJ kolumny (AND) jego wartość należy do wybranych
 * (OR w obrębie kolumny). Pusta lista wybranych = brak filtra (przepuszcza wszystko).
 */
export function rowMatchesMultiFilters(
  getValue: (key: string) => string, filters: Record<string, string[]>,
): boolean {
  return Object.entries(filters).every(
    ([key, selected]) => selected.length === 0 || selected.includes(getValue(key).trim()));
}

/**
 * BUG 016 (Krzysztof 2026-06-24): przekładanie kolumn w „Porównaj" (←/→) — zamiana sąsiednich elementów.
 * Poza zakresem (skrajna kolumna) → kopia bez zmian. Bez mutacji wejścia.
 */
export function swapAdjacent<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const j = idx + dir;
  if (idx < 0 || idx >= arr.length || j < 0 || j >= arr.length) return [...arr];
  const next = [...arr];
  [next[idx], next[j]] = [next[j], next[idx]];
  return next;
}

/** BUG 016: usuwanie kolumny z „Porównaj" po indeksie. Bez mutacji wejścia. */
export function removeAt<T>(arr: T[], idx: number): T[] {
  return arr.filter((_, i) => i !== idx);
}

/** Pola potrzebne do domyślnego sortowania transportu (BUG 006). */
export interface DefaultSortable {
  city: string | null;
  region: string | null;
  tag: string | null;
  last_name: string | null;
  first_name: string | null;
}

/**
 * BUG 006: domyślne sortowanie listy uczestników (i listy wygenerowanej):
 * 1) przystanek alfabetycznie (po polsku), 2) resort Beaver→Sawa→Limba, 3) nazwisko+imię alfabetycznie.
 */
export function compareDefaultTransportOrder(a: DefaultSortable, b: DefaultSortable): number {
  const byCity = (a.city ?? '').localeCompare(b.city ?? '', 'pl');
  if (byCity !== 0) return byCity;
  const byResort = resortRank(a.region, a.tag) - resortRank(b.region, b.tag);
  if (byResort !== 0) return byResort;
  const an = `${a.last_name ?? ''} ${a.first_name ?? ''}`.trim();
  const bn = `${b.last_name ?? ''} ${b.first_name ?? ''}`.trim();
  return an.localeCompare(bn, 'pl');
}

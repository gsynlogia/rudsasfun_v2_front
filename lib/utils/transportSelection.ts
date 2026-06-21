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

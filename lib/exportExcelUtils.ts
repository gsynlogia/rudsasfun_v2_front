/**
 * Wspólne funkcje eksportu do Excel (nazwa arkusza, format liczb).
 * Używane w ReservationsTableNew i testach jednostkowych.
 */

export function formatDecimalForExcel(useDot: boolean, n: number): string {
  return n.toFixed(2).replace('.', useDot ? '.' : ',');
}

export function getExportSheetName(tableModule: 'reservations' | 'payments'): string {
  return tableModule === 'payments' ? 'Płatności' : 'Rezerwacje';
}

// Warianty płci (lower-case, bez polskich ogonków) → kanoniczna etykieta dziecięca.
// Obozy = dzieci, więc mapujemy też formy „dorosłe" (mężczyzna/kobieta/man/woman) na
// Chłopiec/Dziewczynka — spójnie z backendem normalize_gender (transport_service.py)
// i mapGender (contractReservationMapping.ts). Dorzucamy man/woman/women, których
// sety backendu nie miały (rozkaz Pana: obsłużyć też te warianty).
const GENDER_MALE = new Set(['chlopiec', 'chlopak', 'mezczyzna', 'male', 'boy', 'man', 'm']);
const GENDER_FEMALE = new Set(['dziewczynka', 'dziewczyna', 'kobieta', 'female', 'girl', 'woman', 'women', 'k', 'f']);

/**
 * Normalizuje wartość płci uczestnika do czytelnej polskiej etykiety dla eksportu Excel.
 * Pusta/null/undefined → '' (nie wymyślamy płci). Nieznany wariant → oryginał (trim) —
 * świadomie NIE gubimy danych (w przeciwieństwie do mapGender, które ma stratny fallback
 * 'Chłopiec'). Dlatego osobny helper, nie reużycie mapGender.
 */
export function normalizeGenderLabel(gender: string | null | undefined): string {
  const raw = (gender ?? '').trim();
  if (!raw) return '';
  const key = raw
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
    .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
  if (GENDER_MALE.has(key)) return 'Chłopiec';
  if (GENDER_FEMALE.has(key)) return 'Dziewczynka';
  return raw;
}
/**
 * Walidacja polskiego numeru PESEL (tylko frontend).
 * Zasady: 11 cyfr, wagi [1,3,7,9,1,3,7,9,1,3], cyfra kontrolna, opcjonalnie poprawna data.
 */

const PESEL_WEIGHTS = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];

/**
 * Sprawdza, czy numer PESEL ma poprawną sumę kontrolną.
 */
function checkChecksum(pesel: string): boolean {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(pesel[i]) * PESEL_WEIGHTS[i];
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum === Number(pesel[10]);
}

/**
 * Sprawdza, czy data urodzenia zakodowana w PESEL (pozycje 0-5: RRMMDD) jest poprawna.
 * Miesiąc: 01-12 (1900-1999), 21-32→-20 (2000), 41-52→-40 (2100), 61-72→-60 (2200), 81-92→-80 (1800).
 */
function checkDateInPesel(pesel: string): boolean {
  const year2 = Number(pesel.slice(0, 2));
  let monthRaw = Number(pesel.slice(2, 4));
  const day = Number(pesel.slice(4, 6));

  let century: number;
  if (monthRaw >= 80) {
    century = 1800;
    monthRaw -= 80;
  } else if (monthRaw >= 60) {
    century = 2200;
    monthRaw -= 60;
  } else if (monthRaw >= 40) {
    century = 2100;
    monthRaw -= 40;
  } else if (monthRaw >= 20) {
    century = 2000;
    monthRaw -= 20;
  } else {
    century = 1900;
  }

  const month = monthRaw;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const fullYear = century + year2;
  const lastDay = new Date(fullYear, month, 0).getDate();
  return day <= lastDay;
}

/**
 * Zwraca true, jeśli przekazany string jest poprawnym numerem PESEL (11 cyfr, suma kontrolna, sensowna data).
 * Pusty string / nie-11-cyfr zwraca false.
 */
export function isValidPesel(pesel: string): boolean {
  const trimmed = (pesel ?? '').trim();
  if (trimmed.length !== 11) return false;
  if (!/^[0-9]{11}$/.test(trimmed)) return false;
  if (!checkChecksum(trimmed)) return false;
  if (!checkDateInPesel(trimmed)) return false;
  return true;
}
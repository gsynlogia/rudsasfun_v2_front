/**
 * Testy jednostkowe: eksport Excel — format liczb i nazwa arkusza.
 * Domyślnie przecinek; kropka gdy użytkownik włączy.
 */
import { formatDecimalForExcel, getExportSheetName, normalizeGenderLabel } from '@/lib/exportExcelUtils';

describe('exportExcelUtils', () => {
  describe('formatDecimalForExcel', () => {
    it('używa przecinka gdy useDot false (domyślnie)', () => {
      expect(formatDecimalForExcel(false, 1.5)).toBe('1,50');
      expect(formatDecimalForExcel(false, 0)).toBe('0,00');
      expect(formatDecimalForExcel(false, 1234.56)).toBe('1234,56');
    });

    it('używa kropki gdy useDot true', () => {
      expect(formatDecimalForExcel(true, 1.5)).toBe('1.50');
      expect(formatDecimalForExcel(true, 0)).toBe('0.00');
      expect(formatDecimalForExcel(true, 1234.56)).toBe('1234.56');
    });
  });

  describe('getExportSheetName', () => {
    it('zwraca "Rezerwacje" dla modułu rezerwacji', () => {
      expect(getExportSheetName('reservations')).toBe('Rezerwacje');
    });

    it('zwraca "Płatności" dla modułu płatności', () => {
      expect(getExportSheetName('payments')).toBe('Płatności');
    });
  });

  describe('normalizeGenderLabel', () => {
    it('zachowuje kanoniczne polskie etykiety z bazy (Chłopiec/Dziewczynka)', () => {
      expect(normalizeGenderLabel('Chłopiec')).toBe('Chłopiec');
      expect(normalizeGenderLabel('Dziewczynka')).toBe('Dziewczynka');
    });

    it('mapuje warianty PL „dorosłe" na etykietę dziecięcą (obozy = dzieci)', () => {
      expect(normalizeGenderLabel('Mężczyzna')).toBe('Chłopiec');
      expect(normalizeGenderLabel('mężczyzna')).toBe('Chłopiec');
      expect(normalizeGenderLabel('Kobieta')).toBe('Dziewczynka');
      expect(normalizeGenderLabel('chłopak')).toBe('Chłopiec');
      expect(normalizeGenderLabel('dziewczyna')).toBe('Dziewczynka');
    });

    it('mapuje warianty EN (male/female/boy/girl/man/woman/women)', () => {
      expect(normalizeGenderLabel('male')).toBe('Chłopiec');
      expect(normalizeGenderLabel('female')).toBe('Dziewczynka');
      expect(normalizeGenderLabel('boy')).toBe('Chłopiec');
      expect(normalizeGenderLabel('girl')).toBe('Dziewczynka');
      expect(normalizeGenderLabel('man')).toBe('Chłopiec');
      expect(normalizeGenderLabel('woman')).toBe('Dziewczynka');
      expect(normalizeGenderLabel('women')).toBe('Dziewczynka');
    });

    it('mapuje skróty literowe (m/k/f) i jest odporny na wielkość liter', () => {
      expect(normalizeGenderLabel('M')).toBe('Chłopiec');
      expect(normalizeGenderLabel('m')).toBe('Chłopiec');
      expect(normalizeGenderLabel('K')).toBe('Dziewczynka');
      expect(normalizeGenderLabel('F')).toBe('Dziewczynka');
      expect(normalizeGenderLabel('MALE')).toBe('Chłopiec');
      expect(normalizeGenderLabel('CHŁOPIEC')).toBe('Chłopiec');
    });

    it('przycina białe znaki przed dopasowaniem', () => {
      expect(normalizeGenderLabel('  Chłopiec  ')).toBe('Chłopiec');
      expect(normalizeGenderLabel('  male ')).toBe('Chłopiec');
    });

    it('zwraca pusty string dla pustych/nullowych wartości (nie wymyśla płci)', () => {
      expect(normalizeGenderLabel('')).toBe('');
      expect(normalizeGenderLabel('   ')).toBe('');
      expect(normalizeGenderLabel(null)).toBe('');
      expect(normalizeGenderLabel(undefined)).toBe('');
    });

    it('zachowuje oryginał (trim) dla nieznanego wariantu — nie gubi danych', () => {
      expect(normalizeGenderLabel('inne')).toBe('inne');
      expect(normalizeGenderLabel('  niebinarna  ')).toBe('niebinarna');
    });
  });
});

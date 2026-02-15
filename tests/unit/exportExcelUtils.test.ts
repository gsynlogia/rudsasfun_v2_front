/**
 * Testy jednostkowe: eksport Excel — format liczb i nazwa arkusza.
 * Zgodność z wymaganiami: kropka/przecinek, arkusz "Rezerwacje" / "Płatności".
 */
import { formatDecimalForExcel, getExportSheetName } from '@/lib/exportExcelUtils';

describe('exportExcelUtils', () => {
  describe('formatDecimalForExcel', () => {
    it('używa kropki gdy useDot true (domyślne dla Excel)', () => {
      expect(formatDecimalForExcel(true, 1.5)).toBe('1.50');
      expect(formatDecimalForExcel(true, 0)).toBe('0.00');
      expect(formatDecimalForExcel(true, 1234.56)).toBe('1234.56');
    });

    it('używa przecinka gdy useDot false', () => {
      expect(formatDecimalForExcel(false, 1.5)).toBe('1,50');
      expect(formatDecimalForExcel(false, 0)).toBe('0,00');
      expect(formatDecimalForExcel(false, 1234.56)).toBe('1234,56');
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
});

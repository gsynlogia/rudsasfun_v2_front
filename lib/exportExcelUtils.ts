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
/**
 * Funkcje formatujące dla strony szczegółów rezerwacji.
 */

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Brak danych';
  try {
    return new Date(dateString).toLocaleDateString('pl-PL');
  } catch {
    return 'Brak danych';
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Brak danych';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      timeZone: 'Europe/Warsaw',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Brak danych';
  }
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0.00 PLN';
  return `${amount.toFixed(2)} PLN`;
}

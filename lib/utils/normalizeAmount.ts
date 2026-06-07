/**
 * Normalizuje wartość kwoty wpisaną przez użytkownika w polu input typu kwota.
 *
 * Akceptuje polską (przecinek) i angielską (kropka) konwencję dziesiętną,
 * strip-uje spacje (np. "- 100" → "-100"), wymusza minus tylko na początku,
 * maksymalnie jedną kropkę. Przeznaczone do użycia w onChange dla pól z pieniędzmi
 * (wplata/nowa, wplata/[paymentId]) — bug 4CAKxfov Phase 3.
 *
 * Zwraca string (nie number), żeby zachować stan kontrolowanego inputa
 * podczas pisania (np. "-100." musi być dozwolone w trakcie pisania "-100.5").
 */
export function normalizeAmount(raw: string): string {
  if (!raw) return '';

  // 1. Strip wszystkich whitespace (spacja, tab, nbsp).
  let s = raw.replace(/\s+/g, '');

  // 2. Przecinek dziesiętny PL → kropka.
  s = s.replace(/,/g, '.');

  // 3. Tylko cyfry, kropka, minus — wszystko inne odrzuć.
  s = s.replace(/[^0-9.\-]/g, '');

  // 4. Minus tylko na samym początku, max 1.
  const hasLeadingMinus = s.startsWith('-');
  s = s.replace(/-/g, '');
  if (hasLeadingMinus) s = '-' + s;

  // 5. Max 1 kropka — kolejne usuń (zostaje pierwsza).
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }

  return s;
}

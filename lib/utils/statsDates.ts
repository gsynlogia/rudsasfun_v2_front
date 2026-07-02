/**
 * Wspólne helpery dat dla stron statystyk (jedno źródło prawdy — DRY).
 * Operują na lokalnych datach (bez przesunięcia strefowego przy północy).
 */

/** Date → 'YYYY-MM-DD' (lokalnie). */
export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** 'YYYY-MM-DD' sprzed n dni (n=0 → dziś). */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

/** Wszystkie dni w zakresie [from, to] (ciągła oś — też dni bez danych). */
export function enumerateDays(from: string, to: string): string[] {
  if (!from || !to) return [];
  const out: string[] = [];
  const d = new Date(from + 'T12:00:00'); // południe — bez przesunięcia strefowego
  const end = new Date(to + 'T12:00:00');
  let guard = 0;
  while (d <= end && guard < 400) {
    out.push(ymd(d));
    d.setDate(d.getDate() + 1);
    guard += 1;
  }
  return out;
}

/** 'YYYY-MM-DD' → 'DD.MM'. */
export function formatDayLabel(iso: string): string {
  const [, mm, dd] = iso.split('-');
  return `${dd}.${mm}`;
}

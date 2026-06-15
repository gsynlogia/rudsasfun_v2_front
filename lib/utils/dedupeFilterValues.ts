/**
 * Deduplikuje listę wartości filtra kolumny (np. miasta transportu) zachowując kolejność.
 *
 * Bug Trello gsOJQywn: modal filtra ładuje wartości stronami z /filter-search. Wstawianie
 * sentinela "Własny" na offset=0 (fix 4ERzXvnf) przesuwa granicę stron tak, że to samo
 * miasto wraca w dwóch batchach (offset=0 kończy "Kraków", offset=10 zaczyna "Kraków").
 * Konkatenacja stron we froncie → "Kraków" 2× → React "two children with same key".
 *
 * DLACZEGO normalizacja zamiast porównania surowego stringu (rozkaz właściciela: "nie po
 * stringu"): to samo miasto może być zapisane różną wielkością liter / ze spacjami
 * ("Kraków" / "kraków" / " Kraków "). Klucz deduplikacji = trim + locale-lowercase (pl),
 * dzięki czemu warianty pisowni scalają się do jednej pozycji. Wyświetlana jest pierwsza
 * napotkana wartość (oryginalny zapis), reszta wariantów jest pomijana w prezentacji.
 *
 * Pure function — testowalna bez DOM/Next/auth.
 */
export function dedupeFilterValues(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = (value ?? '').trim().toLocaleLowerCase('pl');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

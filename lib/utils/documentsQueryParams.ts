/**
 * Pure helper — decyduje, które parametry „zakresu" (exclude/only effective) dorzucić
 * do zapytania DOKUMENTY (`/api/reservations/paginated`).
 *
 * Bug Ani 2026-06-01: dział DOKUMENTY miał na sztywno `exclude_effective_reminders=true`
 * w trybie active → ukrywał w pełni podpisane rezerwacje. Teraz domyślnie pokazujemy
 * WSZYSTKIE, a ukrywanie zatwierdzonych jest opcjonalne (checkbox „Ukryj zatwierdzone").
 *
 * Wyciągnięte do `lib/utils` żeby było testowalne bez React/Next runtime (CLAUDE.md:
 * dekorator-pattern dla testowalności).
 */

export type DocumentsScopeMode = 'active' | 'effective';

export interface DocumentsScopeOptions {
  /** Checkbox „Ukryj zatwierdzone" (tryb active). true → wyklucz w pełni podpisane. */
  hideApproved?: boolean;
  /** Tryb „Skuteczne powiadomienia" — pokaż też organiczne (bez reminderu). */
  effectiveShowOrganic?: boolean;
}

export function getDocumentsScopeParams(
  mode: DocumentsScopeMode,
  opts: DocumentsScopeOptions = {},
): Record<string, string> {
  const params: Record<string, string> = {};

  if (mode === 'active') {
    // Domyślnie WSZYSTKIE — exclude tylko gdy user zaznaczył „Ukryj zatwierdzone".
    if (opts.hideApproved) {
      params.exclude_effective_reminders = 'true';
    }
  } else {
    params.only_effective_reminders = 'true';
    if (opts.effectiveShowOrganic) {
      params.effective_show_organic = 'true';
    }
  }

  return params;
}

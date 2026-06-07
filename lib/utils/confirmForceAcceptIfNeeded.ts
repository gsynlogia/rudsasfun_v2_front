/**
 * Helpery dla bug REZ-1828 (force-accept karty/umowy bez SMS klienta).
 *
 * Pure functions — testowalne bez DOM.
 */

/**
 * Sprawdza czy error z backendu to walidacja braku SMS (HTTP 400 z konkretnym detail).
 * Używane do decyzji czy pokazać modal force-accept.
 *
 * @param error - Error rzucony przez authenticatedApiCall (e.message zawiera backend detail)
 * @returns true gdy backend odmówił z powodu braku SMS klienta
 */
export function isSmsValidationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('weryfikacji kodu SMS');
}

/**
 * @deprecated 2026-05-24 — używaj `isSmsValidationError` + `ForceAcceptConfirmModal` (modal z design systemu)
 * zamiast natywnego window.confirm (UX niespójny z resztą aplikacji).
 * Zachowane dla unit testów + wstecznej kompatybilności.
 */
export function shouldRetryWithForceAccept(
  error: unknown,
  confirmFn: (msg: string) => boolean = (msg) => window.confirm(msg),
): boolean {
  if (!isSmsValidationError(error)) return false;
  return confirmFn(
    'Klient nie wpisał kodu SMS.\n\n' +
    'Czy zaakceptować dokument mimo to?\n' +
    '(zostanie odnotowane w historii — akcja audytowana)',
  );
}

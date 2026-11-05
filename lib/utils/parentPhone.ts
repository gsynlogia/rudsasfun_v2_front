/**
 * Pełny telefon opiekuna z kroku 1, np. „+48 500600700”.
 * W kroku 1 kierunkowy (`phone`) i numer (`phoneNumber`) są w osobnych polach;
 * dane do faktury dostawały sam kierunkowy, bez numeru.
 */
export function fullParentPhone(parent: { phone?: string | null; phoneNumber?: string | null }): string {
  const parts = [parent.phone, parent.phoneNumber].map((part) => (part ?? '').trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '+48';
}

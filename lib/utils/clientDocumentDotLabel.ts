/**
 * Panel klienta — opis kolorowej kropki statusu umowy / karty kwalifikacyjnej.
 *
 * Trello „Umowa i karta w panelu klienta - komunikaty" + „Po zatwierdzeniu dokumentów pojawia
 * się zielona kropka - super, ale nie ma opisu o co chodzi": klient nie wie, czy udało mu się
 * wgrać dokument, ani co oznaczają kolory. Dodajemy opis przy kółeczkach.
 *
 * DLACZEGO osobny helper (a nie getDocumentStatusVisual z DocumentStatusBadge):
 *  - Kropki w ReservationSidebar liczą kolor po WŁASNEJ, 3-stanowej logice
 *    (approved/accepted → zielony, rejected → czerwony, reszta → żółty).
 *  - Etykieta MUSI iść tą samą logiką, żeby tekst nigdy nie kłócił się z kolorem, który
 *    faktycznie widzi klient. Słownictwo jest klienckie (nie adminowe) i wprost od Joanny.
 */

export type ClientDocDotColor = 'green' | 'red' | 'yellow';

export interface ClientDocumentDotPresentation {
  color: ClientDocDotColor;
  /** Klasa tła kropki (Tailwind). */
  dotClass: string;
  /** Klasa koloru tekstu opisu (Tailwind). */
  textClass: string;
  /** Opis dla klienta — treść wprost od Joanny (RadSas). */
  label: string;
}

/**
 * Zwraca kolor kropki + opis dla statusu dokumentu w panelu klienta.
 * Wejście: reservation.contract_status / reservation.qualification_card_status.
 */
export function getClientDocumentDotPresentation(
  status: string | null | undefined,
): ClientDocumentDotPresentation {
  if (status === 'approved' || status === 'accepted') {
    return { color: 'green', dotClass: 'bg-green-500', textClass: 'text-green-600', label: 'zatwierdzone' };
  }
  if (status === 'rejected') {
    return { color: 'red', dotClass: 'bg-red-500', textClass: 'text-red-600', label: 'odrzucone' };
  }
  // signed_pending_admin / in_verification / pending / brak → żółty (dokument w toku weryfikacji)
  return { color: 'yellow', dotClass: 'bg-yellow-400', textClass: 'text-yellow-600', label: 'wgrane, weryfikowane' };
}
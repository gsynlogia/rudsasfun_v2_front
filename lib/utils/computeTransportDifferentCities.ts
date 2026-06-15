/**
 * Wylicza, czy miejsce wyjazdu i powrotu są RÓŻNE — wartość ptaszka
 * „Różne miasta wyjazdu i powrotu" w panelu admina (detal rezerwacji → Transport).
 *
 * Bug Trello DwhFUHiq (#156). Reguła wiążąca (rozkaz właściciela):
 *   tożsamość transportu = 'OWN' dla transportu własnego (type === 'wlasny'),
 *   w przeciwnym razie nazwa miasta. Ptaszek = true gdy tożsamości się różnią.
 *
 * DLACZEGO 'OWN' zamiast porównania miast: dla transportu własnego baza często
 * trzyma niepuste `departure_city`/`return_city` (śmieci historyczne — 665 rez.),
 * więc porównanie samych miast dawałoby fałszywe „różne". Typ ma pierwszeństwo:
 * dwa transporty własne to JEDNA kategoria „własny", więc NIE są różne.
 *
 * Przykłady:
 *   własny + własny                 → false
 *   zbiorowy(X) + własny            → true
 *   zbiorowy(X) + zbiorowy(Y) X≠Y   → true
 *   zbiorowy(X) + zbiorowy(X)       → false
 *
 * Pure function — testowalna bez DOM/Next/auth.
 */

/** Wartość pola `departure_type`/`return_type` oznaczająca transport własny. */
const OWN_TRANSPORT_TYPE = 'wlasny';
/** Tożsamość-sentinel dla transportu własnego (jedna wspólna kategoria). */
const OWN_IDENTITY = 'OWN';

export interface TransportEndpoint {
  /** 'wlasny' | 'zbiorowy' (lub null/undefined w danych legacy). */
  type: string | null | undefined;
  /** Miasto zbiórki — istotne tylko dla transportu zbiorowego. */
  city: string | null | undefined;
}

/** Tożsamość punktu transportu: 'OWN' dla własnego, inaczej nazwa miasta (trim). */
function transportIdentity(endpoint: TransportEndpoint): string {
  if (endpoint.type === OWN_TRANSPORT_TYPE) return OWN_IDENTITY;
  return (endpoint.city ?? '').trim();
}

export function computeTransportDifferentCities(
  departure: TransportEndpoint,
  ret: TransportEndpoint,
): boolean {
  return transportIdentity(departure) !== transportIdentity(ret);
}

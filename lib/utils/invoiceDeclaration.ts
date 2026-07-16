/**
 * invoiceDeclaration — co pokazać klientowi o fakturze, którą zadeklarował przy rezerwacji.
 *
 * PO CO: rodzic w panelu ma widzieć, czy przy rezerwacji poprosił o fakturę i na jakie dane.
 * Danych NIE zmienia — jeśli chce coś poprawić, dzwoni do biura (tylko admin może edytować).
 *
 * WAŻNA PUŁAPKA (zweryfikowana na bazie 2026-07-17): `invoice_type` jest ustawione u PRAWIE
 * WSZYSTKICH rezerwacji (2624 z 2653 ma 'private') — także u tych, które faktury NIE chcą,
 * bo to wartość domyślna. Jedynym wyznacznikiem chęci jest `wants_invoice`.
 *
 * Reguła, które dane pokazać, jest ta sama, co w panelu admina (sekcja „Faktura"):
 * firma → nazwa + NIP; osoba prywatna → imię + nazwisko; adres w obu wypadkach.
 * Dzięki temu klient widzi dokładnie to, co widzi Joanna — bez rozjazdu.
 */

/** Pola rezerwacji potrzebne do opisania deklaracji (podzbiór ReservationResponse). */
export interface InvoiceDeclarationInput {
  wants_invoice?: boolean | null;
  invoice_type?: string | null;
  invoice_first_name?: string | null;
  invoice_last_name?: string | null;
  invoice_company_name?: string | null;
  invoice_nip?: string | null;
  invoice_street?: string | null;
  invoice_postal_code?: string | null;
  invoice_city?: string | null;
}

export interface InvoiceDeclaration {
  /** Czy klient zadeklarował chęć otrzymania faktury. */
  wants: boolean;
  /** Dane nabywcy, linia po linii. Puste, gdy klient faktury nie chce albo danych brak. */
  lines: string[];
}

/** Zwraca przycięty tekst albo null, gdy pole jest puste/same spacje. */
function clean(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Skleja części w jedną linię, pomijając puste (bez wiszących spacji). */
function joinLine(...parts: (string | null | undefined)[]): string | null {
  const kept = parts.map(clean).filter((p): p is string => p !== null);
  return kept.length > 0 ? kept.join(' ') : null;
}

/**
 * Opisuje deklarację faktury dla panelu klienta.
 *
 * @param reservation rezerwacja (pola invoice_* z API)
 */
export function describeInvoiceDeclaration(reservation: InvoiceDeclarationInput): InvoiceDeclaration {
  // Uwaga: świadomie NIE patrzymy na invoice_type — patrz komentarz na górze pliku.
  if (reservation.wants_invoice !== true) {
    return { wants: false, lines: [] };
  }

  const lines: string[] = [];

  if (reservation.invoice_type === 'company') {
    const company = clean(reservation.invoice_company_name);
    if (company) lines.push(company);

    const nip = clean(reservation.invoice_nip);
    if (nip) lines.push(`NIP: ${nip}`);
  } else {
    const person = joinLine(reservation.invoice_first_name, reservation.invoice_last_name);
    if (person) lines.push(person);
  }

  const street = clean(reservation.invoice_street);
  if (street) lines.push(street);

  // Kod i miasto w jednej linii („83-314 Somonino"); jeśli jest tylko jedno — pokazujemy je samo.
  const cityLine = joinLine(reservation.invoice_postal_code, reservation.invoice_city);
  if (cityLine) lines.push(cityLine);

  return { wants: true, lines };
}
/**
 * describeInvoiceDeclaration — co pokazać klientowi o jego deklaracji faktury.
 *
 * Przypadki wzięte z REALNYCH danych (SQL na bazie lokalnej 2026-07-17, 2653 rezerwacje):
 *   855 chce faktury (826 prywatnych + 29 firm), 1798 nie chce.
 *   Nie-chcący mają 0/1798 wypełnionych pól → nie ma czego pokazywać.
 *   REZ-2026-1252: chce faktury, ale WSZYSTKIE dane puste (jedyny taki) → przypadek brzegowy.
 *
 * Reguła private/company skopiowana z zachowania panelu admina:
 *   private → imię+nazwisko, company → nazwa firmy+NIP; adres zawsze.
 */
import { describeInvoiceDeclaration } from '@/lib/utils/invoiceDeclaration';

describe('describeInvoiceDeclaration — deklaracja faktury w panelu klienta', () => {
  it('NIE chce faktury → wants=false, brak danych do pokazania', () => {
    const out = describeInvoiceDeclaration({ wants_invoice: false, invoice_type: 'private' });
    expect(out.wants).toBe(false);
    expect(out.lines).toEqual([]);
  });

  it('wants_invoice=null (brak informacji) → traktujemy jak NIE (nie zmyślamy)', () => {
    expect(describeInvoiceDeclaration({ wants_invoice: null }).wants).toBe(false);
  });

  it('invoice_type=private NIE oznacza chęci faktury (to wartość domyślna dla 2624 rezerwacji)', () => {
    // Pułapka: invoice_type jest ustawione u prawie wszystkich, także tych bez faktury.
    const out = describeInvoiceDeclaration({
      wants_invoice: false,
      invoice_type: 'private',
      invoice_first_name: 'Jan',
      invoice_last_name: 'Kowalski',
    });
    expect(out.wants).toBe(false);
    expect(out.lines).toEqual([]);
  });

  describe('osoba prywatna (826 rezerwacji)', () => {
    it('pokazuje imię i nazwisko + adres, BEZ nazwy firmy/NIP', () => {
      // realna: REZ-2026-3078
      const out = describeInvoiceDeclaration({
        wants_invoice: true,
        invoice_type: 'private',
        invoice_first_name: 'Rafał',
        invoice_last_name: 'Stawicki',
        invoice_street: 'Witosławy 33B',
        invoice_postal_code: '83-314',
        invoice_city: 'Somonino',
      });
      expect(out.wants).toBe(true);
      expect(out.lines).toEqual(['Rafał Stawicki', 'Witosławy 33B', '83-314 Somonino']);
    });
  });

  describe('firma (29 rezerwacji)', () => {
    it('pokazuje nazwę firmy + NIP + adres, BEZ imienia', () => {
      // realna: REZ-2026-3082
      const out = describeInvoiceDeclaration({
        wants_invoice: true,
        invoice_type: 'company',
        invoice_company_name: 'SALEZJAŃSKA PLACÓWKA OPIEKUŃCZO WYCHOWAWCZA "NASZ DOM"',
        invoice_nip: '8911635954',
        invoice_street: 'ul. Szczygłowskiego 5',
        invoice_postal_code: '87-700',
        invoice_city: 'Aleksandrów Kujawski',
      });
      expect(out.wants).toBe(true);
      expect(out.lines).toEqual([
        'SALEZJAŃSKA PLACÓWKA OPIEKUŃCZO WYCHOWAWCZA "NASZ DOM"',
        'NIP: 8911635954',
        'ul. Szczygłowskiego 5',
        '87-700 Aleksandrów Kujawski',
      ]);
    });

    it('firma NIE pokazuje imienia, nawet gdy pola imienia są wypełnione', () => {
      const out = describeInvoiceDeclaration({
        wants_invoice: true,
        invoice_type: 'company',
        invoice_company_name: 'ACME',
        invoice_nip: '1234567890',
        invoice_first_name: 'Jan',
        invoice_last_name: 'Kowalski',
        invoice_street: 'Testowa 1',
        invoice_postal_code: '00-001',
        invoice_city: 'Warszawa',
      });
      expect(out.lines).not.toContain('Jan Kowalski');
    });
  });

  describe('przypadki brzegowe', () => {
    it('chce faktury, ale dane puste (REZ-2026-1252) → wants=true, lines puste', () => {
      const out = describeInvoiceDeclaration({
        wants_invoice: true,
        invoice_type: 'private',
        invoice_first_name: null,
        invoice_last_name: null,
        invoice_street: '',
        invoice_postal_code: '',
        invoice_city: '',
      });
      expect(out.wants).toBe(true);
      expect(out.lines).toEqual([]); // widok pokaże komunikat o braku danych, nie puste linie
    });

    it('same spacje traktujemy jak brak (nie pokazujemy pustych linii)', () => {
      const out = describeInvoiceDeclaration({
        wants_invoice: true,
        invoice_type: 'private',
        invoice_first_name: '   ',
        invoice_last_name: '  ',
        invoice_street: '  ',
        invoice_postal_code: ' ',
        invoice_city: '  ',
      });
      expect(out.lines).toEqual([]);
    });

    it('samo imię bez nazwiska → jedna linia, bez wiszącej spacji', () => {
      const out = describeInvoiceDeclaration({
        wants_invoice: true,
        invoice_type: 'private',
        invoice_first_name: 'Anna',
        invoice_street: 'Kwiatowa 2',
      });
      expect(out.lines).toEqual(['Anna', 'Kwiatowa 2']);
    });

    it('kod bez miasta → nie zostawia sierocego kodu w oderwaniu', () => {
      const out = describeInvoiceDeclaration({
        wants_invoice: true,
        invoice_type: 'private',
        invoice_first_name: 'Anna',
        invoice_postal_code: '80-180',
      });
      expect(out.lines).toEqual(['Anna', '80-180']);
    });

    it('firma bez NIP → pokazuje samą nazwę (bez „NIP:" bez wartości)', () => {
      const out = describeInvoiceDeclaration({
        wants_invoice: true,
        invoice_type: 'company',
        invoice_company_name: 'ACME',
      });
      expect(out.lines).toEqual(['ACME']);
    });
  });
});

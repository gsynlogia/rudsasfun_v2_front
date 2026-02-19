'use client';

/**
 * Nowy szablon umowy – przepisany 1:1 na podstawie /profil/aktualne-rezerwacje/[id]/umowa.
 * Wszystkie dane z systemu są edytowalne; pola do edycji mają żółte tło (background).
 * Używany w panelu admin (rezerwacja #dokumenty) zamiast starego szablonu HTML z backendu.
 */

import { Printer } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';

export interface ContractTemplateNewProps {
  reservationId?: number;
  reservationData?: {
    reservationNumber?: string;
    contractDate?: string;
    tournamentName?: string;
    tournamentDates?: string;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
    parentCity?: string;
    childName?: string;
    childCity?: string;
    childYear?: string;
    childGender?: string;
    locationName?: string;
    locationAddress?: string;
    facilityName?: string;
    transportTo?: string;
    transportFrom?: string;
    baseCost?: string;
    diet?: string;
    attractions?: string;
    insurance1?: string;
    insurance2?: string;
    transport?: string;
    totalCost?: string;
    deposit?: string;
    remainingPayment?: string;
    accommodation?: string;
    meals?: string;
    transportInfo?: string;
    departurePlace?: string;
    returnPlace?: string;
    invoice?: string;
    promotions?: string;
  };
  signedPayload?: Record<string, unknown> | null;
  /** true = tylko podgląd (div), false = edycja (input/textarea z żółtym tłem) */
  readOnly?: boolean;
}

function contractPayloadToFormOverlay(p: Record<string, unknown>): Partial<ContractTemplateNewProps['reservationData']> {
  const daneKlienta = p.daneKlienta as Record<string, string> | undefined;
  const daneUczestnika = p.daneUczestnika as Record<string, string> | undefined;
  const szczegoly = p.szczegolyKoloniiObozu as Record<string, string> | undefined;
  const platnosci = p.platnosci as Record<string, string> | undefined;
  const temat = (p.tematKoloniiObozu as string) || '';
  const bracket = temat.indexOf(' (');
  const tournamentName = bracket > 0 ? temat.slice(0, bracket).trim() : temat;
  const tournamentDates = bracket > 0 ? temat.slice(bracket + 2, temat.endsWith(')') ? temat.length - 1 : temat.length).trim() : '';
  return {
    parentName: daneKlienta?.imieNazwisko,
    parentEmail: daneKlienta?.email,
    parentPhone: daneKlienta?.kontakt,
    parentCity: daneKlienta?.miasto,
    childName: daneUczestnika?.imieNazwisko,
    childYear: daneUczestnika?.rocznik,
    childCity: daneUczestnika?.miasto,
    childGender: daneUczestnika?.plec,
    tournamentName: tournamentName || undefined,
    tournamentDates: tournamentDates || undefined,
    locationName: szczegoly?.tematOśrodekData,
    facilityName: szczegoly?.nazwaIAdresOśrodka,
    locationAddress: szczegoly?.adresOśrodka,
    baseCost: platnosci?.kosztPodstawowy,
    diet: platnosci?.dieta,
    attractions: platnosci?.atrakcjeDodatkowe,
    insurance1: platnosci?.ochronaRezygnacjiPrzed,
    insurance2: platnosci?.ochronaRezygnacjiWTrakcie,
    transport: platnosci?.cenaZaTransport,
    totalCost: platnosci?.kosztCalkowity,
    deposit: platnosci?.zaliczka,
    remainingPayment: platnosci?.pozostalaKwotaTermin,
    invoice: platnosci?.faktura,
    promotions: platnosci?.promocje,
    meals: p.wyzywienie as string | undefined,
    transportInfo: p.specyfikacjaTransportu as string | undefined,
    departurePlace: p.miejsceWyjazdu as string | undefined,
    returnPlace: p.miejscePowrotu as string | undefined,
  };
}

const defaultMeals = '4 posiłki dziennie (śniadanie, obiad, podwieczorek, kolacja; w dniu przyjazdu obiadokolacja) + suchy prowiant na drogę';
const defaultTransportInfo = 'Autokar, bus, PKP lub własny zgodnie z rezerwacją i regulaminem transportu dostępnym na stronie organizatora i w Panelu Klienta. Jeśli autokar z przyczyn niezależnych od organizatora zostanie podstawiony z opóźnieniem, organizator nie ponosi odpowiedzialności z tego tytułu. Uczestnik ma obowiązek stawić się na wyznaczone miejsce zbiórki w ustalonym czasie. Miejsca zbiórki i godziny odjazdów/przyjazdów znajdują się w Panelu Klienta oraz na stronie internetowej wybranej kolonii/obozu.';

function EditableField({
  value,
  onChange,
  readOnly,
  multiline,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  multiline?: boolean;
  className?: string;
}) {
  const baseClass = multiline ? 'field-value-multiline' : 'field-value';
  const _withYellow = readOnly ? '' : ' admin-editable-field';
  if (readOnly) {
    return <div className={`${baseClass} ${className}`}>{value}</div>;
  }
  if (multiline) {
    return (
      <textarea
        className={`${baseClass} admin-editable-field ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    );
  }
  return (
    <input
      type="text"
      className={`${baseClass} admin-editable-field ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function ContractTemplateNew({ reservationData, signedPayload, readOnly = false }: ContractTemplateNewProps) {
  const getCurrentDateTime = () => {
    const now = new Date();
    return `${now.toLocaleDateString('pl-PL')}, ${now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
  };
  const getCurrentDate = () => new Date().toLocaleDateString('pl-PL');

  const overlay = signedPayload && typeof signedPayload === 'object' ? contractPayloadToFormOverlay(signedPayload) : {};
  const base = {
    reservationNumber: reservationData?.reservationNumber ?? '',
    contractDate: reservationData?.contractDate ?? '',
    tournamentName: reservationData?.tournamentName ?? '',
    tournamentDates: reservationData?.tournamentDates ?? '',
    parentName: reservationData?.parentName ?? 'Brak danych',
    parentEmail: reservationData?.parentEmail ?? '',
    parentPhone: reservationData?.parentPhone ?? '',
    parentCity: reservationData?.parentCity ?? '',
    childName: reservationData?.childName ?? 'Brak danych',
    childCity: reservationData?.childCity ?? '',
    childYear: reservationData?.childYear ?? '',
    childGender: reservationData?.childGender ?? '',
    locationName: reservationData?.locationName ?? '',
    locationAddress: reservationData?.locationAddress ?? '',
    facilityName: reservationData?.facilityName ?? '',
    transportTo: reservationData?.transportTo ?? '',
    transportFrom: reservationData?.transportFrom ?? '',
    baseCost: reservationData?.baseCost ?? '0,00',
    diet: reservationData?.diet ?? '',
    attractions: reservationData?.attractions ?? '',
    insurance1: reservationData?.insurance1 ?? '',
    insurance2: reservationData?.insurance2 ?? '',
    transport: reservationData?.transport ?? '',
    totalCost: reservationData?.totalCost ?? '0,00',
    deposit: reservationData?.deposit ?? '0,00',
    remainingPayment: reservationData?.remainingPayment ?? '21 dni przed rozpoczęciem się kolonii/obozu',
    meals: reservationData?.meals ?? defaultMeals,
    transportInfo: reservationData?.transportInfo ?? defaultTransportInfo,
    departurePlace: reservationData?.departurePlace ?? '',
    returnPlace: reservationData?.returnPlace ?? '',
    invoice: reservationData?.invoice ?? '',
    promotions: reservationData?.promotions ?? '',
  };
  const initialFormData = useMemo(() => {
    const data = { ...base };
    if (overlay) {
      Object.keys(overlay).forEach((k) => {
        const v = (overlay as Record<string, unknown>)[k];
        if (v !== null && v !== undefined && k in data) (data as Record<string, string>)[k] = String(v);
      });
    }
    return data;
  }, [reservationData, signedPayload]);

  const [formData, setFormData] = useState(initialFormData);
  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  const update = (key: keyof typeof formData, value: string) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Przycisk druku – jak w profilu (zrzut z przyciskiem Drukuj jest prawidłowy) */}
      <div className="no-print max-w-[210mm] mx-auto px-4 pt-4 flex justify-end">
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 bg-[#03adf0] text-white px-4 py-2 rounded hover:bg-[#0299d6] transition text-sm font-medium"
        >
          <Printer className="w-4 h-4" />
          Drukuj
        </button>
      </div>

      <div className="form-container">
        <div className="page">
          <div className="header">
            <div className="date">{getCurrentDateTime()}</div>
            <div className="title-center">Umowa o świadczenie usług/imprezy turystycznej</div>
            <Image src="/logo.png" alt="RADSAS fun" width={75} height={40} className="logo" />
          </div>
          <h1 className="main-title">
            UMOWA O ŚWIADCZENIE USŁUG/IMPREZY TURYSTYCZNEJ (zwanej dalej &quot;kolonia/obóz&quot;) DOT. <EditableField value={formData.reservationNumber} onChange={(v) => update('reservationNumber', v)} readOnly={readOnly} /> <br />
            ZAWARTA W DNIU <EditableField value={formData.contractDate || getCurrentDate()} onChange={(v) => update('contractDate', v)} readOnly={readOnly} />
          </h1>
          <div className="tournament-name">
            <EditableField value={formData.tournamentName} onChange={(v) => update('tournamentName', v)} readOnly={readOnly} /> (<EditableField value={formData.tournamentDates} onChange={(v) => update('tournamentDates', v)} readOnly={readOnly} />)
          </div>
          <section className="section">
            <h2 className="section-title">DANE ORGANIZATORA (zwany dalej &quot;Organizatorem&quot;):</h2>
            <div className="organizer-box">
              <p><strong>RADSAS FUN sp. z o.o.</strong></p>
              <p>ul. Chłopska 7/6, 80-362 Gdańsk</p>
              <p>NIP: 5842861490, KRS 0001143093</p>
            </div>
          </section>
          <section className="section">
            <h2 className="section-title">DANE RODZICA/OPIEKUNA PRAWNEGO rezerwującego kolonię/obóz (zwany dalej &quot;Klientem&quot;):</h2>
            <div className="field-grid">
              <div className="field-group">
                <label>Imię i nazwisko:</label>
                <EditableField value={formData.parentName} onChange={(v) => update('parentName', v)} readOnly={readOnly} />
              </div>
              <div className="field-group">
                <label>E-mail:</label>
                <EditableField value={formData.parentEmail} onChange={(v) => update('parentEmail', v)} readOnly={readOnly} />
              </div>
            </div>
            <div className="field-grid">
              <div className="field-group">
                <label>Kontakt:</label>
                <EditableField value={formData.parentPhone} onChange={(v) => update('parentPhone', v)} readOnly={readOnly} />
              </div>
              <div className="field-group">
                <label>Miasto:</label>
                <EditableField value={formData.parentCity} onChange={(v) => update('parentCity', v)} readOnly={readOnly} />
              </div>
            </div>
          </section>
          <section className="section">
            <h2 className="section-title">DANE UCZESTNIKA (zwany dalej &quot;Uczestnikiem&quot;):</h2>
            <div className="field-grid">
              <div className="field-group">
                <label>Imię i nazwisko:</label>
                <EditableField value={formData.childName} onChange={(v) => update('childName', v)} readOnly={readOnly} />
              </div>
              <div className="field-group">
                <label>Rocznik:</label>
                <EditableField value={formData.childYear} onChange={(v) => update('childYear', v)} readOnly={readOnly} />
              </div>
            </div>
            <div className="field-grid">
              <div className="field-group">
                <label>Miasto:</label>
                <EditableField value={formData.childCity} onChange={(v) => update('childCity', v)} readOnly={readOnly} />
              </div>
              <div className="field-group">
                <label>Płeć:</label>
                <EditableField value={formData.childGender} onChange={(v) => update('childGender', v)} readOnly={readOnly} />
              </div>
            </div>
          </section>
          <section className="section">
            <h2 className="section-title">PRZEDMIOT UMOWY:</h2>
            <p className="info-text">
              Przedmiotem umowy pomiędzy Organizatorem i Klientem jest organizacja kolonii/obozu dla Uczestnika zgodnie z danymi w niniejszej umowie, w Panelu Klienta i regulaminie.
            </p>
          </section>
          <section className="section">
            <h2 className="section-title">SZCZEGÓŁY KOLONII/OBOZU:</h2>
            <div className="field-group">
              <label>Temat kolonii/obozu, ośrodek i data:</label>
              <EditableField value={formData.locationName} onChange={(v) => update('locationName', v)} readOnly={readOnly} multiline />
            </div>
            <div className="field-group">
              <label>Nazwa i adres ośrodka (zakwaterowanie):</label>
              <div className="field-value-multiline">
                {readOnly ? (
                  <>
                    <div className="facility-name">{formData.facilityName}</div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.locationAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="location-link"
                    >
                      {formData.locationAddress}
                    </a>
                  </>
                ) : (
                  <>
                    <div className="facility-name">
                      <EditableField value={formData.facilityName} onChange={(v) => update('facilityName', v)} readOnly={false} className="block" />
                    </div>
                    <EditableField value={formData.locationAddress} onChange={(v) => update('locationAddress', v)} readOnly={false} />
                  </>
                )}
              </div>
            </div>
          </section>
          <section className="section">
            <label>Wyżywienie:</label>
            <EditableField value={formData.meals} onChange={(v) => update('meals', v)} readOnly={readOnly} multiline />
          </section>
          <div className="page-number">1/3</div>
        </div>

        <div className="page">
          <div className="header-simple">
            <div className="date">{getCurrentDateTime()}</div>
            <div className="title-center">Umowa o świadczenie usług/imprezy turystycznej</div>
            <Image src="/logo.png" alt="RADSAS fun" width={60} height={32} className="logo-small" />
          </div>
          <section className="section">
            <h2 className="section-title">PŁATNOŚCI:</h2>
            <p className="info-text-small">KOSZT PODSTAWOWY zawiera: atrakcje, które są w cenie obozu i ubezpieczenia (NNW, TFG, TFP)</p>
            <p className="info-text-small">KOSZT CAŁKOWITY zawiera: diety, atrakcje dodatkowe, ochrony, transport i promocje</p>
            <div className="payment-grid">
              <div className="payment-item">
                <label>KOSZT PODSTAWOWY:</label>
                <EditableField value={formData.baseCost} onChange={(v) => update('baseCost', v)} readOnly={readOnly} />
                <span>zł</span>
              </div>
              <div className="payment-item">
                <label>Dieta:</label>
                <EditableField value={formData.diet} onChange={(v) => update('diet', v)} readOnly={readOnly} />
                <span>zł</span>
              </div>
              <div className="payment-item">
                <label>Atrakcje dodatkowe:</label>
                <EditableField value={formData.attractions} onChange={(v) => update('attractions', v)} readOnly={readOnly} multiline />
                <span>zł</span>
              </div>
              <div className="payment-item">
                <label>Ochrona od rezygnacji przed rozpoczęciem się obozu/kolonii:</label>
                <EditableField value={formData.insurance1} onChange={(v) => update('insurance1', v)} readOnly={readOnly} />
                <span>zł</span>
              </div>
              <div className="payment-item">
                <label>Ochrona od rezygnacji w trakcie trwania obozu/kolonii:</label>
                <EditableField value={formData.insurance2} onChange={(v) => update('insurance2', v)} readOnly={readOnly} />
                <span>zł</span>
              </div>
              <div className="payment-item">
                <label>Cena za transport:</label>
                {readOnly ? (
                  <>
                    <div className="field-value">
                      {formData.transportTo === 'Własny transport' && formData.transportFrom === 'Własny transport'
                        ? '— — — — — — — — — — — — — — — — — — — —'
                        : formData.transport}
                    </div>
                    {!(formData.transportTo === 'Własny transport' && formData.transportFrom === 'Własny transport') && <span>zł</span>}
                  </>
                ) : (
                  <>
                    <EditableField value={formData.transport} onChange={(v) => update('transport', v)} readOnly={false} />
                    {!(formData.transportTo === 'Własny transport' && formData.transportFrom === 'Własny transport') && <span>zł</span>}
                  </>
                )}
              </div>
              <div className="payment-item promocja">
                <label>Faktura:</label>
                <EditableField value={formData.invoice} onChange={(v) => update('invoice', v)} readOnly={readOnly} />
                <span>zł</span>
              </div>
              <div className="payment-item promocja">
                <label>Promocje:</label>
                <EditableField value={formData.promotions} onChange={(v) => update('promotions', v)} readOnly={readOnly} />
                <span>zł</span>
              </div>
            </div>
            <div className="total-cost">
              <strong>KOSZT CAŁKOWITY do zapłaty: <EditableField value={formData.totalCost} onChange={(v) => update('totalCost', v)} readOnly={readOnly} /> zł</strong>
            </div>
          </section>
          <section className="section">
            <h2 className="section-title">Warunki płatności:</h2>
            {(() => {
              const promLower = (formData.promotions ?? '').toLowerCase();
              const isFirstMinute =
                promLower.includes('first minute') ||
                promLower.includes('firstminute') ||
                promLower.includes('wczesna rezerwacja');
              if (isFirstMinute) {
                return (
                  <p className="info-text">
                    <strong>Pełna wpłata (<EditableField value={formData.totalCost} onChange={(v) => update('totalCost', v)} readOnly={readOnly} /> zł) płatna w ciągu 2 dni roboczych od daty rezerwacji.</strong>
                  </p>
                );
              }
              return (
                <>
                  <p className="info-text">
                    <strong>Zaliczka w kwocie <EditableField value={formData.deposit} onChange={(v) => update('deposit', v)} readOnly={readOnly} /> zł</strong> (zaliczka 500 zł + ewentualne ochrony) płatna w ciągu 2 dni roboczych od daty rezerwacji.
                  </p>
                  <p className="info-text">
                    Pozostała kwota płatna najpóźniej na <EditableField value={formData.remainingPayment} onChange={(v) => update('remainingPayment', v)} readOnly={readOnly} />.
                  </p>
                </>
              );
            })()}
          </section>
          <section className="section">
            <h2 className="section-title">Dane do wpłat:</h2>
            <div className="bank-info">
              <p><strong>RADSAS FUN sp. z o.o.</strong> ul. Chłopska 7/6, 80-362 Gdańsk</p>
              <p><strong>Numer rachunku (Bank Millenium):</strong> 81 1160 2202 0000 0006 4343 3035</p>
              <p><strong>Tytuł wpłaty:</strong> nazwisko i imię uczestnika, numer rezerwacji, temat obozu, ośrodek, termin</p>
            </div>
          </section>
          <section className="section">
            <h2 className="section-title">TRANSPORT:</h2>
            <h2 className="section-title">Specyfikacja transportu:</h2>
            <EditableField value={formData.transportInfo} onChange={(v) => update('transportInfo', v)} readOnly={readOnly} multiline />
          </section>
          <section className="section">
            <h2 className="section-title">Miejsce wyjazdu:</h2>
            <EditableField value={formData.departurePlace} onChange={(v) => update('departurePlace', v)} readOnly={readOnly} />
          </section>
          <section className="section">
            <h2 className="section-title">Miejsce powrotu:</h2>
            <EditableField value={formData.returnPlace} onChange={(v) => update('returnPlace', v)} readOnly={readOnly} />
          </section>
          <div className="page-number">2/3</div>
        </div>

        <div className="page">
          <div className="header-simple">
            <div className="date">{getCurrentDateTime()}</div>
            <div className="title-center">Umowa o świadczenie usług/imprezy turystycznej</div>
            <Image src="/logo.png" alt="RADSAS fun" width={60} height={32} className="logo-small" />
          </div>
          <section className="section">
            <h2 className="section-title">OBOWIĄZKI ORGANIZATORA:</h2>
            <ul className="bullet-list">
              <li>Organizator zapewnia zakwaterowanie, wyżywienie, realizację programu dostępnego na stronie wybranej kolonii/obozu oraz możliwość transportu.</li>
              <li>Organizator zapewnia opiekę pedagogiczną, instruktorską oraz dostęp do opieki medycznej</li>
              <li>Program kolonii/obozu dostępny jest na www.radsas-fun.pl w zakładce danej kolonii/obozu. Zmiany w realizacji programu zależą od czynników niezależnych od Organizatora. W przypadku złych warunków atmosferycznych, Organizator zastrzega sobie prawo do wprowadzenia zmian w programie lub zmiany atrakcji na równorzędne.</li>
              <li>Organizator nie ponosi odpowiedzialności za rzeczy wartościowe uczestnika (pieniądze, telefony, tablety, biżuteria itp.).</li>
            </ul>
          </section>
          <section className="section">
            <h2 className="section-title">OBOWIĄZKI KLIENTA:</h2>
            <ul className="bullet-list">
              <li>Klient zobowiązuje się do wniesienia płatności w terminach określonych w umowie i regulaminie.</li>
              <li>Klient zobowiązuje się do podpisania w Panelu Klienta wszystkich wymaganych dokumentów (karta kwalifikacyjna, zgody, upoważnienia) przed rozpoczęciem kolonii/obozu.</li>
              <li>Klient zobowiązuje się do przekazania organizatorowi wszystkich istotnych informacji o stanie zdrowia uczestnika, przyjmowanych lekach, alergiach itp.</li>
              <li>Klient zobowiązuje się do przekazania i odbioru Uczestnika opiekunowi w wyznaczonym przez Organizatora miejscu i czasie.</li>
              <li>Klient ponosi pełną odpowiedzialność za szkody wyrządzone przez uczestnika w mieniu Organizatora lub osób trzecich.</li>
            </ul>
          </section>
          <section className="section">
            <h2 className="section-title">ODSTĄPIENIE OD UMOWY:</h2>
            <ul className="bullet-list">
              <li>Klient może odstąpić od umowy w każdym czasie przed rozpoczęciem kolonii/obozu, zgodnie z zasadami określonymi w Regulaminie.</li>
              <li>W przypadku odstąpienia, Organizator pobiera opłaty zgodnie z tabelą dostępną w Regulaminie i Panelu Klienta.</li>
              <li>Organizator może odstąpić od umowy w przypadku nie uiszczenia płatności w terminie, niewykonania innych zobowiązań przez Klienta, sytuacji niezależnych od Organizatora oraz jego autonomicznych decyzji.</li>
              <li>W przypadku odwołania terminu/tematu danej kolonii/obozu, Organizator proponuje inny termin/temat/miejsce kolonii/obozu lub zwraca 100% wpłaty - po konsultacji z Klientem.</li>
            </ul>
          </section>
          <section className="section">
            <h2 className="section-title">REKLAMACJE:</h2>
            <p className="info-text">
              Wszelkiego rodzaju reklamacje należy zgłosić za pośrednictwem poczty elektronicznej na adres: lato@radsas-fun.pl Przedmiotem reklamacji nie mogą być okoliczności i zdarzenia, za które Organizator nie ponosi odpowiedzialności i przy zachowaniu należytej staranności nie mógł ich przewidzieć. Reklamacje rozpatrywane są w ciągu 30 dni roboczych.
            </p>
          </section>
          <section className="section">
            <h2 className="section-title">POSTANOWIENIA KOŃCOWE:</h2>
            <ul className="bullet-list">
              <li>Sprawy nieuregulowane umową rozstrzygane będą w drodze dialogu, a następnie przepisami Kodeksu Cywilnego oraz ustawy z dnia 29.08.1997 r. o usługach turystycznych (Dz.U nr. 133/97 poz. 884 z póź. zmianami).</li>
              <li>Ewentualne spory wynikające z umowy rozstrzygane będą polubownie, a w razie braku porozumienia przez sąd właściwy dla siedziby Organizatora.</li>
              <li>Umowa sporządzona została w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze stron.</li>
              <li>Klient ma możliwość wglądu w umowę przed jej podpisaniem i dokonaniem wpłaty.</li>
              <li>Wszelkiego rodzaju zmiany w Panelu Klienta (np: dokupienie atrakcji dodatkowych, poprawienie danych) stanowią aneks do niniejszej umowy i nie wymagają dodatkowego podpisu.</li>
            </ul>
          </section>
          <section className="section">
            <p className="info-text">
              Organizator zobowiązuje się do przeprowadzenia imprezy turystycznej i dołoży wszelkich starań, aby została wykonana zgodnie z umową.
            </p>
            <p className="info-text">
              Klient wyraża zgodę na przetwarzanie jego danych w Panelu Administratora, Panelu Klienta, Bazie Danych Radsas Fun oraz przez współpracujące z firmami (np. ośrodek, ubezpieczyciel) w zakresie niezbędnym do realizacji kolonii/obozu.
            </p>
            <p className="info-text">
              Cena obozu może ulec zmianie z powodu wzrostu inflacji, kosztów wyżywienia i zakwaterowania oraz opłat przewoźników.
            </p>
            <ul className="bullet-list">
              <li><strong>Załącznik:</strong> Szczegółowy Regulamin Imprez Turystycznych RADSAS FUN.</li>
              <li>Rodzic/opiekun prawny zapoznał się z umową i regulaminem oraz akceptuje ich treść.</li>
            </ul>
          </section>
          <div className="page-number">3/3</div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            background-image: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-layout {
            background: #fff !important;
            min-height: auto !important;
          }

          .form-container {
            width: 210mm !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .page {
            width: 210mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 12mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: always;
            page-break-inside: avoid;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .page:last-child {
            page-break-after: auto;
          }

          .form-container *,
          .form-container *::before,
          .form-container *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .field-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 1.2rem !important;
          }

          .header,
          .header-simple {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
          }

          .signature-row-single {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
        }

        @media screen {
          .form-container {
            max-width: 210mm;
            margin: 2rem auto;
            background: #f5f5f5;
          }

          .page {
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            margin-bottom: 2rem;
            border-radius: 4px;
          }
        }

        .page {
          width: 210mm;
          min-height: 297mm;
          max-height: 297mm;
          padding: 12mm 12mm;
          box-sizing: border-box;
          position: relative;
          font-size: 9pt;
          line-height: 1.3;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1a1a1a;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.6rem;
          border-bottom: 2px solid #0066cc;
          gap: 1rem;
        }

        .header-simple {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.8rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #0066cc;
          gap: 0.8rem;
        }

        .date {
          font-size: 7.5pt;
          flex-shrink: 0;
          color: #666;
        }

        .title-center {
          text-align: center;
          font-size: 9pt;
          flex: 1;
          font-weight: 600;
          color: #0066cc;
        }

        .contract-date {
          font-size: 9pt;
          font-weight: 600;
          padding: 0.3rem 0.6rem;
          border: 2px solid #0066cc;
          color: #0066cc;
          flex-shrink: 0;
        }

        .logo {
          width: 75px;
          height: auto;
          flex-shrink: 0;
        }

        .logo-small {
          width: 60px;
          height: auto;
          flex-shrink: 0;
        }

        .main-title {
          text-align: center;
          font-size: 11pt;
          font-weight: 700;
          margin: 1rem 0 1.2rem 0;
          padding: 0.8rem;
          background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
          color: white;
          border-radius: 3px;
          letter-spacing: 0.3px;
          line-height: 1.4;
        }

        .tournament-name {
          text-align: center;
          font-size: 9.5pt;
          font-weight: 600;
          margin: 1rem 0 1.2rem 0;
          padding: 0.6rem;
          background: #f0f7ff;
          border-left: 3px solid #0066cc;
          color: #0066cc;
        }

        .section {
          margin: 0.8rem 0;
          background: white;
        }

        .page:nth-child(2) .section {
          margin: 0.5rem 0;
        }

        .section-title {
          font-size: 8.5pt;
          font-weight: 700;
          margin: 0.6rem 0 0.5rem 0;
          color: #0066cc;
          padding-bottom: 0.3rem;
          border-bottom: 1px solid #e0e0e0;
          line-height: 1.2;
        }

        .page:nth-child(2) .section-title {
          margin: 0.4rem 0 0.3rem 0;
        }

        .organizer-box {
          background: #f8faff;
          padding: 0.7rem 0.8rem;
          border-left: 3px solid #0066cc;
          margin: 0.5rem 0;
        }

        .organizer-box p {
          margin: 0.3rem 0;
          font-size: 8.5pt;
          line-height: 1.4;
        }

        .organizer-box strong {
          color: #0066cc;
        }

        .field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.2rem;
          margin: 0.5rem 0;
        }

        .field-group {
          margin: 0.5rem 0;
        }

        .field-group label {
          font-size: 8pt;
          display: block;
          margin-bottom: 0.25rem;
          color: #333;
          font-weight: 600;
        }

        .field-value {
          padding: 0.4rem 0.5rem;
          border-bottom: 1px solid #b0b0b0;
          font-size: 8.5pt;
          font-family: inherit;
          color: #1a1a1a;
          min-height: 1.3em;
        }

        .field-value-multiline {
          padding: 0.5rem 0.6rem;
          border: 1px solid #d0d0d0;
          font-size: 8pt;
          font-family: inherit;
          border-radius: 2px;
          line-height: 1.4;
          white-space: pre-wrap;
          color: #1a1a1a;
          min-height: 45px;
        }

        .info-text {
          font-size: 8pt;
          line-height: 1.4;
          margin: 0.5rem 0;
          text-align: justify;
          color: #333;
        }

        .info-text strong {
          color: #0066cc;
          font-weight: 600;
        }

        .info-text-small {
          font-size: 7.5pt;
          line-height: 1.3;
          margin: 0.3rem 0;
          text-align: justify;
          color: #555;
          font-style: italic;
        }

        .payment-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.5rem;
          margin: 0.5rem 0;
        }

        .payment-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 0.5rem;
          align-items: center;
          padding: 0.2rem 0;
        }

        .payment-item label {
          font-size: 8pt;
          font-weight: 600;
          color: #333;
          white-space: nowrap;
        }

        .payment-item span {
          font-size: 8pt;
          color: #333;
        }

        .total-cost {
          font-size: 10pt;
          font-weight: 700;
          color: #0066cc;
          text-align: right;
          margin: 0.8rem 0;
          padding: 0.6rem;
          background: #f0f7ff;
          border-radius: 3px;
          border-left: 3px solid #0066cc;
        }

        .bank-info {
          background: #f8faff;
          padding: 0.6rem 0.8rem;
          border-left: 3px solid #0066cc;
          margin: 0.5rem 0;
        }

        .bank-info p {
          margin: 0.3rem 0;
          font-size: 8pt;
          line-height: 1.4;
        }

        .bank-info strong {
          color: #0066cc;
        }

        .bullet-list {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .bullet-list li {
          font-size: 8pt;
          line-height: 1.4;
          margin: 0.35rem 0;
          text-align: justify;
          color: #333;
        }

        .signature-section {
          margin-top: 2.5rem;
          padding-top: 1.5rem;
          border-top: 2px solid #e0e0e0;
        }

        .signature-row-single {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 1.5rem 0;
        }

        .signature-field-organizer {
          text-align: left;
        }

        .signature-field-organizer label {
          display: block;
          font-size: 8pt;
          margin-bottom: 0.6rem;
          color: #333;
          font-weight: 600;
        }

        .page-number {
          position: absolute;
          bottom: 10mm;
          right: 15mm;
          font-size: 8pt;
          font-weight: 600;
          color: #333;
          padding: 0.15rem 0.4rem;
          background: #f0f0f0;
          border-radius: 2px;
        }

        .location-link {
          color: #0066cc;
          text-decoration: none;
          font-weight: 600;
        }

        .location-link:hover {
          text-decoration: underline;
        }

        .facility-name {
          font-weight: 600;
          color: #0052a3;
          margin-bottom: 0.3rem;
          font-size: 8.5pt;
        }

        .admin-editable-field { background: #fef9c3 !important; }
      `}</style>
    </>
  );
}
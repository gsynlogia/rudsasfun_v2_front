'use client';

import { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import Image from 'next/image';
import { authService } from '@/lib/services/AuthService';

interface ContractFormProps {
  /** Id rezerwacji (number) – do zapisu w signed_documents */
  reservationId?: number;
  reservationData?: {
    reservationNumber?: string;
    /** Data dokonania rezerwacji (DD.MM.YYYY) do „ZAWARTA W DNIU” */
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
  /** Payload z signed_documents (umowa). Gdy podany – dane formularza z payloadu; gdy brak – z rezerwacji (obecne zachowanie). */
  signedPayload?: Record<string, unknown> | null;
  printMode?: boolean;
}

type PrintErrorKey = 'reservationNumber' | 'contractDate' | 'parentName' | 'childName' | 'tournamentName' | 'tournamentDates';

/** Mapuje payload umowy (signed_documents) na overlay pól formularza. */
function contractPayloadToFormOverlay(p: Record<string, unknown>): Partial<ContractFormProps['reservationData']> {
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

export function ContractForm({ reservationId, reservationData, signedPayload, printMode = false }: ContractFormProps) {
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureCode, setSignatureCode] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [currentDocumentId, setCurrentDocumentId] = useState<number | null>(null);
  const [printErrors, setPrintErrors] = useState<Partial<Record<PrintErrorKey, boolean>>>({});
  const [latestContractStatus, setLatestContractStatus] = useState<'in_verification' | 'accepted' | 'rejected' | null>(null);

  // Automatyczny druk w trybie printMode
  useEffect(() => {
    if (printMode) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printMode]);

  // Pobierz status najnowszego podpisanego dokumentu (umowa) – czy można podpisać ponownie (tylko gdy odrzucona)
  useEffect(() => {
    if (printMode || reservationId == null) return;
    const token = authService.getToken();
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/api/signed-documents/reservation/${reservationId}?document_type=contract`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((docs: Array<{ status: string }>) => {
        const latest = docs[0];
        if (latest && (latest.status === 'in_verification' || latest.status === 'accepted' || latest.status === 'rejected')) {
          setLatestContractStatus(latest.status as 'in_verification' | 'accepted' | 'rejected');
        } else {
          setLatestContractStatus(null);
        }
      })
      .catch(() => setLatestContractStatus(null));
  }, [reservationId, printMode]);

  // Aktualna data i godzina
  const getCurrentDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString('pl-PL');
    const time = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('pl-PL');
  };

  // Gdy brak payloadu (dokument nie zapisany) – dane z rezerwacji. Gdy jest signedPayload – overlay z zapisanego dokumentu.
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
    accommodation: reservationData?.accommodation ?? '',
    meals: reservationData?.meals ?? '4 posiłki dziennie (śniadanie, obiad, podwieczorek, kolacja; w dniu przyjazdu obiadokolacja) + suchy prowiant na drogę',
    transportInfo: reservationData?.transportInfo ?? 'Autokar, bus, PKP lub własny zgodnie z rezerwacją i regulaminem transportu dostępnym na stronie organizatora i w Panelu Klienta. Jeśli autokar z przyczyn niezależnych od organizatora zostanie podstawiony z opóźnieniem, organizator nie ponosi odpowiedzialności z tego tytułu. Uczestnik ma obowiązek stawić się na wyznaczone miejsce zbiórki w ustalonym czasie. Miejsca zbiórki i godziny odjazdów/przyjazdów znajdują się w Panelu Klienta oraz na stronie internetowej wybranej kolonii/obozu.',
    departurePlace: reservationData?.departurePlace ?? '',
    returnPlace: reservationData?.returnPlace ?? '',
    invoice: reservationData?.invoice ?? '',
    promotions: reservationData?.promotions ?? ''
  };
  const formData: typeof base = { ...base };
  if (overlay) {
    if (overlay.reservationNumber != null) formData.reservationNumber = String(overlay.reservationNumber);
    if (overlay.contractDate != null) formData.contractDate = String(overlay.contractDate);
    if (overlay.tournamentName != null) formData.tournamentName = String(overlay.tournamentName);
    if (overlay.tournamentDates != null) formData.tournamentDates = String(overlay.tournamentDates);
    if (overlay.parentName != null) formData.parentName = String(overlay.parentName);
    if (overlay.parentEmail != null) formData.parentEmail = String(overlay.parentEmail);
    if (overlay.parentPhone != null) formData.parentPhone = String(overlay.parentPhone);
    if (overlay.parentCity != null) formData.parentCity = String(overlay.parentCity);
    if (overlay.childName != null) formData.childName = String(overlay.childName);
    if (overlay.childCity != null) formData.childCity = String(overlay.childCity);
    if (overlay.childYear != null) formData.childYear = String(overlay.childYear);
    if (overlay.childGender != null) formData.childGender = String(overlay.childGender);
    if (overlay.locationName != null) formData.locationName = String(overlay.locationName);
    if (overlay.locationAddress != null) formData.locationAddress = String(overlay.locationAddress);
    if (overlay.facilityName != null) formData.facilityName = String(overlay.facilityName);
    if (overlay.transportTo != null) formData.transportTo = String(overlay.transportTo);
    if (overlay.transportFrom != null) formData.transportFrom = String(overlay.transportFrom);
    if (overlay.baseCost != null) formData.baseCost = String(overlay.baseCost);
    if (overlay.diet != null) formData.diet = String(overlay.diet);
    if (overlay.attractions != null) formData.attractions = String(overlay.attractions);
    if (overlay.insurance1 != null) formData.insurance1 = String(overlay.insurance1);
    if (overlay.insurance2 != null) formData.insurance2 = String(overlay.insurance2);
    if (overlay.transport != null) formData.transport = String(overlay.transport);
    if (overlay.totalCost != null) formData.totalCost = String(overlay.totalCost);
    if (overlay.deposit != null) formData.deposit = String(overlay.deposit);
    if (overlay.remainingPayment != null) formData.remainingPayment = String(overlay.remainingPayment);
    if (overlay.accommodation != null) formData.accommodation = String(overlay.accommodation);
    if (overlay.meals != null) formData.meals = String(overlay.meals);
    if (overlay.transportInfo != null) formData.transportInfo = String(overlay.transportInfo);
    if (overlay.departurePlace != null) formData.departurePlace = String(overlay.departurePlace);
    if (overlay.returnPlace != null) formData.returnPlace = String(overlay.returnPlace);
    if (overlay.invoice != null) formData.invoice = String(overlay.invoice);
    if (overlay.promotions != null) formData.promotions = String(overlay.promotions);
  }

  const handlePrint = () => {
    if (printMode) {
      window.print();
      return;
    }
    const reservationNumber = (formData.reservationNumber ?? '').trim();
    const contractDate = (formData.contractDate ?? '').trim();
    const parentName = (formData.parentName ?? '').trim();
    const childName = (formData.childName ?? '').trim();
    const tournamentName = (formData.tournamentName ?? '').trim();
    const tournamentDates = (formData.tournamentDates ?? '').trim();
    const errors: Partial<Record<PrintErrorKey, boolean>> = {};
    if (!reservationNumber) errors.reservationNumber = true;
    if (!contractDate) errors.contractDate = true;
    if (!parentName || parentName === 'Brak danych') errors.parentName = true;
    if (!childName || childName === 'Brak danych') errors.childName = true;
    if (!tournamentName) errors.tournamentName = true;
    if (!tournamentDates) errors.tournamentDates = true;
    if (Object.keys(errors).length > 0) {
      setPrintErrors(errors);
      const firstId = (errors.reservationNumber || errors.contractDate) ? 'contract-print-error-reservationNumber'
        : errors.parentName ? 'contract-print-error-parentName'
        : errors.childName ? 'contract-print-error-childName'
        : (errors.tournamentName || errors.tournamentDates) ? 'contract-print-error-tournamentName'
        : null;
      if (firstId) {
        document.getElementById(firstId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setPrintErrors({});
    window.open(`/druk/umowa/${reservationNumber}`, '_blank');
  };

  const getContractPayload = () => {
    const fd = formData;
    const transportDisplay = fd.transportTo === 'Własny transport' && fd.transportFrom === 'Własny transport'
      ? 'Transport własny'
      : fd.transport;
    return {
      signedAt: new Date().toISOString(),
      tytul: `UMOWA O ŚWIADCZENIE USŁUG/IMPREZY TURYSTYCZNEJ DOT. ${fd.reservationNumber} ZAWARTA W DNIU ${fd.contractDate || getCurrentDate()}`,
      tematKoloniiObozu: `${fd.tournamentName} (${fd.tournamentDates})`,
      daneOrganizatora: { nazwa: 'RADSAS FUN sp. z o.o.', adres: 'ul. Chłopska 7/6, 80-362 Gdańsk', nip: '5842861490', krs: '0001143093' },
      daneKlienta: { imieNazwisko: fd.parentName, email: fd.parentEmail, kontakt: fd.parentPhone, miasto: fd.parentCity },
      daneUczestnika: { imieNazwisko: fd.childName, rocznik: fd.childYear, miasto: fd.childCity, plec: fd.childGender },
      przedmiotUmowy: 'Przedmiotem umowy pomiędzy Organizatorem i Klientem jest organizacja kolonii/obozu dla Uczestnika zgodnie z danymi w niniejszej umowie, w Panelu Klienta i regulaminie.',
      szczegolyKoloniiObozu: { tematOśrodekData: fd.locationName, nazwaIAdresOśrodka: fd.facilityName, adresOśrodka: fd.locationAddress },
      wyzywienie: fd.meals,
      platnosci: { kosztPodstawowy: fd.baseCost, dieta: fd.diet, atrakcjeDodatkowe: fd.attractions, ochronaRezygnacjiPrzed: fd.insurance1, ochronaRezygnacjiWTrakcie: fd.insurance2, cenaZaTransport: transportDisplay, faktura: fd.invoice, promocje: fd.promotions, kosztCalkowity: fd.totalCost, zaliczka: fd.deposit, pozostalaKwotaTermin: fd.remainingPayment },
      daneDoWplat: { odbiorca: 'RADSAS FUN sp. z o.o. ul. Chłopska 7/6, 80-362 Gdańsk', numerRachunku: '81 1160 2202 0000 0006 4343 3035 (Bank Millenium)', tytulWplaty: 'nazwisko i imię uczestnika, numer rezerwacji, temat obozu, ośrodek, termin' },
      specyfikacjaTransportu: fd.transportInfo,
      miejsceWyjazdu: fd.departurePlace,
      miejscePowrotu: fd.returnPlace,
      obowiazkiOrganizatora: [
        'Organizator zapewnia zakwaterowanie, wyżywienie, realizację programu dostępnego na stronie wybranej kolonii/obozu oraz możliwość transportu.',
        'Organizator zapewnia opiekę pedagogiczną, instruktorską oraz dostęp do opieki medycznej',
        'Program kolonii/obozu dostępny jest na www.radsas-fun.pl w zakładce danej kolonii/obozu. Zmiany w realizacji programu zależą od czynników niezależnych od Organizatora. W przypadku złych warunków atmosferycznych, Organizator zastrzega sobie prawo do wprowadzenia zmian w programie lub zmiany atrakcji na równorzędne.',
        'Organizator nie ponosi odpowiedzialności za rzeczy wartościowe uczestnika (pieniądze, telefony, tablety, biżuteria itp.).',
      ],
      obowiazkiKlienta: [
        'Klient zobowiązuje się do wniesienia płatności w terminach określonych w umowie i regulaminie.',
        'Klient zobowiązuje się do podpisania w Panelu Klienta wszystkich wymaganych dokumentów (karta kwalifikacyjna, zgody, upoważnienia) przed rozpoczęciem kolonii/obozu.',
        'Klient zobowiązuje się do przekazania organizatorowi wszystkich istotnych informacji o stanie zdrowia uczestnika, przyjmowanych lekach, alergiach itp.',
        'Klient zobowiązuje się do przekazania i odbioru Uczestnika opiekunowi w wyznaczonym przez Organizatora miejscu i czasie.',
        'Klient ponosi pełną odpowiedzialność za szkody wyrządzone przez uczestnika w mieniu Organizatora lub osób trzecich.',
      ],
      odstapienieOdUmowy: [
        'Klient może odstąpić od umowy w każdym czasie przed rozpoczęciem kolonii/obozu, zgodnie z zasadami określonymi w Regulaminie.',
        'W przypadku odstąpienia, Organizator pobiera opłaty zgodnie z tabelą dostępną w Regulaminie i Panelu Klienta.',
        'Organizator może odstąpić od umowy w przypadku nie uiszczenia płatności w terminie, niewykonania innych zobowiązań przez Klienta, sytuacji niezależnych od Organizatora oraz jego autonomicznych decyzji.',
        'W przypadku odwołania terminu/tematu danej kolonii/obozu, Organizator proponuje inny termin/temat/miejsce kolonii/obozu lub zwraca 100% wpłaty - po konsultacji z Klientem.',
      ],
      reklamacje: 'Wszelkiego rodzaju reklamacje należy zgłosić za pośrednictwem poczty elektronicznej na adres: lato@radsas-fun.pl Przedmiotem reklamacji nie mogą być okoliczności i zdarzenia, za które Organizator nie ponosi odpowiedzialności i przy zachowaniu należytej staranności nie mógł ich przewidzieć. Reklamacje rozpatrywane są w ciągu 30 dni roboczych.',
      postanowieniaKoncowe: [
        'Sprawy nieuregulowane umową rozstrzygane będą w drodze dialogu, a następnie przepisami Kodeksu Cywilnego oraz ustawy z dnia 29.08.1997 r. o usługach turystycznych (Dz.U nr. 133/97 poz. 884 z póź. zmianami).',
        'Ewentualne spory wynikające z umowy rozstrzygane będą polubownie, a w razie braku porozumienia przez sąd właściwy dla siedziby Organizatora.',
        'Umowa sporządzona została w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze stron.',
        'Klient ma możliwość wglądu w umowę przed jej podpisaniem i dokonaniem wpłaty.',
        'Wszelkiego rodzaju zmiany w Panelu Klienta (np: dokupienie atrakcji dodatkowych, poprawienie danych) stanowią aneks do niniejszej umowy i nie wymagają dodatkowego podpisu.',
      ],
      dodatkowePostanowienia: [
        'Organizator zobowiązuje się do przeprowadzenia imprezy turystycznej i dołoży wszelkich starań, aby została wykonana zgodnie z umową.',
        'Klient wyraża zgodę na przetwarzanie jego danych w Panelu Administratora, Panelu Klienta, Bazie Danych Radsas Fun oraz przez współpracujące z firmami (np. ośrodek, ubezpieczyciel) w zakresie niezbędnym do realizacji kolonii/obozu.',
        'Cena obozu może ulec zmianie z powodu wzrostu inflacji, kosztów wyżywienia i zakwaterowania oraz opłat przewoźników.',
        'Załącznik: Szczegółowy Regulamin Imprez Turystycznych RADSAS FUN.',
        'Rodzic/opiekun prawny zapoznał się z umową i regulaminem oraz akceptuje ich treść.',
      ],
    };
  };

  const handleSignDocument = async () => {
    if (reservationId == null) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const token = authService.getToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/signed-documents/request-sms-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, document_type: 'contract', payload: getContractPayload() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Nie udało się wysłać kodu SMS');
      }
      const data = await res.json();
      setCurrentDocumentId(data.document_id);
      setShowSignatureModal(true);
      setResendTimer(60);
      setSignatureCode('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Nie udało się wysłać kodu SMS.');
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0 || reservationId == null) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const token = authService.getToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/signed-documents/request-sms-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, document_type: 'contract' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Nie udało się wysłać kodu ponownie');
      }
      setResendTimer(60);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Nie udało się wysłać kodu ponownie.');
    }
  };

  const handleConfirmSignature = async () => {
    if (signatureCode.length !== 4 || currentDocumentId == null) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const token = authService.getToken();
    if (!token) {
      setShowSignatureModal(false);
      setSignatureCode('');
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/signed-documents/verify-sms-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: currentDocumentId, code: signatureCode }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Nieprawidłowy kod');
      }
      setIsSigned(true);
      setShowSignatureModal(false);
      setSignatureCode('');
      setCurrentDocumentId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Nieprawidłowy kod lub błąd weryfikacji.');
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  return (
    <>
      {/* Przycisk druku - ukryty przy druku i w printMode */}
      {!printMode && (
        <div className="no-print max-w-[210mm] mx-auto px-4 pt-4 flex justify-end">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#03adf0] text-white px-4 py-2 rounded hover:bg-[#0299d6] transition text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Drukuj
          </button>
        </div>
      )}

      {/* Formularz - cztery strony A4 */}
      <div className="form-container">
        {/* STRONA 1 */}
        <div className="page">
          {/* Nagłówek */}
          <div className="header">
            <div className="date">{getCurrentDateTime()}</div>
            <div className="title-center">Umowa o świadczenie usług/imprezy turystycznej</div>
            <Image src="/logo.png" alt="RADSAS fun" width={75} height={40} className="logo" />
          </div>

          <h1 className={`main-title ${(printErrors.reservationNumber || printErrors.contractDate) ? 'border-2 border-red-500 rounded p-2 bg-red-50' : ''}`} id="contract-print-error-reservationNumber">UMOWA O ŚWIADCZENIE USŁUG/IMPREZY TURYSTYCZNEJ (zwanej dalej &quot;kolonia/obóz&quot;) DOT. {formData.reservationNumber}  <br />ZAWARTA W DNIU {formData.contractDate || getCurrentDate()}</h1>
          {(printErrors.reservationNumber || printErrors.contractDate) && <p className="text-red-600 text-sm mt-1 font-semibold" role="alert">To pole jest obowiązkowe</p>}

          <div className={`tournament-name ${(printErrors.tournamentName || printErrors.tournamentDates) ? 'border-2 border-red-500 rounded p-2 bg-red-50' : ''}`} id="contract-print-error-tournamentName">{formData.tournamentName} ({formData.tournamentDates})</div>
          {(printErrors.tournamentName || printErrors.tournamentDates) && <p className="text-red-600 text-sm mt-1 font-semibold" role="alert">To pole jest obowiązkowe</p>}

          {/* Dane organizatora */}
          <section className="section">
            <h2 className="section-title">DANE ORGANIZATORA (zwany dalej &quot;Organizatorem&quot;):</h2>
            <div className="organizer-box">
              <p><strong>RADSAS FUN sp. z o.o.</strong></p>
              <p>ul. Chłopska 7/6, 80-362 Gdańsk</p>
              <p>NIP: 5842861490, KRS 0001143093</p>
            </div>
          </section>

          {/* Dane rodzica/opiekuna */}
          <section className="section">
            <h2 className="section-title">DANE RODZICA/OPIEKUNA PRAWNEGO rezerwującego kolonię/obóz (zwany dalej &quot;Klientem&quot;):</h2>
            <div className="field-grid">
              <div className="field-group" id="contract-print-error-parentName">
                <label>Imię i nazwisko:</label>
                <div className={`field-value ${printErrors.parentName ? 'border-2 border-red-500 rounded bg-red-50' : ''}`}>{formData.parentName}</div>
                {printErrors.parentName && <p className="text-red-600 text-sm mt-1 font-semibold" role="alert">To pole jest obowiązkowe</p>}
              </div>
              <div className="field-group">
                <label>E-mail:</label>
                <div className="field-value">{formData.parentEmail}</div>
              </div>
            </div>
            <div className="field-grid">
              <div className="field-group">
                <label>Kontakt:</label>
                <div className="field-value">{formData.parentPhone}</div>
              </div>
              <div className="field-group">
                <label>Miasto:</label>
                <div className="field-value">{formData.parentCity}</div>
              </div>
            </div>
          </section>

          {/* Dane uczestnika */}
          <section className="section">
            <h2 className="section-title">DANE UCZESTNIKA (zwany dalej &quot;Uczestnikiem&quot;):</h2>
            <div className="field-grid">
              <div className="field-group" id="contract-print-error-childName">
                <label>Imię i nazwisko:</label>
                <div className={`field-value ${printErrors.childName ? 'border-2 border-red-500 rounded bg-red-50' : ''}`}>{formData.childName}</div>
                {printErrors.childName && <p className="text-red-600 text-sm mt-1 font-semibold" role="alert">To pole jest obowiązkowe</p>}
              </div>
              <div className="field-group">
                <label>Rocznik:</label>
                <div className="field-value">{formData.childYear}</div>
              </div>
            </div>
            <div className="field-grid">
              <div className="field-group">
                <label>Miasto:</label>
                <div className="field-value">{formData.childCity}</div>
              </div>
              <div className="field-group">
                <label>Płeć:</label>
                <div className="field-value">{formData.childGender}</div>
              </div>
            </div>
          </section>

          {/* Przedmiot umowy */}
          <section className="section">
            <h2 className="section-title">PRZEDMIOT UMOWY:</h2>
            <p className="info-text">
              Przedmiotem umowy pomiędzy Organizatorem i Klientem jest organizacja kolonii/obozu dla Uczestnika
              zgodnie z danymi w niniejszej umowie, w Panelu Klienta i regulaminie.
            </p>
          </section>

          {/* Szczegóły wyjazdu */}
          <section className="section">
            <h2 className="section-title">SZCZEGÓŁY KOLONII/OBOZU:</h2>
            
            <div className="field-group">
              <label>Temat kolonii/obozu, ośrodek i data:</label>
              <div className="field-value-multiline">{formData.locationName}</div>
            </div>

            <div className="field-group">
              <label>Nazwa i adres ośrodka (zakwaterowanie):</label>
              <div className="field-value-multiline">
                <div className="facility-name">{formData.facilityName}</div>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.locationAddress)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="location-link"
                >
                  {formData.locationAddress}
                </a>
              </div>
            </div>
          </section>
          {/* Wyżywienie */}
          <section className="section">
            <label>Wyżywienie:</label>
            <div className="field-value-multiline">{formData.meals}</div>
          </section>

          <div className="page-number">1/3</div>
        </div>

        {/* STRONA 2 */}
        <div className="page">
          <div className="header-simple">
            <div className="date">{getCurrentDateTime()}</div>
            <div className="title-center">Umowa o świadczenie usług/imprezy turystycznej</div>
            <Image src="/logo.png" alt="RADSAS fun" width={60} height={32} className="logo-small" />
          </div>

          {/* Płatności */}
          <section className="section">
            <h2 className="section-title">PŁATNOŚCI:</h2>
            <p className="info-text-small">
              KOSZT PODSTAWOWY zawiera: atrakcje, które są w cenie obozu i ubezpieczenia (NNW, TFG, TFP) 
              </p> 
              <p className="info-text-small">
              KOSZT CAŁKOWITY zawiera: diety, atrakcje dodatkowe, ochrony, transport i promocje
            </p>

            <div className="payment-grid">
              <div className="payment-item">
                <label>KOSZT PODSTAWOWY:</label>
                <div className="field-value">{formData.baseCost}</div>
                <span>zł</span>
              </div>

              <div className="payment-item">
                <label>Dieta:</label>
                <div className="field-value">{formData.diet}</div>
                <span>zł</span>
              </div>

              <div className="payment-item">
                <label>Atrakcje dodatkowe:</label>
                <div className="field-value-multiline">{formData.attractions}</div>
                <span>zł</span>
              </div>

              <div className="payment-item">
                <label>Ochrona od rezygnacji przed rozpoczęciem się obozu/kolonii:</label>
                <div className="field-value">{formData.insurance1}</div>
                <span>zł</span>
              </div>

              <div className="payment-item">
                <label>Ochrona od rezygnacji w trakcie trwania obozu/kolonii:</label>
                <div className="field-value">{formData.insurance2}</div>
                <span>zł</span>
              </div>

              <div className="payment-item">
                <label>Cena za transport:</label>
                <div className="field-value">
                  {formData.transportTo === 'Własny transport' && formData.transportFrom === 'Własny transport'
                    ? '— — — — — — — — — — — — — — — — — — — —'
                    : formData.transport}
                </div>
                {!(formData.transportTo === 'Własny transport' && formData.transportFrom === 'Własny transport') && <span>zł</span>}
              </div>

               <div className="payment-item promocja">
                <label>Faktura:</label>
                <div className="field-value">{formData.invoice}</div>
                <span>zł</span>
              </div>

                <div className="payment-item promocja">
                <label>Promocje:</label>
                <div className="field-value">{formData.promotions}</div>
                <span>zł</span>
              </div>
              
            </div>

            <div className="total-cost">
              <strong>KOSZT CAŁKOWITY do zapłaty: {formData.totalCost} zł</strong>
            </div>
          </section>

          {/* Warunki płatności */}
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
                    <strong>Pełna wpłata ({formData.totalCost} zł) płatna w ciągu 2 dni roboczych od daty rezerwacji.</strong>
                  </p>
                );
              }
              return (
                <>
                  <p className="info-text">
                    <strong>Zaliczka w kwocie {formData.deposit} zł</strong> (zaliczka 500 zł + ewentualne ochrony) płatna w ciągu 2 dni roboczych od daty
                    rezerwacji.
                  </p>
                  <p className="info-text">
                    Pozostała kwota płatna najpóźniej na {formData.remainingPayment}.
                  </p>
                </>
              );
            })()}
          </section>

          {/* Dane do wpłat */}
          <section className="section">
            <h2 className="section-title">Dane do wpłat:</h2>
            <div className="bank-info">
              <p><strong>RADSAS FUN sp. z o.o.</strong> ul. Chłopska 7/6, 80-362 Gdańsk</p>
              <p><strong>Numer rachunku (Bank Millenium):</strong> 81 1160 2202 0000 0006 4343 3035</p>
              <p><strong>Tytuł wpłaty:</strong> nazwisko i imię uczestnika, numer rezerwacji, temat obozu, ośrodek, termin</p>
            </div>
          </section>

          {/* Transport */}
          <section className="section">
            <h2 className="section-title">TRANSPORT:</h2>
            <h2 className="section-title">Specyfikacja transportu:</h2> 
            <div className="field-value-multiline">{formData.transportInfo}</div>
          </section>

          {/* Miejsce wyjazdu */}
          <section className="section">
            <h2 className="section-title">Miejsce wyjazdu:</h2>
            <div className="field-value">{formData.departurePlace}</div>
          </section>

          {/* Miejsce powrotu */}
          <section className="section">
            <h2 className="section-title">Miejsce powrotu:</h2>
            <div className="field-value">{formData.returnPlace}</div>
          </section>

          <div className="page-number">2/3</div>
        </div>

        {/* STRONA 3 */}
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
              <li>Program kolonii/obozu dostępny jest na www.radsas-fun.pl w zakładce danej kolonii/obozu. Zmiany w realizacji programu zależą od czynników niezależnych od Organizatora. 
                W przypadku złych warunków atmosferycznych, Organizator zastrzega sobie prawo do wprowadzenia zmian w programie lub zmiany atrakcji na równorzędne.</li>
              <li>Organizator nie ponosi odpowiedzialności za rzeczy wartościowe uczestnika (pieniądze, telefony, tablety, biżuteria itp.).</li>  
            </ul>
         </section>

          {/* Obowiązki klienta */}
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

          {/* Odstąpienie od umowy */}
          <section className="section">
            <h2 className="section-title">ODSTĄPIENIE OD UMOWY:</h2>
            <ul className="bullet-list">
              <li>Klient może odstąpić od umowy w każdym czasie przed rozpoczęciem kolonii/obozu, zgodnie z zasadami określonymi w Regulaminie.</li>
              <li>W przypadku odstąpienia, Organizator pobiera opłaty zgodnie z tabelą dostępną w Regulaminie i Panelu Klienta.</li>
              <li>Organizator może odstąpić od umowy w przypadku nie uiszczenia płatności w terminie, niewykonania innych zobowiązań przez Klienta, sytuacji niezależnych od Organizatora oraz jego autonomicznych decyzji.</li>
              <li>W przypadku odwołania terminu/tematu danej kolonii/obozu, Organizator proponuje inny termin/temat/miejsce kolonii/obozu lub zwraca 100% wpłaty - po konsultacji z Klientem.</li>
             </ul>
          </section>

          {/* Reklamacje */}
          <section className="section">
            <h2 className="section-title">REKLAMACJE:</h2>
            <p className="info-text">
              Wszelkiego rodzaju reklamacje należy zgłosić za pośrednictwem poczty elektronicznej na adres: lato@radsas-fun.pl Przedmiotem reklamacji nie mogą być okoliczności i zdarzenia, za które Organizator
              nie ponosi odpowiedzialności i przy zachowaniu należytej staranności nie mógł ich przewidzieć. Reklamacje rozpatrywane są w ciągu 30 dni roboczych.
            </p>
          </section>

          {/* Postanowienia końcowe */}
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

          {/* Podpisy */}
          <section className="section signature-section">
            <div className="signature-row-single">
              <div className="signature-field-organizer">
                <label>Data: {getCurrentDate()} i podpis Organizatora</label>
                <div className="signed-indicator-contract">
                  <div className="signed-name">RADSAS FUN sp. z o.o.</div>
                  <div className="signed-date">{getCurrentDate()}</div>
                </div>
              </div>

              {/* Przycisk podpisz dokument – tylko gdy brak podpisu lub najnowszy status = odrzucona */}
              {isSigned ? (
                <div className="signed-confirmation">
                  <div className="signed-header">Dokument podpisany przez:</div>
                  <div className="signed-role">Opiekun prawny</div>
                  <div className="signed-timestamp">{getCurrentDateTime()}</div>
                </div>
              ) : latestContractStatus === 'in_verification' ? (
                <p className="text-amber-700 font-medium no-print">Dokument w trakcie weryfikacji. Ponowne podpisanie nie jest możliwe.</p>
              ) : latestContractStatus === 'accepted' ? (
                <p className="text-green-700 font-medium no-print">Umowa została zaakceptowana.</p>
              ) : (
                <button
                  onClick={handleSignDocument}
                  className="sign-button no-print"
                >
                  {latestContractStatus === 'rejected' ? 'PODPISZ PONOWNIE' : 'PODPISZ DOKUMENT'}
                </button>
              )}
            </div>
          </section>

          <div className="page-number">3/3</div>
        </div>
      </div>

      
      {/* Modal do potwierdzenia podpisu */}
      {showSignatureModal && (
        <div className="modal-overlay no-print" onClick={() => setShowSignatureModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Potwierdzenie</h3>
            <p className="modal-text">
              Na podany w rezerwacji numer telefonu <strong>{formData.parentPhone}</strong>, przesłany został 4 cyfrowy kod. 
              Wpisanie kodu jest jednoznaczne z podpisaniem niniejszego dokumentu.
            </p>
            <div className="modal-input-group">
              <label>Kod autoryzacyjny</label>
              <input
                type="text"
                maxLength={4}
                value={signatureCode}
                onChange={(e) => setSignatureCode(e.target.value.replace(/\D/g, ''))}
                placeholder="_ _ _ _"
                className="modal-input"
              />
            </div>
            <div className="modal-buttons">
              <button 
                onClick={() => setShowSignatureModal(false)} 
                className="modal-button modal-button-cancel"
              >
                Anuluj
              </button>
              <button 
                onClick={handleResendCode} 
                className="modal-button modal-button-resend"
                disabled={resendTimer > 0}
              >
                {resendTimer > 0 ? `Ponownie za ${resendTimer}s` : 'Wyślij ponownie kod'}
              </button>
              <button 
                onClick={handleConfirmSignature} 
                className="modal-button modal-button-confirm"
                disabled={signatureCode.length !== 4}
              >
                Potwierdź
              </button>
            </div>
          </div>
        </div>
      )}

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

        /* Zmniejszone marginesy dla strony 2 */
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

        /* Zmniejszone marginesy tytułów na stronie 2 */
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

        .signature-placeholder {
          font-size: 8pt;
          color: #999;
          margin-top: 0.6rem;
        }

        .signed-indicator-contract {
          margin-top: 0.6rem;
        }

        .signed-name {
          font-weight: 600;
          font-size: 9pt;
          color: #0052a3;
          margin: 0.3rem 0;
        }

        .signed-date {
          font-weight: 400;
          font-size: 7.5pt;
          color: #666;
        }

        .signed-confirmation {
          background: #d4edda;
          color: #155724;
          padding: 0.6rem 1.2rem;
          border-radius: 4px;
          font-size: 9pt;
          font-weight: 600;
          display: inline-block;
        }

        .signed-header {
          font-weight: 600;
          font-size: 9pt;
          color: #0052a3;
          margin: 0.3rem 0;
        }

        .signed-role {
          font-weight: 400;
          font-size: 7.5pt;
          color: #666;
        }

        .signed-timestamp {
          font-weight: 400;
          font-size: 7.5pt;
          color: #666;
        }

        .sign-button {
          background: #0066cc;
          color: white;
          padding: 0.8rem 1.8rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 10pt;
          font-weight: 600;
        }

        .sign-button:hover {
          background: #0052a3;
        }

        .footer {
          position: absolute;
          bottom: 10mm;
          left: 15mm;
          right: 15mm;
          text-align: center;
          font-size: 7.5pt;
          color: #666;
          padding-top: 0.6rem;
          border-top: 1px solid #e0e0e0;
        }

        .footer p {
          margin: 0;
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

        .transport-box {
          display: flex;
          align-items: center;
          background: #f0f7ff;
          border-left: 3px solid #0066cc;
          padding: 0.5rem 0.7rem;
          margin: 0.5rem 0;
        }

        .transport-value {
          width: 100%;
          font-size: 8.5pt;
          font-family: inherit;
          font-weight: 600;
          color: #0066cc;
        }

        /* Tylko ekran – przy druku (@media print) nie stosować; układ ma być jak na podglądzie (grid 2 kolumny, header w rzędzie). */
        @media screen and (max-width: 768px) {
          .page {
            width: 100%;
            min-height: auto;
            max-height: none;
            padding: 10mm;
          }

          .header {
            flex-direction: column;
            align-items: center;
          }

          .header-simple {
            flex-direction: column;
            align-items: center;
          }

          .logo-small {
            width: 55px;
          }

          .field-grid {
            grid-template-columns: 1fr;
          }

          .signature-row-single {
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-content {
          background: white;
          padding: 2rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 400px;
          max-width: 90%;
          text-align: center;
          animation: slideUp 0.3s ease-out;
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #0066cc;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .modal-title::before {
          content: '🔒';
          font-size: 1.5rem;
        }

        .modal-text {
          font-size: 0.95rem;
          color: #555;
          margin-bottom: 1.5rem;
          line-height: 1.6;
          text-align: left;
        }

        .modal-text strong {
          color: #0066cc;
          font-weight: 600;
        }

        .modal-input-group {
          margin-bottom: 1.5rem;
        }

        .modal-input-group label {
          font-size: 0.9rem;
          color: #333;
          margin-bottom: 0.5rem;
          display: block;
          font-weight: 600;
        }

        .modal-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1.5rem;
          text-align: center;
          font-family: monospace;
          letter-spacing: 0.5rem;
          transition: all 0.3s;
          background: #f8f9fa;
        }

        .modal-input:focus {
          outline: none;
          border-color: #0066cc;
          background: white;
          box-shadow: 0 0 0 4px rgba(0, 102, 204, 0.1);
        }

        .modal-buttons {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .modal-button {
          padding: 0.75rem 1.25rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 600;
          font-size: 0.9rem;
          min-width: 110px;
        }

        .modal-button-cancel {
          background: #f0f0f0;
          color: #666;
        }

        .modal-button-cancel:hover {
          background: #e0e0e0;
          color: #333;
        }

        .modal-button-resend {
          background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(0, 102, 204, 0.3);
        }

        .modal-button-resend:hover {
          background: linear-gradient(135deg, #0052a3 0%, #004080 100%);
          box-shadow: 0 4px 12px rgba(0, 102, 204, 0.4);
          transform: translateY(-2px);
        }

        .modal-button-resend:disabled {
          background: #ccc;
          color: #666;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .modal-button-resend:disabled:hover {
          transform: none;
        }

        .modal-button-confirm {
          background: linear-gradient(135deg, #28a745 0%, #218838 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
        }

        .modal-button-confirm:hover {
          background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
          transform: translateY(-2px);
        }

        .modal-button-confirm:disabled {
          background: #ccc;
          color: #666;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .modal-button-confirm:disabled:hover {
          transform: none;
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
      `}</style>
    </>
  );
}

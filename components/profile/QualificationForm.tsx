'use client';

import { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import Image from 'next/image';

interface QualificationFormProps {
  reservationData?: {
    turnName?: string;
    campLocation?: string;
    campDates?: string;
    childName?: string;
    childDOB?: string;
    childAddress?: string;
    parentNames?: string;
    parentAddress?: string;
    parentPhone?: string;
    reservationId?: string;
  };
  printMode?: boolean;
}

export function QualificationForm({ reservationData, printMode = false }: QualificationFormProps) {
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureCode, setSignatureCode] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [showRegulationError, setShowRegulationError] = useState(false);
  const [showAuthorizationError, setShowAuthorizationError] = useState(false);

  // Automatyczny druk w trybie printMode
  useEffect(() => {
    if (printMode) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printMode]);
  
  // Tablica upoważnień
  const [authorizations, setAuthorizations] = useState([
    {
      fullName: '',
      documentType: 'dowód osobisty',
      documentNumber: '',
      canPickup: false,
      canTemporaryPickup: false
    }
  ]);
  
  // Aktualna data i godzina
  const getCurrentDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString('pl-PL');
    const time = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  };

  const [formData, setFormData] = useState({
    // Dane uczestnika (domyślne wartości dla podglądu)
    turnName: reservationData?.turnName || 'All in One - Młodzieżowy',
    campLocation: reservationData?.campLocation || 'OK BEAVER, Wiele, Rogalewo 1',
    campDates: reservationData?.campDates || '16.07.2026 - 25.07.2026',
    
    // Sekcja I - Dane uczestnika/dziecka
    childName: reservationData?.childName || 'test test',
    childDOB: reservationData?.childDOB || '21.01.2014',
    childPesel: '',
    childAddress: reservationData?.childAddress || 'Przylądź OODB1, 80-349 Gdańsk',
    parentNames: reservationData?.parentNames || 'test test, test brąk',
    parentAddress: reservationData?.parentAddress || 'Działczaś OOBB1, 80-349 Gdańsk brak, brak brak',
    parentPhone: reservationData?.parentPhone || '+48 724680812',
    
    // Sekcja II - Informacja o stanie zdrowia
    healthInfo: '',
    
    // Informacja o szczepieniach
    vaccination: {
      calendar: false,
      tetanus: false,
      tetanusYear: '',
      measles: false,
      measlesYear: '',
      diphtheria: false,
      diphtheriaYear: '',
      other: false,
      otherYear: '',
      otherDetails: ''
    },
    
    vaccineInfo: '',
    
    // Sekcja III - Deklaracja
    parentDeclaration: '',
    
    // Sekcja IV - Potwierdzenie zapoznania
    regulationConfirm: false,
    
    // Sekcja VI - Zgoda na samodzielny powrót
    independentReturn: false,
    
    // Sekcja III - Informacje dodatkowe
    additionalInfo: '',
    
    // Sekcja V - Odbiór dziecka
    pickupInfo: '',
    
    // Sekcja VI - Potwierdzenie przez kierownika
    directorConfirmation: '',
    directorDate: '',
    
    // Podpisy
    parentSignature: '',
    parentSignatureDate: '',
    directorSignature: '',
    organizerSignature: ''
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVaccinationChange = (field: string, value: any) => {
    // Jeśli zaznaczamy "calendar", automatycznie zaznacz Tężec, Błonica, Dur (ale nie Inne)
    if (field === 'calendar' && value === true) {
      setFormData(prev => ({
        ...prev,
        vaccination: {
          ...prev.vaccination,
          calendar: true,
          tetanus: true,
          measles: true,
          diphtheria: true
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vaccination: { ...prev.vaccination, [field]: value }
      }));
    }
  };

  // Funkcje obsługi upoważnień
  const handleAuthorizationChange = (index: number, field: string, value: any) => {
    const updated = [...authorizations];
    updated[index] = { ...updated[index], [field]: value };
    setAuthorizations(updated);
  };

  const addNewAuthorization = () => {
    setAuthorizations([
      ...authorizations,
      {
        fullName: '',
        documentType: 'dowód osobisty',
        documentNumber: '',
        canPickup: false,
        canTemporaryPickup: false
      }
    ]);
  };

  const removeAuthorization = (index: number) => {
    if (authorizations.length > 1) {
      const updated = authorizations.filter((_, i) => i !== index);
      setAuthorizations(updated);
    }
  };

  const handlePrint = () => {
    if (printMode) {
      window.print();
    } else {
      // Otwórz stronę druku w nowym oknie
      const reservationId = reservationData?.reservationId || '';
      window.open(`/druk/karta-kwalifikacyjna/${reservationId}`, '_blank');
    }
  };

  const handleSignDocument = () => {
    // Sprawdź czy zaznaczono checkbox z regulaminem
    if (!formData.regulationConfirm) {
      setShowRegulationError(true);
      setShowAuthorizationError(false);
      // Przewiń do sekcji V z regulaminem
      const regulationSection = document.querySelector('.checkbox-single');
      if (regulationSection) {
        regulationSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // Sprawdź walidację upoważnień
    const hasInvalidAuthorization = authorizations.some(auth => {
      // Sprawdź czy użytkownik zaczął wypełniać COKOLWIEK w tej sekcji
      const hasStartedFilling = 
        auth.fullName.trim().length > 0 || 
        auth.documentNumber.trim().length > 0 || 
        auth.canPickup || 
        auth.canTemporaryPickup;
      
      // Jeśli zaczął wypełniać, musi wypełnić WSZYSTKO
      if (hasStartedFilling) {
        // Musi być wypełnione imię i nazwisko
        if (!auth.fullName.trim()) {
          return true;
        }
        // Musi być wypełniony numer dokumentu
        if (!auth.documentNumber.trim()) {
          return true;
        }
        // Musi być zaznaczony przynajmniej jeden checkbox
        if (!auth.canPickup && !auth.canTemporaryPickup) {
          return true;
        }
      }
      return false;
    });

    if (hasInvalidAuthorization) {
      setShowAuthorizationError(true);
      setShowRegulationError(false);
      // Przewiń do sekcji VI z upoważnieniami
      const authSection = document.querySelector('.authorization-card');
      if (authSection) {
        authSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // Jeśli wszystko OK, otwórz modal
    setShowRegulationError(false);
    setShowAuthorizationError(false);
    setShowSignatureModal(true);
  };

  const handleResendCode = () => {
    // Logika do ponownego wysłania kodu SMS
    alert('Kod został wysłany ponownie');
    setResendTimer(60);
  };

  const handleConfirmSignature = () => {
    if (signatureCode.length === 4) {
      setIsSigned(true);
      setShowSignatureModal(false);
      setSignatureCode('');
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

      {/* Formularz - dwie strony A4 */}
      <div className="form-container">
        {/* STRONA 1 */}
        <div className="page">
          {/* Nagłówek */}
          <div className="header">
            <div className="date">{getCurrentDateTime()}</div>
            <div className="title-center">Karta Kwalifikacyjna Uczestnika Wypoczynku LATO 2026</div>
            <Image src="/logo.png" alt="RADSAS fun" width={75} height={40} className="logo" />
          </div>

          <h1 className="main-title">KARTA KWALIFIKACYJNA UCZESTNIKA WYPOCZYNKU LATO 2026</h1>

          <div className="notice">
            Jest to dokument urzędowy i należy go wypełnić skrupulatnie, zgodnie z prawdą. Brak podpisu lub niewypełnienie karty kwalifikacyjnej może spowodować
            niedopuszczenie dziecka do zajęć, a nawet odesłanie z obozu na koszt rodziców (opiekunów) z przyczyn niezawinionych przez Organizatora.
          </div>

          {/* Tabela z danymi podstawowymi */}
          <div className="info-table">
            <div className="info-row">
              <div className="info-cell">
                <label>Wybrany turnus obozu</label>
                <div className="readonly-field">{formData.turnName}</div>
              </div>
              <div className="info-cell">
                <label>Miejsce/Ośrodek wypoczynku</label>
                <div className="readonly-field">{formData.campLocation}</div>
              </div>
              <div className="info-cell">
                <label>Termin obozu</label>
                <div className="readonly-field">{formData.campDates}</div>
              </div>
            </div>
          </div>

          {/* Sekcja I */}
          <section className="section">
            <h2 className="section-title">I WNIOSEK RODZICÓW (OPIEKUNÓW PRAWNYCH) O SKIEROWANIE UCZESTNIKA/DZIECKA NA
PLACÓWKĘ WYPOCZYNKU – impreza organizowana przez Radsas Fun sp. z o.o. z siedzibą w Gdańsku</h2>
            
            <div className="field-group">
              <label>1) Imię i nazwisko uczestnika/dziecka</label>
              <div className="readonly-field">{formData.childName}</div>
            </div>

            <div className="field-group">
              <label>2) Data urodzenia uczestnika/dziecka</label>
              <div className="readonly-field">{formData.childDOB}</div>
            </div>

            <div className="field-group">
              <label>3) PESEL uczestnika/dziecka</label>
              <input
                type="text"
                value={formData.childPesel}
                onChange={(e) => handleChange('childPesel', e.target.value)}
                className={`input-line ${!isSigned ? 'editable-field' : ''}`}
                placeholder="12312312322"
              />
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.vaccination.measles}
                onChange={(e) => handleVaccinationChange('measles', e.target.checked)}
              />
              Dziecko nie posiada numeru PESEL
              {formData.vaccination.measles && !formData.vaccination.calendar && (
                <input
                  type="text"
                  value={formData.vaccination.measlesYear}
                  onChange={(e) => handleVaccinationChange('measlesYear', e.target.value)}
                  className={`input-inline ${!isSigned ? 'editable-field' : ''}`}
                  placeholder="rok"
                />
              )}
            </label>
            
            <div className="field-group">
              <label>4) Adres zamieszkania uczestnika/dziecka</label>
              <div className="readonly-field">{formData.childAddress}</div>
            </div>

            <div className="field-group">
              <label>5) Imiona i nazwiska rodziców/opiekunów prawnych</label>
              <div className="readonly-field">{formData.parentNames}</div>
            </div>

            <div className="field-group">
              <label>6) Adresy zamieszkania rodziców/opiekunów prawnych</label>
              <div className="readonly-field">{formData.parentAddress}</div>
            </div>

            <div className="field-group">
              <label>7) Telefony do rodziców/ opiekunów prawnych</label>
              <div className="readonly-field">{formData.parentPhone}</div>
            </div>
          </section>

          {/* Sekcja II */}
          <section className="section">
            <h2 className="section-title">II INFORMACJA RODZICÓW (OPIEKUNÓW) O STANIE ZDROWIA UCZESTNIKA/DZIECKA</h2>
            <div className="info-text">
              Np. na co dziecko jest uczulone, czy przyjmuje stałe leki i w jakich dawkach, czy może przyjmować je samodzielnie, czy może uprawiać sport,
              czy choruje przewlekle (np. alergie, cukrzyca, AZS itp.), czy posiada jakieś dysfunkcje (np. ADHD, upośledzenie w stopniu lekkim, itd), czy dziecko leczy się lub leczyło się
              psychiatrycznie/psychologicznie, czy ma problemy ze wzrokiem (np. okulary, soczewki), słuchem, czy ma problemy z moczeniem się (tak zwanym zapaleniem układu moczowego). 
              Informujemy, że leki podaje kadra na obozie lub uczestnik samodzielnie za zgodą opiekuna prawnego/rodzica. Informujemy, że z uwagi na brak możliwości zapewnienia pełnej opieki osobom z zaburzeniami rozwoju
              (Autyzm, Zespół Aspergera, Zespół Retta, Zespół Hellera, Zespół Tourett&apos;a oraz choroba autoimmunologiczna - celiakia), nie przyjmujemy uczestników z tym dysfunkcjami. Zatajenie informacji może
              skutkować usunięciem dziecka/uczestnika z obozu/kolonii i skierowaniem sprawy do sądu.
            </div>
            <textarea
              value={formData.healthInfo}
              onChange={(e) => handleChange('healthInfo', e.target.value)}
              className={`textarea-field ${!isSigned ? 'editable-field' : ''}`}
              rows={3}
              placeholder="Dane z procesu rezerwacji z możliwością edycji/dopisania tutaj"
            />
          </section>

          {/* Informacja o szczepieniach */}
          <section className="section">
            <h2 className="section-title">Informacja o szczepieniach ochronnych (zaznaczenie oraz podanie roku):</h2>
            
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.vaccination.calendar}
                  onChange={(e) => handleVaccinationChange('calendar', e.target.checked)}
                />
                Zgodnie z kalendarzem szczepień
              </label>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.vaccination.tetanus}
                  onChange={(e) => handleVaccinationChange('tetanus', e.target.checked)}
                />
                Tężec
                {formData.vaccination.tetanus && !formData.vaccination.calendar && (
                  <input
                    type="text"
                    value={formData.vaccination.tetanusYear}
                    onChange={(e) => handleVaccinationChange('tetanusYear', e.target.value)}
                    className={`input-inline ${!isSigned ? 'editable-field' : ''}`}
                    placeholder="rok"
                  />
                )}
              </label>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.vaccination.measles}
                  onChange={(e) => handleVaccinationChange('measles', e.target.checked)}
                />
                Błonica
                {formData.vaccination.measles && !formData.vaccination.calendar && (
                  <input
                    type="text"
                    value={formData.vaccination.measlesYear}
                    onChange={(e) => handleVaccinationChange('measlesYear', e.target.value)}
                    className={`input-inline ${!isSigned ? 'editable-field' : ''}`}
                    placeholder="rok"
                  />
                )}
              </label>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.vaccination.diphtheria}
                  onChange={(e) => handleVaccinationChange('diphtheria', e.target.checked)}
                />
                Dur
                {formData.vaccination.diphtheria && !formData.vaccination.calendar && (
                  <input
                    type="text"
                    value={formData.vaccination.diphtheriaYear}
                    onChange={(e) => handleVaccinationChange('diphtheriaYear', e.target.value)}
                    className={`input-inline ${!isSigned ? 'editable-field' : ''}`}
                    placeholder="rok"
                  />
                )}
              </label>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.vaccination.other}
                  onChange={(e) => handleVaccinationChange('other', e.target.checked)}
                />
                Inne
                {formData.vaccination.other && !formData.vaccination.calendar && (
                  <>
                    <input
                      type="text"
                      value={formData.vaccination.otherDetails}
                      onChange={(e) => handleVaccinationChange('otherDetails', e.target.value)}
                      className={`input-inline ${!isSigned ? 'editable-field' : ''}`}
                      placeholder="podać jakie"
                    />
                    <input
                      type="text"
                      value={formData.vaccination.otherYear}
                      onChange={(e) => handleVaccinationChange('otherYear', e.target.value)}
                      className={`input-inline ${!isSigned ? 'editable-field' : ''}`}
                      placeholder="rok"
                    />
                  </>
                )}
              </label>
            </div>
          </section>

          {/* Deklaracja o zgodzie na leczenie - przeniesiona ze strony 2 */}
          <section className="section">
            <div className="info-text">
              W razie zagrożenia zdrowia lub życia dziecka zgadzam się na jego leczenie, niezbędne zabiegi diagnostyczne i operacje. 
              Wyrażam zgodę na transport mojego dziecka przez kierownika, wychowawcę lub opiekuna obozu/kolonii prywatnym samochodem osobowym do lekarza, 
              przychodni, szpitala i/lub miejsca, gdzie zostanie mu zapewniona opieka medyczna. Wyrażam zgodę na podawanie potrzebnych leków przez kadrę Radsas Fun sp. z o.o. mojemu dziecku w razie potrzeby. 
            </div>

            <div className="declaration-box">
              <p className="declaration-text">
                STWIERDZAM, ŻE PODAŁEM/AM WSZYSTKIE ZNANE MI INFORMACJE O DZIECKU, KTÓRE MOGĄ POMÓC W ZAPEWNIENIU WŁAŚCIWEJ OPIEKI
                W CZASIE POBYTU DZIECKA NA KOLONII ORGANIZOWANEJ PRZEZ FIRMĘ RADSAS FUN SP. Z O.O.
              </p>
              <div className="info-text-below">
                Stwierdzam brak przeciwwskazań do uczestnictwa w specjalistycznych imprezach i obozach oraz uprawiania takiej zajęć rekreacji ruchowej jak m.in.: jazda na quadach, skuterze wodnym, bananie wodnym, ścianka wspinaczkowa, park linowy, kąpiele w jeziorze, park wodny, kajaki i rowerki wodne, Energylandia, Aquapark.
              </div>
            </div>
          </section>

          <div className="page-number">1/2</div>
        </div>

        {/* STRONA 2 */}
        <div className="page">
          <div className="header-simple">
            <div className="date">{getCurrentDateTime()}</div>
            <div className="title-center">Karta Kwalifikacyjna Uczestnika Wypoczynku LATO 2026</div>
            <Image src="/logo.png" alt="RADSAS fun" width={60} height={32} className="logo-small" />
          </div>

          {/* Sekcja III - Informacje dodatkowe przeniesiona ze strony 1 */}
          <section className="section">
            <h2 className="section-title">III INFORMACJE DODATKOWE</h2>
            <div className="info-text">
              Prosimy o podanie dodatkowych informacji np. przyjedzie dzień później, rodzic ma ograniczone prawa rodzicielskie, ma urodziny podczas obozu, boi się balonów, itp.
            </div>
            <textarea
              value={formData.additionalInfo}
              onChange={(e) => handleChange('additionalInfo', e.target.value)}
              className={`textarea-field ${!isSigned ? 'editable-field' : ''}`}
              rows={2}
            />
          </section>

          {/* Sekcja IV - Karta Kwalifikacyjna */}
          <section className="section">
            <h2 className="section-title">IV WNIOSEK RODZICÓW (OPIEKUNÓW PRAWNYCH) O ZAKWATEROWANIE UCZESTNIKA/DZIECKA NA OBÓZ/KOLONIE</h2>
            <div className="info-text">
              Prosimy podać imię i nazwisko osoby, z którą dziecko chce być zakwaterowane. Prośby dotyczące zakwaterowania będą wykonywane w miarę możliwości logistycznych i lokalnych. Dokładamy wszelkich starań, żeby dzieci były zakwaterowane
              zgodnie z wnioskami.
            </div>
            <textarea
              value={formData.vaccineInfo}
              onChange={(e) => handleChange('vaccineInfo', e.target.value)}
              className={`textarea-field ${!isSigned ? 'editable-field' : ''}`}
              rows={2}
            />
          </section>

          {/* Sekcja V */}
          <section className="section">
            <h2 className="section-title">V POTWIERDZENIE ZAPOZNANIA SIĘ Z REGULAMINEM Radsas Fun sp. z o.o.</h2>
            <div className="info-text">
              SZCZEGÓŁOWY REGULAMIN IMPREZ TURYSTYCZNYCH RADSAS FUN DOSTĘPNY JEST NA STRONIE INTERNETOWEJ ORGANIZATORA ORAZ W PANELU KLIENTA. 
              KLIENT (RODZIC/OPIEKUN PRAWNY) JEST W OBOWIĄZKU ZAPOZNANIA SIE Z REGULAMINEM. 
              ZAPISANIE DZIECKA/UCZESTNIKA NA OBÓZ/KOLONIĘ JEST JEDNOZNACZNE Z JEGO ZAAKCEPTOWANIEM. 
            </div>
            <div className={`checkbox-single ${showRegulationError ? 'checkbox-error' : ''}`}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.regulationConfirm}
                  onChange={(e) => {
                    handleChange('regulationConfirm', e.target.checked);
                    if (e.target.checked) {
                      setShowRegulationError(false);
                    }
                  }}
                />
                Potwierdzam zapoznanie się z regulaminem
              </label>
            </div>
            {showRegulationError && (
              <div className="error-message">
                ⚠️ Musisz potwierdzić zapoznanie się z regulaminem przed podpisaniem dokumentu.
              </div>
            )}
          </section>

          {/* Sekcja VI */}
          <section className="section">
            <h2 className="section-title">VI ODBIÓR DZIECKA Z OBOZU / ODWIEDZINY W TRAKCIE IMPREZY – UPOWAŻNIENIE</h2>
            
            <div className="info-text">
              Biorę pełną odpowiedzialność za bezpieczeństwo dziecka podczas przebywania z osobą upoważnioną.
            </div>

            {authorizations.map((auth, index) => (
              <div key={index} className="authorization-card">
                {/* Nagłówek karty z przyciskiem usuwania */}
                <div className="auth-header">
                  <span className="auth-title">Osoba upoważniona #{index + 1}</span>
                  {index > 0 && (
                    <button
                      onClick={() => removeAuthorization(index)}
                      className="remove-button no-print"
                      title="Usuń osobę upoważnioną"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Imię i nazwisko - w jednym rzędzie */}
                <div className="field-row-inline">
                  <span className="label-inline">Upoważniam (imię i nazwisko):</span>
                  <input
                    type="text"
                    value={auth.fullName}
                    onChange={(e) => handleAuthorizationChange(index, 'fullName', e.target.value)}
                    className={`input-inline-full ${!isSigned ? 'editable-field' : ''}`}
                    placeholder="Jan Kowalski"
                  />
                </div>

                {/* Dokument - w jednym rzędzie */}
                <div className="field-row">
                  <div className="field-inline">
                    <label>Legitymującą/ego się dokumentem</label>
                    <select
                      value={auth.documentType}
                      onChange={(e) => handleAuthorizationChange(index, 'documentType', e.target.value)}
                      className={`select-field ${!isSigned ? 'editable-field' : ''}`}
                    >
                      <option value="dowód osobisty">Dowód osobisty</option>
                      <option value="paszport">Paszport</option>
                    </select>
                  </div>
                  <div className="field-inline">
                    <label>Numer dokumentu</label>
                    <input
                      type="text"
                      value={auth.documentNumber}
                      onChange={(e) => handleAuthorizationChange(index, 'documentNumber', e.target.value)}
                      className={`input-line ${!isSigned ? 'editable-field' : ''}`}
                      placeholder="ABC123456"
                    />
                  </div>
                </div>

                {/* Do czego upoważniamy */}
                <div className="field-group">
                  <label className="section-label">Do czego upoważniam:</label>
                  
                  <div className="checkbox-container">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={auth.canPickup}
                        onChange={(e) => handleAuthorizationChange(index, 'canPickup', e.target.checked)}
                      />
                      Do odbioru dziecka z obozu: ośrodka i/lub miejsca zbiórki transportu zbiorowego
                    </label>
                    
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={auth.canTemporaryPickup}
                        onChange={(e) => handleAuthorizationChange(index, 'canTemporaryPickup', e.target.checked)}
                      />
                      Odwiedzin dziecka i/lub zabrania go poza teren ośrodka na określony czas, w trakcie trwania obozu
                    </label>
                  </div>
                </div>
              </div>
            ))}

            {/* Prosty checkbox dodawania kolejnej osoby */}
            <div className="simple-action">
              <label className="simple-action-label">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      addNewAuthorization();
                      e.target.checked = false; // Reset checkbox
                    }
                  }}
                />
                <span className="simple-action-text">Upoważniam kolejną osobę</span>
              </label>
            </div>

            {/* Wyeksponowany checkbox samodzielnego powrotu */}
            <div className="consent-box">
              <label className="consent-label">
                <input
                  type="checkbox"
                  checked={formData.independentReturn}
                  onChange={(e) => handleChange('independentReturn', e.target.checked)}
                />
                <span className="consent-text">Wyrażam zgodę na samodzielny powrót dziecka do domu z miejsca zbiórki transportu zbiorowego</span>
              </label>
            </div>

            {/* Błąd upoważnień */}
            {showAuthorizationError && (
              <div className="error-message">
                ⚠️ Jeśli wypełniłeś imię i nazwisko osoby upoważnionej, musisz uzupełnić numer dokumentu oraz zaznaczyć przynajmniej jedno upoważnienie w Sekcji VI.
              </div>
            )}
          </section>

          {/* Podpis dokumentu */}
          <section className="section">

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              {isSigned ? (
                <div className="signed-confirmation">
                  <div className="signed-header">Dokument podpisany przez:</div>
                  <div className="signed-role">{formData.parentNames || 'Opiekun prawny'}</div>
                  <div className="signed-timestamp">{getCurrentDateTime()}</div>
                </div>
              ) : (
                <button 
                  onClick={handleSignDocument} 
                  className="sign-button no-print"
                >
                  PODPISZ DOKUMENT
                </button>
              )}
            </div>
          </section>

          {/* Część Organizatora */}
          <section className="section organizer-section">
            <h2 className="section-title">CZĘŚĆ ORGANIZATORA</h2>
            <div className="info-text">
              Uczestnik skwalifikowany do wypoczynku / nie zakwalifkowany (włąściwe zakreślić Organizator wypoczynku)
            </div>
          </section>

          {/* Sekcja VII */}
          <section className="section">
            <h2 className="section-title">VII POTWIERDZENIE PRZEZ KIEROWNIKA WYPOCZYNKU POBYTU UCZESTNIKA WYPOCZYNKU W/REJSCU WYPOCZYNKU (WYPEŁNIANIE PRZEZ
KIEROWNIKA DO CELÓW WAMNET ŻYWIENIA WYRSTAWANIE SA NA PODSTAWE ODREDREGO WNICSKU RODZICAROPIEKUNA
PRAWNEGO) I INFORMACJE O UCZESTNIU W CZASIE TRWANIA WYPOCZYNKU (STAN ZDROWIA, CHOROBY PRZEBYTE W TRAKCIE)</h2>
            
            <div className="field-group">
              <label>Uczestnik przybywał (impreza wypoczynku)</label>
              <input
                type="text"
                value={formData.directorConfirmation}
                onChange={(e) => handleChange('directorConfirmation', e.target.value)}
                className="input-line"
                readOnly
              />
            </div>

            <div className="field-group">
              <label>od dnia _____________ do dnia _____________</label>
            </div>

            <div className="field-group" style={{ marginTop: '1rem' }}>
              <label>Informacje:</label>
              <textarea
                className="textarea-field"
                rows={2}
                readOnly
              />
            </div>

            <div className="signature-row" style={{ marginTop: '2rem' }}>
              <div className="signature-field">
                <label>(miejsca i data)</label>
                <input
                  type="text"
                  className="input-line"
                  readOnly
                />
              </div>
              <div className="signature-field">
                <label>(podpis kierownika wypoczynku)</label>
                <input
                  type="text"
                  className="input-line"
                  readOnly
                />
              </div>
            </div>
          </section>

          <div className="page-number">2/2</div>
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
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .form-container {
            width: 100%;
          }
          
          .page {
            page-break-after: always;
            page-break-inside: avoid;
          }
          
          .page:last-child {
            page-break-after: auto;
          }

          input, textarea {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
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
          padding: 10mm 15mm;
          box-sizing: border-box;
          position: relative;
          font-size: 8.5pt;
          line-height: 1.25;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1a1a1a;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.4rem;
          gap: 0.8rem;
          padding-bottom: 0.3rem;
          border-bottom: 2px solid #0066cc;
        }

        .header-simple {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
          padding-bottom: 0.25rem;
          border-bottom: 2px solid #0066cc;
          gap: 0.8rem;
        }

        .date {
          font-size: 7pt;
          flex-shrink: 0;
          color: #666;
        }

        .title-center {
          text-align: center;
          font-size: 8.5pt;
          flex: 1;
          font-weight: 600;
          color: #0066cc;
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
          font-size: 10pt;
          font-weight: 700;
          margin: 0.4rem 0;
          padding: 0.4rem;
          background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
          color: white;
          border-radius: 3px;
          letter-spacing: 0.3px;
        }

        .notice {
          font-size: 6.5pt;
          font-style: italic;
          margin: 0.3rem 0;
          line-height: 1.15;
          color: #c00;
          background: #fff5f5;
          padding: 0.3rem;
          border-left: 2px solid #c00;
          border-radius: 2px;
        }

        .info-table {
          margin: 0.4rem 0;
          border: 1px solid #ddd;
          border-radius: 3px;
          overflow: hidden;
        }

        .info-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1px;
          background: #e0e0e0;
        }

        .info-cell {
          background: #f9f9f9;
          padding: 0.3rem;
        }

        .info-cell label {
          display: block;
          font-size: 6.5pt;
          margin-bottom: 0.15rem;
          color: #555;
          font-weight: 600;
        }

        .section {
          margin: 0.35rem 0;
          background: white;
          padding: 0.2rem 0;
        }

        .section-title {
          font-size: 8pt;
          font-weight: 700;
          margin: 0.3rem 0 0.25rem 0;
          color: #0066cc;
          padding-bottom: 0.15rem;
          border-bottom: 1px solid #e0e0e0;
          line-height: 1.15;
        }

        .field-group {
          margin: 0.25rem 0;
        }

        .field-group label {
          font-size: 7.5pt;
          display: block;
          margin-bottom: 0.1rem;
          color: #333;
          font-weight: 500;
        }

        .input-field,
        .input-line {
          width: 100%;
          padding: 0.25rem 0.3rem;
          border: none;
          border-bottom: 1px solid #d0d0d0;
          font-size: 8pt;
          background: transparent;
          transition: border-color 0.2s;
          font-family: inherit;
        }

        .input-field:focus,
        .input-line:focus {
          outline: none;
          border-bottom-color: #0066cc;
          background: #f8faff;
        }

        .input-line {
          border-bottom: 1px solid #b0b0b0;
        }

        .textarea-field {
          width: 100%;
          padding: 0.3rem;
          border: 1px solid #d0d0d0;
          font-size: 7.5pt;
          font-family: inherit;
          resize: vertical;
          min-height: 30px;
          border-radius: 2px;
          transition: border-color 0.2s, background-color 0.2s;
          line-height: 1.25;
        }

        .textarea-field:focus {
          outline: none;
          border-color: #0066cc;
          background: #f8faff;
        }

        /* Edytowalne pola - pastelowy żółty kolor przed podpisaniem */
        .editable-field {
          background: #fef9c3 !important;
        }

        /* Pola tylko do odczytu */
        .readonly-field {
          width: 100%;
          padding: 0.25rem 0.3rem;
          border: none;
          border-bottom: 1px solid #d0d0d0;
          font-size: 8pt;
          background: transparent;
          font-family: inherit;
          color: #333;
        }

        .info-text {
          font-size: 7pt;
          line-height: 1.2;
          margin: 0.25rem 0;
          text-align: justify;
          color: #444;
          background: #fafafa;
          padding: 0.25rem;
          border-radius: 2px;
        }

        .checkbox-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.8rem;
          margin: 0.3rem 0;
          padding: 0.3rem;
          background: #f9f9f9;
          border-radius: 2px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 7.5pt;
          cursor: pointer;
          transition: color 0.2s;
        }

        .checkbox-label:hover {
          color: #0066cc;
        }

        .checkbox-label input[type="checkbox"] {
          width: 13px;
          height: 13px;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background: white;
          border: 2px solid #0066cc;
          border-radius: 2px;
          position: relative;
          transition: all 0.2s;
        }

        .checkbox-label input[type="checkbox"]:hover {
          border-color: #0052a3;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        .checkbox-label input[type="checkbox"]:checked {
          background: white;
          border-color: #0066cc;
        }

        .checkbox-label input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 2px;
          top: -1px;
          width: 5px;
          height: 9px;
          border: solid #0066cc;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        /* Ujednolicone checkboxy dla wszystkich sekcji */
        .simple-action-label input[type="checkbox"],
        .consent-label input[type="checkbox"] {
          width: 13px;
          height: 13px;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background: white;
          border: 2px solid #0066cc;
          border-radius: 2px;
          position: relative;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .simple-action-label input[type="checkbox"]:hover,
        .consent-label input[type="checkbox"]:hover {
          border-color: #0052a3;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        .simple-action-label input[type="checkbox"]:checked,
        .consent-label input[type="checkbox"]:checked {
          background: white;
          border-color: #0066cc;
        }

        .simple-action-label input[type="checkbox"]:checked::after,
        .consent-label input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 2px;
          top: -1px;
          width: 5px;
          height: 9px;
          border: solid #0066cc;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .checkbox-single {
          margin: 0.3rem 0;
          padding: 0.3rem;
          background: #f0f7ff;
          border-radius: 2px;
          border-left: 2px solid #0066cc;
        }

        .checkbox-error {
          border-left: 2px solid #c00;
          background: #fff5f5 !important;
          animation: shake 0.5s;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .error-message {
          color: #c00;
          font-size: 8pt;
          font-weight: 600;
          margin-top: 0.5rem;
          padding: 0.3rem 0.5rem;
          background: #fff5f5;
          border-left: 3px solid #c00;
          border-radius: 2px;
          animation: fadeIn 0.3s;
        }

        .input-inline {
          margin-left: 0.25rem;
          padding: 0.1rem 0.25rem;
          border: none;
          border-bottom: 1px solid #b0b0b0;
          font-size: 7.5pt;
          width: 130px;
        }

        .input-inline:focus {
          outline: none;
          border-bottom-color: #0066cc;
          background: #f8faff;
        }

        .declaration-box {
          border: 1.5px solid #0066cc;
          padding: 0.4rem;
          margin: 0.4rem 0;
          background: #f8faff;
          border-radius: 3px;
        }

        .declaration-text {
          font-size: 7.5pt;
          font-weight: 700;
          margin: 0 0 0.3rem 0;
          color: #0066cc;
          text-transform: uppercase;
          letter-spacing: 0.2px;
          line-height: 1.15;
        }

        .signature-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.2rem;
          margin: 0.6rem 0;
        }

        .signature-field label {
          display: block;
          font-size: 6.5pt;
          font-style: italic;
          margin-bottom: 0.15rem;
          color: #666;
        }

        .auto-filled-date {
          font-size: 6.5pt;
          color: #666;
        }

        .signed-indicator {
          font-size: 6.5pt;
          color: #0066cc;
          font-weight: 600;
        }

        .signed-label {
          font-weight: 700;
          font-size: 7.5pt;
          color: #0066cc;
          margin-bottom: 0.2rem;
        }

        .signed-name {
          font-weight: 600;
          font-size: 8pt;
          color: #0052a3;
          margin: 0.2rem 0;
        }

        .signed-date {
          font-weight: 400;
          font-size: 6.5pt;
          color: #666;
        }

        .sign-button {
          background: #0066cc;
          color: white;
          padding: 0.6rem 1.2rem;
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

        .page-footer {
          position: absolute;
          bottom: 7mm;
          left: 15mm;
          right: 15mm;
          padding-top: 0.3rem;
          border-top: 1px solid #e0e0e0;
        }

        .footer-signatures {
          display: flex;
          justify-content: space-between;
          font-size: 6.5pt;
          font-style: italic;
          color: #666;
        }

        .footer-left,
        .footer-right {
          font-style: italic;
        }

        .page-number {
          position: absolute;
          bottom: 7mm;
          right: 15mm;
          font-size: 7pt;
          font-weight: 600;
          color: #333;
          padding: 0.1rem 0.35rem;
          background: #f0f0f0;
          border-radius: 2px;
        }

        .organizer-section {
          background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
          padding: 0.4rem;
          margin: 0.4rem 0;
          border-radius: 3px;
          border-left: 3px solid #0066cc;
        }

        .organizer-section .section-title {
          border-bottom: none;
          margin: 0 0 0.25rem 0;
        }

        @media (max-width: 768px) {
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

          .logo {
            width: 70px;
          }

          .logo-small {
            width: 55px;
          }

          .info-row {
            grid-template-columns: 1fr;
          }

          .signature-row {
            grid-template-columns: 1fr;
            gap: 0.8rem;
          }

          .checkbox-group {
            flex-direction: column;
            gap: 0.6rem;
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

        .signed-confirmation {
          background: #d4edda;
          color: #155724;
          padding: 0.6rem 1.2rem;
          border-radius: 4px;
          font-size: 9pt;
          font-weight: 600;
          display: inline-block;
          text-align: left;
        }

        .signed-header {
          font-weight: 700;
          font-size: 9pt;
          color: #0066cc;
          margin-bottom: 0.3rem;
        }

        .signed-role {
          font-weight: 600;
          font-size: 10pt;
          color: #0052a3;
          margin: 0.3rem 0;
        }

        .signed-timestamp {
          font-weight: 400;
          font-size: 8pt;
          color: #666;
        }

        .info-text-below {
          font-size: 7pt;
          line-height: 1.2;
          margin: 0.25rem 0;
          text-align: justify;
          color: #444;
          background: #fafafa;
          padding: 0.25rem;
          border-radius: 2px;
        }

        /* Upoważnienia */
        .authorization-card {
          border: 1px solid #ddd;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          border-radius: 3px;
          background: #f9f9f9;
        }

        .auth-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.3rem;
        }

        .auth-title {
          font-size: 7.5pt;
          color: #555;
          font-weight: 600;
        }

        .remove-button {
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 4px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 14pt;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          padding: 0;
        }

        .remove-button:hover {
          background: #cc0000;
          transform: scale(1.1);
        }

        .field-row-inline {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.4rem;
        }

        .label-inline {
          font-size: 7.5pt;
          color: #555;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .input-inline-full {
          width: 100%;
          padding: 0.25rem 0.3rem;
          border: none;
          border-bottom: 1px solid #d0d0d0;
          font-size: 8pt;
          background: transparent;
          transition: border-color 0.2s;
          font-family: inherit;
        }

        .input-inline-full:focus {
          outline: none;
          border-bottom-color: #0066cc;
          background: #f8faff;
        }

        .field-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .field-inline {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .select-field {
          width: 100%;
          padding: 0.25rem 0.3rem;
          border: none;
          border-bottom: 1px solid #d0d0d0;
          font-size: 8pt;
          background: transparent;
          transition: border-color 0.2s;
          font-family: inherit;
        }

        .select-field:focus {
          outline: none;
          border-bottom-color: #0066cc;
          background: #f8faff;
        }

        .checkbox-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .section-label {
          font-size: 7.5pt;
          color: #555;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .simple-action {
          margin-top: 0.5rem;
        }

        .simple-action-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .simple-action-text {
          font-size: 7.5pt;
          color: #555;
          font-weight: 600;
        }

        .consent-box {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #fff5f5;
          border-radius: 3px;
          border-left: 3px solid #c00;
        }

        .consent-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .consent-text {
          font-size: 7.5pt;
          color: #555;
          font-weight: 600;
        }
      `}</style>
    </>
  );
}

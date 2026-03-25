'use client';

import { Printer } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';

import type { SignedQualificationPayload } from '@/lib/qualificationReservationMapping';
import { signedPayloadOverlayOnly, signedPayloadToFormState, getSecondParentFromPayload } from '@/lib/qualificationReservationMapping';
import { authService } from '@/lib/services/AuthService';
import { isValidPesel } from '@/lib/utils/pesel';
import { useToast } from '@/components/ToastContainer';

function HealthTagInput({
  tags,
  onTagsChange,
  placeholder,
}: {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState('');
  const addTag = useCallback(() => {
    const v = inputValue.trim();
    if (v && !tags.includes(v)) {
      onTagsChange([...tags, v]);
      setInputValue('');
    }
  }, [inputValue, tags, onTagsChange]);
  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };
  return (
    <div className="border border-gray-300 rounded-lg p-2 bg-white min-h-[42px]">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#03adf0]/15 text-sm"
            >
              {t}
              <button type="button" onClick={() => removeTag(i)} className="text-gray-600 hover:text-red-600" aria-label="Usuń">×</button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
        onBlur={addTag}
        placeholder={placeholder}
        className="input-line w-full border-0 p-0 focus:ring-0"
      />
    </div>
  );
}

/** Pomoc: zamiana tekstu z bazy (szczegóły) na tablicę tagów (po przecinku). */
function parseDetailToTags(detail: string | null | undefined): string[] {
  if (!detail || typeof detail !== 'string') return [];
  return detail.split(',').map((s) => s.trim()).filter(Boolean);
}

interface QualificationFormProps {
  /** Id rezerwacji (numeryczny) – do zapisu podpisu w signed_documents */
  reservationId?: number | null;
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
    healthInfo?: string;
    health_questions?: Record<string, string> | null;
    health_details?: Record<string, string> | null;
    additional_notes?: string | null;
    additionalInfo?: string;
    accommodationRequest?: string;
    parentCount?: number;
    childPesel?: string;
    secondParentName?: string;
    secondParentAddress?: string;
    secondParentPhone?: string;
  };
  /** Payload z signed_documents – overlay (szczepienia, upoważnienia, potwierdzenia). */
  signedPayload?: SignedQualificationPayload | null;
  /** Drugi opiekun wyciągnięty z payloadu na stronie (sekcjaI.drugiOpiekun) – gdy podany, ma pierwszeństwo. */
  secondParentFromPayload?: { name: string; address: string; phone: string } | null;
  /** Zapisany draft z qualification_card_data.form_snapshot – przywraca zaznaczenia po F5. */
  formSnapshotFromDb?: SignedQualificationPayload | Record<string, unknown> | null;
  printMode?: boolean;
  /** Po udanym „Zapisz zmiany” – np. do pokazania toastu z informacją o źródle danych */
  onSaveSuccess?: (message: string) => void;
  /** Status najnowszej karty z rodzica (po refetch po zapisie); gdy podany, ma pierwszeństwo nad wewnętrznym fetch. */
  latestCardStatusFromParent?: string | null;
  /** Data podpisania dokumentu (signed_at z signed_documents). */
  latestCardSignedAtFromParent?: string | null;
  /** Tryb widoku karty: robocza (draft) / zatwierdzona (podpisana SMS-em) */
  viewMode?: 'robocza' | 'zatwierdzona';
  /** Callback do przelaczenia trybu widoku */
  onViewModeChange?: (mode: 'robocza' | 'zatwierdzona') => void;
  /** Czy istnieje podpisana wersja (do disabled na przycisku) */
  hasVerifiedVersion?: boolean;
}

export function QualificationForm({ reservationId: reservationIdProp, reservationData, signedPayload, secondParentFromPayload, formSnapshotFromDb, printMode = false, onSaveSuccess, latestCardStatusFromParent, latestCardSignedAtFromParent, viewMode, onViewModeChange, hasVerifiedVersion }: QualificationFormProps) {
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureCode, setSignatureCode] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<number | null>(null);
  const [latestCardStatus, setLatestCardStatus] = useState<'in_verification' | 'accepted' | 'rejected' | null>(null);
  const effectiveLatestCardStatus = (latestCardStatusFromParent ?? latestCardStatus) as 'in_verification' | 'accepted' | 'rejected' | null;
  const [resendTimer, setResendTimer] = useState(60);
  const [showRegulationError, setShowRegulationError] = useState(false);
  const [showAuthorizationError, setShowAuthorizationError] = useState(false);
  const [childPeselError, setChildPeselError] = useState<string | null>(null);
  const [noPeselYearError, setNoPeselYearError] = useState<string | null>(null);
  const [noSecondParent, setNoSecondParent] = useState(false);
  const [secondParentName, setSecondParentName] = useState('');
  const [secondParentAddress, setSecondParentAddress] = useState('');
  const [secondParentPhone, setSecondParentPhone] = useState('');
  const [secondParentError, setSecondParentError] = useState<string | null>(null);
  const [childDOBError, setChildDOBError] = useState<string | null>(null);
  const [secondParentNameError, setSecondParentNameError] = useState(false);
  const [secondParentAddressError, setSecondParentAddressError] = useState(false);
  const [secondParentPhoneError, setSecondParentPhoneError] = useState(false);

  /** Sekcja II – stan zdrowia: 3 pytania z kroku 1 (tagi) + 4. pole dodatkowe */
  const [healthChronicTags, setHealthChronicTags] = useState<string[]>([]);
  const [healthDysfunctionsTags, setHealthDysfunctionsTags] = useState<string[]>([]);
  const [healthPsychiatricTags, setHealthPsychiatricTags] = useState<string[]>([]);
  const [healthAdditionalNotes, setHealthAdditionalNotes] = useState('');
  /** Który modal tagów zdrowia jest otwarty: null | 'chronic' | 'dysfunctions' | 'psychiatric' */
  const [healthTagModal, setHealthTagModal] = useState<null | 'chronic' | 'dysfunctions' | 'psychiatric'>(null);

  /** Refy z aktualnymi tagami zdrowia – używane przy budowaniu payloadu do podpisu (001_umowa: pełny zapis przy Podpisz dokument). */
  const healthChronicTagsRef = useRef<string[]>(healthChronicTags);
  const healthDysfunctionsTagsRef = useRef<string[]>(healthDysfunctionsTags);
  const healthPsychiatricTagsRef = useRef<string[]>(healthPsychiatricTags);
  const healthAdditionalNotesRef = useRef(healthAdditionalNotes);
  useEffect(() => {
    healthChronicTagsRef.current = healthChronicTags;
    healthDysfunctionsTagsRef.current = healthDysfunctionsTags;
    healthPsychiatricTagsRef.current = healthPsychiatricTags;
    healthAdditionalNotesRef.current = healthAdditionalNotes;
  }, [healthChronicTags, healthDysfunctionsTags, healthPsychiatricTags, healthAdditionalNotes]);

  /** Śledzenie zmian: snapshot stanu po załadowaniu danych → porównanie z bieżącym stanem. */
  const savedStateRef = useRef<string | null>(null);
  const dataReadyRef = useRef(false);

  /** Inicjalizacja sekcji zdrowia z rezerwacji (health_details, additional_notes) */
  useEffect(() => {
    if (!reservationData) return;
    const hd = reservationData.health_details;
    if (hd && typeof hd === 'object') {
      setHealthChronicTags(parseDetailToTags(hd.chronicDiseases));
      setHealthDysfunctionsTags(parseDetailToTags(hd.dysfunctions));
      setHealthPsychiatricTags(parseDetailToTags(hd.psychiatric));
    }
    setHealthAdditionalNotes((reservationData.additional_notes ?? '').trim());
  }, [reservationData?.health_details, reservationData?.additional_notes]);

  /** Synchronizacja z reservationData (tylko rezerwacja). Gdy jest signedPayload, drugiego opiekuna nie nadpisujemy – źródło = snapshot. */
  useEffect(() => {
    if (!reservationData) return;
    setFormData((prev) => ({
      ...prev,
      childPesel: reservationData.childPesel ?? prev.childPesel,
    }));
    if (signedPayload && !formSnapshotFromDb) return; // signedPayload bez draftu — nie nadpisuj opiekuna 2
    if (reservationData.secondParentName !== null && reservationData.secondParentName !== undefined) setSecondParentName(reservationData.secondParentName);
    if (reservationData.secondParentAddress !== null && reservationData.secondParentAddress !== undefined) setSecondParentAddress(reservationData.secondParentAddress);
    if (reservationData.secondParentPhone !== null && reservationData.secondParentPhone !== undefined) setSecondParentPhone(reservationData.secondParentPhone);
  }, [reservationData?.childPesel, reservationData?.secondParentName, reservationData?.secondParentAddress, reservationData?.secondParentPhone, signedPayload, formSnapshotFromDb]);

  // Kontrakt overlay klient: formSnapshotFromDb (draft po "Zapisz zmiany") > signedPayload > reservationData.
  // formSnapshot jest NOWSZY niż signedPayload (aktualizowany przy każdym "Zapisz"), dlatego ma priorytet.
  useEffect(() => {
    if (!formSnapshotFromDb && signedPayload) return; // brak draftu — overlay z signedPayload (useEffect nizej)
    const snapshot = formSnapshotFromDb as SignedQualificationPayload | undefined;
    const overlay = signedPayloadOverlayOnly(snapshot ?? undefined);
    if (!overlay) return;
    setAuthorizations(overlay.authorizations);
    const s2 = snapshot?.sekcjaII_stanZdrowia;
    if (s2) {
      const toTags = (v: unknown): string[] => Array.isArray(v) ? v.map((x) => String(x ?? '')) : typeof v === 'string' && v ? [v] : [];
      setHealthChronicTags(toTags(s2.chorobyPrzewlekle));
      setHealthDysfunctionsTags(toTags(s2.dysfunkcje));
      setHealthPsychiatricTags(toTags(s2.problemyPsychiatryczne));
      setHealthAdditionalNotes((s2.dodatkoweInformacje ?? '').trim());
    }
    if (overlay.secondParent) {
      setSecondParentName(overlay.secondParent.name);
      setSecondParentAddress(overlay.secondParent.address);
      setSecondParentPhone(overlay.secondParent.phone);
      setNoSecondParent(false);
    } else if (reservationData?.parentCount === 1) {
      setNoSecondParent(true);
    }
    setFormData((prev) => ({
      ...prev,
      // Sekcja I — nadpisuj z snapshotu jeśli obecne
      childName: overlay.childName ?? prev.childName,
      childDOB: overlay.childDOB ?? prev.childDOB,
      childAddress: overlay.childAddress ?? prev.childAddress,
      // parentNames/parentAddress/parentPhone NIE nadpisujemy — base z mapReservation ma poprawne dane,
      // a drugi opiekun jest obsługiwany przez osobny stan (secondParentName/Address/Phone).
      // Nadpisywanie powodowało duplikaty (snapshot ma tylko 1. opiekuna, a rendering dopisywał drugiego).
      turnName: overlay.turnName ?? prev.turnName,
      campLocation: overlay.campLocation ?? prev.campLocation,
      campDates: overlay.campDates ?? prev.campDates,
      // Pozostałe pola
      childPesel: overlay.childPesel !== undefined ? (overlay.childPesel ?? '') : prev.childPesel,
      noPesel: overlay.noPesel ?? prev.noPesel,
      noPeselYear: overlay.noPeselYear ?? prev.noPeselYear,
      vaccination: overlay.vaccination,
      vaccineInfo: overlay.vaccineInfo ?? prev.vaccineInfo,
      regulationConfirm: overlay.regulationConfirm,
      pickupInfo: overlay.pickupInfo,
      independentReturn: overlay.independentReturn,
      parentDeclaration: overlay.parentDeclaration,
      directorConfirmation: overlay.directorConfirmation,
      directorDate: overlay.directorDate,
      directorSignature: overlay.directorSignature,
      organizerSignature: overlay.organizerSignature,
    }));
  }, [formSnapshotFromDb, signedPayload, reservationData?.parentCount]);

  /** Gdy rodzic przekazał secondParentFromPayload (wyciągnięty ze snapshotu na stronie) – ustaw drugiego opiekuna z niego (pierwszeństwo). */
  useEffect(() => {
    if (secondParentFromPayload) {
      setSecondParentName(secondParentFromPayload.name);
      setSecondParentAddress(secondParentFromPayload.address);
      setSecondParentPhone(secondParentFromPayload.phone);
      setNoSecondParent(false);
    }
  }, [secondParentFromPayload]);

  /** Overlay z signed_documents.payload: PESEL, drugi opiekun, szczepienia, upoważnienia, tagi zdrowia.
   *  Pomijany gdy formSnapshotFromDb istnieje — draft (po "Zapisz zmiany") jest nowszy i ma priorytet. */
  useEffect(() => {
    if (formSnapshotFromDb) return; // Draft ma priorytet — overlay z formSnapshot juz ustawiony wyzej
    const overlay = signedPayloadOverlayOnly(signedPayload ?? undefined);
    if (!overlay) return;
    setAuthorizations(overlay.authorizations);
    const s2 = signedPayload?.sekcjaII_stanZdrowia;
    if (s2) {
      const toTags = (v: unknown): string[] => Array.isArray(v) ? v.map((x) => String(x ?? '')) : typeof v === 'string' && v ? [v] : [];
      setHealthChronicTags(toTags(s2.chorobyPrzewlekle));
      setHealthDysfunctionsTags(toTags(s2.dysfunkcje));
      setHealthPsychiatricTags(toTags(s2.problemyPsychiatryczne));
      setHealthAdditionalNotes((s2.dodatkoweInformacje ?? '').trim());
    }
    const s1 = signedPayload && typeof signedPayload === 'object' ? (signedPayload as Record<string, unknown>).sekcjaI : undefined;
    const drugi = s1 && typeof s1 === 'object' ? (s1 as Record<string, unknown>).drugiOpiekun : undefined;
    const secondParent =
      secondParentFromPayload ??
      overlay.secondParent ??
      getSecondParentFromPayload(signedPayload ?? undefined) ??
      (drugi && typeof drugi === 'object'
        ? (() => {
            const d = drugi as Record<string, unknown>;
            const name = String(d.imieNazwisko ?? d.imionaNazwiska ?? '').trim();
            const address = String(d.adres ?? '').trim();
            const phone = String(d.telefon ?? '').trim();
            return name || address || phone ? { name, address, phone } : null;
          })()
        : null);
    if (secondParent) {
      setSecondParentName(secondParent.name);
      setSecondParentAddress(secondParent.address);
      setSecondParentPhone(secondParent.phone);
      setNoSecondParent(false);
    } else if (reservationData?.parentCount === 1) {
      setNoSecondParent(true);
    }
    setFormData((prev) => ({
      ...prev,
      // Sekcja I — nadpisuj z payloadu jeśli obecne
      childName: overlay.childName ?? prev.childName,
      childDOB: overlay.childDOB ?? prev.childDOB,
      childAddress: overlay.childAddress ?? prev.childAddress,
      // parentNames/parentAddress/parentPhone — jak wyżej, nie nadpisujemy z overlay
      turnName: overlay.turnName ?? prev.turnName,
      campLocation: overlay.campLocation ?? prev.campLocation,
      campDates: overlay.campDates ?? prev.campDates,
      // Pozostałe pola
      childPesel: overlay.childPesel !== undefined ? (overlay.childPesel ?? '') : prev.childPesel,
      noPesel: overlay.noPesel ?? prev.noPesel,
      noPeselYear: overlay.noPeselYear ?? prev.noPeselYear,
      vaccination: overlay.vaccination,
      vaccineInfo: overlay.vaccineInfo ?? prev.vaccineInfo,
      regulationConfirm: overlay.regulationConfirm,
      pickupInfo: overlay.pickupInfo,
      independentReturn: overlay.independentReturn,
      parentDeclaration: overlay.parentDeclaration,
      directorConfirmation: overlay.directorConfirmation,
      directorDate: overlay.directorDate,
      directorSignature: overlay.directorSignature,
      organizerSignature: overlay.organizerSignature,
    }));
  }, [signedPayload, reservationData?.parentCount]);

  /** Pola edytowalne — wylaczone w printMode i w trybie zatwierdzonej wersji (readonly). */
  const isEditable = !printMode && viewMode !== 'zatwierdzona';

  // Pobierz status najnowszego podpisanego dokumentu (karta) – czy można podpisać ponownie (tylko gdy odrzucona)
  useEffect(() => {
    if (printMode || reservationIdProp === null || reservationIdProp === undefined) return;
    const token = authService.getToken();
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/api/signed-documents/reservation/${reservationIdProp}?document_type=qualification_card`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((docs: Array<{ status: string; sms_verified_at?: string | null }>) => {
        const latest = docs[0];
        if (latest && (latest.status === 'accepted' || latest.status === 'rejected')) {
          setLatestCardStatus(latest.status as 'accepted' | 'rejected');
        } else if (latest && latest.status === 'in_verification' && latest.sms_verified_at) {
          // Tylko gdy SMS faktycznie zweryfikowany — bez sms_verified_at karta NIE jest podpisana
          setLatestCardStatus('in_verification');
        } else {
          setLatestCardStatus(null);
        }
      })
      .catch(() => setLatestCardStatus(null));
  }, [reservationIdProp, printMode]);

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
      canTemporaryPickup: false,
    },
  ]);

  // Aktualna data i godzina
  const getCurrentDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString('pl-PL');
    const time = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  };

  const [formData, setFormData] = useState({
    // Dane z profilu rezerwacji (żółte pola – wczytywane z API, edytowalne przez klienta)
    turnName: reservationData?.turnName ?? '',
    campLocation: reservationData?.campLocation ?? '',
    campDates: reservationData?.campDates ?? '',
    childName: reservationData?.childName ?? '',
    childDOB: reservationData?.childDOB ?? '',
    childPesel: reservationData?.childPesel ?? '',
    childAddress: reservationData?.childAddress ?? '',
    parentNames: reservationData?.parentNames ?? '',
    parentAddress: reservationData?.parentAddress ?? '',
    parentPhone: reservationData?.parentPhone ?? '',

    // Sekcja II - Informacja o stanie zdrowia (z profilu: health_questions, health_details, additional_notes)
    healthInfo: reservationData?.healthInfo ?? '',

    // "Dziecko nie posiada numeru PESEL" + rok – odseparowane od sekcji Szczepienia (odra)
    noPesel: false,
    noPeselYear: '',

    // Informacja o szczepieniach (Odra = vaccination.measles/measlesYear – nie mylić z noPesel)
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
      otherDetails: '',
    },

    // Sekcja IV - Wniosek o zakwaterowanie (z profilu: accommodation_request)
    vaccineInfo: reservationData?.accommodationRequest ?? '',

    // Sekcja III - Deklaracja
    parentDeclaration: '',

    // Sekcja IV - Potwierdzenie zapoznania
    regulationConfirm: false,

    // Sekcja VI - Zgoda na samodzielny powrót
    independentReturn: false,

    // Sekcja III - Informacje dodatkowe (z profilu: participant_additional_info)
    additionalInfo: reservationData?.additionalInfo ?? '',

    // Sekcja V - Odbiór dziecka
    pickupInfo: '',

    // Sekcja VI - Potwierdzenie przez kierownika
    directorConfirmation: '',
    directorDate: '',

    // Podpisy
    parentSignature: '',
    parentSignatureDate: '',
    directorSignature: '',
    organizerSignature: '',
  });

  // Wartosci z podpisanego SMS-em snapshotu — do podswietlania zmian na zolto w wersji roboczej
  const signedS1 = signedPayload && viewMode === 'robocza' ? (signedPayload as Record<string, unknown>).sekcjaI as Record<string, unknown> | undefined : undefined;
  const signedChildAddress = signedS1 ? ((signedS1.uczestnik as Record<string, unknown>)?.adres as string || '').trim() : undefined;
  const signedParentNames = signedS1 ? ((signedS1.opiekunowie as Record<string, unknown>)?.imionaNazwiska as string || '').trim() : undefined;
  const signedParentAddress = signedS1 ? ((signedS1.opiekunowie as Record<string, unknown>)?.adres as string || '').trim() : undefined;
  const signedParentPhone = signedS1 ? ((signedS1.opiekunowie as Record<string, unknown>)?.telefon as string || '').trim() : undefined;
  const diffChildAddress = signedChildAddress !== undefined && formData.childAddress !== signedChildAddress;
  const diffParentNames = signedParentNames !== undefined && formData.parentNames !== signedParentNames;
  const diffParentAddress = signedParentAddress !== undefined && formData.parentAddress !== signedParentAddress;
  const diffParentPhone = signedParentPhone !== undefined && formData.parentPhone !== signedParentPhone;

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
          diphtheria: true,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vaccination: { ...prev.vaccination, [field]: value },
      }));
    }
  };

  /** Buduje snapshot edytowalnych pól – do porównania „czy użytkownik coś zmienił". */
  const buildStateSnapshot = useCallback(() => JSON.stringify({
    healthChronicTags, healthDysfunctionsTags, healthPsychiatricTags, healthAdditionalNotes,
    childDOB: formData.childDOB, childPesel: formData.childPesel, noPesel: formData.noPesel,
    noPeselYear: formData.noPeselYear, vaccination: formData.vaccination, vaccineInfo: formData.vaccineInfo,
    additionalInfo: formData.additionalInfo, regulationConfirm: formData.regulationConfirm,
    pickupInfo: formData.pickupInfo, independentReturn: formData.independentReturn,
    secondParentName, secondParentAddress, secondParentPhone, noSecondParent, authorizations,
  }), [healthChronicTags, healthDysfunctionsTags, healthPsychiatricTags, healthAdditionalNotes,
    formData.childDOB, formData.childPesel, formData.noPesel, formData.noPeselYear,
    formData.vaccination, formData.vaccineInfo, formData.additionalInfo,
    formData.regulationConfirm, formData.pickupInfo, formData.independentReturn,
    secondParentName, secondParentAddress, secondParentPhone, noSecondParent, authorizations]);

  /** Przechwycenie stanu po załadowaniu danych — debounce 800ms po ostatniej zmianie. */
  useEffect(() => {
    if (dataReadyRef.current) return; // już przechwycono
    const timer = setTimeout(() => {
      dataReadyRef.current = true;
      savedStateRef.current = buildStateSnapshot();
    }, 800);
    return () => clearTimeout(timer);
  }, [buildStateSnapshot]);

  const cardIsSigned = isSigned || effectiveLatestCardStatus === 'in_verification' || effectiveLatestCardStatus === 'accepted';
  const currentSnapshot = buildStateSnapshot();
  const hasUnsavedChanges = dataReadyRef.current && cardIsSigned && savedStateRef.current !== null && currentSnapshot !== savedStateRef.current;

  /** Anuluj zmiany — przywróć stan z bazy. */
  const handleCancelChanges = useCallback(() => {
    if (!savedStateRef.current) return;
    try {
      const s = JSON.parse(savedStateRef.current) as Record<string, unknown>;
      setHealthChronicTags(s.healthChronicTags as string[]);
      setHealthDysfunctionsTags(s.healthDysfunctionsTags as string[]);
      setHealthPsychiatricTags(s.healthPsychiatricTags as string[]);
      setHealthAdditionalNotes(s.healthAdditionalNotes as string);
      setSecondParentName(s.secondParentName as string);
      setSecondParentAddress(s.secondParentAddress as string);
      setSecondParentPhone(s.secondParentPhone as string);
      setNoSecondParent(s.noSecondParent as boolean);
      setAuthorizations(s.authorizations as typeof authorizations);
      setFormData((prev) => ({
        ...prev,
        childDOB: s.childDOB as string,
        childPesel: s.childPesel as string,
        noPesel: s.noPesel as boolean,
        noPeselYear: s.noPeselYear as string,
        vaccination: s.vaccination as typeof prev.vaccination,
        vaccineInfo: s.vaccineInfo as string,
        additionalInfo: s.additionalInfo as string,
        regulationConfirm: s.regulationConfirm as boolean,
        pickupInfo: s.pickupInfo as string,
        independentReturn: s.independentReturn as boolean,
      }));
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        canTemporaryPickup: false,
      },
    ]);
  };

  const removeAuthorization = (index: number) => {
    if (authorizations.length > 1) {
      const updated = authorizations.filter((_, i) => i !== index);
      setAuthorizations(updated);
    }
  };

  /** Walidacja pól obowiązkowych (ta sama co przy podpisywaniu). Zwraca true, gdy formularz jest poprawny.
   * Zbiera wszystkie błędy naraz i ustawia state, żeby użytkownik widział czerwone ramki przy wszystkich błędnych polach (w tym drugi opiekun). */
  const runValidation = (): boolean => {
    setChildPeselError(null);
    setNoPeselYearError(null);
    setSecondParentError(null);
    setChildDOBError(null);
    setSecondParentNameError(false);
    setSecondParentAddressError(false);
    setSecondParentPhoneError(false);
    setShowRegulationError(false);
    setShowAuthorizationError(false);

    let hasAnyError = false;
    let firstErrorSection: Element | null = null;

    if (!formData.regulationConfirm) {
      setShowRegulationError(true);
      hasAnyError = true;
      const el = document.querySelector('.checkbox-single');
      if (el && !firstErrorSection) firstErrorSection = el;
    }

    const dobRaw = (formData.childDOB || '').trim();
    const hasDOB = /^\d{4}(-\d{2}-\d{2})?$/.test(dobRaw) || /^\d{4}$/.test(dobRaw);
    if (!hasDOB) {
      setChildDOBError('To pole jest obowiązkowe');
      hasAnyError = true;
      if (!firstErrorSection) firstErrorSection = document.getElementById('child-dob-field');
    }

    if (!formData.noPesel) {
      const peselTrim = formData.childPesel.trim();
      if (!peselTrim || !isValidPesel(peselTrim)) {
        setChildPeselError('To pole jest obowiązkowe');
        hasAnyError = true;
        if (!firstErrorSection) firstErrorSection = document.querySelector('[data-pesel-field]');
      }
    } else {
      if (!formData.vaccination.calendar) {
        const yearTrim = (formData.noPeselYear || '').trim();
        if (!yearTrim) {
          setNoPeselYearError('To pole jest obowiązkowe');
          hasAnyError = true;
          if (!firstErrorSection) firstErrorSection = document.getElementById('child-no-pesel-section');
        }
      }
    }

    const parentCount = reservationData?.parentCount ?? 0;
    if (parentCount === 1 && !noSecondParent) {
      const nameTrim = secondParentName.trim();
      const addressTrim = secondParentAddress.trim();
      const phoneTrim = secondParentPhone.trim();
      if (!nameTrim || !addressTrim || !phoneTrim) {
        setSecondParentNameError(!nameTrim);
        setSecondParentAddressError(!addressTrim);
        setSecondParentPhoneError(!phoneTrim);
        hasAnyError = true;
        if (!firstErrorSection) firstErrorSection = document.getElementById('no-second-parent-section');
      }
    }

    const hasInvalidAuthorization = authorizations.some(auth => {
      const hasStartedFilling =
        auth.fullName.trim().length > 0 ||
        auth.documentNumber.trim().length > 0 ||
        auth.canPickup ||
        auth.canTemporaryPickup;
      if (hasStartedFilling) {
        if (!auth.fullName.trim()) return true;
        if (!auth.documentNumber.trim()) return true;
        if (!auth.canPickup && !auth.canTemporaryPickup) return true;
      }
      return false;
    });
    if (hasInvalidAuthorization) {
      setShowAuthorizationError(true);
      hasAnyError = true;
      if (!firstErrorSection) firstErrorSection = document.querySelector('.authorization-card');
    }

    if (firstErrorSection) {
      firstErrorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return !hasAnyError;
  };

  const handlePrint = () => {
    if (printMode) {
      window.print();
    } else {
      if (!runValidation()) return;
      const reservationId = reservationData?.reservationId || '';
      window.open(`/druk/karta-kwalifikacyjna/${reservationId}`, '_blank');
    }
  };

  const getQualificationPayload = () => {
    const fd = formData;
    return {
      signedAt: new Date().toISOString(),
      numerRezerwacji: reservationData?.reservationId ?? '',
      sekcjaI: {
        nazwaTurnusu: fd.turnName,
        miejsceKoloniiObozu: fd.campLocation,
        termin: fd.campDates,
        uczestnik: {
          imieNazwisko: fd.childName,
          dataUrodzenia: (fd.childDOB?.trim() && !/^dd\.mm\.yyyy$/i.test(fd.childDOB.trim())) ? fd.childDOB.trim() : '',
          pesel: fd.childPesel,
          adres: fd.childAddress,
          brakPesel: fd.noPesel,
          rokUrodzeniaGdyBrakPesel: fd.noPeselYear || undefined,
        },
        opiekunowie: {
          // Dolacz dane drugiego opiekuna do opiekunowie (pelna lista) niezaleznie od parentCount
          imionaNazwiska: secondParentName.trim() && !fd.parentNames.includes(secondParentName.trim())
            ? `${fd.parentNames}, ${secondParentName.trim()}` : fd.parentNames,
          adres: secondParentAddress.trim() && !fd.parentAddress.includes(secondParentAddress.trim())
            ? `${fd.parentAddress}; ${secondParentAddress.trim()}` : fd.parentAddress,
          telefon: secondParentPhone.trim() && !fd.parentPhone.includes(secondParentPhone.trim())
            ? `${fd.parentPhone}, ${secondParentPhone.trim()}` : fd.parentPhone,
        },
        drugiOpiekun: (!noSecondParent && secondParentName.trim())
          ? { imieNazwisko: secondParentName, adres: secondParentAddress, telefon: secondParentPhone }
          : null,
      },
      sekcjaII_stanZdrowia: {
        chorobyPrzewlekle: healthChronicTags,
        dysfunkcje: healthDysfunctionsTags,
        problemyPsychiatryczne: healthPsychiatricTags,
        dodatkoweInformacje: healthAdditionalNotes,
        tekstZbiorczy: [
          healthChronicTags.length ? `Choroby przewlekłe: ${healthChronicTags.join(', ')}` : '',
          healthDysfunctionsTags.length ? `Dysfunkcje: ${healthDysfunctionsTags.join(', ')}` : '',
          healthPsychiatricTags.length ? `Problemy psychiatryczne/psychologiczne: ${healthPsychiatricTags.join(', ')}` : '',
          healthAdditionalNotes.trim() || '',
          (fd.healthInfo || '').trim(),
        ].filter(Boolean).join('; ') || fd.healthInfo || '',
      },
      sekcjaII_szczepienia: {
        zgodnieZKalendarzem: fd.vaccination.calendar,
        tezec: fd.vaccination.tetanus,
        tezecRok: fd.vaccination.tetanusYear,
        odra: fd.vaccination.measles,
        odraRok: fd.vaccination.measlesYear,
        blonica: fd.vaccination.diphtheria,
        blonicaRok: fd.vaccination.diphtheriaYear,
        inne: fd.vaccination.other,
        inneRok: fd.vaccination.otherYear,
        inneSzczegoly: fd.vaccination.otherDetails,
      },
      sekcjaIII: { informacjeDodatkowe: fd.additionalInfo, deklaracjaOpiekuna: fd.parentDeclaration },
      sekcjaIV: {
        wniosekOZakwaterowanie: fd.vaccineInfo,
        potwierdzenieRegulaminu: fd.regulationConfirm,
        odbiorDziecka: fd.pickupInfo,
        zgodaNaSamodzielnyPowrot: fd.independentReturn,
      },
      upowaznienia: authorizations.map(a => ({
        imieNazwisko: a.fullName,
        typDokumentu: a.documentType,
        numerDokumentu: a.documentNumber,
        odbiorStaly: a.canPickup,
        odbiorTymczasowy: a.canTemporaryPickup,
      })),
      potwierdzenieKierownika: fd.directorConfirmation,
      dataKierownika: fd.directorDate,
      podpisKierownika: fd.directorSignature,
      podpisOrganizatora: fd.organizerSignature,
    };
  };

  const handleSignDocument = async () => {
    if (!runValidation() || reservationIdProp === null || reservationIdProp === undefined) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const token = authService.getToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/signed-documents/request-sms-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation_id: reservationIdProp,
          document_type: 'qualification_card',
          payload: getQualificationPayload(),
        }),
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
    if (resendTimer > 0 || reservationIdProp === null || reservationIdProp === undefined) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const token = authService.getToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/signed-documents/request-sms-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationIdProp, document_type: 'qualification_card' }),
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
    if (signatureCode.length !== 4 || currentDocumentId === null || currentDocumentId === undefined) return;
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
      savedStateRef.current = buildStateSnapshot();
      // Natychmiast zmień status UI + powiadom page.tsx o konieczności refetchu danych
      setLatestCardStatus('in_verification');
      onSaveSuccess?.('podpisano');
      showToastSuccess('Karta kwalifikacyjna podpisana');
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

  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const { showSuccess: showToastSuccess, showError: showToastError } = useToast();

  const performSave = async () => {
    const reservationId = reservationData?.reservationId;
    if (!reservationId || !reservationId.startsWith('REZ-')) {
      showToastError('Brak numeru rezerwacji');
      setSaveStatus('error');
      return;
    }
    const token = authService.getToken();
    if (!token) {
      showToastError('Zaloguj się ponownie');
      setSaveStatus('error');
      return;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    setSaveStatus('loading');
    try {
      const health_questions = {
        chronicDiseases: healthChronicTags.length ? 'Tak' : 'Nie',
        dysfunctions: healthDysfunctionsTags.length ? 'Tak' : 'Nie',
        psychiatric: healthPsychiatricTags.length ? 'Tak' : 'Nie',
      };
      const health_details = {
        chronicDiseases: healthChronicTags.join(', '),
        dysfunctions: healthDysfunctionsTags.join(', '),
        psychiatric: healthPsychiatricTags.join(', '),
      };
      const resRes = await fetch(`${apiUrl}/api/reservations/by-number/${reservationId}/partial`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          health_questions,
          health_details,
          additional_notes: healthAdditionalNotes.trim() || null,
          accommodation_request: formData.vaccineInfo?.trim() || null,
          participant_additional_info: formData.additionalInfo?.trim() || null,
        }),
      });
      if (!resRes.ok) {
        const err = await resRes.json().catch(() => ({}));
        throw new Error(err.detail || 'Błąd zapisu rezerwacji');
      }
      const parts = secondParentName.trim().split(/\s+/);
      const parent2_first_name = parts[0] ?? '';
      const parent2_last_name = parts.slice(1).join(' ') ?? '';
      const cardBody: Record<string, unknown> = {
        form_snapshot: getQualificationPayload(),
      };
      const dobStr = (formData.childDOB || '').trim();
      const dobMatch = dobStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (dobMatch) {
        cardBody.participant_birth_date = `${dobMatch[3]}-${dobMatch[2].padStart(2, '0')}-${dobMatch[1].padStart(2, '0')}`;
      }
      if (formData.childPesel) cardBody.participant_pesel = formData.childPesel;
      if (secondParentName.trim()) {
        cardBody.parent2_first_name = parent2_first_name;
        cardBody.parent2_last_name = parent2_last_name;
      }
      if (secondParentAddress.trim()) cardBody.parent2_street = secondParentAddress.trim();
      if (secondParentPhone.trim()) cardBody.parent2_phone = secondParentPhone.trim();

      const resCard = await fetch(`${apiUrl}/api/qualification-cards/by-number/${reservationId}/data/partial`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardBody),
      });
      if (!resCard.ok) {
        const err = await resCard.json().catch(() => ({}));
        throw new Error(err.detail || 'Błąd zapisu danych karty');
      }
      setSaveStatus('ok');
      savedStateRef.current = buildStateSnapshot();
      showToastSuccess('Zmiany zostały zapisane');
      onSaveSuccess?.('Zapisano');
    } catch (e) {
      setSaveStatus('error');
      showToastError(e instanceof Error ? e.message : 'Błąd zapisu');
    }
  };

  const handleSaveChanges = () => {
    void performSave();
  };

  return (
    <>
      {/* Pasek akcji — sticky na dole ekranu (desktop), ukryty przy druku */}
      <div className="no-print fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] hidden md:block">
        <div className="max-w-[210mm] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!printMode && (
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saveStatus === 'loading'}
                className="flex items-center gap-2 bg-gray-600 text-white px-5 py-2.5 rounded-lg hover:bg-gray-700 transition text-sm font-medium disabled:opacity-50"
              >
                {saveStatus === 'loading' ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-[#03adf0] text-white px-5 py-2.5 rounded-lg hover:bg-[#0299d6] transition text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              Drukuj
            </button>
            {/* Przelaczanie wersji */}
            {onViewModeChange && (
              <div className="flex items-center gap-1 ml-3 border-l border-gray-300 pl-3">
                <button
                  type="button"
                  onClick={() => onViewModeChange('robocza')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'robocza' ? 'bg-orange-100 text-orange-800 border border-orange-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Wersja robocza
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange('zatwierdzona')}
                  disabled={!hasVerifiedVersion}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'zatwierdzona' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Wersja zatwierdzona
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Mobilny pasek — na górze */}
      {!printMode && (
        <div className="no-print max-w-[210mm] mx-auto px-4 pt-4 flex flex-wrap items-center gap-2 md:hidden">
          {viewMode !== 'zatwierdzona' && (
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saveStatus === 'loading'}
              className="flex items-center gap-2 bg-gray-600 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
            >
              {saveStatus === 'loading' ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#03adf0] text-white px-3 py-1.5 rounded text-xs font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            Drukuj
          </button>
          {onViewModeChange && (
            <>
              <button
                type="button"
                onClick={() => onViewModeChange('robocza')}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition ${viewMode === 'robocza' ? 'bg-orange-100 text-orange-800 border border-orange-300' : 'bg-gray-100 text-gray-500'}`}
              >
                Robocza
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('zatwierdzona')}
                disabled={!hasVerifiedVersion}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition ${viewMode === 'zatwierdzona' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-gray-100 text-gray-500'} disabled:opacity-40`}
              >
                Zatwierdzona
              </button>
            </>
          )}
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

            <div id="child-dob-field" className="field-group">
              <label>2) Data urodzenia uczestnika/dziecka</label>
              {(() => {
                const dobRaw = formData.childDOB || '';
                const yearMatch = dobRaw.match(/^(\d{4})/);
                const birthYear = yearMatch ? parseInt(yearMatch[1], 10) : null;
                const minYear = birthYear !== null && birthYear !== undefined && !isNaN(birthYear) ? birthYear - 1 : null;
                const maxYear = birthYear !== null && birthYear !== undefined && !isNaN(birthYear) ? birthYear : null;
                // Sam rocznik (np. "2012") traktujemy jako niewypelnione — dopiero pelna data YYYY-MM-DD jest wartoscia
                const dobValue =
                  /^\d{4}-\d{2}-\d{2}$/.test(dobRaw) ? dobRaw
                  : '';
                const minDate = minYear !== null && minYear !== undefined ? `${minYear}-01-01` : undefined;
                const maxDate = maxYear !== null && maxYear !== undefined ? `${maxYear}-12-31` : undefined;
                return (
                  <>
                    <input
                      type="date"
                      value={dobValue}
                      onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                      onChange={(e) => {
                        handleChange('childDOB', e.target.value);
                        setChildDOBError(null);
                      }}
                      min={minDate}
                      max={maxDate}
                      readOnly={printMode || viewMode === 'zatwierdzona'}
                      className={`input-line ${isEditable ? 'editable-field' : ''} ${childDOBError ? 'border-red-500' : ''} ${!dobValue ? 'text-gray-400' : ''}`}
                      aria-invalid={!!childDOBError}
                    />
                    {childDOBError && (
                      <p className="text-red-600 text-sm mt-1 font-semibold" role="alert">{childDOBError}</p>
                    )}
                  </>
                );
              })()}
            </div>

            <div className={`field-group ${childPeselError ? 'border-2 border-red-500 rounded p-2 bg-red-50' : ''}`} data-pesel-field>
              <label>3) PESEL uczestnika/dziecka</label>
              <div className={formData.noPesel ? 'pesel-input-crossed' : ''}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  value={formData.noPesel ? 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' : formData.childPesel}
                  readOnly={printMode || formData.noPesel}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '');
                    handleChange('childPesel', v);
                    if (childPeselError) setChildPeselError(null);
                  }}
                  onBlur={() => {
                    const v = formData.childPesel.trim();
                    if (v.length === 0) {
                      setChildPeselError(null);
                      return;
                    }
                    setChildPeselError(isValidPesel(v) ? null : 'Nieprawidłowy numer PESEL');
                  }}
                  className={`input-line ${isEditable ? 'editable-field' : ''} ${childPeselError ? 'border-red-500' : ''}`}
                  placeholder="12312312322"
                  aria-invalid={!!childPeselError}
                  aria-describedby={childPeselError ? 'childPesel-error' : undefined}
                />
              </div>
              {childPeselError && (
                <p id="childPesel-error" className="text-red-600 text-sm mt-1 font-semibold" role="alert">
                  {childPeselError}
                </p>
              )}
            </div>

            <div id="child-no-pesel-section">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.noPesel}
                  onChange={(e) => {
                    handleChange('noPesel', e.target.checked);
                    setNoPeselYearError(null);
                  }}
                  disabled={printMode || viewMode === 'zatwierdzona'}
                />
                Dziecko nie posiada numeru PESEL
                {formData.noPesel && !formData.vaccination.calendar && (
                  <input
                    type="text"
                    value={formData.noPeselYear}
                    onChange={(e) => {
                      handleChange('noPeselYear', e.target.value);
                      if (noPeselYearError) setNoPeselYearError(null);
                    }}
                    readOnly={printMode || viewMode === 'zatwierdzona'}
                    className={`input-inline ${isEditable ? 'editable-field' : ''} ${noPeselYearError ? 'border-red-500' : ''}`}
                    placeholder="rok"
                    aria-invalid={!!noPeselYearError}
                  />
                )}
              </label>
              {noPeselYearError && (
                <p className="text-red-600 text-sm mt-1 font-semibold" role="alert">
                  {noPeselYearError}
                </p>
              )}
            </div>

            <div className="field-group">
              <label>4) Adres zamieszkania uczestnika/dziecka</label>
              <input
                type="text"
                value={formData.childAddress}
                onChange={(e) => handleChange('childAddress', e.target.value)}
                readOnly={printMode || viewMode === 'zatwierdzona'}
                className={`input-line ${isEditable ? 'editable-field' : ''}`}
              />
            </div>

            <div id="parents-section" className="space-y-2">
              <div className="field-group">
                <label>5) Imiona i nazwiska rodziców/opiekunów prawnych</label>
                {(reservationData?.parentCount ?? 0) >= 2 ? (
                  <div className="flex items-center gap-2">
                    <div className="readonly-field flex-1 min-w-0">{(reservationData?.parentNames || '').split(',')[0]?.trim()}</div>
                    <input
                      type="text"
                      value={secondParentName}
                      onChange={(e) => setSecondParentName(e.target.value)}
                      readOnly={printMode || viewMode === 'zatwierdzona'}
                      placeholder="Imię i nazwisko drugiego opiekuna"
                      className={`input-line flex-1 min-w-[200px] ${isEditable ? 'editable-field' : ''}`}
                    />
                  </div>
                ) : (reservationData?.parentCount ?? 0) === 1 ? (
                  <>
                    <div className="flex items-start gap-2 flex-wrap">
                      <div className="readonly-field flex-1 min-w-0">
                        {formData.parentNames}
                        {noSecondParent ? ', Brak drugiego rodzica/opiekuna prawnego' : secondParentName.trim() ? `, ${secondParentName.trim()}` : ''}
                      </div>
                      {!noSecondParent && (
                        <>
                          <input
                            type="text"
                            value={secondParentName}
                            onChange={(e) => {
                              setSecondParentName(e.target.value);
                              setSecondParentNameError(false);
                            }}
                            placeholder="Imię i nazwisko drugiego opiekuna"
                            readOnly={printMode || viewMode === 'zatwierdzona'}
                            className={`input-line flex-1 min-w-[200px] ${isEditable ? 'editable-field' : ''} ${secondParentNameError ? 'border-red-500' : ''}`}
                            aria-invalid={secondParentNameError}
                          />
                          {secondParentNameError && (
                            <p className="text-red-600 text-sm mt-1 w-full font-semibold" role="alert">To pole jest obowiązkowe</p>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="readonly-field">{formData.parentNames}</div>
                )}
              </div>

              {(reservationData?.parentCount ?? 0) === 1 && (
                <div id="no-second-parent-section">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={noSecondParent}
                      onChange={(e) => {
                        setNoSecondParent(e.target.checked);
                        setSecondParentNameError(false);
                        setSecondParentAddressError(false);
                        setSecondParentPhoneError(false);
                      }}
                      disabled={printMode || viewMode === 'zatwierdzona'}
                    />
                    Brak drugiego rodzica/opiekuna prawnego
                  </label>
                </div>
              )}

              <div className="field-group">
                <label>6) Adresy zamieszkania rodziców/opiekunów prawnych</label>
                {(reservationData?.parentCount ?? 0) >= 2 ? (
                  <div className="flex items-center gap-2">
                    <div className="readonly-field flex-1 min-w-0">{(reservationData?.parentAddress || '').split(';')[0]?.trim()}</div>
                    <input
                      type="text"
                      value={secondParentAddress}
                      onChange={(e) => setSecondParentAddress(e.target.value)}
                      readOnly={printMode || viewMode === 'zatwierdzona'}
                      placeholder="Adres drugiego opiekuna"
                      className={`input-line flex-1 min-w-[200px] ${isEditable ? 'editable-field' : ''}`}
                    />
                  </div>
                ) : (reservationData?.parentCount ?? 0) === 1 ? (
                  <>
                    <div className="flex items-start gap-2 flex-wrap">
                      <div className="readonly-field flex-1 min-w-0">
                        {formData.parentAddress}
                        {noSecondParent ? ', Brak drugiego rodzica/opiekuna prawnego' : secondParentAddress.trim() ? `, ${secondParentAddress.trim()}` : ''}
                      </div>
                      {!noSecondParent && (
                        <>
                          <input
                            type="text"
                            value={secondParentAddress}
                            onChange={(e) => {
                              setSecondParentAddress(e.target.value);
                              setSecondParentAddressError(false);
                            }}
                            placeholder="Adres drugiego opiekuna"
                            readOnly={printMode || viewMode === 'zatwierdzona'}
                            className={`input-line flex-1 min-w-[200px] ${isEditable ? 'editable-field' : ''} ${secondParentAddressError ? 'border-red-500' : ''}`}
                            aria-invalid={secondParentAddressError}
                          />
                          {secondParentAddressError && (
                            <p className="text-red-600 text-sm mt-1 w-full font-semibold" role="alert">To pole jest obowiązkowe</p>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="readonly-field">{formData.parentAddress}</div>
                )}
              </div>

              <div className="field-group">
                <label>7) Telefony do rodziców/ opiekunów prawnych</label>
                {(reservationData?.parentCount ?? 0) >= 2 ? (
                  <div className="flex items-center gap-2">
                    <div className="readonly-field flex-1 min-w-0">{(reservationData?.parentPhone || '').split(',')[0]?.trim()}</div>
                    <input
                      type="text"
                      value={secondParentPhone}
                      onChange={(e) => setSecondParentPhone(e.target.value)}
                      readOnly={printMode || viewMode === 'zatwierdzona'}
                      placeholder="Telefon drugiego opiekuna"
                      className={`input-line flex-1 min-w-[200px] ${isEditable ? 'editable-field' : ''}`}
                    />
                  </div>
                ) : (reservationData?.parentCount ?? 0) === 1 ? (
                  <>
                    <div className="flex items-start gap-2 flex-wrap">
                      <div className="readonly-field flex-1 min-w-0">
                        {formData.parentPhone}
                        {noSecondParent ? ', Brak drugiego rodzica/opiekuna prawnego' : secondParentPhone.trim() ? `, ${secondParentPhone.trim()}` : ''}
                      </div>
                      {!noSecondParent && (
                        <>
                          <input
                            type="text"
                            value={secondParentPhone}
                            onChange={(e) => {
                              setSecondParentPhone(e.target.value);
                              setSecondParentPhoneError(false);
                            }}
                            placeholder="Telefon drugiego opiekuna"
                            readOnly={printMode || viewMode === 'zatwierdzona'}
                            className={`input-line flex-1 min-w-[160px] ${isEditable ? 'editable-field' : ''} ${secondParentPhoneError ? 'border-red-500' : ''}`}
                            aria-invalid={secondParentPhoneError}
                          />
                          {secondParentPhoneError && (
                            <p className="text-red-600 text-sm mt-1 w-full font-semibold" role="alert">To pole jest obowiązkowe</p>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="readonly-field">{formData.parentPhone}</div>
                )}
              </div>
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
            <div className="space-y-3">
              <div className="field-group">
                <label>1) Choroby przewlekłe</label>
                {isEditable && !printMode ? (
                  <div className="health-tag-field">
                    <div className="readonly-field">{healthChronicTags.length ? healthChronicTags.join(', ') : '—'}</div>
                    <button type="button" onClick={() => setHealthTagModal('chronic')} className="health-tag-edit-btn">Edytuj</button>
                  </div>
                ) : (
                  <div className="readonly-field">{healthChronicTags.length ? healthChronicTags.join(', ') : '—'}</div>
                )}
              </div>
              <div className="field-group">
                <label>2) Dysfunkcje</label>
                {isEditable && !printMode ? (
                  <div className="health-tag-field">
                    <div className="readonly-field">{healthDysfunctionsTags.length ? healthDysfunctionsTags.join(', ') : '—'}</div>
                    <button type="button" onClick={() => setHealthTagModal('dysfunctions')} className="health-tag-edit-btn">Edytuj</button>
                  </div>
                ) : (
                  <div className="readonly-field">{healthDysfunctionsTags.length ? healthDysfunctionsTags.join(', ') : '—'}</div>
                )}
              </div>
              <div className="field-group">
                <label>3) Problemy psychiatryczne/psychologiczne</label>
                {isEditable && !printMode ? (
                  <div className="health-tag-field">
                    <div className="readonly-field">{healthPsychiatricTags.length ? healthPsychiatricTags.join(', ') : '—'}</div>
                    <button type="button" onClick={() => setHealthTagModal('psychiatric')} className="health-tag-edit-btn">Edytuj</button>
                  </div>
                ) : (
                  <div className="readonly-field">{healthPsychiatricTags.length ? healthPsychiatricTags.join(', ') : '—'}</div>
                )}
              </div>
              <div className="field-group">
                <label>4) Dodatkowe informacje zdrowotne</label>
                <textarea
                  value={healthAdditionalNotes}
                  onChange={(e) => setHealthAdditionalNotes(e.target.value)}
                  readOnly={printMode || viewMode === 'zatwierdzona'}
                  className={`textarea-field ${isEditable ? 'editable-field' : ''}`}
                  rows={2}
                  placeholder="Pozostałe informacje (np. po przecinku)"
                />
              </div>
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

          {/* Informacja o szczepieniach – od następnej kartki (Strona 2) */}
          <section className="section">
            <h2 className="section-title">Informacja o szczepieniach ochronnych (zaznaczenie oraz podanie roku):</h2>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.vaccination.calendar}
                  onChange={(e) => handleVaccinationChange('calendar', e.target.checked)}
                  disabled={printMode || viewMode === 'zatwierdzona'}
                />
                Zgodnie z kalendarzem szczepień
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.vaccination.tetanus}
                  onChange={(e) => handleVaccinationChange('tetanus', e.target.checked)}
                  disabled={printMode || viewMode === 'zatwierdzona'}
                />
                Tężec
                {formData.vaccination.tetanus && !formData.vaccination.calendar && (
                  <input
                    type="text"
                    value={formData.vaccination.tetanusYear}
                    onChange={(e) => handleVaccinationChange('tetanusYear', e.target.value)}
                    readOnly={printMode || viewMode === 'zatwierdzona'}
                    className={`input-inline ${isEditable ? 'editable-field' : ''}`}
                    placeholder="rok"
                  />
                )}
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.vaccination.measles}
                  onChange={(e) => handleVaccinationChange('measles', e.target.checked)}
                  disabled={printMode || viewMode === 'zatwierdzona'}
                />
                Dur
                {formData.vaccination.measles && !formData.vaccination.calendar && (
                  <input
                    type="text"
                    value={formData.vaccination.measlesYear}
                    onChange={(e) => handleVaccinationChange('measlesYear', e.target.value)}
                    readOnly={printMode || viewMode === 'zatwierdzona'}
                    className={`input-inline ${isEditable ? 'editable-field' : ''}`}
                    placeholder="rok"
                  />
                )}
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.vaccination.diphtheria}
                  onChange={(e) => handleVaccinationChange('diphtheria', e.target.checked)}
                  disabled={printMode || viewMode === 'zatwierdzona'}
                />
                Błonica
                {formData.vaccination.diphtheria && !formData.vaccination.calendar && (
                  <input
                    type="text"
                    value={formData.vaccination.diphtheriaYear}
                    onChange={(e) => handleVaccinationChange('diphtheriaYear', e.target.value)}
                    readOnly={printMode || viewMode === 'zatwierdzona'}
                    className={`input-inline ${isEditable ? 'editable-field' : ''}`}
                    placeholder="rok"
                  />
                )}
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.vaccination.other}
                  onChange={(e) => handleVaccinationChange('other', e.target.checked)}
                  disabled={printMode || viewMode === 'zatwierdzona'}
                />
                Inne
                {formData.vaccination.other && !formData.vaccination.calendar && (
                  <>
                    <input
                      type="text"
                      value={formData.vaccination.otherDetails}
                      onChange={(e) => handleVaccinationChange('otherDetails', e.target.value)}
                      readOnly={printMode || viewMode === 'zatwierdzona'}
                      className={`input-inline ${isEditable ? 'editable-field' : ''}`}
                      placeholder="podać jakie"
                    />
                    <input
                      type="text"
                      value={formData.vaccination.otherYear}
                      onChange={(e) => handleVaccinationChange('otherYear', e.target.value)}
                      readOnly={printMode || viewMode === 'zatwierdzona'}
                      className={`input-inline ${isEditable ? 'editable-field' : ''}`}
                      placeholder="rok"
                    />
                  </>
                )}
              </label>
            </div>
          </section>

          {/* Sekcja III - Informacje dodatkowe przeniesiona ze strony 1 */}
          <section className="section">
            <h2 className="section-title">III INFORMACJE DODATKOWE</h2>
            <div className="info-text">
              Prosimy o podanie dodatkowych informacji np. przyjedzie dzień później, rodzic ma ograniczone prawa rodzicielskie, ma urodziny podczas obozu, boi się balonów, itp.
            </div>
            <textarea
              value={formData.additionalInfo}
              onChange={(e) => handleChange('additionalInfo', e.target.value)}
              readOnly={printMode || viewMode === 'zatwierdzona'}
              className={`textarea-field ${isEditable ? 'editable-field' : ''}`}
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
              readOnly={printMode || viewMode === 'zatwierdzona'}
              className={`textarea-field ${isEditable ? 'editable-field' : ''}`}
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
                  disabled={printMode || viewMode === 'zatwierdzona'}
                />
                Potwierdzam zapoznanie się z regulaminem
              </label>
            </div>
            {showRegulationError && (
              <p className="text-red-600 text-sm mt-1 font-semibold" role="alert">To pole jest obowiązkowe</p>
            )}
          </section>

          {/* Sekcja VI */}
          <section className="section">
            <h2 className="section-title">VI ODBIÓR DZIECKA Z OBOZU / ODWIEDZINY W TRAKCIE IMPREZY – UPOWAŻNIENIE</h2>

            <div className="info-text">
              Biorę pełną odpowiedzialność za bezpieczeństwo dziecka podczas przebywania z osobą upoważnioną.
            </div>

            {authorizations.map((auth, index) => (
              <div key={index} className={`authorization-card ${showAuthorizationError ? 'border-2 border-red-500 rounded p-2 bg-red-50' : ''}`}>
                {/* Nagłówek karty z przyciskiem usuwania */}
                <div className="auth-header">
                  <span className="auth-title">Osoba upoważniona #{index + 1}</span>
                  {!printMode && index > 0 && (
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
                    readOnly={printMode || viewMode === 'zatwierdzona'}
                    className={`input-inline-full ${isEditable ? 'editable-field' : ''}`}
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
                      disabled={printMode || viewMode === 'zatwierdzona'}
                      className={`select-field ${isEditable ? 'editable-field' : ''}`}
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
                      readOnly={printMode || viewMode === 'zatwierdzona'}
                      className={`input-line ${isEditable ? 'editable-field' : ''}`}
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
                        disabled={printMode || viewMode === 'zatwierdzona'}
                      />
                      Do odbioru dziecka z obozu: ośrodka i/lub miejsca zbiórki transportu zbiorowego
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={auth.canTemporaryPickup}
                        onChange={(e) => handleAuthorizationChange(index, 'canTemporaryPickup', e.target.checked)}
                        disabled={printMode || viewMode === 'zatwierdzona'}
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
                  disabled={printMode || viewMode === 'zatwierdzona'}
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
                  disabled={printMode || viewMode === 'zatwierdzona'}
                />
                <span className="consent-text">Wyrażam zgodę na samodzielny powrót dziecka do domu z miejsca zbiórki transportu zbiorowego</span>
              </label>
            </div>

            {/* Błąd upoważnień */}
            {showAuthorizationError && (
              <p className="text-red-600 text-sm mt-1 font-semibold" role="alert">To pole jest obowiązkowe</p>
            )}
          </section>

          {/* Podpis dokumentu */}
          <section className="section">

            {(() => {
              const firstParentName = (formData.parentNames || '').split(',')[0].trim() || 'Opiekun prawny';
              const signedAtDate = latestCardSignedAtFromParent
                ? new Date(latestCardSignedAtFromParent).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : null;
              const signedAtFull = latestCardSignedAtFromParent
                ? (() => { const d = new Date(latestCardSignedAtFromParent); return `${d.toLocaleDateString('pl-PL')}, ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`; })()
                : getCurrentDateTime();

              const showSignatureBoxes = isSigned || effectiveLatestCardStatus === 'in_verification' || effectiveLatestCardStatus === 'accepted';

              if (printMode) return null;

              // Gdy użytkownik zmienił dane na podpisanej karcie — przyciski zamiast podpisów
              if (hasUnsavedChanges) {
                return (
                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '2rem', alignItems: 'center' }}>
                    <div style={{ flex: 1, background: '#fef3c7', color: '#92400e', padding: '0.8rem 1.2rem', borderRadius: '6px', fontSize: '10pt', fontWeight: 600, textAlign: 'center' }}>
                      Wprowadzono zmiany — wymagany ponowny podpis
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={handleCancelChanges}
                        className="no-print"
                        style={{
                          padding: '10px 20px', borderRadius: '6px', border: '1px solid #d1d5db',
                          background: 'white', color: '#374151', fontWeight: 500, fontSize: '13px', cursor: 'pointer',
                        }}
                      >
                        Anuluj zmiany
                      </button>
                      <button
                        type="button"
                        onClick={handleSignDocument}
                        className="no-print"
                        style={{
                          padding: '10px 20px', borderRadius: '6px', border: 'none',
                          background: '#03adf0', color: 'white', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                        }}
                      >
                        Podpisz ponownie dokument
                      </button>
                    </div>
                  </div>
                );
              }

              if (showSignatureBoxes) {
                return (
                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
                    {/* Lewa strona — Organizator */}
                    {effectiveLatestCardStatus === 'accepted' ? (
                      <div className="signed-confirmation" style={{ flex: 1 }}>
                        <div className="signed-header">Data: {signedAtDate || getCurrentDateTime().split(',')[0]} i podpis Organizatora</div>
                        <div className="signed-role" style={{ color: '#03adf0' }}>RADSAS FUN sp. z o.o.</div>
                        <div className="signed-timestamp">{signedAtDate || getCurrentDateTime().split(',')[0]}</div>
                      </div>
                    ) : (
                      <div style={{ flex: 1, background: '#fef3c7', color: '#92400e', padding: '0.6rem 1.2rem', borderRadius: '4px', fontSize: '9pt', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                        Dokument w trakcie weryfikacji przez organizatora
                      </div>
                    )}

                    {/* Prawa strona — Opiekun */}
                    <div className="signed-confirmation" style={{ flex: 1, textAlign: 'right' }}>
                      <div className="signed-header">Dokument podpisany przez:</div>
                      <div className="signed-role">{firstParentName}</div>
                      <div className="signed-timestamp">{signedAtFull}</div>
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleSignDocument}
                    className="sign-button no-print"
                  >
                    {effectiveLatestCardStatus === 'rejected' ? 'PODPISZ PONOWNIE' : 'PODPISZ DOKUMENT'}
                  </button>
                </div>
              );
            })()}
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

      {/* Sticky bar usunięty — przyciski re-sign są teraz w sekcji podpisów */}

      {/* Modal do potwierdzenia podpisu */}
      {showSignatureModal && (
        <div className="modal-overlay no-print" onClick={() => setShowSignatureModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Potwierdzenie</h3>
            <p className="modal-text">
              Na podany w rezerwacji numer telefonu <strong>{(formData.parentPhone || '').split(',')[0]?.trim() || formData.parentPhone}</strong>, przesłany został 4 cyfrowy kod.
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

      {/* Modal edycji tagów zdrowia (1–3) – bez zmiany treści pól */}
      {healthTagModal && (
        <div className="modal-overlay no-print" onClick={() => setHealthTagModal(null)}>
          <div className="modal-content modal-content-tags" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title modal-title-tags">
              {healthTagModal === 'chronic' && '1) Choroby przewlekłe'}
              {healthTagModal === 'dysfunctions' && '2) Dysfunkcje'}
              {healthTagModal === 'psychiatric' && '3) Problemy psychiatryczne/psychologiczne'}
            </h3>
            <div className="modal-body-tags">
              {healthTagModal === 'chronic' && (
                <HealthTagInput
                  tags={healthChronicTags}
                  onTagsChange={setHealthChronicTags}
                  placeholder="Wpisz i naciśnij Enter"
                />
              )}
              {healthTagModal === 'dysfunctions' && (
                <HealthTagInput
                  tags={healthDysfunctionsTags}
                  onTagsChange={setHealthDysfunctionsTags}
                  placeholder="Wpisz i naciśnij Enter"
                />
              )}
              {healthTagModal === 'psychiatric' && (
                <HealthTagInput
                  tags={healthPsychiatricTags}
                  onTagsChange={setHealthPsychiatricTags}
                  placeholder="Wpisz i naciśnij Enter"
                />
              )}
            </div>
            <div className="modal-buttons">
              <button type="button" onClick={() => setHealthTagModal(null)} className="modal-button modal-button-confirm">
                Zamknij
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
          overflow-x: hidden;
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
          max-width: 100%;
          min-width: 0;
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

        .pesel-input-crossed {
          display: block;
          width: 100%;
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

        /* Błąd walidacji – wyraźna czerwona ramka i tło */
        .input-line.border-red-500,
        .input-inline.border-red-500,
        input[type="date"].border-red-500,
        .select-field.border-red-500 {
          border: 2px solid #dc2626 !important;
          border-radius: 4px;
          background: #fef2f2 !important;
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
          max-width: 100%;
          min-width: 0;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.25rem;
          font-size: 7.5pt;
          cursor: pointer;
          transition: color 0.2s;
          max-width: 100%;
          min-width: 0;
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
          max-width: 100%;
          box-sizing: border-box;
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

        .health-tag-field {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .health-tag-field .readonly-field {
          flex: 1;
          min-width: 0;
        }
        .health-tag-edit-btn {
          flex-shrink: 0;
          padding: 0.35rem 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #0066cc;
          background: #f0f8ff;
          border: 1px solid #0066cc;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .health-tag-edit-btn:hover {
          background: #0066cc;
          color: white;
        }
        .modal-content-tags {
          width: 480px;
          max-width: 92vw;
          text-align: left;
        }
        .modal-title-tags {
          justify-content: flex-start;
        }
        .modal-title-tags::before {
          content: none;
        }
        .modal-body-tags {
          margin-bottom: 1.25rem;
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
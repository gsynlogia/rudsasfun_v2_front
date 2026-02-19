/**
 * Mapowanie danych rezerwacji z API na format QualificationForm (karta kwalifikacyjna).
 * Dane z profilu rezerwacji są wczytywane do żółtych pól (edytowalnych przez klienta).
 */

import type { ReservationData } from './contractReservationMapping';

export interface QualificationFormReservationData {
  reservationId?: string;
  turnName?: string;
  campLocation?: string;
  campDates?: string;
  childName?: string;
  childDOB?: string;
  childAddress?: string;
  parentNames?: string;
  parentAddress?: string;
  parentPhone?: string;
  /** Stan zdrowia (sekcja II) – tekst złożony (do wyświetlania gdy brak struktury) */
  healthInfo?: string;
  /** Pytania zdrowotne z kroku 1 (chronicDiseases, dysfunctions, psychiatric: Tak/Nie) */
  health_questions?: Record<string, string> | null;
  /** Szczegóły zdrowotne z kroku 1 (chronicDiseases, dysfunctions, psychiatric: tekst) */
  health_details?: Record<string, string> | null;
  /** Dodatkowe uwagi zdrowotne (4. pole w sekcji stan zdrowia) */
  additional_notes?: string | null;
  /** Informacje dodatkowe dotyczące uczestnika (sekcja III karty kwalifikacyjnej) */
  additionalInfo?: string;
  /** Wniosek o zakwaterowanie (sekcja IV karty kwalifikacyjnej) */
  accommodationRequest?: string;
  /** Liczba opiekunów z rezerwacji (1 lub 2) – do pokazania checkboxa i pól drugiego opiekuna */
  parentCount?: number;
  /** PESEL uczestnika – z rezerwacji (jeśli w przyszłości) lub z signed_documents.payload po podpisaniu karty */
  childPesel?: string;
  /** Drugi opiekun – z reservations.parents_data (drugi element) lub z signed_documents.payload (sekcjaI.drugiOpiekun) */
  secondParentName?: string;
  secondParentAddress?: string;
  secondParentPhone?: string;
}

/**
 * Overlay z signed_documents.payload: pola, których nie ma w reservations
 * (PESEL, drugi opiekun gdy dopisany przy karcie, szczepienia, upoważnienia, potwierdzenia).
 * Źródła: reservations + signed_documents. qualification_card_data nie jest wczytywane.
 */
export function signedPayloadOverlayOnly(payload: SignedQualificationPayload | null | undefined) {
  if (!payload) return null;
  const s1 = payload.sekcjaI;
  const drugi = s1?.drugiOpiekun;
  const s2vac = payload.sekcjaII_szczepienia;
  const s3 = payload.sekcjaIII;
  const s4 = payload.sekcjaIV;
  const u = payload.upowaznienia;
  return {
    childPesel: s1?.uczestnik?.pesel ?? '',
    secondParent: drugi
      ? { name: drugi.imieNazwisko ?? '', address: drugi.adres ?? '', phone: drugi.telefon ?? '' }
      : null,
    vaccination: {
      calendar: s2vac?.zgodnieZKalendarzem ?? false,
      tetanus: s2vac?.tezec ?? false,
      tetanusYear: s2vac?.tezecRok ?? '',
      measles: s2vac?.odra ?? false,
      measlesYear: s2vac?.odraRok ?? '',
      diphtheria: s2vac?.blonica ?? false,
      diphtheriaYear: s2vac?.blonicaRok ?? '',
      other: s2vac?.inne ?? false,
      otherYear: s2vac?.inneRok ?? '',
      otherDetails: s2vac?.inneSzczegoly ?? '',
    },
    authorizations:
      Array.isArray(u) && u.length > 0
        ? u.map((a) => ({
            fullName: a.imieNazwisko ?? '',
            documentType: (a.typDokumentu as 'dowód osobisty' | 'paszport') ?? 'dowód osobisty',
            documentNumber: a.numerDokumentu ?? '',
            canPickup: a.odbiorStaly ?? false,
            canTemporaryPickup: a.odbiorTymczasowy ?? false,
          }))
        : [{ fullName: '', documentType: 'dowód osobisty' as const, documentNumber: '', canPickup: false, canTemporaryPickup: false }],
    regulationConfirm: s4?.potwierdzenieRegulaminu ?? false,
    pickupInfo: s4?.odbiorDziecka ?? '',
    independentReturn: s4?.zgodaNaSamodzielnyPowrot ?? false,
    parentDeclaration: s3?.deklaracjaOpiekuna ?? '',
    directorConfirmation: payload.potwierdzenieKierownika ?? '',
    directorDate: payload.dataKierownika ?? '',
    directorSignature: payload.podpisKierownika ?? '',
    organizerSignature: payload.podpisOrganizatora ?? '',
  };
}

/**
 * Payload zapisany przy podpisaniu karty (getQualificationPayload) – struktura z signed_documents.payload.
 * Mapowanie payload -> reservationData + formData (do wczytania zapisanych danych do dokumentu).
 */
export interface SignedQualificationPayload {
  numerRezerwacji?: string;
  sekcjaI?: {
    nazwaTurnusu?: string;
    miejsceKoloniiObozu?: string;
    termin?: string;
    uczestnik?: { imieNazwisko?: string; dataUrodzenia?: string; pesel?: string; adres?: string };
    opiekunowie?: { imionaNazwiska?: string; adres?: string; telefon?: string };
    drugiOpiekun?: { imieNazwisko?: string; adres?: string; telefon?: string } | null;
  };
  sekcjaII_stanZdrowia?: {
    chorobyPrzewlekle?: string[];
    dysfunkcje?: string[];
    problemyPsychiatryczne?: string[];
    dodatkoweInformacje?: string;
    tekstZbiorczy?: string;
  };
  sekcjaII_szczepienia?: {
    zgodnieZKalendarzem?: boolean;
    tezec?: boolean;
    tezecRok?: string;
    odra?: boolean;
    odraRok?: string;
    blonica?: boolean;
    blonicaRok?: string;
    inne?: boolean;
    inneRok?: string;
    inneSzczegoly?: string;
  };
  sekcjaIII?: { informacjeDodatkowe?: string; deklaracjaOpiekuna?: string };
  sekcjaIV?: {
    wniosekOZakwaterowanie?: string;
    potwierdzenieRegulaminu?: boolean;
    odbiorDziecka?: string;
    zgodaNaSamodzielnyPowrot?: boolean;
  };
  upowaznienia?: Array<{
    imieNazwisko?: string;
    typDokumentu?: string;
    numerDokumentu?: string;
    odbiorStaly?: boolean;
    odbiorTymczasowy?: boolean;
  }>;
  potwierdzenieKierownika?: string;
  dataKierownika?: string;
  podpisKierownika?: string;
  podpisOrganizatora?: string;
}

function ensureArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map((v) => (typeof v === 'string' ? v : String(v ?? '')));
  if (typeof val === 'string') return val ? [val] : [];
  return [];
}

/**
 * Mapuje payload z signed_documents (karta kwalifikacyjna) na obiekt do ustawienia formData
 * oraz zwraca { formDataPatch, healthChronicTags, healthDysfunctionsTags, healthPsychiatricTags,
 * healthAdditionalNotes, vaccination, authorizations, secondParent, noSecondParent }.
 */
export function signedPayloadToFormState(payload: SignedQualificationPayload | null | undefined) {
  if (!payload) return null;
  const s1 = payload.sekcjaI;
  const s2health = payload.sekcjaII_stanZdrowia;
  const s2vac = payload.sekcjaII_szczepienia;
  const s3 = payload.sekcjaIII;
  const s4 = payload.sekcjaIV;
  const u = payload.upowaznienia;
  const drugi = s1?.drugiOpiekun;

  const formDataPatch = {
    turnName: s1?.nazwaTurnusu ?? '',
    campLocation: s1?.miejsceKoloniiObozu ?? '',
    campDates: s1?.termin ?? '',
    childName: s1?.uczestnik?.imieNazwisko ?? '',
    childDOB: s1?.uczestnik?.dataUrodzenia ?? '',
    childPesel: s1?.uczestnik?.pesel ?? '',
    childAddress: s1?.uczestnik?.adres ?? '',
    parentNames: s1?.opiekunowie?.imionaNazwiska ?? '',
    parentAddress: s1?.opiekunowie?.adres ?? '',
    parentPhone: s1?.opiekunowie?.telefon ?? '',
    healthInfo: s2health?.tekstZbiorczy ?? '',
    vaccineInfo: s4?.wniosekOZakwaterowanie ?? '',
    additionalInfo: s3?.informacjeDodatkowe ?? '',
    parentDeclaration: s3?.deklaracjaOpiekuna ?? '',
    regulationConfirm: s4?.potwierdzenieRegulaminu ?? false,
    independentReturn: s4?.zgodaNaSamodzielnyPowrot ?? false,
    pickupInfo: s4?.odbiorDziecka ?? '',
    directorConfirmation: payload.potwierdzenieKierownika ?? '',
    directorDate: payload.dataKierownika ?? '',
    directorSignature: payload.podpisKierownika ?? '',
    organizerSignature: payload.podpisOrganizatora ?? '',
    vaccination: {
      calendar: s2vac?.zgodnieZKalendarzem ?? false,
      tetanus: s2vac?.tezec ?? false,
      tetanusYear: s2vac?.tezecRok ?? '',
      measles: s2vac?.odra ?? false,
      measlesYear: s2vac?.odraRok ?? '',
      diphtheria: s2vac?.blonica ?? false,
      diphtheriaYear: s2vac?.blonicaRok ?? '',
      other: s2vac?.inne ?? false,
      otherYear: s2vac?.inneRok ?? '',
      otherDetails: s2vac?.inneSzczegoly ?? '',
    },
  };

  return {
    formDataPatch,
    healthChronicTags: ensureArray(s2health?.chorobyPrzewlekle),
    healthDysfunctionsTags: ensureArray(s2health?.dysfunkcje),
    healthPsychiatricTags: ensureArray(s2health?.problemyPsychiatryczne),
    healthAdditionalNotes: (s2health?.dodatkoweInformacje ?? '').trim(),
    vaccination: formDataPatch.vaccination,
    authorizations:
      Array.isArray(u) && u.length > 0
        ? u.map((a) => ({
            fullName: a.imieNazwisko ?? '',
            documentType: (a.typDokumentu as 'dowód osobisty' | 'paszport') ?? 'dowód osobisty',
            documentNumber: a.numerDokumentu ?? '',
            canPickup: a.odbiorStaly ?? false,
            canTemporaryPickup: a.odbiorTymczasowy ?? false,
          }))
        : [
            {
              fullName: '',
              documentType: 'dowód osobisty' as const,
              documentNumber: '',
              canPickup: false,
              canTemporaryPickup: false,
            },
          ],
    secondParent: drugi
      ? {
          name: drugi.imieNazwisko ?? '',
          address: drugi.adres ?? '',
          phone: drugi.telefon ?? '',
        }
      : null,
    noSecondParent: drugi === null || drugi === undefined,
  };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pl-PL');
}

function buildHealthInfoString(data: ReservationData): string {
  const parts: string[] = [];
  const hq = data.health_questions && typeof data.health_questions === 'object' ? data.health_questions : null;
  const hd = data.health_details && typeof data.health_details === 'object' ? data.health_details : null;
  const isTak = (v: unknown) => v === 'yes' || v === 'tak' || v === 'Tak';

  if (hq) {
    if (isTak(hq.chronicDiseases)) {
      const details = hd?.chronicDiseases?.trim();
      parts.push(details ? `Choroby przewlekłe: ${details}` : 'Choroby przewlekłe: Tak');
    }
    if (isTak(hq.dysfunctions)) {
      const details = hd?.dysfunctions?.trim();
      parts.push(details ? `Dysfunkcje: ${details}` : 'Dysfunkcje: Tak');
    }
    if (isTak(hq.psychiatric)) {
      const details = hd?.psychiatric?.trim();
      parts.push(details ? `Problemy psychiatryczne: ${details}` : 'Problemy psychiatryczne: Tak');
    }
  }

  const additionalNotes = (data.additional_notes || '').trim();
  if (additionalNotes) parts.push(additionalNotes);

  return parts.join(', ');
}

/**
 * Mapuje odpowiedź API rezerwacji (by-number) na dane do karty kwalifikacyjnej.
 */
export function mapReservationToQualificationForm(
  data: ReservationData,
): QualificationFormReservationData {
  const parents = data.parents_data || [];
  const firstParent = parents[0] || {};
  const childName = `${(data.participant_first_name || '').trim()} ${(data.participant_last_name || '').trim()}`.trim() || '';
  const parentNames = parents
    .map((p) => `${(p.firstName || '').trim()} ${(p.lastName || '').trim()}`.trim())
    .filter(Boolean)
    .join(', ') || (firstParent.firstName || firstParent.lastName ? `${firstParent.firstName || ''} ${firstParent.lastName || ''}`.trim() : '');
  const parentAddress = parents.map((p) => (p.city || '').trim()).filter(Boolean).join(', ') || (firstParent.city || '');
  const parentPhone = parents
    .map((p) => [p.phone, p.phoneNumber].filter(Boolean).join(' ').trim())
    .filter(Boolean)
    .join(', ') || [firstParent.phone, firstParent.phoneNumber].filter(Boolean).join(' ').trim() || '';
  const parentCount = parents.length;

  const campDates =
    data.property_start_date && data.property_end_date
      ? `${formatDate(data.property_start_date)} - ${formatDate(data.property_end_date)}`
      : '';
  const turnName = [data.camp_name, data.property_name].filter(Boolean).join(', ') || '';
  const campLocation = data.property_city || data.property_name || '';

  const healthInfoRaw = buildHealthInfoString(data);
  const healthInfo =
    healthInfoRaw.trim() ||
    'Nie choruje na choroby przewlekłe, nie posiada dysfunkcji, nie leczył się psychiatrycznie.';
  const additionalInfo = (data.participant_additional_info || '').trim() || undefined;
  const accommodationRequest = (data.accommodation_request || '').trim() || undefined;

  const secondParent = parents.length >= 2 ? parents[1] : null;
  const secondParentName = secondParent
    ? `${(secondParent.firstName || '').trim()} ${(secondParent.lastName || '').trim()}`.trim() || undefined
    : undefined;
  const secondParentAddress = secondParent
    ? (secondParent as { street?: string; postalCode?: string; city?: string }).street ||
      (secondParent as { street?: string; city?: string }).city ||
      undefined
    : undefined;
  const secondParentPhone = secondParent
    ? [secondParent.phone, (secondParent as { phoneNumber?: string }).phoneNumber].filter(Boolean).join(' ').trim() || undefined
    : undefined;

  return {
    reservationId: data.reservation_number || (data.id ? `REZ-2026-${data.id}` : undefined),
    turnName: turnName || undefined,
    campLocation: campLocation || undefined,
    campDates: campDates || undefined,
    childName: childName || undefined,
    childDOB: data.participant_age || undefined,
    childAddress: data.participant_city || undefined,
    parentNames: parentNames || undefined,
    parentAddress: parentAddress || undefined,
    parentPhone: parentPhone || undefined,
    parentCount,
    healthInfo: healthInfo || undefined,
    health_questions: data.health_questions ?? undefined,
    health_details: data.health_details ?? undefined,
    additional_notes: data.additional_notes ?? undefined,
    additionalInfo,
    accommodationRequest,
    secondParentName,
    secondParentAddress,
    secondParentPhone,
  };
}
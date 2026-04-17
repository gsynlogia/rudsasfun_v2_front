'use client';

import { MapPin, User, Calendar, Mail, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { useReservationPaymentHeader } from '@/contexts/ReservationPaymentHeaderContext';
import { contractService } from '@/lib/services/ContractService';
import { manualPaymentService, ManualPaymentResponse } from '@/lib/services/ManualPaymentService';
import { paymentService, PaymentResponse } from '@/lib/services/PaymentService';
import { AlertTriangle } from 'lucide-react';
import { qualificationCardService, QualificationCardResponse } from '@/lib/services/QualificationCardService';
import { authService } from '@/lib/services/AuthService';

/** Wyciaga roznice miedzy podpisanym a draftem. Jezeli draft zaczyna sie od podpisanego — zwraca tylko nowa czesc. */
function getDiffText(signed: string, draft: string): string {
  if (!signed) return draft;
  if (draft === signed) return '';
  if (draft.startsWith(signed)) {
    const diff = draft.slice(signed.length).replace(/^[,;\s]+/, '').trim();
    return diff || draft;
  }
  return draft;
}
import { reservationService, ReservationResponse } from '@/lib/services/ReservationService';
import { getApiBaseUrlRuntime } from '@/utils/api-config';

import DashedLine from '../DashedLine';


import AdditionalServicesTiles from './AdditionalServicesTiles';
import PromotionV2Snapshot from './PromotionV2Snapshot';

/** Linki do Map Google dla nazw ośrodków (otwierane w nowej karcie) */
const CENTER_MAP_LINKS: Record<string, string> = {
  beaver: 'https://www.google.com/maps/place/O%C5%9Brodek+BEAVER+-+Obozy+Radsas-Fun/@53.930431,17.82408,13z/data=!4m6!3m5!1s0x47026f7b1d4add13:0x2c1d171fb42a4a4d!8m2!3d53.9304311!4d17.8240802!16s%2Fg%2F11sc3kpv2s?hl=pl-PL&entry=ttu',
  wiele: 'https://www.google.com/maps/place/O%C5%9Brodek+BEAVER+-+Obozy+Radsas-Fun/@53.930431,17.82408,13z/data=!4m6!3m5!1s0x47026f7b1d4add13:0x2c1d171fb42a4a4d!8m2!3d53.9304311!4d17.8240802!16s%2Fg%2F11sc3kpv2s?hl=pl-PL&entry=ttu',
  sawa: 'https://www.google.com/maps?ll=54.332345,19.057051&z=11&t=m&hl=pl-PL&gl=US&mapclient=embed&cid=14839320515448778601',
  limba: 'https://www.google.com/maps?ll=49.329466,20.038894&z=13&t=m&hl=pl-PL&gl=US&mapclient=embed&cid=14078562888214195223',
};

interface ReservationMainProps {
  reservation: ReservationResponse;
  isDetailsExpanded: boolean;
  onToggleDetails: () => void;
  onReservationUpdate?: (updatedReservation: ReservationResponse) => void;
  /** Base path for navigation (e.g., '/profil' or '/client-view/123') */
  basePath?: string;
}

/**
 * ReservationMain Component
 * Left part of reservation card with main details
 */
export default function ReservationMain({ reservation, isDetailsExpanded, onToggleDetails, onReservationUpdate, basePath = '/profil' }: ReservationMainProps) {
  const router = useRouter();
  const paymentHeaderCtx = useReservationPaymentHeader();
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [manualPayments, setManualPayments] = useState<ManualPaymentResponse[]>([]);
  const [_loadingPayments, _setLoadingPayments] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const [paymentInstallments, setPaymentInstallments] = useState<'full' | '2' | '3' | null>(() => {
    // Initialize from reservation.payment_plan if available
    return (reservation.payment_plan as 'full' | '2' | '3') || null;
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [_contract, _setContract] = useState<any>(null);
  const [_qualificationCard, _setQualificationCard] = useState<QualificationCardResponse | null>(null);
  const [_loadingContract, _setLoadingContract] = useState(false);
  const [_loadingCard, _setLoadingCard] = useState(false);
  const [_downloadingContract, _setDownloadingContract] = useState(false);
  const [_downloadingCard, _setDownloadingCard] = useState(false);
  // Tpay wycofany (2026-03-19) — płatności online na stałe wyłączone
  const [onlinePaymentsEnabled] = useState<boolean>(false);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [loadingOnlinePaymentsStatus, setLoadingOnlinePaymentsStatus] = useState(true);
  const [protections, setProtections] = useState<Map<number, { name: string; price: number }>>(new Map());
  // Niezatwierdzone zmiany w karcie kwalifikacyjnej (draft vs podpisane SMS-em)
  // Niezatwierdzone zmiany w karcie kwalifikacyjnej — per-sekcja (widoczne na profilu) + lista wszystkich zmian
  const [unsignedCardChanges, setUnsignedCardChanges] = useState<{
    accommodation: boolean;
    health: boolean;
    additionalInfo: boolean;
    draftValues: {
      accommodation?: string; health?: string; additionalInfo?: string;
      chronicDiseases?: string; dysfunctions?: string; psychiatric?: string; additionalNotes?: string;
    };
    signedValues: {
      accommodation?: string; additionalInfo?: string;
      chronicDiseases?: string; dysfunctions?: string; psychiatric?: string; additionalNotes?: string;
    };
    // Pelna lista niezatwierdzonych zmian (nazwaPolska -> wartoscDraftu) do alertu rozwijanego
    allChanges: Array<{ label: string; value: string }>;
  }>({ accommodation: false, health: false, additionalInfo: false, draftValues: {}, signedValues: {}, allChanges: [] });

  useEffect(() => {
    if (!reservation?.id) return;
    const token = authService.getToken();
    if (!token) return;
    const apiUrl = getApiBaseUrlRuntime();

    // Sprawdz 2 zrodla niezatwierdzonych zmian:
    // 1) signed_documents z in_verification bez sms_verified_at (klient kliknal "Podpisz" ale nie wpisal kodu)
    // 2) qualification_card_data.form_snapshot (klient kliknal "Zapisz zmiany" ale nie podpisal SMS-em)
    Promise.all([
      fetch(`${apiUrl}/api/signed-documents/reservation/${reservation.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : []),
      fetch(`${apiUrl}/api/qualification-cards/${reservation.id}/data`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : null),
    ]).then(([docs, cardData]) => {
      const cardDocs = (docs || []).filter(
        (d: { document_type: string }) => d.document_type === 'qualification_card'
      );

      // Znajdz zrodlo niezatwierdzonych danych:
      // - in_verification bez sms_verified_at (kliknal "Podpisz" ale nie wpisal kodu)
      // - requires_signature (admin zmienil, klient nie podpisal ponownie)
      const unverifiedDoc = cardDocs.find(
        (d: { status: string; sms_verified_at?: string | null; payload?: string }) =>
          ((d.status === 'in_verification' && !d.sms_verified_at) || d.status === 'requires_signature') && d.payload
      );
      // Znajdz ostatni zweryfikowany doc (podpisany SMS-em)
      const verifiedDoc = cardDocs
        .filter((d: { sms_verified_at?: string | null; payload?: string }) => !!d.sms_verified_at && !!d.payload)
        .sort((a: { sms_verified_at: string }, b: { sms_verified_at: string }) =>
          b.sms_verified_at.localeCompare(a.sms_verified_at))[0] as { payload?: string } | undefined;

      // Wybierz snapshot do porownania: NOWSZY z form_snapshot vs niezweryfikowany doc.
      // form_snapshot jest aktualizowany przez "Zapisz zmiany", niezweryfikowany doc przez admin-full.
      let draftSnap: Record<string, unknown> | null = null;
      let unverifiedSnap: Record<string, unknown> | null = null;
      let formSnap: Record<string, unknown> | null = null;
      if (unverifiedDoc?.payload) {
        try { unverifiedSnap = JSON.parse(unverifiedDoc.payload as string); } catch { /* */ }
      }
      if (cardData?.form_snapshot) {
        try {
          formSnap = typeof cardData.form_snapshot === 'string'
            ? JSON.parse(cardData.form_snapshot) : cardData.form_snapshot;
        } catch { /* */ }
      }
      // Preferuj form_snapshot jesli jest nowszy (updated_at > unverifiedDoc.created_at)
      if (formSnap && unverifiedSnap) {
        const qcdUpdated = cardData?.updated_at || '';
        const docCreated = (unverifiedDoc as { created_at?: string })?.created_at || '';
        draftSnap = qcdUpdated > docCreated ? formSnap : unverifiedSnap;
      } else {
        draftSnap = formSnap || unverifiedSnap;
      }
      if (!draftSnap) return;

      // Bazowe dane do porownania: ostatni zweryfikowany snapshot LUB dane z rezerwacji
      let baseSnap: Record<string, unknown> | null = null;
      if (verifiedDoc?.payload) {
        try { baseSnap = JSON.parse(verifiedDoc.payload as string); } catch { /* */ }
      }

      // Wyciagnij dane draftu
      const ds2 = (draftSnap.sekcjaII_stanZdrowia || {}) as Record<string, unknown>;
      const ds3 = (draftSnap.sekcjaIII || {}) as Record<string, unknown>;
      const ds4 = (draftSnap.sekcjaIV || {}) as Record<string, unknown>;
      const draftAcc = ((ds4.wniosekOZakwaterowanie as string) || '').trim();
      const draftHealthParts = [
        ...(Array.isArray(ds2.chorobyPrzewlekle) ? ds2.chorobyPrzewlekle : []),
        ...(Array.isArray(ds2.dysfunkcje) ? ds2.dysfunkcje : []),
        ...(Array.isArray(ds2.problemyPsychiatryczne) ? ds2.problemyPsychiatryczne : []),
        ((ds2.dodatkoweInformacje as string) || '').trim(),
      ].filter(Boolean).join(', ');
      const draftInfo = ((ds3.informacjeDodatkowe as string) || '').trim();

      // Dane bazowe: WYLACZNIE z podpisanego SMS-em snapshotu.
      // Jezeli brak podpisu — baza to puste stringi (wszystko z draftu jest niezatwierdzone).
      let baseAcc = '', baseHealth = '', baseInfo = '';
      if (baseSnap) {
        const bs2 = (baseSnap.sekcjaII_stanZdrowia || {}) as Record<string, unknown>;
        const bs3 = (baseSnap.sekcjaIII || {}) as Record<string, unknown>;
        const bs4 = (baseSnap.sekcjaIV || {}) as Record<string, unknown>;
        baseAcc = ((bs4.wniosekOZakwaterowanie as string) || '').trim();
        baseHealth = [
          ...(Array.isArray(bs2.chorobyPrzewlekle) ? bs2.chorobyPrzewlekle : []),
          ...(Array.isArray(bs2.dysfunkcje) ? bs2.dysfunkcje : []),
          ...(Array.isArray(bs2.problemyPsychiatryczne) ? bs2.problemyPsychiatryczne : []),
          ((bs2.dodatkoweInformacje as string) || '').trim(),
        ].filter(Boolean).join(', ');
        baseInfo = ((bs3.informacjeDodatkowe as string) || '').trim();
      }

      // Porownaj pole po polu
      const accChanged = draftAcc !== baseAcc;
      const healthChanged = draftHealthParts !== baseHealth;
      const infoChanged = draftInfo !== baseInfo;

      // Szczegolowe wartosci per-pole zdrowia z draftu
      const draftChronic = (Array.isArray(ds2.chorobyPrzewlekle) ? ds2.chorobyPrzewlekle : []).filter(Boolean).join(', ');
      const draftDysf = (Array.isArray(ds2.dysfunkcje) ? ds2.dysfunkcje : []).filter(Boolean).join(', ');
      const draftPsych = (Array.isArray(ds2.problemyPsychiatryczne) ? ds2.problemyPsychiatryczne : []).filter(Boolean).join(', ');
      const draftNotes = ((ds2.dodatkoweInformacje as string) || '').trim();

      // Wartosci podpisane SMS-em per-pole (do porownania i wyswietlenia)
      const baseChronic = baseSnap ? (Array.isArray((baseSnap.sekcjaII_stanZdrowia as Record<string, unknown>)?.chorobyPrzewlekle) ? ((baseSnap.sekcjaII_stanZdrowia as Record<string, unknown>).chorobyPrzewlekle as string[]).filter(Boolean).join(', ') : '') : '';
      const baseDysf = baseSnap ? (Array.isArray((baseSnap.sekcjaII_stanZdrowia as Record<string, unknown>)?.dysfunkcje) ? ((baseSnap.sekcjaII_stanZdrowia as Record<string, unknown>).dysfunkcje as string[]).filter(Boolean).join(', ') : '') : '';
      const basePsych = baseSnap ? (Array.isArray((baseSnap.sekcjaII_stanZdrowia as Record<string, unknown>)?.problemyPsychiatryczne) ? ((baseSnap.sekcjaII_stanZdrowia as Record<string, unknown>).problemyPsychiatryczne as string[]).filter(Boolean).join(', ') : '') : '';
      const baseNotes = baseSnap ? (((baseSnap.sekcjaII_stanZdrowia as Record<string, unknown>)?.dodatkoweInformacje as string) || '').trim() : '';

      const diffChronic = draftChronic && draftChronic !== baseChronic ? getDiffText(baseChronic, draftChronic) : '';
      const diffDysf = draftDysf && draftDysf !== baseDysf ? getDiffText(baseDysf, draftDysf) : '';
      const diffPsych = draftPsych && draftPsych !== basePsych ? getDiffText(basePsych, draftPsych) : '';
      const diffNotes = draftNotes && draftNotes !== baseNotes ? getDiffText(baseNotes, draftNotes) : '';

      // Wartosci podpisane SMS-em (do porownania w UI)
      let sv: typeof unsignedCardChanges.signedValues = {};
      if (baseSnap) {
          const bs2 = (baseSnap.sekcjaII_stanZdrowia || {}) as Record<string, unknown>;
          const bs3 = (baseSnap.sekcjaIII || {}) as Record<string, unknown>;
          const bs4 = (baseSnap.sekcjaIV || {}) as Record<string, unknown>;
          sv = {
            chronicDiseases: (Array.isArray(bs2.chorobyPrzewlekle) ? bs2.chorobyPrzewlekle : []).filter(Boolean).join(', ') || undefined,
            dysfunctions: (Array.isArray(bs2.dysfunkcje) ? bs2.dysfunkcje : []).filter(Boolean).join(', ') || undefined,
            psychiatric: (Array.isArray(bs2.problemyPsychiatryczne) ? bs2.problemyPsychiatryczne : []).filter(Boolean).join(', ') || undefined,
            additionalNotes: ((bs2.dodatkoweInformacje as string) || '').trim() || undefined,
            additionalInfo: ((bs3.informacjeDodatkowe as string) || '').trim() || undefined,
            accommodation: ((bs4.wniosekOZakwaterowanie as string) || '').trim() || undefined,
          };
        }

        // Porownanie WSZYSTKICH pol payload (do rozwijanej listy w alercie)
        const allChanges: Array<{ label: string; value: string }> = [];
        const ds1 = (draftSnap.sekcjaI || {}) as Record<string, unknown>;
        const ds1u = (ds1.uczestnik || {}) as Record<string, unknown>;
        const ds1d = (ds1.drugiOpiekun || null) as Record<string, unknown> | null;
        const bs1 = baseSnap ? ((baseSnap.sekcjaI || {}) as Record<string, unknown>) : {};
        const bs1u = (bs1.uczestnik || {}) as Record<string, unknown>;
        const bs1d = (bs1.drugiOpiekun || null) as Record<string, unknown> | null;
        const bs2Full = baseSnap ? ((baseSnap.sekcjaII_stanZdrowia || {}) as Record<string, unknown>) : {};
        const bsVac = baseSnap ? ((baseSnap.sekcjaII_szczepienia || {}) as Record<string, unknown>) : {};
        const dsVac = (draftSnap.sekcjaII_szczepienia || {}) as Record<string, unknown>;
        const bs3Full = baseSnap ? ((baseSnap.sekcjaIII || {}) as Record<string, unknown>) : {};
        const bs4Full = baseSnap ? ((baseSnap.sekcjaIV || {}) as Record<string, unknown>) : {};
        const ds4Full = (draftSnap.sekcjaIV || {}) as Record<string, unknown>;
        const bsAuth = baseSnap ? (baseSnap.upowaznienia || []) : [];
        const dsAuth = draftSnap.upowaznienia || [];

        // Helper: porownaj pole i dodaj do listy jesli sie rozni
        const cmp = (label: string, dVal: unknown, bVal: unknown) => {
          const d = typeof dVal === 'boolean' ? (dVal ? 'Tak' : 'Nie') : Array.isArray(dVal) ? dVal.filter(Boolean).join(', ') : String(dVal ?? '').trim();
          const b = typeof bVal === 'boolean' ? (bVal ? 'Tak' : 'Nie') : Array.isArray(bVal) ? bVal.filter(Boolean).join(', ') : String(bVal ?? '').trim();
          if (d !== b && d) allChanges.push({ label, value: getDiffText(b, d) });
        };

        // Sekcja I — uczestnik
        cmp('Data urodzenia', ds1u.dataUrodzenia, bs1u.dataUrodzenia);
        cmp('PESEL', ds1u.pesel, bs1u.pesel);
        cmp('Brak PESEL', ds1u.brakPesel, bs1u.brakPesel);
        cmp('Rok urodzenia (brak PESEL)', ds1u.rokUrodzeniaGdyBrakPesel, bs1u.rokUrodzeniaGdyBrakPesel);
        // Drugi opiekun
        if (ds1d) {
          cmp('Drugi opiekun: imię i nazwisko', ds1d.imieNazwisko, bs1d?.imieNazwisko);
          cmp('Drugi opiekun: adres', ds1d.adres, bs1d?.adres);
          cmp('Drugi opiekun: telefon', ds1d.telefon, bs1d?.telefon);
        }
        // Sekcja II — zdrowie
        if (diffChronic) allChanges.push({ label: 'Choroby przewlekłe', value: diffChronic });
        if (diffDysf) allChanges.push({ label: 'Dysfunkcje', value: diffDysf });
        if (diffPsych) allChanges.push({ label: 'Problemy psychiatryczne', value: diffPsych });
        if (diffNotes) allChanges.push({ label: 'Uwagi dodatkowe (zdrowie)', value: diffNotes });
        // Sekcja II — szczepienia
        cmp('Szczepienia: zgodnie z kalendarzem', dsVac.zgodnieZKalendarzem, bsVac.zgodnieZKalendarzem);
        cmp('Szczepienia: tężec', dsVac.tezec, bsVac.tezec);
        cmp('Szczepienia: tężec rok', dsVac.tezecRok, bsVac.tezecRok);
        cmp('Szczepienia: odra', dsVac.odra, bsVac.odra);
        cmp('Szczepienia: odra rok', dsVac.odraRok, bsVac.odraRok);
        cmp('Szczepienia: błonica', dsVac.blonica, bsVac.blonica);
        cmp('Szczepienia: błonica rok', dsVac.blonicaRok, bsVac.blonicaRok);
        cmp('Szczepienia: inne', dsVac.inne, bsVac.inne);
        cmp('Szczepienia: inne rok', dsVac.inneRok, bsVac.inneRok);
        cmp('Szczepienia: inne szczegóły', dsVac.inneSzczegoly, bsVac.inneSzczegoly);
        // Sekcja III
        if (infoChanged && draftInfo) allChanges.push({ label: 'Informacje dodatkowe uczestnika', value: getDiffText(baseInfo, draftInfo) });
        cmp('Deklaracja opiekuna', (draftSnap.sekcjaIII as Record<string, unknown>)?.deklaracjaOpiekuna, bs3Full.deklaracjaOpiekuna);
        // Sekcja IV
        if (accChanged && draftAcc) allChanges.push({ label: 'Wniosek o zakwaterowanie', value: getDiffText(baseAcc, draftAcc) });
        cmp('Potwierdzenie regulaminu', ds4Full.potwierdzenieRegulaminu, bs4Full.potwierdzenieRegulaminu);
        cmp('Odbiór dziecka', ds4Full.odbiorDziecka, bs4Full.odbiorDziecka);
        cmp('Zgoda na samodzielny powrót', ds4Full.zgodaNaSamodzielnyPowrot, bs4Full.zgodaNaSamodzielnyPowrot);
        // Upoważnienia
        const dsAuthStr = JSON.stringify(dsAuth);
        const bsAuthStr = JSON.stringify(bsAuth);
        if (dsAuthStr !== bsAuthStr && Array.isArray(dsAuth) && dsAuth.length > 0) {
          allChanges.push({ label: 'Upoważnienia', value: (dsAuth as Array<Record<string, unknown>>).map((a) => `${a.imieNazwisko || ''} (${a.numerDokumentu || ''})`).filter(a => a.trim() !== '()').join(', ') });
        }

      // Ustaw stan — allChanges moze miec elementy nawet jesli 3 glowne sekcje sie nie zmienily (np. szczepionki)
      if (allChanges.length > 0) {
        setUnsignedCardChanges({
          accommodation: accChanged,
          health: healthChanged,
          additionalInfo: infoChanged,
          draftValues: {
            accommodation: accChanged ? draftAcc : undefined,
            health: healthChanged ? draftHealthParts : undefined,
            additionalInfo: infoChanged ? draftInfo : undefined,
            chronicDiseases: draftChronic || undefined,
            dysfunctions: draftDysf || undefined,
            psychiatric: draftPsych || undefined,
            additionalNotes: draftNotes || undefined,
          },
          signedValues: sv,
          allChanges,
        });
      }
    }).catch(() => {});
  }, [reservation?.id, reservation?.accommodation_request, reservation?.additional_notes, reservation?.participant_additional_info]);

  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [justificationDraft, setJustificationDraft] = useState<Record<string, any>>(reservation.promotion_justification || {});
  const [savingJustification, setSavingJustification] = useState(false);
  const [justificationError, setJustificationError] = useState<string | null>(null);

  const getPromotionType = (promotionName?: string | null): string => {
    if (!promotionName) return 'other';
    const nameLower = promotionName.toLowerCase();
    if (nameLower.includes('duża rodzina') || nameLower.includes('duza rodzina')) return 'duza_rodzina';
    if (nameLower.includes('rodzeństwo razem') || nameLower.includes('rodzenstwo razem')) return 'rodzenstwo_razem';
    if (nameLower.includes('obozy na maxa') || nameLower.includes('obozy na max')) return 'obozy_na_maxa';
    if (nameLower.includes('first minute') || nameLower.includes('wczesna rezerwacja')) return 'first_minute';
    if (nameLower.includes('bon') && (
      nameLower.includes('brązowy') || nameLower.includes('brazowy') ||
      nameLower.includes('srebrny') ||
      nameLower.includes('złoty') || nameLower.includes('zloty') ||
      nameLower.includes('platynowy')
    )) return 'bonowych';
    if (nameLower.includes('bonowych') || nameLower.includes('bonowa')) return 'bonowych';
    return 'other';
  };

  const requiresJustification = (promotionName?: string | null): boolean => {
    const type = getPromotionType(promotionName);
    return ['duza_rodzina', 'rodzenstwo_razem', 'obozy_na_maxa', 'first_minute', 'bonowych'].includes(type);
  };

  const hasJustificationData = (justification: any): boolean => {
    return Boolean(
      justification &&
      typeof justification === 'object' &&
      Object.keys(justification).length > 0 &&
      Object.values(justification).some((val: any) =>
        val !== null && val !== undefined && val !== '' &&
        (Array.isArray(val) ? val.length > 0 : true),
      ),
    );
  };

  const formatJustification = (just: any): string[] => {
    if (!just || typeof just !== 'object') return [];
    const parts: string[] = [];
    if (just.card_number) parts.push(`Numer karty dużej rodziny: ${just.card_number}`);
    if (just.sibling_first_name || just.sibling_last_name) {
      const siblingName = [just.sibling_first_name, just.sibling_last_name].filter(Boolean).join(' ');
      if (siblingName) parts.push(`Rodzeństwo: ${siblingName}`);
    }
    if (just.first_camp_date) parts.push(`Data pierwszego obozu: ${just.first_camp_date}`);
    if (just.first_camp_name) parts.push(`Nazwa pierwszego obozu: ${just.first_camp_name}`);
    if (just.reason) parts.push(`Powód wyboru promocji: ${just.reason}`);
    if (just.years) {
      const yearsStr = Array.isArray(just.years) ? just.years.join(', ') : String(just.years);
      if (yearsStr) parts.push(`Lata uczestnictwa: ${yearsStr}`);
    }
    const knownFields = ['card_number', 'sibling_first_name', 'sibling_last_name', 'first_camp_date', 'first_camp_name', 'reason', 'years'];
    const otherFields = Object.keys(just).filter(key => !knownFields.includes(key));
    otherFields.forEach(key => {
      const value = just[key];
      if (value !== null && value !== undefined && value !== '') {
        parts.push(`${key}: ${String(value)}`);
      }
    });
    return parts;
  };

  const validateJustificationDraft = (): boolean => {
    setJustificationError(null);
    const promotionName = reservation.promotion_name || reservation.selected_promotion || '';
    const type = getPromotionType(promotionName);
    const just = justificationDraft || {};

    if (!requiresJustification(promotionName)) {
      // Wymuś chociaż jedno pole opisowe dla spójności
      const hasAny = hasJustificationData(just);
      if (!hasAny) {
        setJustificationError('Uzupełnij krótkie uzasadnienie.');
      }
      return hasAny;
    }

    if (type === 'duza_rodzina') {
      const ok = !!(just.card_number && just.card_number.trim() !== '');
      if (!ok) setJustificationError('Podaj numer karty dużej rodziny.');
      return ok;
    }

    if (type === 'rodzenstwo_razem') {
      const ok = !!(
        just.sibling_first_name && just.sibling_first_name.trim() !== '' &&
        just.sibling_last_name && just.sibling_last_name.trim() !== ''
      );
      if (!ok) setJustificationError('Podaj imię i nazwisko rodzeństwa.');
      return ok;
    }

    if (type === 'obozy_na_maxa') {
      const ok = !!(
        (just.first_camp_date && just.first_camp_date.trim() !== '') ||
        (just.first_camp_name && just.first_camp_name.trim() !== '')
      );
      if (!ok) setJustificationError('Podaj datę lub nazwę pierwszego obozu.');
      return ok;
    }

    if (type === 'first_minute') {
      const ok = !!(just.reason && just.reason.trim() !== '');
      if (!ok) setJustificationError('Podaj powód wyboru promocji First Minute.');
      return ok;
    }

    if (type === 'bonowych') {
      const ok = !!(just.years &&
        (
          (Array.isArray(just.years) && just.years.length > 0) ||
          (typeof just.years === 'string' && just.years.trim() !== '')
        ));
      if (!ok) setJustificationError('Podaj lata uczestnictwa.');
      return ok;
    }

    const fallback = hasJustificationData(just);
    if (!fallback) setJustificationError('Uzupełnij uzasadnienie.');
    return fallback;
  };

  useEffect(() => {
    setJustificationDraft(reservation.promotion_justification || {});
  }, [reservation.promotion_justification]);

  // Format date helper
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Brak danych';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'Brak danych';
    }
  };

  // Format date range
  const formatDateRange = (start: string | null | undefined, end: string | null | undefined): string => {
    if (!start || !end) return 'Brak danych';
    return `${formatDate(start)} – ${formatDate(end)}`;
  };

  // Tpay wycofany (2026-03-19) — ładujemy tylko dane konta bankowego (przelew ręczny)
  useEffect(() => {
    const loadBankAccount = async () => {
      try {
        setLoadingOnlinePaymentsStatus(true);
        const API_BASE_URL = getApiBaseUrlRuntime();
        const bankResponse = await fetch(`${API_BASE_URL}/api/bank-accounts/active`);
        if (bankResponse.ok) {
          const bankData = await bankResponse.json();
          setBankAccount(bankData);
        }
      } catch (err) {
        console.error('Error loading bank account:', err);
      } finally {
        setLoadingOnlinePaymentsStatus(false);
      }
    };
    loadBankAccount();
  }, []);

  // Load protection prices from API
  useEffect(() => {
    const loadProtections = async () => {
      if (!reservation.selected_protection || !reservation.camp_id || !reservation.property_id) {
        setProtections(new Map());
        return;
      }

      try {
        const API_BASE_URL = getApiBaseUrlRuntime();
        const protectionsMap = new Map<number, { name: string; price: number }>();

        // Fetch turnus protections (public endpoint - has name and price)
        const turnusProtections = await fetch(
          `${API_BASE_URL}/api/camps/${reservation.camp_id}/properties/${reservation.property_id}/protections`,
        ).then(res => res.ok ? res.json() : []);

        // Fetch public general protections as fallback (public endpoint)
        const publicProtections = await fetch(
          `${API_BASE_URL}/api/general-protections/public`,
        ).then(res => res.ok ? res.json() : []).catch(() => []);

        for (const protectionIdValue of reservation.selected_protection) {
          try {
            let generalProtectionId: number | null = null;
            if (typeof protectionIdValue === 'string' && protectionIdValue.startsWith('protection-')) {
              const numericId = parseInt(protectionIdValue.split('-')[1], 10);
              if (!isNaN(numericId)) {
                generalProtectionId = numericId;
              }
            } else {
              const parsedId = typeof protectionIdValue === 'number' ? protectionIdValue : parseInt(String(protectionIdValue));
              if (!isNaN(parsedId)) {
                generalProtectionId = parsedId;
              }
            }

            if (generalProtectionId) {
              // First try to find in turnus protections (has center-specific price)
              const turnusProtection = turnusProtections.find(
                (tp: any) => tp.general_protection_id === generalProtectionId || tp.id === generalProtectionId,
              );

              if (turnusProtection && turnusProtection.general_protection_id) {
                // Use data from turnus protection (has name and price)
                protectionsMap.set(generalProtectionId, {
                  name: turnusProtection.name || `Ochrona ${generalProtectionId}`,
                  price: turnusProtection.price || 0,
                });
              } else {
                // Fallback to public general protections
                const publicProtection = publicProtections.find(
                  (p: any) => p.id === generalProtectionId,
                );

                if (publicProtection) {
                  protectionsMap.set(generalProtectionId, {
                    name: publicProtection.name,
                    price: publicProtection.price || 0,
                  });
                }
              }
            }
          } catch (err) {
            console.error(`Error processing protection ${protectionIdValue}:`, err);
          }
        }

        setProtections(protectionsMap);
      } catch (err) {
        console.error('Error loading protections:', err);
        setProtections(new Map());
      }
    };

    loadProtections();
  }, [reservation.selected_protection, reservation.camp_id, reservation.property_id]);

  // Load payments for this reservation
  useEffect(() => {
    const loadPayments = async () => {
      try {
        _setLoadingPayments(true);
        const allPayments = await paymentService.listPayments(0, 1000);
        // Filter payments for this reservation (order_id format: "RES-{id}" or just "{id}" or "RES-{id}-{timestamp}")
        // Use the same logic as PaymentsManagement.tsx for consistency
        const reservationPayments = allPayments.filter(p => {
          const orderId = p.order_id || '';
          // Check if order_id matches reservation.id (with or without "RES-" prefix, or with timestamp)
          // Format: "RES-{id}" or "RES-{id}-{timestamp}" or just "{id}"
          if (orderId === String(reservation.id)) return true;
          if (orderId === `RES-${reservation.id}`) return true;
          // For format "RES-{id}-{timestamp}", extract the id part
          const match = orderId.match(/^RES-(\d+)(?:-|$)/);
          if (match && parseInt(match[1], 10) === reservation.id) return true;
          return false;
        });
        setPayments(reservationPayments);

        // Include payments with status 'success' or 'pending' if they have amount set
        // For pending payments, we use 'amount' as the paid amount (assuming payment was made)
        // For success payments, we use 'paid_amount' if available, otherwise 'amount'
        // Use the same logic as PaymentsManagement.tsx for consistency
        const successfulPayments = reservationPayments.filter(p => {
          // Include success payments
          if (p.status === 'success') return true;
          // Include pending payments that have an amount (payment was created)
          if (p.status === 'pending' && p.amount && p.amount > 0) return true;
          return false;
        });

        // Calculate actual paid amount from database
        // Priority: paid_amount (from webhook) > amount (from payment creation)
        // Use the same logic as PaymentsManagement.tsx for consistency
        const actualPaidAmount = successfulPayments.reduce((sum, p) => {
          // If paid_amount is set (from webhook), use it
          if (p.paid_amount !== null && p.paid_amount !== undefined && p.paid_amount > 0) {
            return sum + p.paid_amount;
          }
          // Otherwise, use amount (payment was created but webhook didn't update it yet)
          return sum + (p.amount || 0);
        }, 0);

        // Load manual payments for this reservation
        let manualPaymentsTotal = 0;
        try {
          const manualPaymentsList = await manualPaymentService.getByReservation(reservation.id);
          setManualPayments(manualPaymentsList);
          manualPaymentsTotal = manualPaymentsList.reduce((sum, mp) => sum + mp.amount, 0);
        } catch (error) {
          console.error('Error loading manual payments:', error);
          setManualPayments([]);
        }

        // Use actual paid amount from database (this is the source of truth for payments)
        // Include manual payments in the total paid amount
        const totalAmount = reservation.total_price || 0;
        const totalPaidAmount = actualPaidAmount + manualPaymentsTotal;
        const paidAmount = Math.min(totalPaidAmount, totalAmount);

        setPaidAmount(paidAmount);
        setIsFullyPaid(paidAmount >= totalAmount);

        if (paymentHeaderCtx) {
          paymentHeaderCtx.setPaymentHeader({
            totalPrice: totalAmount,
            totalPaid: paidAmount,
            paymentStatus: paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
          });
        }

        // Update payment installments from reservation.payment_plan if available
        if (reservation.payment_plan && (reservation.payment_plan === 'full' || reservation.payment_plan === '2' || reservation.payment_plan === '3')) {
          setPaymentInstallments(reservation.payment_plan as 'full' | '2' | '3');
        }
      } catch (error) {
        console.error('Error loading payments:', error);
      } finally {
        _setLoadingPayments(false);
      }
    };

    if (isDetailsExpanded) {
      loadPayments();
      loadDocuments();
    }
  }, [reservation.id, reservation.total_price, isDetailsExpanded]);

  // Load contract and qualification card
  const loadDocuments = async () => {
    try {
      _setLoadingContract(true);
      _setLoadingCard(true);

      // Load contract
      try {
        const contracts = await contractService.listMyContracts();
        const contractData = contracts.find(c => c.reservation_id === reservation.id);
        _setContract(contractData || null);
      } catch (error) {
        console.error('Error loading contract:', error);
        _setContract(null);
      } finally {
        _setLoadingContract(false);
      }

      // Load qualification card
      try {
        const card = await qualificationCardService.getQualificationCard(reservation.id);
        _setQualificationCard(card);
      } catch (error) {
        console.error('Error loading qualification card:', error);
        _setQualificationCard(null);
      } finally {
        _setLoadingCard(false);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const _handleDownloadContract = async () => {
    try {
      _setDownloadingContract(true);
      await contractService.downloadContract(reservation.id);

      // Show important information about contract signing
      alert('WAŻNE:\n\n• Masz 2 dni na wgranie podpisanej umowy do systemu.\n• Możesz podpisać umowę odręcznie lub podpisem zaufanym.\n• MUSISZ odesłać PODPISANĄ umowę.');

      // Reload contract status after download
      await loadDocuments();
    } catch (error: any) {
      console.error('Error downloading contract:', error);
      alert(error.message || 'Nie udało się pobrać umowy. Spróbuj ponownie.');
    } finally {
      _setDownloadingContract(false);
    }
  };

  const _handleDownloadQualificationCard = async () => {
    try {
      _setDownloadingCard(true);
      await qualificationCardService.downloadQualificationCard(reservation.id);

      // Show important information about qualification card
      const hasSecondParent = reservation.parents_data && Array.isArray(reservation.parents_data) && reservation.parents_data.length > 1;
      alert(`WAŻNE INFORMACJE O KARCIE KWALIFIKACYJNEJ:\n\n` +
            `• Karta jest uzupełniona na podstawie rezerwacji.\n` +
            `• MUSISZ uzupełnić pozostałe dane: PESEL (jeśli nie został podany) oraz informacje o chorobach/zdrowiu.\n` +
            `• MUSISZ odesłać PODPISANĄ kartę kwalifikacyjną.\n` +
            `• Masz 2 dni na wgranie podpisanej karty do systemu.\n` +
            `• Możesz podpisać kartę odręcznie lub podpisem zaufanym.\n${
            hasSecondParent ? '• W karcie muszą być dane obojga rodziców/opiekunów.\n' : ''}`);

      // Reload card status after download
      await loadDocuments();
    } catch (error: any) {
      console.error('Error downloading qualification card:', error);
      alert(error.message || 'Nie udało się pobrać karty kwalifikacyjnej. Spróbuj ponownie.');
    } finally {
      _setDownloadingCard(false);
    }
  };

  // Get participant name
  const participantName = reservation.participant_first_name && reservation.participant_last_name
    ? `${reservation.participant_first_name} ${reservation.participant_last_name}`
    : 'Brak danych';

  // Format reservation number (e.g., REZ-2025-003)
  const formatReservationNumber = (reservationId: number, createdAt: string) => {
    const year = new Date(createdAt).getFullYear();
    const paddedId = String(reservationId).padStart(3, '0');
    return `REZ-${year}-${paddedId}`;
  };

  const reservationNumber = reservation.reservation_number ?? formatReservationNumber(reservation.id, reservation.created_at);

  // Get age (rocznik - birth year)
  const age = reservation.participant_age ? `Rocznik: ${reservation.participant_age}` : 'Brak danych';

  // Get gender
  const gender = reservation.participant_gender || 'Brak danych';

  // Get city
  const city = reservation.participant_city || reservation.property_city || 'Brak danych';

  // Get camp name
  const campName = reservation.camp_name || 'Brak danych';

  // Get turnus name (property name)
  const _turnusName = reservation.property_name || 'Brak danych';

  // Get dates
  const dates = formatDateRange(reservation.property_start_date, reservation.property_end_date);

  // Tytuł przelewu: nazwa kolonii/obozu, termin, imię i nazwisko uczestnika, nr tel. wpłacającego
  const firstParent = reservation.parents_data?.[0];
  const payerPhone = firstParent
    ? [firstParent.phone, firstParent.phoneNumber].filter(Boolean).join(' ').trim() || ''
    : '';
  const transferTitle = [campName, dates, participantName, payerPhone ? `tel. ${payerPhone}` : ''].filter(Boolean).join(', ');

  // Get center/city
  const _center = reservation.property_city || 'Brak danych';

  // Get transport info
  const departureType = reservation.departure_type === 'zbiorowy' ? 'Transport zbiorowy' : 'Transport własny';
  const departureCity = reservation.departure_city || '';
  const returnType = reservation.return_type === 'zbiorowy' ? 'Transport zbiorowy' : 'Transport własny';
  const returnCity = reservation.return_city || '';

  // State for diet name and price (will be fetched if not in reservation)
  const [dietName, setDietName] = useState<string | null>(reservation.diet_name || null);
  const [dietPrice, setDietPrice] = useState<number | null>(null);

  // Update dietName when reservation.diet_name changes (from backend)
  useEffect(() => {
    if (reservation.diet_name) {
      setDietName(reservation.diet_name);
    }
  }, [reservation.diet_name]);

  // Fetch diet price from turnus diets (backend already provides diet_name in reservation)
  // This gives us turnus-specific price which may differ from base price
  useEffect(() => {
    if (reservation.diet && reservation.camp_id && reservation.property_id) {
      const fetchDietPrice = async () => {
        try {
          const API_BASE_URL = getApiBaseUrlRuntime();

          // Try to find in turnus diets to get turnus-specific price
          const response = await fetch(`${API_BASE_URL}/api/camps/${reservation.camp_id}/properties/${reservation.property_id}/diets`);
          if (response.ok) {
            const diets = await response.json();
            // Try to find diet by id or relation_id
            const foundDiet = diets.find((d: any) =>
              d.id === reservation.diet ||
              d.relation_id === reservation.diet ||
              (d.is_center_diet_relation && d.relation_id === reservation.diet),
            );
            if (foundDiet && foundDiet.price !== undefined && foundDiet.price !== null) {
              setDietPrice(parseFloat(foundDiet.price));
            }
          }
        } catch (err) {
          // Silently fail - price is optional, name is already from backend
          console.error('Error fetching diet price:', err);
        }
      };
      fetchDietPrice();
    }
  }, [reservation.diet, reservation.camp_id, reservation.property_id]);

  // Get diet name (prefer diet_name, fallback to fetched name, then diet ID)
  const diet = dietName || (reservation.diet ? `Dieta ID: ${reservation.diet}` : 'Brak danych');

  // Format diet display with price in parentheses if available
  const dietDisplay = dietPrice !== null && dietPrice > 0
    ? `${diet} (${dietPrice.toFixed(2)} PLN)`
    : diet;

  // Get promotion name (if selected_promotion exists, show promotion_name or selected_promotion)
  const promotion = reservation.promotion_name || reservation.selected_promotion || 'Brak promocji';
  const hasPromotion = !!(reservation.selected_promotion || reservation.promotion_name);

  // Get source name (prefer source_name, fallback to selected_source)
  const source = reservation.source_name || reservation.selected_source || 'Brak danych';

  const [unsignedAlertExpanded, setUnsignedAlertExpanded] = useState(false);

  // Get accommodation
  const accommodation = reservation.accommodation_request || 'Brak danych';

  // Get participant additional info
  const participantAdditionalInfo = reservation.participant_additional_info || null;

  // Get health info - use additional_notes (Informacje dodatkowe / Uwagi from Step1)
  const additionalNotes = reservation.additional_notes || null;

  // Get health questions and details
  const healthQuestions = reservation.health_questions || null;
  const healthDetails = reservation.health_details || null;

  // Format health status info
  const formatHealthStatus = (question: string | null | undefined): string => {
    if (!question || question.trim() === '') return 'Nie';
    if (question === 'yes' || question === 'tak') return 'Tak';
    if (question === 'no' || question === 'nie') return 'Nie';
    return question;
  };

  // Build health info display
  const buildHealthInfo = () => {
    const parts: string[] = [];

    // Add health questions with details
    if (healthQuestions && typeof healthQuestions === 'object') {
      if (healthQuestions.chronicDiseases && (healthQuestions.chronicDiseases === 'yes' || healthQuestions.chronicDiseases === 'tak' || healthQuestions.chronicDiseases === 'Tak')) {
        const details = healthDetails && typeof healthDetails === 'object' ? healthDetails.chronicDiseases : '';
        if (details && details.trim()) {
          parts.push(`Choroby przewlekłe: ${details}`);
        } else {
          parts.push('Choroby przewlekłe: Tak');
        }
      }

      if (healthQuestions.dysfunctions && (healthQuestions.dysfunctions === 'yes' || healthQuestions.dysfunctions === 'tak' || healthQuestions.dysfunctions === 'Tak')) {
        const details = healthDetails && typeof healthDetails === 'object' ? healthDetails.dysfunctions : '';
        if (details && details.trim()) {
          parts.push(`Dysfunkcje: ${details}`);
        } else {
          parts.push('Dysfunkcje: Tak');
        }
      }

      if (healthQuestions.psychiatric && (healthQuestions.psychiatric === 'yes' || healthQuestions.psychiatric === 'tak' || healthQuestions.psychiatric === 'Tak')) {
        const details = healthDetails && typeof healthDetails === 'object' ? healthDetails.psychiatric : '';
        if (details && details.trim()) {
          parts.push(`Problemy psychiatryczne: ${details}`);
        } else {
          parts.push('Problemy psychiatryczne: Tak');
        }
      }
    }

    // Add additional notes if available
    if (additionalNotes && additionalNotes.trim()) {
      parts.push(additionalNotes);
    }

    return parts.length > 0 ? parts : ['Brak danych'];
  };

  const healthInfoParts = buildHealthInfo();

  // Map status
  const statusMap: Record<string, string> = {
    'pending': 'Zarezerwowana — oczekuje na dokumenty',
    'confirmed': 'Potwierdzona — dokumenty zatwierdzone',
    'cancelled': 'Anulowana',
    'completed': 'Zakończona',
  };
  const status = statusMap[reservation.status] || reservation.status;
  const statusColor = reservation.status === 'cancelled' ? 'red' : reservation.status === 'completed' ? 'gray' : 'green';

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
      {/* Alert: niezatwierdzone zmiany w karcie kwalifikacyjnej */}
      {unsignedCardChanges.allChanges.length > 0 && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl p-3 sm:p-4">
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setUnsignedAlertExpanded(e => !e)}
          >
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <p className="text-sm font-medium text-orange-800 flex-1">
              Karta kwalifikacyjna zawiera niezatwierdzone zmiany ({unsignedCardChanges.allChanges.length})
            </p>
            <svg className={`w-4 h-4 text-orange-500 transition-transform ${unsignedAlertExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {unsignedAlertExpanded && (
            <div className="mt-2 pl-8 space-y-1">
              {unsignedCardChanges.allChanges.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-orange-800">
                  <span className="text-orange-400 mt-0.5">&#8226;</span>
                  <span><span className="font-medium">{c.label}:</span> {c.value}</span>
                </div>
              ))}
              <a
                href={`${basePath}/aktualne-rezerwacje/${reservation.reservation_number || `REZ-2026-${reservation.id}`}/karta-kwalifikacyjna`}
                className="inline-block mt-2 text-xs font-medium text-orange-700 underline hover:text-orange-900"
              >
                Przejdź do karty i potwierdź podpisem SMS
              </a>
            </div>
          )}
        </div>
      )}
      {/* Header Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
              {participantName}
            </h3>
            <span className="text-xs sm:text-sm text-gray-500 font-medium">
              ({reservationNumber})
            </span>
          </div>
          <span className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 ${
            statusColor === 'green' ? 'bg-green-50 text-green-700' :
            statusColor === 'red' ? 'bg-red-50 text-red-700' :
            'bg-gray-50 text-gray-700'
          } text-[10px] sm:text-xs font-medium rounded-full w-fit`}>
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
              statusColor === 'green' ? 'bg-green-500' :
              statusColor === 'red' ? 'bg-red-500' :
              'bg-gray-500'
            }`} />
            {status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <User className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{age}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <User className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{gender}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{city}</span>
          </div>
        </div>
      </div>

      {/* Parents/Guardians Section */}
      {reservation.parents_data && reservation.parents_data.length > 0 && (
        <>
          <DashedLine />
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-1">
              Opiekunowie/Rodzice
              {unsignedCardChanges.allChanges.some(c => c.label.startsWith('Drugi opiekun')) && (
                <span className="relative group cursor-help">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-orange-50 border border-orange-300 text-orange-800 text-xs rounded px-2 py-1 whitespace-nowrap z-50 shadow-md">
                    Niezatwierdzone zmiany dotyczące drugiego opiekuna
                  </span>
                </span>
              )}
            </h4>
            <div className="space-y-3 sm:space-y-4">
              {reservation.parents_data.map((parent, index) => {
                // Dla drugiego opiekuna (index=1): sprawdz czy dane sa niezatwierdzone
                const isUnsignedParent2 = index === 1 && unsignedCardChanges.allChanges.some(c => c.label.startsWith('Drugi opiekun'));
                return (
                <div key={`parent-${index}`} className={`rounded-lg p-2 sm:p-3 ${isUnsignedParent2 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                  <div className="text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-2">
                    {parent.firstName} {parent.lastName}
                    {isUnsignedParent2 && <span className="ml-1 text-xs text-orange-600 font-normal">(niezatwierdzony SMS-em)</span>}
                  </div>
                  <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                    {parent.email && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{parent.email}</span>
                      </div>
                    )}
                    {(parent.phoneNumber || parent.phone) && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{parent.phone || '+48'} {parent.phoneNumber}</span>
                      </div>
                    )}
                    {parent.street && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{parent.street}, {parent.postalCode} {parent.city}</span>
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <DashedLine />

      {/* Camp Details */}
      <div>
        <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
          {campName}
          {reservation.property_city && (() => {
            const key = reservation.property_city!.trim().toLowerCase();
            const href = CENTER_MAP_LINKS[key];
            return (
              <span className="text-xs sm:text-sm font-normal text-gray-600 ml-2">
                - {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#03adf0] hover:text-[#0288c7] underline"
                  >
                    {reservation.property_city}
                  </a>
                ) : (
                  reservation.property_city
                )}
              </span>
            );
          })()}
        </h4>
        <div className="text-xs sm:text-sm text-gray-600 space-y-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="font-semibold text-gray-900">Termin: {dates}</span>
          </div>
        </div>
      </div>

      <DashedLine />

      {/* Transport Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Transport to resort */}
        <div>
          <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
            Transport: <span className="uppercase">WYJAZD</span>
          </h5>
          <div className="text-xs sm:text-sm text-gray-700 space-y-1">
            <div>{departureType}</div>
            {departureCity && <div>{departureCity}</div>}
          </div>
        </div>

        {/* Transport from resort */}
        <div>
          <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
            Transport: <span className="uppercase">PRZYJAZD</span>
          </h5>
          <div className="text-xs sm:text-sm text-gray-700 space-y-1">
            <div>{returnType}</div>
            {returnCity && <div>{returnCity}</div>}
          </div>
        </div>
      </div>

      {/* Collapsible Details Section */}
      {isDetailsExpanded && (
        <>
          <DashedLine />

          {/* Diet and Promotion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Dieta</h5>
              <div className="text-xs sm:text-sm text-gray-700">{dietDisplay}</div>
            </div>
            <div>
              {/* §16.B1 — Snapshot v2 (promocja + kod rabatowy); komponent sam ukrywa się gdy rezerwacja to legacy */}
              <PromotionV2Snapshot reservationId={reservation.id} authToken={authService.getToken()} />
              {/* Stary kafel „Promocja" — renderowany TYLKO dla rezerwacji legacy (mają selected_promotion lub promotion_name);
                  nagłówek §14.13: „Promocje i Rabaty". */}
              {hasPromotion && (
                <>
                  <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Promocje i Rabaty</h5>
                  <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-gray-700">
                    <span>{promotion}</span>
                    {reservation.promotion_price !== null && reservation.promotion_price !== undefined && (
                      <span>{reservation.promotion_price.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł</span>
                    )}
                  </div>
                  <div className="mt-2">
                    {hasJustificationData(reservation.promotion_justification) ? (
                      <div className="space-y-1 text-xs sm:text-sm text-gray-700">
                        {formatJustification(reservation.promotion_justification).map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const type = getPromotionType(reservation.promotion_name || reservation.selected_promotion || '');
                          if (type === 'first_minute' && (!justificationDraft.reason || justificationDraft.reason.trim() === '')) {
                            setJustificationDraft({
                              ...justificationDraft,
                              reason: 'Promocja - First Minute',
                            });
                          } else {
                            setJustificationDraft(reservation.promotion_justification || {});
                          }
                          setJustificationError(null);
                          setShowJustificationModal(true);
                        }}
                        className="text-xs px-3 py-1 bg-[#03adf0] text-white rounded hover:bg-[#0288c7] transition-colors"
                        disabled={savingJustification}
                      >
                        Dodaj uzasadnienie
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <DashedLine />

          {/* Source */}
          <div>
            <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Źródło</h5>
            <div className="text-xs sm:text-sm text-gray-700">{source}</div>
          </div>

          <DashedLine />

          {/* Accommodation and Health */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Accommodation */}
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center gap-1">
                Zakwaterowanie
                {unsignedCardChanges.accommodation && (
                  <span className="relative group cursor-help">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-orange-50 border border-orange-300 text-orange-800 text-xs rounded px-2 py-1 whitespace-nowrap z-50 shadow-md">
                      Niezatwierdzona zmiana: {unsignedCardChanges.draftValues.accommodation}
                    </span>
                  </span>
                )}
              </h5>
              <p className="text-xs sm:text-sm text-gray-700">
                {accommodation}
                {unsignedCardChanges.accommodation && unsignedCardChanges.draftValues.accommodation && unsignedCardChanges.draftValues.accommodation !== (unsignedCardChanges.signedValues.accommodation || '') && (
                  <span className="ml-1 text-xs text-orange-600 bg-orange-50 px-1 rounded">(niezatwierdzone: {getDiffText(unsignedCardChanges.signedValues.accommodation || '', unsignedCardChanges.draftValues.accommodation)})</span>
                )}
              </p>
            </div>

            {/* Health Status */}
            <div>
              <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center gap-1">
                Stan zdrowia
                {unsignedCardChanges.health && (
                  <span className="relative group cursor-help">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-orange-50 border border-orange-300 text-orange-800 text-xs rounded px-2 py-1 max-w-xs z-50 shadow-md">
                      Niezatwierdzona zmiana w karcie kwalifikacyjnej (brak podpisu SMS)
                    </span>
                  </span>
                )}
              </h5>
              <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                {(() => {
                  const sv = unsignedCardChanges.health ? unsignedCardChanges.signedValues : null;
                  const dv = unsignedCardChanges.health ? unsignedCardChanges.draftValues : null;
                  // Uzyj podpisanych wartosci jesli sa, w przeciwnym razie z rezerwacji
                  const hq = healthQuestions as Record<string, string> | null;
                  const hd = healthDetails as Record<string, string> | null;

                  const showField = (label: string, signedVal: string | undefined, resVal: string | undefined, draftVal: string | undefined) => {
                    const base = signedVal ?? resVal ?? '';
                    const diff = draftVal && draftVal !== base ? getDiffText(base, draftVal) : '';
                    if (!base && !diff) return null;
                    return (
                      <div key={label}>
                        {label}: {base || ''}
                        {diff && <span className="ml-1 text-orange-600 bg-orange-50 px-1 rounded text-xs font-medium">(niezatwierdzone: {diff})</span>}
                      </div>
                    );
                  };

                  const parts: React.ReactNode[] = [];
                  if (hq?.chronicDiseases === 'Tak' || hq?.chronicDiseases === 'tak') {
                    const el = showField('Choroby przewlekłe', sv?.chronicDiseases, hd?.chronicDiseases, dv?.chronicDiseases);
                    if (el) parts.push(el);
                  }
                  if (hq?.dysfunctions === 'Tak' || hq?.dysfunctions === 'tak') {
                    const el = showField('Dysfunkcje', sv?.dysfunctions, hd?.dysfunctions, dv?.dysfunctions);
                    if (el) parts.push(el);
                  }
                  if (hq?.psychiatric === 'Tak' || hq?.psychiatric === 'tak') {
                    const el = showField('Problemy psychiatryczne', sv?.psychiatric, hd?.psychiatric, dv?.psychiatric);
                    if (el) parts.push(el);
                  }
                  // Uwagi dodatkowe
                  const baseNotes = sv?.additionalNotes ?? additionalNotes ?? '';
                  const diffNotes = dv?.additionalNotes && dv.additionalNotes !== baseNotes ? getDiffText(baseNotes, dv.additionalNotes) : '';
                  if (baseNotes || diffNotes) {
                    parts.push(
                      <div key="notes">
                        {baseNotes}
                        {diffNotes && <span className="ml-1 text-orange-600 bg-orange-50 px-1 rounded text-xs font-medium">(niezatwierdzone: {diffNotes})</span>}
                      </div>
                    );
                  }

                  return parts.length > 0 ? parts : <div>Brak danych</div>;
                })()}
              </div>
            </div>
          </div>

          {/* Participant Additional Info */}
          <DashedLine />
          <div>
            <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2 flex items-center gap-1">
              Informacje dodatkowe dotyczące uczestnika
              {unsignedCardChanges.additionalInfo && (
                <span className="relative group cursor-help">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-orange-50 border border-orange-300 text-orange-800 text-xs rounded px-2 py-1 max-w-xs z-50 shadow-md">
                    Niezatwierdzona zmiana w karcie kwalifikacyjnej (brak podpisu SMS)
                  </span>
                </span>
              )}
            </h5>
            <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">
              {participantAdditionalInfo || 'brak'}
              {unsignedCardChanges.additionalInfo && unsignedCardChanges.draftValues.additionalInfo && unsignedCardChanges.draftValues.additionalInfo !== (unsignedCardChanges.signedValues.additionalInfo || '') && (
                <span className="ml-1 text-xs text-orange-600 bg-orange-50 px-1 rounded">(niezatwierdzone: {getDiffText(unsignedCardChanges.signedValues.additionalInfo || '', unsignedCardChanges.draftValues.additionalInfo)})</span>
              )}
            </p>
          </div>

          <DashedLine />

          {/* Additional Services Tiles */}
          <AdditionalServicesTiles
            selectedAddons={reservation.selected_addons || []}
            selectedProtection={reservation.selected_protection || []}
            reservation={reservation}
            onReservationUpdate={async (updatedReservation) => {
              // Update reservation data using the updated reservation from API
              if (onReservationUpdate) {
                // Use the callback from parent to update reservation state
                onReservationUpdate(updatedReservation);
              } else {
                // Fallback: reload page if no callback provided (for backward compatibility)
                try {
                  const refreshedReservation = await reservationService.getReservation(reservation.id);
                  window.location.reload();
                } catch (error) {
                  console.error('Error refreshing reservation:', error);
                  window.location.reload();
                }
              }
            }}
          />

          <DashedLine />

          {/* Cost breakdown (same structure as step 4 basket) – dynamic from API, no hardcoded amounts */}
          {(() => {
            const hasBase = reservation.base_price != null && reservation.base_price > 0;
            const hasDiet = reservation.diet_name && (reservation.diet_price ?? 0) !== 0;
            const hasAddons = reservation.addons_data && reservation.addons_data.length > 0;
            const hasProtection =
              reservation.selected_protection &&
              reservation.selected_protection.length > 0 &&
              reservation.protection_names &&
              reservation.protection_prices;
            const hasTransport = reservation.transport_price != null && reservation.transport_price > 0;
            const hasPromotion = reservation.promotion_name != null && reservation.promotion_name !== '';
            const showBreakdown =
              hasBase || hasDiet || hasAddons || hasProtection || hasTransport || hasPromotion;

            if (!showBreakdown) return null;

            const formatAmount = (value: number): string => {
              if (value >= 0) return `+${value.toFixed(2)} zł`;
              return `${value.toFixed(2)} zł`;
            };

            const rows: { label: string; amount?: number; infoOnly?: boolean }[] = [];

            if (hasBase) {
              rows.push({ label: 'Cena podstawowa', amount: reservation.base_price! });
            }
            if (hasDiet) {
              rows.push({
                label: reservation.diet_name!,
                amount: reservation.diet_price ?? 0,
              });
            }
            if (hasAddons) {
              for (const addon of reservation.addons_data!) {
                rows.push({ label: addon.name, amount: addon.price });
              }
            }
            if (hasProtection) {
              for (const id of reservation.selected_protection!) {
                const name = reservation.protection_names![id] ?? reservation.protection_names![String(id)];
                if (!name) continue;
                const price = reservation.protection_prices![name.toLowerCase()] ?? 0;
                rows.push({ label: name, amount: price });
              }
            }
            if (hasTransport) {
              const dep =
                reservation.departure_type === 'wlasny'
                  ? 'Własny transport'
                  : (reservation.departure_city ?? '');
              const ret =
                reservation.return_type === 'wlasny'
                  ? 'Własny transport'
                  : (reservation.return_city ?? '');
              rows.push({
                label: `Transport (WYJAZD: ${dep} / POWRÓT: ${ret})`,
                amount: reservation.transport_price!,
              });
            }
            if (hasPromotion) {
              if (reservation.promotion_does_not_reduce_price) {
                rows.push({
                  label: `${reservation.promotion_name} – nie obniża ceny`,
                  infoOnly: true,
                });
              } else if (reservation.promotion_price != null && reservation.promotion_price !== 0) {
                rows.push({
                  label: reservation.promotion_name!,
                  amount: -Math.abs(reservation.promotion_price),
                });
              } else {
                rows.push({ label: reservation.promotion_name!, infoOnly: true });
              }
            }

            return (
              <div className="mb-3 sm:mb-4">
                <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Szczegóły kosztów</h5>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-1.5 text-xs sm:text-sm">
                  {rows.map((row, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-gray-700">{row.label}</span>
                      {row.infoOnly ? (
                        <span className="text-gray-500 italic">–</span>
                      ) : (
                        <span className="font-medium tabular-nums text-gray-900">
                          {row.amount! >= 0 ? formatAmount(row.amount!) : `${row.amount!.toFixed(2)} zł`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Total Cost and Actions */}
          <div>
            <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Koszt całkowity</h5>

            {/* Detailed Payment Breakdown */}
            {!isFullyPaid && (
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Całkowity koszt:</span>
                  <span className="font-semibold text-gray-900">{reservation.total_price.toFixed(2)} PLN</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Całkowite wpływy:</span>
                    <span className="font-semibold text-gray-900">{paidAmount.toFixed(2)} PLN</span>
                  </div>
                  {manualPayments.length > 0 && (
                    <div className="mt-1 ml-4 space-y-1">
                      {manualPayments.map((mp) => (
                        <div key={mp.id} className="flex justify-between items-center text-gray-500">
                          <span className="text-[10px] sm:text-xs">
                            • {formatDate(mp.payment_date)} {mp.payment_method ? `(${mp.payment_method})` : ''}
                          </span>
                          <span className="text-[10px] sm:text-xs font-medium">{mp.amount.toFixed(2)} PLN</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-700 font-medium">Pozostała kwota do zapłaty:</span>
                  <span className="font-bold text-[#03adf0]">{(reservation.total_price - paidAmount).toFixed(2)} PLN</span>
                </div>
              </div>
            )}

            {isFullyPaid && (
              <div className="text-xs sm:text-sm text-green-600 mb-3 sm:mb-4 font-semibold">
                ✅ Rezerwacja w pełni opłacona
              </div>
            )}

            {!isFullyPaid && (
              <>
                {/* Show online payment options only if online payments are enabled */}
                {onlinePaymentsEnabled && !loadingOnlinePaymentsStatus && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {/* Payment Installments Options - Left Side */}
                    <div className="space-y-2 sm:space-y-3">
                      <h6 className="text-xs sm:text-sm font-semibold text-gray-700">Wybierz sposób płatności:</h6>
                  <div className="space-y-2">
                    {/* Calculate remaining amount - disable other options if payment_plan is already set in database */}
                    {(() => {
                      // Check if First Minute promotion is selected
                      const promotionName = reservation.promotion_name || reservation.selected_promotion || '';
                      const isFirstMinute = promotionName.toLowerCase().includes('first minute') ||
                                          promotionName.toLowerCase().includes('firstminute') ||
                                          promotionName.toLowerCase().includes('wczesna rezerwacja');

                      const remainingAmount = reservation.total_price - paidAmount;
                      // Check if payment_plan is already saved in database
                      const savedPaymentPlan = reservation.payment_plan;
                      const isPlanLocked = !!savedPaymentPlan; // If payment_plan exists, lock other options

                      // For First Minute, only allow full payment
                      if (isFirstMinute) {
                        // Force full payment for First Minute
                        if (paymentInstallments !== 'full') {
                          setPaymentInstallments('full');
                        }

                        return (
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id={`installmentFull-${reservation.id}`}
                              name={`paymentInstallments-${reservation.id}`}
                              value="full"
                              checked={true}
                              disabled={true}
                              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-not-allowed"
                            />
                            <label
                              htmlFor={`installmentFull-${reservation.id}`}
                              className="text-xs sm:text-sm text-gray-700"
                            >
                              Pełna płatność ({remainingAmount.toFixed(2)} zł) - wymagana dla promocji First Minute
                            </label>
                          </div>
                        );
                      }

                      // Normal payment options for non-First Minute
                      return (
                        <>
                          {/* Full Payment - disabled if payment_plan is '2' or '3' */}
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id={`installmentFull-${reservation.id}`}
                              name={`paymentInstallments-${reservation.id}`}
                              value="full"
                              checked={paymentInstallments === 'full'}
                              onChange={() => {
                                // Only update local state if plan is not locked
                                if (!isPlanLocked) {
                                  setPaymentInstallments('full');
                                }
                              }}
                              disabled={isPlanLocked && savedPaymentPlan !== 'full'}
                              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <label
                              htmlFor={`installmentFull-${reservation.id}`}
                              className={`text-xs sm:text-sm ${isPlanLocked && savedPaymentPlan !== 'full' ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}
                            >
                              Pełna płatność ({remainingAmount.toFixed(2)} zł)
                            </label>
                          </div>

                          {/* 2 Equal Installments - disabled if payment_plan is 'full' or '3' */}
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id={`installment2-${reservation.id}`}
                              name={`paymentInstallments-${reservation.id}`}
                              value="2"
                              checked={paymentInstallments === '2'}
                              onChange={() => {
                                // Only update local state if plan is not locked
                                if (!isPlanLocked) {
                                  setPaymentInstallments('2');
                                }
                              }}
                              disabled={isPlanLocked && savedPaymentPlan !== '2'}
                              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <label
                              htmlFor={`installment2-${reservation.id}`}
                              className={`text-xs sm:text-sm ${isPlanLocked && savedPaymentPlan !== '2' ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}
                            >
                              Płatność w dwóch ratach (po {(remainingAmount / 2).toFixed(2)} zł)
                            </label>
                          </div>

                          {/* 3 Equal Installments - disabled if payment_plan is 'full' or '2' */}
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id={`installment3-${reservation.id}`}
                              name={`paymentInstallments-${reservation.id}`}
                              value="3"
                              checked={paymentInstallments === '3'}
                              onChange={() => {
                                // Only update local state if plan is not locked
                                if (!isPlanLocked) {
                                  setPaymentInstallments('3');
                                }
                              }}
                              disabled={isPlanLocked && savedPaymentPlan !== '3'}
                              className="w-4 h-4 text-[#03adf0] focus:ring-[#03adf0] border-gray-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <label
                              htmlFor={`installment3-${reservation.id}`}
                              className={`text-xs sm:text-sm ${isPlanLocked && savedPaymentPlan !== '3' ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}
                            >
                              Płatność w trzech ratach (po {(remainingAmount / 3).toFixed(2)} zł)
                            </label>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Pay Button - Right Side - only show if payment method is selected */}
                {paymentInstallments && (
                  <div className="flex items-end">
                    <button
                      onClick={async () => {
                        if (isProcessingPayment) return;

                        if (!paymentInstallments) {
                          alert('Proszę wybrać sposób płatności');
                          return;
                        }

                        setIsProcessingPayment(true);
                        try {
                          // Save payment plan to database BEFORE creating payment
                          await reservationService.updatePaymentPlan(reservation.id, paymentInstallments);

                          // Calculate remaining amount
                          const remainingAmount = reservation.total_price - paidAmount;

                          // Get payment amount based on selected installments and remaining amount
                          let paymentAmount = remainingAmount;
                          if (paymentInstallments === '2') {
                            paymentAmount = remainingAmount / 2;
                          } else if (paymentInstallments === '3') {
                            paymentAmount = remainingAmount / 3;
                          }

                          // Get payer data from reservation
                          const firstParent = reservation.parents_data && reservation.parents_data.length > 0
                            ? reservation.parents_data[0]
                            : null;

                          if (!firstParent || !firstParent.email) {
                            throw new Error('Brak danych płatnika (email) w rezerwacji');
                          }

                          const payerEmail = firstParent.email;
                          const payerName = firstParent.firstName && firstParent.lastName
                            ? `${firstParent.firstName} ${firstParent.lastName}`.trim()
                            : undefined;

                          // Create order ID
                          const orderId = `RES-${reservation.id}-${Date.now()}`;

                          // Determine installment number for description
                          let installmentDesc = '';
                          if (paymentInstallments === 'full') {
                            installmentDesc = 'Pełna płatność';
                          } else if (paymentInstallments === '2') {
                            // Count how many installment payments were made for this reservation
                            const installmentPayments = payments.filter(p =>
                              (p.status === 'paid' || p.status === 'success') &&
                              (p.description?.includes('Rata') || p.description?.includes('rata')),
                            );
                            const installmentNumber = installmentPayments.length + 1;
                            installmentDesc = `Rata ${installmentNumber}/2`;
                          } else if (paymentInstallments === '3') {
                            // Count how many installment payments were made for this reservation
                            const installmentPayments = payments.filter(p =>
                              (p.status === 'paid' || p.status === 'success') &&
                              (p.description?.includes('Rata') || p.description?.includes('rata')),
                            );
                            const installmentNumber = installmentPayments.length + 1;
                            installmentDesc = `Rata ${installmentNumber}/3`;
                          }

                          // Prepare payment request
                          const paymentRequest: any = { // Tpay wycofany
                            amount: paymentAmount,
                            description: `Rezerwacja obozu #${reservation.id} - ${installmentDesc}`,
                            order_id: orderId,
                            payer_email: payerEmail,
                            payer_name: payerName,
                            success_url: `${window.location.origin}/payment/success?reservation_id=${reservation.id}`,
                            error_url: `${window.location.origin}/payment/failure?reservation_id=${reservation.id}`,
                          };

                          // Create payment
                          const paymentResponse = await paymentService.createPayment(paymentRequest);

                          // Redirect to payment URL if available
                          if (paymentResponse.payment_url) {
                            window.location.href = paymentResponse.payment_url;
                          } else {
                            throw new Error('Nie otrzymano URL płatności');
                          }
                        } catch (error) {
                          console.error('Błąd podczas tworzenia płatności:', error);
                          alert(error instanceof Error ? error.message : 'Wystąpił błąd podczas tworzenia płatności');
                          setIsProcessingPayment(false);
                        }
                      }}
                      disabled={isProcessingPayment || !paymentInstallments}
                      className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-[#03adf0] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessingPayment ? (
                        'Przetwarzanie...'
                      ) : (
                        (() => {
                          const remainingAmount = reservation.total_price - paidAmount;
                          let paymentAmount = remainingAmount;
                          if (paymentInstallments === '2') {
                            paymentAmount = remainingAmount / 2;
                          } else if (paymentInstallments === '3') {
                            paymentAmount = remainingAmount / 3;
                          }
                          return `zapłać ${paymentAmount.toFixed(2)} zł`;
                        })()
                      )}
                    </button>
                  </div>
                )}
              </div>
                )}

                {/* Show traditional transfer section only if online payments are disabled */}
                {!onlinePaymentsEnabled && !loadingOnlinePaymentsStatus && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 sm:p-6 rounded-lg">
                    <h6 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
                      Płatność przelewem tradycyjnym
                    </h6>

                    {/* Calculate deposit: 500 zł + protections, or full payment for First Minute */}
                    {(() => {
                      // Check if First Minute promotion is selected
                      const promotionName = reservation.promotion_name || reservation.selected_promotion || '';
                      const isFirstMinute = promotionName.toLowerCase().includes('first minute') ||
                                          promotionName.toLowerCase().includes('firstminute') ||
                                          promotionName.toLowerCase().includes('wczesna rezerwacja');

                      const baseDeposit = 500;
                      // Calculate protection prices from API data
                      const protectionItems: Array<{ name: string; price: number }> = [];
                      if (reservation.selected_protection) {
                        const selectedProtections = Array.isArray(reservation.selected_protection)
                          ? reservation.selected_protection
                          : typeof reservation.selected_protection === 'string'
                            ? JSON.parse(reservation.selected_protection || '[]')
                            : [];

                        // Get protection prices from API (protections state)
                        selectedProtections.forEach((prot: string) => {
                          let generalProtectionId: number | null = null;
                          if (typeof prot === 'string' && prot.startsWith('protection-')) {
                            const numericId = parseInt(prot.split('-')[1], 10);
                            if (!isNaN(numericId)) {
                              generalProtectionId = numericId;
                            }
                          } else {
                            const parsedId = typeof prot === 'number' ? prot : parseInt(String(prot));
                            if (!isNaN(parsedId)) {
                              generalProtectionId = parsedId;
                            }
                          }

                          if (generalProtectionId) {
                            const protection = protections.get(generalProtectionId);
                            if (protection) {
                              protectionItems.push({ name: protection.name, price: protection.price });
                            }
                          }
                        });
                      }
                      const protectionTotal = protectionItems.reduce((sum, item) => sum + item.price, 0);
                      const totalDeposit = baseDeposit + protectionTotal;

                      // For First Minute, show full payment instead of deposit
                      const paymentAmount = isFirstMinute ? (reservation.total_price || 0) : totalDeposit;

                      return (
                        <div className="space-y-3 sm:space-y-4">
                          <div className="bg-white p-3 sm:p-4 rounded border border-blue-200">
                            <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                              {isFirstMinute ? 'Kwota do wpłaty (pełna płatność):' : 'Zaliczka do wpłaty:'}
                            </p>
                            <div className="space-y-1 text-xs sm:text-sm">
                              {isFirstMinute ? (
                                <div className="flex justify-between pt-2">
                                  <span className="font-semibold text-gray-900">Całkowita kwota do zapłaty:</span>
                                  <span className="font-bold text-[#03adf0]">{paymentAmount.toFixed(2)} zł</span>
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Zaliczka podstawowa:</span>
                                    <span className="font-medium text-gray-900">{baseDeposit.toFixed(2)} zł</span>
                                  </div>
                                  {protectionItems.map((item, index) => (
                                    <div key={index} className="flex justify-between">
                                      <span className="text-gray-600">Ochrona: {item.name}</span>
                                      <span className="font-medium text-gray-900">+{item.price.toFixed(2)} zł</span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between pt-2 border-t border-gray-200">
                                    <span className="font-semibold text-gray-900">Razem zaliczka:</span>
                                    <span className="font-bold text-[#03adf0]">{totalDeposit.toFixed(2)} zł</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {bankAccount && (
                            <div className="bg-white p-3 sm:p-4 rounded border border-blue-200">
                              <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Dane do przelewu:</p>
                              <div className="space-y-1.5 text-xs sm:text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">Odbiorca:</span>
                                  <span className="ml-2 text-gray-900">{bankAccount.account_holder}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Numer konta:</span>
                                  <span className="ml-2 text-gray-900 font-mono">{bankAccount.account_number}</span>
                                </div>
                                {bankAccount.bank_name && (
                                  <div>
                                    <span className="font-medium text-gray-700">Bank:</span>
                                    <span className="ml-2 text-gray-900">{bankAccount.bank_name}</span>
                                  </div>
                                )}
                                {bankAccount.address && (
                                  <div>
                                    <span className="font-medium text-gray-700">Adres:</span>
                                    <span className="ml-2 text-gray-900">{bankAccount.address}</span>
                                  </div>
                                )}
                                <div className="pt-2 border-t border-gray-200">
                                  <span className="font-medium text-gray-700">Tytuł przelewu:</span>
                                  <p className="mt-1 text-gray-900">{transferTitle || '—'}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>

          <DashedLine />
        </>
      )}

      {/* Toggle Details Button */}
      <div className={`text-center ${isDetailsExpanded ? 'pt-3 sm:pt-4' : ''}`}>
        {isDetailsExpanded ? (
          <button
            onClick={onToggleDetails}
            className="text-xs sm:text-sm text-[#03adf0] hover:text-[#0288c7] flex items-center gap-1 mx-auto transition-colors"
          >
            ukryj szczegóły rezerwacji
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => {
              router.push(`${basePath}/aktualne-rezerwacje/${reservationNumber}`);
            }}
            className="text-xs sm:text-sm text-[#03adf0] hover:text-[#0288c7] flex items-center gap-1 mx-auto transition-colors"
          >
            pokaż szczegóły rezerwacji
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4 transition-transform rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>
      </div>

      {showJustificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Uzasadnienie promocji</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Dodaj jednorazowo uzasadnienie wybranej promocji. Po zapisaniu nie będzie można go zmienić.
            </p>

            {justificationError && (
              <div className="mb-3 text-xs sm:text-sm text-red-600">{justificationError}</div>
            )}

            {(() => {
              const promotionName = reservation.promotion_name || reservation.selected_promotion || '';
              const type = getPromotionType(promotionName);

              if (!requiresJustification(promotionName)) {
                return (
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">
                      Uzasadnienie (krótki opis) *
                    </label>
                    <textarea
                      value={justificationDraft.reason || ''}
                      onChange={(e) => setJustificationDraft({
                        ...justificationDraft,
                        reason: e.target.value,
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      placeholder="Wpisz krótkie uzasadnienie"
                      rows={3}
                    />
                  </div>
                );
              }

              if (type === 'duza_rodzina') {
                return (
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">
                      Numer karty dużej rodziny *
                    </label>
                    <input
                      type="text"
                      value={justificationDraft.card_number || ''}
                      onChange={(e) => setJustificationDraft({
                        ...justificationDraft,
                        card_number: e.target.value,
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      placeholder="Wpisz numer karty"
                    />
                  </div>
                );
              }

              if (type === 'rodzenstwo_razem') {
                return (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700">
                        Imię rodzeństwa *
                      </label>
                      <input
                        type="text"
                        value={justificationDraft.sibling_first_name || ''}
                        onChange={(e) => setJustificationDraft({
                          ...justificationDraft,
                          sibling_first_name: e.target.value,
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        placeholder="Wpisz imię rodzeństwa"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700">
                        Nazwisko rodzeństwa *
                      </label>
                      <input
                        type="text"
                        value={justificationDraft.sibling_last_name || ''}
                        onChange={(e) => setJustificationDraft({
                          ...justificationDraft,
                          sibling_last_name: e.target.value,
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        placeholder="Wpisz nazwisko rodzeństwa"
                      />
                    </div>
                  </div>
                );
              }

              if (type === 'obozy_na_maxa') {
                return (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700">
                        Data pierwszego obozu
                      </label>
                      <input
                        type="text"
                        value={justificationDraft.first_camp_date || ''}
                        onChange={(e) => setJustificationDraft({
                          ...justificationDraft,
                          first_camp_date: e.target.value,
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        placeholder="DD.MM.RRRR"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700">
                        Nazwa pierwszego obozu
                      </label>
                      <input
                        type="text"
                        value={justificationDraft.first_camp_name || ''}
                        onChange={(e) => setJustificationDraft({
                          ...justificationDraft,
                          first_camp_name: e.target.value,
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                        placeholder="Podaj nazwę obozu"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Wystarczy wypełnić datę lub nazwę pierwszego obozu.
                    </p>
                  </div>
                );
              }

              if (type === 'first_minute') {
                return (
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">
                      Powód wyboru promocji First Minute *
                    </label>
                    <input
                      type="text"
                      value={justificationDraft.reason || ''}
                      onChange={(e) => setJustificationDraft({
                        ...justificationDraft,
                        reason: e.target.value,
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      placeholder="Napisz krótki powód"
                    />
                  </div>
                );
              }

              if (type === 'bonowych') {
                return (
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">
                      Lata uczestnictwa *
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(justificationDraft.years) ? justificationDraft.years.join(', ') : (justificationDraft.years || '')}
                      onChange={(e) => setJustificationDraft({
                        ...justificationDraft,
                        years: e.target.value,
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                      placeholder="Np. 2022, 2023"
                    />
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">
                    Uzasadnienie *
                  </label>
                  <textarea
                    value={justificationDraft.reason || ''}
                    onChange={(e) => setJustificationDraft({
                      ...justificationDraft,
                      reason: e.target.value,
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03adf0]"
                    placeholder="Wpisz uzasadnienie"
                    rows={3}
                  />
                </div>
              );
            })()}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowJustificationModal(false);
                  setJustificationError(null);
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100"
                disabled={savingJustification}
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={async () => {
                  setJustificationError(null);
                  const valid = validateJustificationDraft();
                  if (!valid) return;

                  try {
                    setSavingJustification(true);
                    const updated = await reservationService.addPromotionJustification(
                      reservation.id,
                      justificationDraft,
                    );
                    if (onReservationUpdate) {
                      onReservationUpdate(updated);
                    }
                    setShowJustificationModal(false);
                  } catch (err: any) {
                    setJustificationError(err?.message || 'Nie udało się zapisać uzasadnienia.');
                  } finally {
                    setSavingJustification(false);
                  }
                }}
                className="px-4 py-2 text-sm bg-[#03adf0] text-white rounded hover:bg-[#0288c7] disabled:opacity-60"
                disabled={savingJustification}
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
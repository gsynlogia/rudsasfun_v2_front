'use client';

import { Save } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { useToast } from '@/components/ToastContainer';
import type { ReservationData } from '@/lib/contractReservationMapping';
import {
  mapReservationToQualificationForm,
  signedPayloadOverlayOnly,
  type SignedQualificationPayload,
} from '@/lib/qualificationReservationMapping';

function parseDetailToTags(detail: string | null | undefined): string[] {
  if (!detail || typeof detail !== 'string') return [];
  return detail.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Normalizuje datę urodzenia do YYYY-MM-DD (dla input type="date"). */
function toDateInputValue(dob: string | null | undefined): string {
  if (!dob || typeof dob !== 'string') return '';
  const raw = dob.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;
  const ddmmyyyy = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
  }
  return '';
}

export interface QualificationCardEditPanelReservation {
  id: number;
  reservation_number?: string;
  participant_first_name?: string | null;
  participant_last_name?: string | null;
  participant_age?: string | null;
  participant_city?: string | null;
  parents_data?: Array<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    phoneNumber?: string;
    street?: string;
    city?: string;
    postalCode?: string;
  }> | null;
  health_questions?: Record<string, string> | null;
  health_details?: Record<string, string> | null;
  additional_notes?: string | null;
  accommodation_request?: string | null;
  participant_additional_info?: string | null;
  property_start_date?: string | null;
  property_end_date?: string | null;
  camp_name?: string | null;
  property_name?: string | null;
  property_city?: string | null;
}

interface AuthorizationRow {
  fullName: string;
  documentType: 'dowód osobisty' | 'paszport';
  documentNumber: string;
  canPickup: boolean;
  canTemporaryPickup: boolean;
}

interface QualificationCardEditPanelProps {
  reservation: QualificationCardEditPanelReservation;
  /** JSON form_snapshot z bazy (overlay gdy brak signedPayload) */
  formSnapshotFromDb?: string | null;
  /** Payload z signed_documents (overlay) */
  signedPayload?: SignedQualificationPayload | null;
  onSaveAdmin: (body: {
    reservation_partial: Record<string, unknown>;
    card_data: Record<string, unknown>;
    sections_edited: string[];
  }) => Promise<void>;
  onClose?: () => void;
}

export function QualificationCardEditPanel({
  reservation,
  formSnapshotFromDb,
  signedPayload,
  onSaveAdmin,
  onClose,
}: QualificationCardEditPanelProps) {
  const { showSuccess, showError: showErrorToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const reservationData = mapReservationToQualificationForm(reservation as unknown as ReservationData);
  const parentCount = reservationData?.parentCount ?? 0;

  let overlay: ReturnType<typeof signedPayloadOverlayOnly> = null;
  if (formSnapshotFromDb?.trim()) {
    try {
      const payload = JSON.parse(formSnapshotFromDb) as SignedQualificationPayload;
      overlay = signedPayloadOverlayOnly(payload);
    } catch {
      overlay = signedPayloadOverlayOnly(signedPayload ?? undefined);
    }
  } else {
    overlay = signedPayloadOverlayOnly(signedPayload ?? undefined);
  }

  const hq = reservation.health_questions ?? {};
  const hd = reservation.health_details ?? {};

  const [childPesel, setChildPesel] = useState('');
  const [childDOB, setChildDOB] = useState('');
  const [noSecondParent, setNoSecondParent] = useState(false);
  const [secondParentName, setSecondParentName] = useState('');
  const [secondParentAddress, setSecondParentAddress] = useState('');
  const [secondParentPhone, setSecondParentPhone] = useState('');
  const [healthChronicTags, setHealthChronicTags] = useState<string[]>([]);
  const [healthDysfunctionsTags, setHealthDysfunctionsTags] = useState<string[]>([]);
  const [healthPsychiatricTags, setHealthPsychiatricTags] = useState<string[]>([]);
  const [healthAdditionalNotes, setHealthAdditionalNotes] = useState('');
  const [vaccination, setVaccination] = useState({
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
  });
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [vaccineInfo, setVaccineInfo] = useState('');
  const [regulationConfirm, setRegulationConfirm] = useState(false);
  const [authorizations, setAuthorizations] = useState<AuthorizationRow[]>([
    { fullName: '', documentType: 'dowód osobisty', documentNumber: '', canPickup: false, canTemporaryPickup: false },
  ]);

  useEffect(() => {
    setHealthChronicTags(parseDetailToTags((hd as { chronicDiseases?: string }).chronicDiseases));
    setHealthDysfunctionsTags(parseDetailToTags((hd as { dysfunctions?: string }).dysfunctions));
    setHealthPsychiatricTags(parseDetailToTags((hd as { psychiatric?: string }).psychiatric));
    setHealthAdditionalNotes((reservation.additional_notes ?? '').trim());
    setAdditionalInfo((reservationData?.additionalInfo ?? '').trim());
    setVaccineInfo((reservationData?.accommodationRequest ?? reservation.accommodation_request ?? '').trim());
  }, [reservation.id, reservation.health_details, reservation.additional_notes, reservation.accommodation_request, reservationData?.additionalInfo, reservationData?.accommodationRequest]);

  useEffect(() => {
    let payload: SignedQualificationPayload | undefined;
    if (formSnapshotFromDb?.trim()) {
      try {
        payload = JSON.parse(formSnapshotFromDb) as SignedQualificationPayload;
      } catch {
        payload = signedPayload ?? undefined;
      }
    } else {
      payload = signedPayload ?? undefined;
    }
    const dobFromPayload = payload?.sekcjaI?.uczestnik?.dataUrodzenia?.trim();
    setChildDOB(dobFromPayload ?? reservationData?.childDOB ?? '');
  }, [formSnapshotFromDb, signedPayload, reservationData?.childDOB]);

  useEffect(() => {
    setChildPesel(reservationData?.childPesel ?? '');
    if (overlay?.childPesel !== undefined && overlay.childPesel !== '') setChildPesel(overlay.childPesel);
    if (overlay?.secondParent) {
      setSecondParentName(overlay.secondParent.name);
      setSecondParentAddress(overlay.secondParent.address);
      setSecondParentPhone(overlay.secondParent.phone);
      setNoSecondParent(false);
    } else if ((reservationData?.secondParentName !== null && reservationData?.secondParentName !== undefined) || (reservationData?.secondParentAddress !== null && reservationData?.secondParentAddress !== undefined)) {
      setSecondParentName(reservationData.secondParentName ?? '');
      setSecondParentAddress(reservationData.secondParentAddress ?? '');
      setSecondParentPhone(reservationData.secondParentPhone ?? '');
    }
    if (overlay?.vaccination) setVaccination(overlay.vaccination);
    if (overlay?.regulationConfirm !== undefined) setRegulationConfirm(overlay.regulationConfirm);
    if (overlay?.authorizations?.length) setAuthorizations(overlay.authorizations);
  }, [overlay, reservationData?.childPesel, reservationData?.secondParentName, reservationData?.secondParentAddress, reservationData?.secondParentPhone]);

  const buildPayload = useCallback(() => {
    const childName = reservationData?.childName ?? '';
    const childAddress = reservationData?.childAddress ?? '';
    const turnName = reservationData?.turnName ?? '';
    const campLocation = reservationData?.campLocation ?? '';
    const campDates = reservationData?.campDates ?? '';
    const parentNames = reservationData?.parentNames ?? '';
    const parentAddress = reservationData?.parentAddress ?? '';
    const parentPhone = reservationData?.parentPhone ?? '';
    const drugiOpiekun =
      parentCount === 1 && !noSecondParent && (secondParentName.trim() || secondParentAddress.trim() || secondParentPhone.trim())
        ? { imieNazwisko: secondParentName.trim(), adres: secondParentAddress.trim(), telefon: secondParentPhone.trim() }
        : null;
    return {
      signedAt: new Date().toISOString(),
      numerRezerwacji: reservationData?.reservationId ?? '',
      sekcjaI: {
        nazwaTurnusu: turnName,
        miejsceKoloniiObozu: campLocation,
        termin: campDates,
        uczestnik: {
          imieNazwisko: childName,
          dataUrodzenia: childDOB.trim() || (reservationData?.childDOB ?? ''),
          pesel: vaccination.measles ? '' : childPesel.trim(),
          adres: childAddress,
        },
        opiekunowie: { imionaNazwiska: parentNames, adres: parentAddress, telefon: parentPhone },
        drugiOpiekun,
      },
      sekcjaII_stanZdrowia: {
        chorobyPrzewlekle: healthChronicTags,
        dysfunkcje: healthDysfunctionsTags,
        problemyPsychiatryczne: healthPsychiatricTags,
        dodatkoweInformacje: healthAdditionalNotes,
        tekstZbiorczy: '',
      },
      sekcjaII_szczepienia: {
        zgodnieZKalendarzem: vaccination.calendar,
        tezec: vaccination.tetanus,
        tezecRok: vaccination.tetanusYear,
        odra: vaccination.measles,
        odraRok: vaccination.measlesYear,
        blonica: vaccination.diphtheria,
        blonicaRok: vaccination.diphtheriaYear,
        inne: vaccination.other,
        inneRok: vaccination.otherYear,
        inneSzczegoly: vaccination.otherDetails,
      },
      sekcjaIII: { informacjeDodatkowe: additionalInfo, deklaracjaOpiekuna: '' },
      sekcjaIV: {
        wniosekOZakwaterowanie: vaccineInfo,
        potwierdzenieRegulaminu: regulationConfirm,
        odbiorDziecka: '',
        zgodaNaSamodzielnyPowrot: false,
      },
      upowaznienia: authorizations.map((a) => ({
        imieNazwisko: a.fullName,
        typDokumentu: a.documentType,
        numerDokumentu: a.documentNumber,
        odbiorStaly: a.canPickup,
        odbiorTymczasowy: a.canTemporaryPickup,
      })),
      potwierdzenieKierownika: '',
      dataKierownika: '',
      podpisKierownika: '',
      podpisOrganizatora: '',
    };
  }, [
    reservationData,
    childDOB,
    parentCount,
    noSecondParent,
    secondParentName,
    secondParentAddress,
    secondParentPhone,
    childPesel,
    healthChronicTags,
    healthDysfunctionsTags,
    healthPsychiatricTags,
    healthAdditionalNotes,
    vaccination,
    additionalInfo,
    vaccineInfo,
    regulationConfirm,
    authorizations,
  ]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
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
      const reservation_partial = {
        health_questions,
        health_details,
        additional_notes: healthAdditionalNotes.trim() || null,
        accommodation_request: vaccineInfo.trim() || null,
        participant_additional_info: additionalInfo.trim() || null,
      };
      const parts = secondParentName.trim().split(/\s+/);
      const parent2_first_name = parts[0] ?? '';
      const parent2_last_name = parts.slice(1).join(' ') ?? '';
      const payload = buildPayload();
      const card_data: Record<string, unknown> = {
        participant_pesel: vaccination.measles ? null : (childPesel.trim() || null),
        participant_birth_date: childDOB.trim() || null,
        parent2_first_name: secondParentName.trim() ? parent2_first_name : null,
        parent2_last_name: secondParentName.trim() ? parent2_last_name : null,
        parent2_street: secondParentAddress.trim() || null,
        parent2_phone: secondParentPhone.trim() || null,
        form_snapshot: payload,
      };
      await onSaveAdmin({ reservation_partial, card_data, sections_edited: ['Karta kwalifikacyjna'] });
      showSuccess('Karta kwalifikacyjna zaktualizowana. Wymagany ponowny podpis klienta.');
      onClose?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Błąd zapisu';
      showErrorToast(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const [newChronicTag, setNewChronicTag] = useState('');
  const [newDysfunctionsTag, setNewDysfunctionsTag] = useState('');
  const [newPsychiatricTag, setNewPsychiatricTag] = useState('');

  const addTag = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    const v = value.trim();
    if (!v) return;
    setter((prev) => (prev.includes(v) ? prev : [...prev, v]));
  };

  const removeTag = (setter: React.Dispatch<React.SetStateAction<string[]>>, tag: string) => {
    setter((prev) => prev.filter((t) => t !== tag));
  };

  const addAuthorization = () => {
    setAuthorizations((prev) => [
      ...prev,
      { fullName: '', documentType: 'dowód osobisty', documentNumber: '', canPickup: false, canTemporaryPickup: false },
    ]);
  };

  const removeAuthorization = (index: number) => {
    if (authorizations.length <= 1) return;
    setAuthorizations((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAuthorization = (index: number, field: keyof AuthorizationRow, value: string | boolean) => {
    setAuthorizations((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('pl-PL');
    } catch {
      return null;
    }
  };
  const startFormatted = formatDate(reservation.property_start_date);
  const endFormatted = formatDate(reservation.property_end_date);
  const datesText = startFormatted && endFormatted ? `${startFormatted} – ${endFormatted}` : startFormatted || endFormatted || null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-3 mb-3 flex-shrink-0">
        <div className="min-w-0 text-sm text-gray-700">
          {reservation.camp_name && <span>Obóz: {reservation.camp_name}</span>}
          {reservation.property_name && (
            <span>{reservation.camp_name ? '. Turnus: ' : 'Turnus: '}{reservation.property_name}</span>
          )}
          {datesText && <span>{reservation.camp_name || reservation.property_name ? '. Daty: ' : 'Daty: '}{datesText}</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onClose && (
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-none">
              Zamknij
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 rounded-none text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Zapisywanie...' : 'Zapisz'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto min-h-0 space-y-6 pb-4">
        {/* Uczestnik */}
        <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Uczestnik</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Imię i nazwisko</label>
              <div className="py-2 text-sm text-gray-900 bg-gray-100 rounded-none">
                {reservationData?.childName || '—'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">2) Data urodzenia uczestnika/dziecka</label>
              <input
                type="date"
                value={toDateInputValue(childDOB)}
                onChange={(e) => setChildDOB(e.target.value)}
                className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm bg-white"
                aria-label="Data urodzenia uczestnika"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">3) PESEL uczestnika/dziecka</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={vaccination.measles ? '' : childPesel}
                readOnly={vaccination.measles}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setChildPesel(v);
                }}
                className={`w-full border border-gray-300 rounded-none px-3 py-2 text-sm bg-white ${vaccination.measles ? 'bg-amber-50 text-gray-500' : ''}`}
                placeholder={vaccination.measles ? 'xxxxxxxxxxx' : 'np. 12345678901'}
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vaccination.measles}
                  onChange={(e) => setVaccination((v) => ({ ...v, measles: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-800">Dziecko nie posiada numeru PESEL</span>
              </label>
              {vaccination.measles && (
                <input
                  type="text"
                  value={vaccination.measlesYear}
                  onChange={(e) => setVaccination((v) => ({ ...v, measlesYear: e.target.value }))}
                  placeholder="rok"
                  className="w-20 border border-gray-300 rounded-none px-2 py-1.5 text-sm bg-amber-50"
                  aria-label="Rok urodzenia (gdy brak PESEL)"
                />
              )}
            </div>
          </div>
        </section>

        {/* Dwie kolumny: lewa = Drugi opiekun + Informacje dodatkowe; prawa = Stan zdrowia + Szczepienia */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Lewa kolumna: Drugi opiekun (gdy 1) + Informacje dodatkowe i deklaracja */}
          <div className="space-y-4">
            {parentCount === 1 && (
              <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Drugi opiekun</h3>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={noSecondParent}
                    onChange={(e) => setNoSecondParent(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Brak drugiego opiekuna</span>
                </label>
                {!noSecondParent && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Imię i nazwisko</label>
                      <input
                        type="text"
                        value={secondParentName}
                        onChange={(e) => setSecondParentName(e.target.value)}
                        className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Adres</label>
                      <input
                        type="text"
                        value={secondParentAddress}
                        onChange={(e) => setSecondParentAddress(e.target.value)}
                        className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                      <input
                        type="text"
                        value={secondParentPhone}
                        onChange={(e) => setSecondParentPhone(e.target.value)}
                        className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Informacje dodatkowe – lewa kolumna */}
            <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Informacje dodatkowe</h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Informacje dodatkowe</label>
                <textarea value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm" />
              </div>
            </section>

            {/* Wniosek o zakwaterowanie i zgody – pod Informacjami dodatkowymi, lewa kolumna */}
            <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Wniosek o zakwaterowanie i zgody</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Wniosek o zakwaterowanie</label>
                  <textarea value={vaccineInfo} onChange={(e) => setVaccineInfo(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm" />
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={regulationConfirm} onChange={(e) => setRegulationConfirm(e.target.checked)} className="rounded border-gray-300" />
                  <span className="text-sm">Potwierdzenie zapoznania z regulaminem</span>
                </label>
              </div>
            </section>
          </div>

          {/* Prawa kolumna: Stan zdrowia + Szczepienia */}
          <div className="space-y-4">
            {/* Stan zdrowia */}
            <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Stan zdrowia</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Choroby przewlekłe</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {healthChronicTags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-none text-sm">
                    {t}
                    <button type="button" onClick={() => removeTag(setHealthChronicTags, t)} className="text-gray-600 hover:text-red-600">×</button>
                  </span>
                ))}
                <input
                  type="text"
                  value={newChronicTag}
                  onChange={(e) => setNewChronicTag(e.target.value)}
                  className="min-w-[50%] flex-1 border border-gray-300 rounded-none px-2 py-1 text-sm"
                  placeholder="Dodaj"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(setHealthChronicTags, newChronicTag);
                      setNewChronicTag('');
                    }
                  }}
                />
                <button type="button" onClick={() => { addTag(setHealthChronicTags, newChronicTag); setNewChronicTag(''); }} className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-none">
                  Dodaj
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dysfunkcje</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {healthDysfunctionsTags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-none text-sm">
                    {t}
                    <button type="button" onClick={() => removeTag(setHealthDysfunctionsTags, t)} className="text-gray-600 hover:text-red-600">×</button>
                  </span>
                ))}
                <input
                  type="text"
                  value={newDysfunctionsTag}
                  onChange={(e) => setNewDysfunctionsTag(e.target.value)}
                  className="min-w-[50%] flex-1 border border-gray-300 rounded-none px-2 py-1 text-sm"
                  placeholder="Dodaj"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(setHealthDysfunctionsTags, newDysfunctionsTag);
                      setNewDysfunctionsTag('');
                    }
                  }}
                />
                <button type="button" onClick={() => { addTag(setHealthDysfunctionsTags, newDysfunctionsTag); setNewDysfunctionsTag(''); }} className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-none">
                  Dodaj
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Problemy psychiatryczne</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {healthPsychiatricTags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-none text-sm">
                    {t}
                    <button type="button" onClick={() => removeTag(setHealthPsychiatricTags, t)} className="text-gray-600 hover:text-red-600">×</button>
                  </span>
                ))}
                <input
                  type="text"
                  value={newPsychiatricTag}
                  onChange={(e) => setNewPsychiatricTag(e.target.value)}
                  className="min-w-[50%] flex-1 border border-gray-300 rounded-none px-2 py-1 text-sm"
                  placeholder="Dodaj"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(setHealthPsychiatricTags, newPsychiatricTag);
                      setNewPsychiatricTag('');
                    }
                  }}
                />
                <button type="button" onClick={() => { addTag(setHealthPsychiatricTags, newPsychiatricTag); setNewPsychiatricTag(''); }} className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-none">
                  Dodaj
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dodatkowe informacje (stan zdrowia)</label>
              <textarea
                value={healthAdditionalNotes}
                onChange={(e) => setHealthAdditionalNotes(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
              />
            </div>
          </div>
            </section>

            {/* Szczepienia – pod Stanem zdrowia, prawa kolumna. Pola „Rok” tylko gdy NIE zaznaczono „Zgodnie z kalendarzem” i dana choroba jest zaznaczona. Inne: przy kalendarzu tylko „podać jakie”. */}
            <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Szczepienia</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={vaccination.calendar} onChange={(e) => setVaccination((v) => ({ ...v, calendar: e.target.checked }))} className="rounded border-gray-300" />
                  <span className="text-sm">Zgodnie z kalendarzem szczepień</span>
                </label>
                <label className="flex items-center gap-2 flex-wrap">
                  <input type="checkbox" checked={vaccination.tetanus} onChange={(e) => setVaccination((v) => ({ ...v, tetanus: e.target.checked }))} className="rounded border-gray-300" />
                  <span className="text-sm">Tężec</span>
                  {vaccination.tetanus && !vaccination.calendar && (
                    <input type="text" value={vaccination.tetanusYear} onChange={(e) => setVaccination((v) => ({ ...v, tetanusYear: e.target.value }))} placeholder="Rok" className="w-20 border border-gray-300 rounded-none px-2 py-1 text-sm ml-2" />
                  )}
                </label>
                <label className="flex items-center gap-2 flex-wrap">
                  <input type="checkbox" checked={vaccination.measles} onChange={(e) => setVaccination((v) => ({ ...v, measles: e.target.checked }))} className="rounded border-gray-300" />
                  <span className="text-sm">Odra</span>
                  {vaccination.measles && !vaccination.calendar && (
                    <input type="text" value={vaccination.measlesYear} onChange={(e) => setVaccination((v) => ({ ...v, measlesYear: e.target.value }))} placeholder="Rok" className="w-20 border border-gray-300 rounded-none px-2 py-1 text-sm ml-2" />
                  )}
                </label>
                <label className="flex items-center gap-2 flex-wrap">
                  <input type="checkbox" checked={vaccination.diphtheria} onChange={(e) => setVaccination((v) => ({ ...v, diphtheria: e.target.checked }))} className="rounded border-gray-300" />
                  <span className="text-sm">Błonica</span>
                  {vaccination.diphtheria && !vaccination.calendar && (
                    <input type="text" value={vaccination.diphtheriaYear} onChange={(e) => setVaccination((v) => ({ ...v, diphtheriaYear: e.target.value }))} placeholder="Rok" className="w-20 border border-gray-300 rounded-none px-2 py-1 text-sm ml-2" />
                  )}
                </label>
                <label className="flex items-center gap-2 flex-wrap">
                  <input type="checkbox" checked={vaccination.other} onChange={(e) => setVaccination((v) => ({ ...v, other: e.target.checked }))} className="rounded border-gray-300" />
                  <span className="text-sm">Inne</span>
                  {vaccination.other && !vaccination.calendar && (
                    <input type="text" value={vaccination.otherYear} onChange={(e) => setVaccination((v) => ({ ...v, otherYear: e.target.value }))} placeholder="Rok" className="w-20 border border-gray-300 rounded-none px-2 py-1 text-sm ml-2" />
                  )}
                  {vaccination.other && (
                    <input type="text" value={vaccination.otherDetails} onChange={(e) => setVaccination((v) => ({ ...v, otherDetails: e.target.value }))} placeholder="podać jakie" className="flex-1 min-w-[8rem] border border-gray-300 rounded-none px-2 py-1 text-sm ml-2" />
                  )}
                </label>
              </div>
            </section>
          </div>
        </div>

        {/* Upoważnienia */}
        <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Upoważnienia do odbioru</h3>
          {authorizations.map((a, index) => (
            <div key={index} className="border border-gray-200 rounded-none p-3 mb-3 bg-white">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-600">Osoba {index + 1}</span>
                {authorizations.length > 1 && (
                  <button type="button" onClick={() => removeAuthorization(index)} className="text-red-600 text-sm hover:underline">
                    Usuń
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text" value={a.fullName} onChange={(e) => updateAuthorization(index, 'fullName', e.target.value)} placeholder="Imię i nazwisko" className="border border-gray-300 rounded-none px-2 py-1.5 text-sm" />
                <select value={a.documentType} onChange={(e) => updateAuthorization(index, 'documentType', e.target.value as 'dowód osobisty' | 'paszport')} className="border border-gray-300 rounded-none px-2 py-1.5 text-sm">
                  <option value="dowód osobisty">Dowód osobisty</option>
                  <option value="paszport">Paszport</option>
                </select>
                <input type="text" value={a.documentNumber} onChange={(e) => updateAuthorization(index, 'documentNumber', e.target.value)} placeholder="Numer dokumentu" className="border border-gray-300 rounded-none px-2 py-1.5 text-sm sm:col-span-2" />
                <label className="flex items-start gap-2 sm:col-span-2">
                  <input type="checkbox" checked={a.canPickup} onChange={(e) => updateAuthorization(index, 'canPickup', e.target.checked)} className="rounded border-gray-300 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Do odbioru dziecka z obozu: ośrodka i/lub miejsca zbiórki transportu zbiorowego</span>
                </label>
                <label className="flex items-start gap-2 sm:col-span-2">
                  <input type="checkbox" checked={a.canTemporaryPickup} onChange={(e) => updateAuthorization(index, 'canTemporaryPickup', e.target.checked)} className="rounded border-gray-300 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Odwiedzin dziecka i/lub zabrania go poza teren ośrodka na określony czas, w trakcie trwania obozu</span>
                </label>
              </div>
            </div>
          ))}
          <button type="button" onClick={addAuthorization} className="text-sm text-[#03adf0] hover:underline">
            + Dodaj upoważnienie
          </button>
        </section>
      </div>
    </div>
  );
}
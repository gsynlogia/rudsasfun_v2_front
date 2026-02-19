'use client';

import { Edit, X, FileText, Download, Upload, Trash2, User, CheckCircle2, CheckCircle, XCircle, SquarePen, Mic, Play } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { ContractEditPanel } from '@/components/admin/ContractEditPanel';
import { QualificationTemplateNew } from '@/components/admin/QualificationTemplateNew';
import { ReservationDetailRightSidebar, RIGHT_SIDEBAR_WIDTH } from '@/components/admin/ReservationDetailRightSidebar';
import SectionGuard from '@/components/admin/SectionGuard';
import UniversalModal from '@/components/admin/UniversalModal';
import { ContractForm } from '@/components/profile/ContractForm';
import { useToast } from '@/components/ToastContainer';
import { useAdminRightPanel } from '@/context/AdminRightPanelContext';
import type { ReservationData } from '@/lib/contractReservationMapping';
import { mapReservationToContractForm } from '@/lib/contractReservationMapping';
import { mapReservationToQualificationForm, type SignedQualificationPayload } from '@/lib/qualificationReservationMapping';
import { contractArchiveService, type ContractArchiveVersionItem } from '@/lib/services/ContractArchiveService';
import { contractService } from '@/lib/services/ContractService';
import { manualPaymentService, ManualPaymentResponse } from '@/lib/services/ManualPaymentService';
import { paymentService, PaymentResponse } from '@/lib/services/PaymentService';
import { qualificationCardService } from '@/lib/services/QualificationCardService';
import { authenticatedApiCall } from '@/utils/api-auth';

import { PaymentsPanel } from './_reservation-detail/components/PaymentsPanel';
import { QualificationCardEditPanelLoader } from './_reservation-detail/components/QualificationCardEditPanelLoader';
import { RejectDocumentPanelContent } from './_reservation-detail/components/RejectDocumentPanelContent';
import { ReservationDetailHeader } from './_reservation-detail/components/ReservationDetailHeader';
import { RESERVATION_PANELS, type PanelId } from './_reservation-detail/constants';
import type {
  ReservationDetails,
  Addon,
  Protection,
  Promotion,
  PromotionOption,
  Diet,
  ReservationNote,
  SpeechRecognitionResultEventLike,
  SpeechRecognitionLike,
} from './_reservation-detail/types';

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useToast();
  const { openDocument, close: closeRightPanel } = useAdminRightPanel();
  // params.id contains the reservation number (e.g., REZ-2025-001)
  const reservationNumber = typeof params?.id === 'string'
    ? params.id
    : Array.isArray(params?.id)
      ? params.id[0]
      : '';

  // Get fromPage param to return to correct pagination page
  const fromPage = searchParams?.get('fromPage');

  // Get all filter params to preserve filters when returning
  const filterParams = new URLSearchParams();
  searchParams?.forEach((value, key) => {
    if (key.startsWith('filter_')) {
      filterParams.set(key, value);
    }
  });

  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [_addons, setAddons] = useState<Map<number, Addon>>(new Map());
  const [_protections, setProtections] = useState<Map<number, Protection>>(new Map());
  const [promotions, setPromotions] = useState<Map<number, Promotion>>(new Map());
  const [promotionOptions, setPromotionOptions] = useState<PromotionOption[]>([]);
  const [promotionDraftId, setPromotionDraftId] = useState<number | null>(null);
  const [pendingPromotionId, setPendingPromotionId] = useState<number | null>(null);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [savingPromotion, setSavingPromotion] = useState(false);
  const [_diets, setDiets] = useState<Map<number, Diet>>(new Map());
  const [transportCities, setTransportCities] = useState<Array<{ id: number; city: string; departure_price: number | null; return_price: number | null }>>([]);
  // Dostępne opcje dla turnusu (do wyświetlania nawet gdy rezerwacja nie ma wybranych)
  const [availableProtections, setAvailableProtections] = useState<Protection[]>([]);
  const [availableAddons, setAvailableAddons] = useState<Addon[]>([]);
  const [turnusDietsList, setTurnusDietsList] = useState<Array<{ id: number; relation_id?: number; name: string; price?: number }>>([]);
  const [sourcesList, setSourcesList] = useState<Array<{ id: number; name: string }>>([]);
  const [savingAddons, setSavingAddons] = useState(false);
  /** Lokalny stan wybranych dodatków (tylko UI). Zapis do API wyłącznie po kliku „Zapisz”. */
  const [addonsDraft, setAddonsDraft] = useState<number[]>([]);
  const [addonsDraftDirty, setAddonsDraftDirty] = useState(false);
  const [savingProtection, setSavingProtection] = useState(false);
  /** Lokalny stan wybranych pakietów ochrony (tylko UI). Zapis do API wyłącznie po kliku „Zapisz”. */
  const [protectionDraft, setProtectionDraft] = useState<number[]>([]);
  const [protectionDraftDirty, setProtectionDraftDirty] = useState(false);
  const [savingDiet, setSavingDiet] = useState(false);
  /** Lokalny stan diety (tylko UI). Zapis do API wyłącznie po kliku „Zapisz”. */
  const [dietDraft, setDietDraft] = useState<number | null>(null);
  const [savingSource, setSavingSource] = useState(false);
  /** Lokalny stan źródła (tylko UI). Zapis do API wyłącznie po kliku „Zapisz”. */
  const [sourceDraft, setSourceDraft] = useState<{ selected_source: string; source_inne_text: string | null }>({ selected_source: '', source_inne_text: null });
  const [savingTransport, setSavingTransport] = useState(false);
  /** Lokalny stan transportu (tylko UI). Zapis do API wyłącznie po kliku „Zapisz”. */
  const [transportDraft, setTransportDraft] = useState<{
    departure_type: string;
    departure_city: string | null;
    departure_transport_city_id: number | null;
    return_type: string;
    return_city: string | null;
    return_transport_city_id: number | null;
    transport_different_cities: boolean;
  }>({
    departure_type: 'wlasny',
    departure_city: null,
    departure_transport_city_id: null,
    return_type: 'wlasny',
    return_city: null,
    return_transport_city_id: null,
    transport_different_cities: false,
  });
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invoiceDraft, setInvoiceDraft] = useState<{
    wants_invoice?: boolean;
    invoice_type: string;
    invoice_company_name?: string | null;
    invoice_nip?: string | null;
    invoice_first_name?: string | null;
    invoice_last_name?: string | null;
    invoice_email?: string | null;
    invoice_phone?: string | null;
    invoice_street?: string | null;
    invoice_postal_code?: string | null;
    invoice_city?: string | null;
  }>({ wants_invoice: false, invoice_type: 'private' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractFiles, setContractFiles] = useState<any[]>([]);
  const [cardFiles, setCardFiles] = useState<any[]>([]);
  const [latestSignedContract, setLatestSignedContract] = useState<{ id: number; status: string; client_message: string | null } | null>(null);
  const [latestSignedCard, setLatestSignedCard] = useState<{ id: number; status: string; client_message: string | null; reverted_after_approval?: number } | null>(null);
  const [qualificationCardSignedPayload, setQualificationCardSignedPayload] = useState<Record<string, unknown> | null>(null);
  const [contractSignedPayload, setContractSignedPayload] = useState<Record<string, unknown> | null>(null);
  const [contractArchiveVersions, setContractArchiveVersions] = useState<ContractArchiveVersionItem[]>([]);
  const [signedDocumentsList, setSignedDocumentsList] = useState<Array<{ id: number; document_type: string; status: string; client_message: string | null; created_at: string; updated_at: string; payload?: string | null }>>([]);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingReservation, setDeletingReservation] = useState(false);
  const [showJustificationModal, setShowJustificationModal] = useState(false);

  // Restore reservation states
  const [restoringReservation, setRestoringReservation] = useState(false);
  const [showNoSpotsModal, setShowNoSpotsModal] = useState(false);
  const [noSpotsMessage, setNoSpotsMessage] = useState('');
  const [editingJustification, setEditingJustification] = useState(false);
  const [justificationDraft, setJustificationDraft] = useState<Record<string, any>>({});
  const [savingJustification, setSavingJustification] = useState(false);
  const [justificationError, setJustificationError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [manualPayments, setManualPayments] = useState<ManualPaymentResponse[]>([]);

  // Notes state (admin only)
  const [notes, setNotes] = useState<ReservationNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSpeechListening, setNoteSpeechListening] = useState(false);
  const noteSpeechRecognitionRef = useRef<{ start: () => void; stop: () => void; abort: () => void } | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);

  /** Sekcja Opiekunowie (#dane): draft 1–2 opiekunów, edycja, zapis przez PATCH by-number/partial */
  interface GuardianEntry {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    street?: string;
    city?: string;
    postalCode?: string;
  }
  const [guardiansDraft, setGuardiansDraft] = useState<GuardianEntry[]>([]);
  const [editingGuardianIndex, setEditingGuardianIndex] = useState<number | null>(null);
  const [savingGuardians, setSavingGuardians] = useState(false);
  /** Modal usunięcia drugiego opiekuna: powód wymagany */
  const [showRemoveSecondGuardianModal, setShowRemoveSecondGuardianModal] = useState(false);
  const [removeSecondGuardianReason, setRemoveSecondGuardianReason] = useState('');
  const [removingSecondGuardian, setRemovingSecondGuardian] = useState(false);
  const [removeSecondGuardianError, setRemoveSecondGuardianError] = useState<string | null>(null);

  /** Zdarzenia klienta (system_events) – tylko dla bieżącej rezerwacji */
  interface ReservationEventItem {
    id: number;
    action: string;
    payload?: string | null;
    created_at?: string | null;
    author_display: string;
    author_role: string;
  }
  const [reservationEvents, setReservationEvents] = useState<ReservationEventItem[]>([]);
  const [loadingReservationEvents, setLoadingReservationEvents] = useState(false);

  /** Dane uczestnika – edycja (tylko edycja, bez usuwania) */
  const [editingParticipant, setEditingParticipant] = useState(false);
  const [participantDraft, setParticipantDraft] = useState({ participant_first_name: '', participant_last_name: '', participant_age: '', participant_gender: '', participant_city: '' });
  const [savingParticipant, setSavingParticipant] = useState(false);

  const [editingHealth, setEditingHealth] = useState(false);
  const [healthDraft, setHealthDraft] = useState<{ health_questions?: Record<string, unknown>; health_details?: Record<string, unknown>; additional_notes?: string }>({});
  const [savingHealth, setSavingHealth] = useState(false);

  const [activePanel, setActivePanel] = useState<PanelId>('platnosci');
  /** Przypomnij o podpisaniu (SMS / E-mail) – sekcja Dokumenty */
  const [remindSignSms, setRemindSignSms] = useState(false);
  const [remindSignEmail, setRemindSignEmail] = useState(true);
  const [remindSignLoading, setRemindSignLoading] = useState(false);
  /** Po zaakceptowaniu/odrzuceniu umowy – powiadom klienta (E-mail domyślnie, SMS opcjonalnie) */
  const [notifyContractEmail, setNotifyContractEmail] = useState(true);
  const [notifyContractSms, setNotifyContractSms] = useState(false);
  /** Przypomnij o podpisaniu karty kwalifikacyjnej (gdy brak podpisanego dokumentu) */
  const [remindCardSms, setRemindCardSms] = useState(false);
  const [remindCardEmail, setRemindCardEmail] = useState(true);
  const [remindCardLoading, setRemindCardLoading] = useState(false);
  /** Po zaakceptowaniu/odrzuceniu karty – powiadom klienta */
  const [notifyCardEmail, setNotifyCardEmail] = useState(true);
  const [notifyCardSms, setNotifyCardSms] = useState(false);
  /** Aneksy do umowy (admin – lista + Anuluj) */
  interface AnnexItem {
    id: number;
    reservation_id: number;
    change_type: string;
    description: string;
    status: string;
    cancellation_reason: string | null;
    created_at: string | null;
  }
  const [reservationAnnexes, setReservationAnnexes] = useState<AnnexItem[]>([]);
  const [cancelAnnexId, setCancelAnnexId] = useState<number | null>(null);
  const [cancelAnnexReason, setCancelAnnexReason] = useState('');
  const [cancelAnnexLoading, setCancelAnnexLoading] = useState(false);

  /** Sygnał do otwarcia panelu edycji umowy, gdy w hash jest #dokumenty/umowa-edycja. */
  const [contractEditStepFromHash, setContractEditStepFromHash] = useState<1 | null>(null);
  /** Zapobiega podwójnemu otwarciu panelu (przycisk vs. efekt po hash). */
  const openedContractEditFromHashRef = useRef(false);
  /** Sygnał do otwarcia panelu edycji karty, gdy w hash jest #dokumenty/karta-edycja. */
  const [cardEditFromHash, setCardEditFromHash] = useState(false);
  const openedCardEditFromHashRef = useRef(false);

  const setPanelFromHash = useCallback(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.slice(1);
    const parts = hash.split('/');
    const panelId = (parts[0] || '') as PanelId;
    const isPanelValid = RESERVATION_PANELS.some((p) => p.id === panelId);
    if (isPanelValid) {
      setActivePanel(panelId);
      if (panelId === 'dokumenty' && parts[1] === 'umowa-edycja') {
        setContractEditStepFromHash(1);
        setCardEditFromHash(false);
        openedCardEditFromHashRef.current = false;
      } else if (panelId === 'dokumenty' && parts[1] === 'karta-edycja') {
        setContractEditStepFromHash(null);
        openedContractEditFromHashRef.current = false;
        setCardEditFromHash(true);
      } else {
        setContractEditStepFromHash(null);
        setCardEditFromHash(false);
        openedContractEditFromHashRef.current = false;
        openedCardEditFromHashRef.current = false;
      }
    } else {
      setActivePanel('platnosci');
      if (!hash) window.history.replaceState(null, '', `${window.location.pathname}#platnosci`);
      setContractEditStepFromHash(null);
      setCardEditFromHash(false);
      openedContractEditFromHashRef.current = false;
      openedCardEditFromHashRef.current = false;
    }
  }, []);

  useEffect(() => {
    setPanelFromHash();
    window.addEventListener('hashchange', setPanelFromHash);
    return () => window.removeEventListener('hashchange', setPanelFromHash);
  }, [setPanelFromHash]);

  const goToPanel = useCallback((id: PanelId) => {
    if (typeof window !== 'undefined') {
      window.location.hash = id;
    }
    setActivePanel(id);
  }, []);

  const refetchReservation = useCallback(async () => {
    if (!reservationNumber) return;
    const data = await authenticatedApiCall<ReservationDetails>(`/api/reservations/by-number/${reservationNumber}`);
    setReservation(data);
  }, [reservationNumber]);

  const handleRemindSign = useCallback(async () => {
    if (!reservationNumber || (!remindSignSms && !remindSignEmail)) return;
    setRemindSignLoading(true);
    try {
      const res = await authenticatedApiCall<{ ok: boolean; sent_sms: boolean; sent_email: boolean; errors?: string[] }>(
        `/api/reservations/by-number/${reservationNumber}/remind-sign`,
        { method: 'POST', body: JSON.stringify({ send_sms: remindSignSms, send_email: remindSignEmail }) },
      );
      if (res.ok) {
        const parts: string[] = [];
        if (res.sent_sms) parts.push('SMS');
        if (res.sent_email) parts.push('e-mail');
        showSuccess(parts.length ? `Przypomnienie wysłane (${parts.join(', ')}).` : 'Wysłano.');
        if (reservation?.id) {
          const data = await authenticatedApiCall<ReservationEventItem[]>(`/api/reservations/${reservation.id}/system-events`);
          setReservationEvents(Array.isArray(data) ? data : []);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Błąd wysyłki przypomnienia';
      showError(msg);
    } finally {
      setRemindSignLoading(false);
    }
  }, [reservationNumber, reservation?.id, remindSignSms, remindSignEmail, showSuccess, showError]);

  const handleRemindSignCard = useCallback(async () => {
    if (!reservationNumber || (!remindCardSms && !remindCardEmail)) return;
    setRemindCardLoading(true);
    try {
      const res = await authenticatedApiCall<{ ok: boolean; sent_sms: boolean; sent_email: boolean; errors?: string[] }>(
        `/api/reservations/by-number/${reservationNumber}/remind-sign`,
        { method: 'POST', body: JSON.stringify({ send_sms: remindCardSms, send_email: remindCardEmail, document_type: 'qualification_card' }) },
      );
      if (res.ok) {
        const parts: string[] = [];
        if (res.sent_sms) parts.push('SMS');
        if (res.sent_email) parts.push('e-mail');
        showSuccess(parts.length ? `Przypomnienie o karcie wysłane (${parts.join(', ')}).` : 'Wysłano.');
        if (reservation?.id) {
          const data = await authenticatedApiCall<ReservationEventItem[]>(`/api/reservations/${reservation.id}/system-events`);
          setReservationEvents(Array.isArray(data) ? data : []);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Błąd wysyłki przypomnienia';
      showError(msg);
    } finally {
      setRemindCardLoading(false);
    }
  }, [reservationNumber, reservation?.id, remindCardSms, remindCardEmail, showSuccess, showError]);

  /** Otwarcie panelu „Edytuj umowę” po odświeżeniu, gdy w adresie jest #dokumenty/umowa-edycja */
  useEffect(() => {
    if (!reservation || contractEditStepFromHash === null || openedContractEditFromHashRef.current) return;
    openedContractEditFromHashRef.current = true;
    setContractEditStepFromHash(null);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `${window.location.pathname}#dokumenty/umowa-edycja`);
    openDocument(
      <ContractEditPanel
        reservation={reservation}
        onSaveSuccess={async () => {
          await refetchReservation();
          if (reservation?.id) {
            const list = await contractArchiveService.list(reservation.id);
            setContractArchiveVersions(list);
          }
          closeRightPanel();
        }}
        onClose={() => {
          if (typeof window !== 'undefined') window.location.hash = 'dokumenty';
          openedContractEditFromHashRef.current = false;
          closeRightPanel();
        }}
      />,
      'Edytuj umowę',
      () => {
        if (typeof window !== 'undefined') {
          window.location.hash = 'dokumenty';
          openedContractEditFromHashRef.current = false;
        }
      },
    );
  }, [reservation, contractEditStepFromHash, openDocument, closeRightPanel, refetchReservation]);

  /** Otwarcie panelu „Edytuj kartę kwalifikacyjną” po odświeżeniu, gdy w adresie jest #dokumenty/karta-edycja */
  useEffect(() => {
    if (!reservation || !reservationNumber || !cardEditFromHash || openedCardEditFromHashRef.current) return;
    openedCardEditFromHashRef.current = true;
    setCardEditFromHash(false);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `${window.location.pathname}#dokumenty/karta-edycja`);
    openDocument(
      <QualificationCardEditPanelLoader
        reservation={reservation}
        reservationNumber={reservationNumber}
        signedPayload={qualificationCardSignedPayload ? (qualificationCardSignedPayload as SignedQualificationPayload) : null}
        refetchReservation={refetchReservation}
        closeRightPanel={closeRightPanel}
        showSuccess={showSuccess}
        showError={showError}
      />,
      'Edytuj kartę kwalifikacyjną',
      () => {
        if (typeof window !== 'undefined') window.location.hash = 'dokumenty';
      },
    );
  }, [reservation, reservationNumber, cardEditFromHash, qualificationCardSignedPayload, openDocument, closeRightPanel, refetchReservation, showSuccess, showError]);

  useEffect(() => {
    if (!reservation?.id) return;
    contractArchiveService.list(reservation.id).then(setContractArchiveVersions).catch(() => setContractArchiveVersions([]));
  }, [reservation?.id]);

  useEffect(() => {
    if (activePanel === 'dokumenty' && reservation?.id) {
      authenticatedApiCall<AnnexItem[]>(`/api/annexes/reservation/${reservation.id}`)
        .then((list) => setReservationAnnexes(Array.isArray(list) ? list : []))
        .catch(() => setReservationAnnexes([]));
    }
  }, [activePanel, reservation?.id]);

  // Informacje dodatkowe dotyczące uczestnika (sekcja z kroku 1 – edycja tylko tego pola)
  const [participantAdditionalInfo, setParticipantAdditionalInfo] = useState('');
  const [savingParticipantAdditionalInfo, setSavingParticipantAdditionalInfo] = useState(false);

  // Wniosek o zakwaterowanie uczestnika (krok 1 – edycja tylko tego pola)
  const [accommodationRequest, setAccommodationRequest] = useState('');
  const [savingAccommodationRequest, setSavingAccommodationRequest] = useState(false);

  const cardUploadInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (reservation) {
      setParticipantAdditionalInfo(reservation.participant_additional_info ?? '');
    }
  }, [reservation?.id, reservation?.participant_additional_info]);

  useEffect(() => {
    if (reservation) {
      setAccommodationRequest(reservation.accommodation_request ?? '');
    }
  }, [reservation?.id, reservation?.accommodation_request]);

  /** Synchronizuj draft opiekunów z rezerwacją (max 2). */
  useEffect(() => {
    if (!reservation?.parents_data || !Array.isArray(reservation.parents_data)) {
      setGuardiansDraft([]);
      return;
    }
    const list = reservation.parents_data.slice(0, 2).map((p) => ({
      firstName: p?.firstName ?? '',
      lastName: p?.lastName ?? '',
      email: p?.email ?? '',
      phoneNumber: p?.phoneNumber ?? '',
      street: p?.street ?? '',
      city: p?.city ?? '',
      postalCode: p?.postalCode ?? '',
    }));
    setGuardiansDraft(list);
    setEditingGuardianIndex(null);
  }, [reservation?.id, reservation?.parents_data]);

  useEffect(() => {
    if (!reservation?.id) {
      setReservationEvents([]);
      return;
    }
    let cancelled = false;
    setLoadingReservationEvents(true);
    authenticatedApiCall<ReservationEventItem[]>(`/api/reservations/${reservation.id}/system-events`)
      .then((data) => {
        if (!cancelled) setReservationEvents(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setReservationEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingReservationEvents(false);
      });
    return () => { cancelled = true; };
  }, [reservation?.id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch reservation by number
        const reservationData = await authenticatedApiCall<ReservationDetails>(
          `/api/reservations/by-number/${reservationNumber}`,
        );
        setReservation(reservationData);
        const currentPromotionId = reservationData.selected_promotion
          ? parseInt(String(reservationData.selected_promotion), 10)
          : null;
        setPromotionDraftId(Number.isNaN(currentPromotionId || undefined) ? null : currentPromotionId);

        // Fetch addons details
        if (reservationData.selected_addons && reservationData.selected_addons.length > 0) {
          const addonsMap = new Map<number, Addon>();
          for (const addonIdValue of reservationData.selected_addons) {
            try {
              const addonId = typeof addonIdValue === 'number' ? addonIdValue : parseInt(String(addonIdValue));
              if (!isNaN(addonId)) {
                const addon = await authenticatedApiCall<Addon>(`/api/addons/${addonId}`);
                addonsMap.set(addonId, addon);
              }
            } catch (err) {
              console.error(`Error fetching addon ${addonIdValue}:`, err);
            }
          }
          setAddons(addonsMap);
        }

        // Fetch protections details
        if (reservationData.selected_protection && reservationData.selected_protection.length > 0) {
          const protectionsMap = new Map<number, Protection>();
          for (const protectionIdValue of reservationData.selected_protection) {
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
                const protection = await authenticatedApiCall<Protection>(`/api/general-protections/${generalProtectionId}`);
                protectionsMap.set(generalProtectionId, protection);
              }
            } catch (err) {
              console.error(`Error fetching protection ${protectionIdValue}:`, err);
            }
          }
          setProtections(protectionsMap);
        }

        // Fetch promotion options for this turnus (always, niezależnie od wyboru)
        if (reservationData.camp_id && reservationData.property_id) {
          try {
            const turnusPromotions = await authenticatedApiCall<any[]>(
              `/api/camps/${reservationData.camp_id}/properties/${reservationData.property_id}/promotions`,
            );
            const options: PromotionOption[] = [];
            const map = new Map<number, Promotion>();
            for (const p of turnusPromotions) {
              const relationId = p.relation_id ?? p.id;
              if (!relationId) continue;
              const price = typeof p.price === 'number' ? p.price : 0;
              const option: PromotionOption = {
                relationId,
                name: p.name || `Promocja #${relationId}`,
                price,
                doesNotReducePrice: !!p.does_not_reduce_price,
              };
              options.push(option);
              map.set(relationId, {
                id: relationId,
                name: option.name,
                price: option.price,
                does_not_reduce_price: option.doesNotReducePrice,
                relation_id: relationId,
              });
            }
            setPromotionOptions(options);
            if (options.length > 0) {
              setPromotions(map);
            }
          } catch (turnusPromoError) {
            console.warn(`Nie udało się pobrać promocji dla turnusu:`, turnusPromoError);
          }
        }

        // Fetch diets details
        // NOTE: selected_diets and diet may contain relation_id (from center_diet_general_diets) or diet_id
        if (reservationData.selected_diets && reservationData.selected_diets.length > 0 && reservationData.camp_id && reservationData.property_id) {
          const dietsMap = new Map<number, Diet>();
          // Get turnus diets to find relations
          try {
            const turnusDiets = await authenticatedApiCall<any[]>(
              `/api/camps/${reservationData.camp_id}/properties/${reservationData.property_id}/diets`,
            );
            for (const dietIdValue of reservationData.selected_diets) {
              const dietId = typeof dietIdValue === 'number' ? dietIdValue : parseInt(String(dietIdValue));
              if (!isNaN(dietId)) {
                // Find diet by relation_id or id
                const foundDiet = turnusDiets.find(
                  (d: any) => d.relation_id === dietId || d.id === dietId,
                );
                if (foundDiet) {
                  // If it's a center diet relation, get general_diet_id
                  if (foundDiet.is_center_diet_relation && foundDiet.general_diet_id) {
                    try {
                      const generalDiet = await authenticatedApiCall<Diet>(`/api/general-diets/${foundDiet.general_diet_id}`);
                      dietsMap.set(dietId, {
                        ...generalDiet,
                        price: foundDiet.price || generalDiet.price, // Use turnus-specific price
                      });
                    } catch {
                      // If general diet not found, use data from turnus diet
                      dietsMap.set(dietId, {
                        id: foundDiet.general_diet_id,
                        name: foundDiet.name,
                        price: foundDiet.price || 0,
                      });
                    }
                  } else {
                    // Regular diet from diets table
                    try {
                      const diet = await authenticatedApiCall<Diet>(`/api/diets/${foundDiet.id}`);
                      dietsMap.set(dietId, diet);
                    } catch {
                      // If diet not found, use data from turnus diet
                      dietsMap.set(dietId, {
                        id: foundDiet.id,
                        name: foundDiet.name,
                        price: foundDiet.price || 0,
                      });
                    }
                  }
                } else {
                  // Try direct fetch as general diet
                  try {
                    const diet = await authenticatedApiCall<Diet>(`/api/general-diets/${dietId}`);
                    dietsMap.set(dietId, diet);
                  } catch {
                    console.warn(`Diet ${dietId} not found in turnus diets or general diets`);
                  }
                }
              }
            }
          } catch (turnusDietsError) {
            console.warn(`Could not fetch turnus diets:`, turnusDietsError);
          }
          setDiets(dietsMap);
        }

        // Fetch main diet from turnus (same logic as Step1 reservation process)
        // This endpoint returns diets with turnus-specific prices (from CenterDietGeneralDiet relations)
        if (reservationData.diet && reservationData.camp_id && reservationData.property_id) {
          try {
            const dietId = typeof reservationData.diet === 'number' ? reservationData.diet : parseInt(String(reservationData.diet));
            if (!isNaN(dietId)) {
              // Get turnus diets (same endpoint as Step1 uses)
              // This returns diets with:
              // - relation_id: ID of CenterDietGeneralDiet relation (this is what's stored in reservation.diet)
              // - general_diet_id: ID of the general diet
              // - name: from general_diet
              // - price: from CenterDietGeneralDiet relation (turnus-specific price, e.g. 85 zł)
              try {
                const turnusDiets = await authenticatedApiCall<any[]>(
                  `/api/camps/${reservationData.camp_id}/properties/${reservationData.property_id}/diets`,
                );
                // Find diet by relation_id (reservation.diet stores the relation_id)
                const foundDiet = turnusDiets.find(
                  (d: any) => d.relation_id === dietId || d.id === dietId,
                );
                if (foundDiet) {
                  // Store diet with turnus-specific price (same as Step1 does)
                  setDiets(prev => new Map(prev).set(dietId, {
                    id: foundDiet.general_diet_id || foundDiet.id,
                    name: foundDiet.name,
                    price: foundDiet.price, // Price from CenterDietGeneralDiet relation (turnus-specific)
                  }));
                }
              } catch (turnusDietsError) {
                console.warn(`Could not fetch turnus diets for main diet:`, turnusDietsError);
              }
            }
          } catch (err) {
            console.error(`Error fetching main diet ${reservationData.diet}:`, err);
          }
        }

        // Fetch transport cities (dla sekcji Transport – lista miast turnusu)
        if (reservationData.camp_id && reservationData.property_id) {
          try {
            const citiesResponse = await authenticatedApiCall<Array<{ id: number; city: string; departure_price: number | null; return_price: number | null }>>(
              `/api/camps/${reservationData.camp_id}/properties/${reservationData.property_id}/transport/cities`,
            );
            setTransportCities(Array.isArray(citiesResponse) ? citiesResponse.map((c: { id?: number; city: string; departure_price?: number | null; return_price?: number | null }) =>
              ({ id: c.id ?? 0, city: c.city, departure_price: c.departure_price ?? null, return_price: c.return_price ?? null })) : []);
          } catch (err) {
            console.warn('Could not fetch transport cities:', err);
            setTransportCities([]);
          }
        } else {
          setTransportCities([]);
        }

        // ========================================
        // ZAWSZE pobierać dostępne opcje dla turnusu
        // (do wyświetlania sekcji nawet gdy rezerwacja nie ma wybranych)
        // ========================================
        if (reservationData.camp_id && reservationData.property_id) {
          // Pobierz dostępne ochrony dla turnusu
          try {
            const turnusProtections = await authenticatedApiCall<any[]>(
              `/api/camps/${reservationData.camp_id}/properties/${reservationData.property_id}/protections`,
            );
            const protectionsList: Protection[] = turnusProtections.map((p: any) => ({
              id: p.general_protection_id || p.id,
              name: p.name || `Ochrona #${p.id}`,
              price: typeof p.price === 'number' ? p.price : 0,
            }));
            setAvailableProtections(protectionsList);
          } catch (err) {
            console.warn('Could not fetch available protections:', err);
            setAvailableProtections([]);
          }
        }

        // Pobierz dostępne dodatki dla turnusu (prefer property_id, fallback city)
        const addonsUrl = reservationData.property_id !== null && reservationData.property_id !== undefined
          ? `/api/addons/public?property_id=${reservationData.property_id}`
          : reservationData.property_city
            ? `/api/addons/public?city=${encodeURIComponent(reservationData.property_city)}`
            : null;
        if (addonsUrl) {
          try {
            const addonsResponse = await authenticatedApiCall<{ addons: Addon[]; total: number }>(addonsUrl);
            setAvailableAddons(addonsResponse.addons || []);
          } catch (err) {
            console.warn('Could not fetch available addons:', err);
            setAvailableAddons([]);
          }
        }

        if (reservationData.camp_id !== null && reservationData.property_id !== null) {
          try {
            const dietsRes = await authenticatedApiCall<Array<{ id: number; relation_id?: number; name: string; price?: number }>>(
              `/api/camps/${reservationData.camp_id}/properties/${reservationData.property_id}/diets`,
            );
            setTurnusDietsList(Array.isArray(dietsRes) ? dietsRes : []);
          } catch (err) {
            console.warn('Could not fetch turnus diets:', err);
            setTurnusDietsList([]);
          }
        }

        try {
          const sourcesRes = await authenticatedApiCall<{ sources: Array<{ id: number; name: string }>; total?: number }>('/api/sources/public');
          setSourcesList(sourcesRes?.sources ?? []);
        } catch (err) {
          console.warn('Could not fetch sources:', err);
          setSourcesList([]);
        }
      } catch (err) {
        console.error('Error fetching reservation details:', err);
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania szczegółów rezerwacji');
      } finally {
        setIsLoading(false);
      }
    };

    if (reservationNumber) {
      fetchData();
    }
  }, [reservationNumber]);

  // Sync invoice draft from reservation (for initial load and after save)
  useEffect(() => {
    if (reservation === null) return;
    setInvoiceDraft({
      wants_invoice: reservation.wants_invoice ?? false,
      invoice_type: reservation.invoice_type ?? 'private',
      invoice_company_name: reservation.invoice_company_name ?? null,
      invoice_nip: reservation.invoice_nip ?? null,
      invoice_first_name: reservation.invoice_first_name ?? null,
      invoice_last_name: reservation.invoice_last_name ?? null,
      invoice_email: reservation.invoice_email ?? null,
      invoice_phone: reservation.invoice_phone ?? null,
      invoice_street: reservation.invoice_street ?? null,
      invoice_postal_code: reservation.invoice_postal_code ?? null,
      invoice_city: reservation.invoice_city ?? null,
    });
  }, [
    reservation?.id,
    reservation?.wants_invoice,
    reservation?.invoice_type,
    reservation?.invoice_company_name,
    reservation?.invoice_nip,
    reservation?.invoice_first_name,
    reservation?.invoice_last_name,
    reservation?.invoice_email,
    reservation?.invoice_phone,
    reservation?.invoice_street,
    reservation?.invoice_postal_code,
    reservation?.invoice_city,
  ]);

  // Sync addons draft from reservation when not dirty (initial load or after save elsewhere)
  useEffect(() => {
    if (addonsDraftDirty || reservation?.selected_addons === undefined) return;
    const raw = reservation.selected_addons;
    const ids = Array.isArray(raw)
      ? (raw as (string | number)[])
          .map((x) => (typeof x === 'number' ? x : parseInt(String(x), 10)))
          .filter((n) => !Number.isNaN(n))
      : [];
    setAddonsDraft(ids);
  }, [reservation?.id, reservation?.selected_addons, addonsDraftDirty]);

  // Sync protection draft from reservation when not dirty
  useEffect(() => {
    if (protectionDraftDirty || reservation?.selected_protection === undefined) return;
    const raw = reservation.selected_protection;
    const ids = Array.isArray(raw)
      ? (raw as (string | number)[])
          .map((x) => {
            if (typeof x === 'number') return x;
            const s = String(x).trim();
            if (s.startsWith('protection-')) {
              const n = parseInt(s.split('-')[1], 10);
              return Number.isNaN(n) ? null : n;
            }
            const n = parseInt(s, 10);
            return Number.isNaN(n) ? null : n;
          })
          .filter((n): n is number => n !== null && n !== undefined)
      : [];
    setProtectionDraft(ids);
  }, [reservation?.id, reservation?.selected_protection, protectionDraftDirty]);

  // Sync diet draft from reservation (for initial load and after save)
  useEffect(() => {
    if (reservation === null || reservation === undefined) return;
    setDietDraft(reservation.diet ?? null);
  }, [reservation?.id, reservation?.diet]);

  // Sync source draft from reservation (for initial load and after save)
  useEffect(() => {
    if (reservation === null || reservation === undefined) return;
    setSourceDraft({
      selected_source: reservation.selected_source ?? '',
      source_inne_text: reservation.source_inne_text ?? null,
    });
  }, [reservation?.id, reservation?.selected_source, reservation?.source_inne_text]);

  // Sync transport draft from reservation (for initial load and after save)
  useEffect(() => {
    if (reservation === null || reservation === undefined) return;
    const r = reservation as ReservationDetails & { departure_transport_city_id?: number | null; return_transport_city_id?: number | null };
    setTransportDraft({
      departure_type: reservation.departure_type ?? 'wlasny',
      departure_city: reservation.departure_city ?? null,
      departure_transport_city_id: r.departure_transport_city_id ?? null,
      return_type: reservation.return_type ?? 'wlasny',
      return_city: reservation.return_city ?? null,
      return_transport_city_id: r.return_transport_city_id ?? null,
      transport_different_cities: reservation.transport_different_cities ?? false,
    });
  }, [
    reservation?.id,
    reservation?.departure_type,
    reservation?.departure_city,
    (reservation as any)?.departure_transport_city_id,
    reservation?.return_type,
    reservation?.return_city,
    (reservation as any)?.return_transport_city_id,
    reservation?.transport_different_cities,
  ]);

  // Load document files and check HTML existence (wywoływane z useEffect i po zapisie umowy)
  const loadDocuments = useCallback(async () => {
    if (!reservation) return;
    if (reservation.is_archived) {
      setContractFiles([]);
      setCardFiles([]);
      setLatestSignedContract(null);
      setLatestSignedCard(null);
      setQualificationCardSignedPayload(null);
      setSignedDocumentsList([]);
      return;
    }
    try {
      const contractFilesData = await contractService.getContractFiles(reservation.id);
      setContractFiles(contractFilesData.filter(f => f.source === 'user'));
      const cardFilesData = await qualificationCardService.getQualificationCardFiles(reservation.id);
      setCardFiles(cardFilesData.filter(f => f.source === 'user'));
      const signedDocs = await authenticatedApiCall<Array<{ id: number; document_type: string; status: string; client_message: string | null; created_at: string; updated_at: string; payload?: string | null; reverted_after_approval?: number }>>(
        `/api/signed-documents/reservation/${reservation.id}`,
      );
      setSignedDocumentsList(signedDocs);
      const contractDoc = signedDocs.find(d => d.document_type === 'contract');
      const cardDoc = signedDocs.find(d => d.document_type === 'qualification_card');
      setLatestSignedContract(contractDoc ? { id: contractDoc.id, status: contractDoc.status, client_message: contractDoc.client_message } : null);
      setLatestSignedCard(cardDoc ? { id: cardDoc.id, status: cardDoc.status, client_message: cardDoc.client_message, reverted_after_approval: cardDoc.reverted_after_approval } : null);
      try {
        setContractSignedPayload(contractDoc?.payload ? JSON.parse(contractDoc.payload) : null);
      } catch {
        setContractSignedPayload(null);
      }
      try {
        setQualificationCardSignedPayload(cardDoc?.payload ? JSON.parse(cardDoc.payload) : null);
      } catch {
        setQualificationCardSignedPayload(null);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  }, [reservation]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Load payments data
  // Skip for archived reservations - payments are in archive tables
  useEffect(() => {
    const loadPayments = async () => {
      if (!reservation) return;

      // Skip loading payments for archived reservations
      // They don't exist in the main tables anymore
      if (reservation.is_archived) {
        setPayments([]);
        setManualPayments([]);
        return;
      }

      try {
        // Fetch all Tpay payments
        const allPayments = await paymentService.listPayments(0, 1000);
        // Filter payments for this reservation
        const reservationPayments = allPayments.filter(p => {
          const orderId = p.order_id || '';
          if (orderId === String(reservation.id)) return true;
          if (orderId === `RES-${reservation.id}`) return true;
          const match = orderId.match(/^RES-(\d+)(?:-|$)/);
          if (match && parseInt(match[1], 10) === reservation.id) return true;
          const addonMatch = orderId.match(/^ADDON-(\d+)-/);
          if (addonMatch && parseInt(addonMatch[1], 10) === reservation.id) return true;
          return false;
        });
        setPayments(reservationPayments);

        // Fetch manual payments
        try {
          const manualPaymentsData = await manualPaymentService.getByReservation(reservation.id);
          setManualPayments(manualPaymentsData);
        } catch (err) {
          console.warn('Could not fetch manual payments:', err);
          setManualPayments([]);
        }
      } catch (err) {
        console.error('Error loading payments:', err);
      }
    };

    loadPayments();
  }, [reservation]);

  // Load admin notes (both for active and archived reservations)
  useEffect(() => {
    const loadNotes = async () => {
      if (!reservation) return;

      console.log('DEBUG loadNotes - reservation:', {
        id: reservation.id,
        is_archived: reservation.is_archived,
        archive_id: reservation.archive_id,
        keys: Object.keys(reservation),
      });

      try {
        setLoadingNotes(true);

        let notesData: ReservationNote[];

        if (reservation.is_archived && reservation.archive_id) {
          // For archived reservations, fetch from archived notes endpoint
          notesData = await authenticatedApiCall<ReservationNote[]>(
            `/api/reservations/archived/${reservation.archive_id}/notes`,
          );
        } else {
          // For active reservations, fetch from regular notes endpoint
          notesData = await authenticatedApiCall<ReservationNote[]>(
            `/api/reservations/${reservation.id}/notes`,
          );
        }

        setNotes(notesData);
      } catch (err) {
        console.error('Error loading notes:', err);
        // Don't show error - notes are optional and may fail for non-admins
        setNotes([]);
      } finally {
        setLoadingNotes(false);
      }
    };

    loadNotes();
  }, [reservation]);

  // Notes management functions
  const handleCreateNote = async () => {
    if (!reservation || !newNoteContent.trim()) return;

    noteSpeechRecognitionRef.current?.stop();
    setNoteSpeechListening(false);

    try {
      setSavingNote(true);
      const newNote = await authenticatedApiCall<ReservationNote>(
        `/api/reservations/${reservation.id}/notes`,
        {
          method: 'POST',
          body: JSON.stringify({ content: newNoteContent.trim() }),
        },
      );
      setNotes(prev => [newNote, ...prev]);
      setNewNoteContent('');
      showSuccess('Notatka została dodana');
    } catch (err) {
      console.error('Error creating note:', err);
      showError('Błąd podczas tworzenia notatki');
    } finally {
      setSavingNote(false);
    }
  };

  const handleUpdateNote = async (noteId: number) => {
    if (!reservation || !editingNoteContent.trim()) return;

    try {
      setSavingNote(true);
      const updatedNote = await authenticatedApiCall<ReservationNote>(
        `/api/reservations/${reservation.id}/notes/${noteId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ content: editingNoteContent.trim() }),
        },
      );
      setNotes(prev => prev.map(n => n.id === noteId ? updatedNote : n));
      setEditingNoteId(null);
      setEditingNoteContent('');
      showSuccess('Notatka została zaktualizowana');
    } catch (err) {
      console.error('Error updating note:', err);
      showError('Błąd podczas aktualizacji notatki');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!reservation) return;

    try {
      setDeletingNoteId(noteId);
      await authenticatedApiCall(
        `/api/reservations/${reservation.id}/notes/${noteId}`,
        { method: 'DELETE' },
      );
      setNotes(prev => prev.filter(n => n.id !== noteId));
      showSuccess('Notatka została usunięta');
    } catch (err) {
      console.error('Error deleting note:', err);
      showError('Błąd podczas usuwania notatki');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const startEditingNote = (note: ReservationNote) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const toggleNoteSpeech = useCallback(() => {
    if (typeof window === 'undefined') return;
    const Win = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const SpeechRecognitionAPI = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      showError('Twoja przeglądarka nie obsługuje rozpoznawania mowy.');
      return;
    }
    if (noteSpeechListening) {
      noteSpeechRecognitionRef.current?.stop();
      return;
    }
    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'pl-PL';
    rec.onresult = (event: SpeechRecognitionResultEventLike) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript;
      if (result.isFinal) {
        setNewNoteContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    rec.onend = () => setNoteSpeechListening(false);
    rec.onerror = (event: { error: string }) => {
      setNoteSpeechListening(false);
      if (event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        showError('Aby dyktować, zezwól na dostęp do mikrofonu w przeglądarce (ikonka kłódki w pasku adresu).');
        return;
      }
      if (event.error === 'no-speech') {
        showError('Nie wykryto mowy. Kliknij mikrofon ponownie i mów po zatwierdzeniu zgody.');
        return;
      }
      if (event.error === 'network') {
        showError('Błąd sieci przy rozpoznawaniu mowy. Sprawdź połączenie.');
        return;
      }
      showError('Błąd rozpoznawania mowy. Sprawdź mikrofon i uprawnienia.');
    };
    noteSpeechRecognitionRef.current = rec;
    setNoteSpeechListening(true);
    try {
      rec.start();
    } catch {
      setNoteSpeechListening(false);
      noteSpeechRecognitionRef.current = null;
      showError('Nie udało się uruchomić mikrofonu. Zezwól na dostęp do mikrofonu w ustawieniach przeglądarki.');
    }
  }, [noteSpeechListening, showError]);

  useEffect(() => () => {
    noteSpeechRecognitionRef.current?.abort();
  }, []);

  // Synchronizuj justificationDraft z reservation (tylko gdy modal nie jest otwarty)
  useEffect(() => {
    if (!showJustificationModal && reservation) {
      setJustificationDraft(reservation.promotion_justification || {});
    }
  }, [reservation, showJustificationModal]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Brak danych';
    try {
      return new Date(dateString).toLocaleDateString('pl-PL');
    } catch {
      return 'Brak danych';
    }
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Brak danych';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pl-PL', {
        timeZone: 'Europe/Warsaw',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Brak danych';
    }
  };

  /** Mapowanie action (+ opcjonalnie payload) na zdanie po polsku w „Zdarzenia klienta”. */
  const formatEventAction = (ev: ReservationEventItem): string => {
    try {
      const payload = ev.payload ? (typeof ev.payload === 'string' ? JSON.parse(ev.payload) : ev.payload) as Record<string, unknown> | null : null;
      if (payload?.description && typeof payload.description === 'string') return payload.description;
      if (ev.action === 'protection_updated' && payload?.new_data && typeof payload.new_data === 'object') {
        const newData = payload.new_data as { added_names?: string[]; removed_names?: string[] };
        const parts: string[] = [];
        if (Array.isArray(newData.added_names) && newData.added_names.length > 0) {
          parts.push(`Pracownik dodał pakiet ochrony: [${newData.added_names.join(', ')}].`);
        }
        if (Array.isArray(newData.removed_names) && newData.removed_names.length > 0) {
          parts.push(`Pracownik usunął pakiet ochrony: [${newData.removed_names.join(', ')}].`);
        }
        if (parts.length > 0) return parts.join(' ');
      }
    } catch {
      /* ignore */
    }
    const labels: Record<string, string> = {
      qualification_card_draft_saved: 'Klient zaktualizował robocze dane w Karcie Kwalifikacyjnej.',
      qualification_card_edited_by_admin: 'Pracownik zaktualizował dane Karty Kwalifikacyjnej.',
      qualification_card_signed: 'Klient podpisał kartę kwalifikacyjną (SMS).',
      qualification_card_accepted: 'Pracownik zaakceptował kartę kwalifikacyjną.',
      qualification_card_rejected: 'Pracownik odrzucił kartę kwalifikacyjną.',
      qualification_card_updated_after_approval: 'Klient zmodyfikował kartę po zaakceptowaniu – wymagana ponowna weryfikacja.',
      protection_updated: 'Pracownik zaktualizował pakiety ochrony.',
    };
    return labels[ev.action] ?? ev.action;
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '0.00 PLN';
    return `${amount.toFixed(2)} PLN`;
  };

  const MissingInfo = ({ field }: { field: string }) => (
    <span className="text-red-600 font-medium">⚠️ Tej informacji nie ma w systemie ({field})</span>
  );

  const currentPromotionId = promotionDraftId;

  const openPromotionModal = (relationId: number | null) => {
    setPendingPromotionId(relationId);
    setShowPromotionModal(true);
  };

  const handlePromotionSelect = (value: string) => {
    if (value === '') {
      openPromotionModal(null);
      return;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    openPromotionModal(parsed);
  };

  const handleConfirmPromotion = async () => {
    if (!reservation) {
      setShowPromotionModal(false);
      return;
    }
    setSavingPromotion(true);
    try {
      const response = await authenticatedApiCall<ReservationDetails>(
        `/api/reservations/${reservation.id}/promotion`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            selected_promotion: pendingPromotionId,
            promotion_justification: reservation.promotion_justification ?? null,
          }),
        },
      );
      setReservation(response);
      const updatedPromotionId = response.selected_promotion
        ? parseInt(String(response.selected_promotion), 10)
        : null;
      setPromotionDraftId(
        updatedPromotionId !== null && !Number.isNaN(updatedPromotionId) ? updatedPromotionId : null,
      );
      setShowPromotionModal(false);
      setPendingPromotionId(null);
    } catch (err) {
      console.error('Błąd aktualizacji promocji', err);
      setError('Nie udało się zaktualizować promocji. Spróbuj ponownie.');
    } finally {
      setSavingPromotion(false);
    }
  };

  const handleCancelPromotion = () => {
    setPendingPromotionId(null);
    setShowPromotionModal(false);
  };

  // Funkcje pomocnicze dla edycji uzasadnienia promocji
  const getPromotionType = (promotionName?: string | null): string => {
    if (!promotionName) return 'other';
    const nameLower = String(promotionName).toLowerCase();
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

  const formatJustificationForDisplay = (just: any): string => {
    if (!just || typeof just !== 'object') return '';
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
    const otherFields = Object.keys(just).filter((key) => !knownFields.includes(key));
    otherFields.forEach((key) => {
      const value = just[key];
      if (value !== null && value !== undefined && value !== '') {
        parts.push(`${key}: ${String(value)}`);
      }
    });
    return parts.join('\n');
  };

  const validateJustificationDraft = (): boolean => {
    setJustificationError(null);
    if (!reservation) return false;
    const promotionName = reservation.promotion_name || reservation.selected_promotion || '';
    const type = getPromotionType(promotionName);
    const just = justificationDraft || {};

    if (!requiresJustification(promotionName)) {
      const hasAny = hasJustificationData(just);
      if (!hasAny) {
        setJustificationError('Uzupełnij krótkie uzasadnienie.');
      }
      return hasAny;
    }

    if (type === 'duza_rodzina') {
      if (!just.card_number || String(just.card_number).trim() === '') {
        setJustificationError('Numer karty dużej rodziny jest wymagany.');
        return false;
      }
    } else if (type === 'rodzenstwo_razem') {
      if (!just.sibling_first_name || String(just.sibling_first_name).trim() === '') {
        setJustificationError('Imię rodzeństwa jest wymagane.');
        return false;
      }
      if (!just.sibling_last_name || String(just.sibling_last_name).trim() === '') {
        setJustificationError('Nazwisko rodzeństwa jest wymagane.');
        return false;
      }
    } else if (type === 'obozy_na_maxa') {
      if ((!just.first_camp_date || String(just.first_camp_date).trim() === '') &&
          (!just.first_camp_name || String(just.first_camp_name).trim() === '')) {
        setJustificationError('Wypełnij datę lub nazwę pierwszego obozu.');
        return false;
      }
    } else if (type === 'first_minute') {
      if (!just.reason || String(just.reason).trim() === '') {
        setJustificationError('Powód wyboru promocji First Minute jest wymagany.');
        return false;
      }
    } else if (type === 'bonowych') {
      if (!just.years || String(just.years).trim() === '') {
        setJustificationError('Lata uczestnictwa są wymagane.');
        return false;
      }
    } else {
      if (!just.reason || String(just.reason).trim() === '') {
        setJustificationError('Uzasadnienie jest wymagane.');
        return false;
      }
    }
    return true;
  };

  const _openJustificationModal = () => {
    if (reservation) {
      // Wczytujemy tylko uzasadnienie dla obecnej promocji (filtrowane)
      const filteredJustification = getJustificationForCurrentPromotion();
      console.log('[Admin] Opening justification modal with data:', filteredJustification);
      setJustificationDraft(filteredJustification);
      setShowJustificationModal(true);
      setJustificationError(null);
    }
  };

  const getJustificationForCurrentPromotion = (): Record<string, any> => {
    if (!reservation || currentPromotionId === null) return {};

    const promotionName = reservation.promotion_name || reservation.selected_promotion || '';
    const type = getPromotionType(promotionName);
    const currentJustification = reservation.promotion_justification || {};

    // Tworzymy nowy obiekt zawierający tylko pola potrzebne dla obecnej promocji
    const filteredJustification: Record<string, any> = {};

    if (type === 'duza_rodzina') {
      if (currentJustification.card_number) {
        filteredJustification.card_number = currentJustification.card_number;
      }
    } else if (type === 'rodzenstwo_razem') {
      if (currentJustification.sibling_first_name) {
        filteredJustification.sibling_first_name = currentJustification.sibling_first_name;
      }
      if (currentJustification.sibling_last_name) {
        filteredJustification.sibling_last_name = currentJustification.sibling_last_name;
      }
    } else if (type === 'obozy_na_maxa') {
      if (currentJustification.first_camp_date) {
        filteredJustification.first_camp_date = currentJustification.first_camp_date;
      }
      if (currentJustification.first_camp_name) {
        filteredJustification.first_camp_name = currentJustification.first_camp_name;
      }
    } else if (type === 'first_minute') {
      if (currentJustification.reason) {
        filteredJustification.reason = currentJustification.reason;
      }
    } else if (type === 'bonowych') {
      if (currentJustification.years) {
        filteredJustification.years = currentJustification.years;
      }
    } else {
      // Dla innych promocji - tylko reason
      if (currentJustification.reason) {
        filteredJustification.reason = currentJustification.reason;
      }
    }

    return filteredJustification;
  };

  const filterJustificationForSave = (draft: Record<string, any>): Record<string, any> => {
    if (!reservation || currentPromotionId === null) return {};

    const promotionName = reservation.promotion_name || reservation.selected_promotion || '';
    const type = getPromotionType(promotionName);

    // Tworzymy nowy obiekt zawierający tylko pola potrzebne dla obecnej promocji
    const filteredJustification: Record<string, any> = {};

    if (type === 'duza_rodzina') {
      if (draft.card_number) {
        filteredJustification.card_number = draft.card_number;
      }
    } else if (type === 'rodzenstwo_razem') {
      if (draft.sibling_first_name) {
        filteredJustification.sibling_first_name = draft.sibling_first_name;
      }
      if (draft.sibling_last_name) {
        filteredJustification.sibling_last_name = draft.sibling_last_name;
      }
    } else if (type === 'obozy_na_maxa') {
      if (draft.first_camp_date) {
        filteredJustification.first_camp_date = draft.first_camp_date;
      }
      if (draft.first_camp_name) {
        filteredJustification.first_camp_name = draft.first_camp_name;
      }
    } else if (type === 'first_minute') {
      if (draft.reason) {
        filteredJustification.reason = draft.reason;
      }
    } else if (type === 'bonowych') {
      if (draft.years) {
        filteredJustification.years = draft.years;
      }
    } else {
      // Dla innych promocji - tylko reason
      if (draft.reason) {
        filteredJustification.reason = draft.reason;
      }
    }

    return filteredJustification;
  };

  const handleSaveJustification = async () => {
    if (!reservation) return;
    setJustificationError(null);
    const valid = validateJustificationDraft();
    if (!valid) return;

    try {
      setSavingJustification(true);
      // Filtrujemy uzasadnienie - zapisujemy tylko pola potrzebne dla obecnej promocji
      const filteredJustification = filterJustificationForSave(justificationDraft);
      const response = await authenticatedApiCall<ReservationDetails>(
        `/api/reservations/${reservation.id}/promotion-justification/admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ promotion_justification: filteredJustification }),
        },
      );
      setReservation((prev) => (prev && response ? { ...prev, ...response } : response));
      setShowJustificationModal(false);
    } catch (err: any) {
      setJustificationError(err?.message || 'Nie udało się zapisać uzasadnienia.');
    } finally {
      setSavingJustification(false);
    }
  };

  // Oblicz kwotę transportu (dokładnie jak w TransportSection.tsx - krok 3)
  // Logika: bierze wyższą kwotę z departure_price i return_price
  let departurePrice: number | null = null;
  let returnPrice: number | null = null;

  if (reservation && reservation.departure_type === 'zbiorowy' && reservation.departure_city) {
    const city = transportCities.find(c => c.city === reservation.departure_city);
    departurePrice = city?.departure_price || null;
  }

  if (reservation && reservation.return_type === 'zbiorowy' && reservation.return_city) {
    const city = transportCities.find(c => c.city === reservation.return_city);
    returnPrice = city?.return_price || null;
  }

  // Oblicz wyższą kwotę (dokładnie jak w TransportSection.tsx linia 255-256)
  const prices = [departurePrice, returnPrice].filter((p): p is number => p !== null && p !== undefined);
  const _transportPrice = prices.length > 0 ? Math.max(...prices) : 0;

  // Cena transportu na podstawie DRAFT (czas rzeczywisty podczas edycji) – ta sama logika co wyżej (TransportSection.tsx)
  let draftDepPrice: number | null = null;
  let draftRetPrice: number | null = null;
  if (transportDraft.departure_type === 'zbiorowy' && transportDraft.departure_city) {
    const city = transportCities.find((c) => c.city === transportDraft.departure_city);
    draftDepPrice = city?.departure_price ?? null;
  }
  if (transportDraft.return_type === 'zbiorowy' && transportDraft.return_city) {
    const city = transportCities.find((c) => c.city === transportDraft.return_city);
    draftRetPrice = city?.return_price ?? null;
  }
  const draftPrices = [draftDepPrice, draftRetPrice].filter((p): p is number => p !== null && p !== undefined);
  const transportPriceFromDraft = draftPrices.length > 0 ? Math.max(...draftPrices) : 0;

  if (isLoading) {
    return (
      <SectionGuard section="reservations">
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
              <div className="text-gray-500">Ładowanie szczegółów rezerwacji...</div>
            </div>
          </div>
        </AdminLayout>
      </SectionGuard>
    );
  }

  if (error || !reservation) {
    return (
      <SectionGuard section="reservations">
        <AdminLayout>
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error || 'Rezerwacja nie została znaleziona'}</p>
          </div>
        </AdminLayout>
      </SectionGuard>
    );
  }

  const rightSidebarDocumentsContent = (
    <div className="flex-1 overflow-y-auto min-h-0 p-3 bg-white">
      <h3 className="text-sm font-semibold text-slate-700 mb-2 pb-2 border-b border-gray-100 flex-shrink-0">Wersje dokumentów z bazy</h3>
      <div className="space-y-2 pr-1">
        {signedDocumentsList.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Brak wpisów w bazie dla tej rezerwacji.</p>
        ) : (
          signedDocumentsList.map((doc) => (
            <div key={doc.id} className="bg-gray-50 rounded border border-gray-200 p-2 text-sm">
              <div className="font-medium text-gray-800">
                {doc.document_type === 'contract' ? 'Umowa' : doc.document_type === 'qualification_card' ? 'Karta kwalifikacyjna' : doc.document_type}
              </div>
              <div className="flex justify-between gap-1 mt-1 text-xs text-gray-600">
                <span>{formatDateTime(doc.created_at)}</span>
                <span className={
                  doc.status === 'accepted' ? 'text-green-600' : doc.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                }>
                  {doc.status === 'accepted' ? 'Zaakceptowana' : doc.status === 'rejected' ? 'Odrzucona' : 'W weryfikacji'}
                </span>
              </div>
              {doc.client_message && (
                <p className="text-xs text-gray-500 mt-1 truncate" title={doc.client_message}>{doc.client_message}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const rightSidebarNotesContent = (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0 min-w-0">
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-3 bg-white">
        <div className="mb-2">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Dodaj notatkę..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d283d] bg-white resize-none text-gray-900"
            rows={2}
          />
          <div className="flex justify-end items-center gap-2 mt-1">
            <button
              type="button"
              onClick={toggleNoteSpeech}
              title={noteSpeechListening ? 'Zatrzymaj dyktowanie' : 'Podyktuj notatkę (mikrofon)'}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-none border text-sm font-medium cursor-pointer transition-colors ${
                noteSpeechListening ? 'bg-red-500 border-red-600 text-white hover:bg-red-600' : 'bg-white border-gray-300 text-[#1d283d] hover:bg-gray-50'
              }`}
            >
              <Mic className="w-4 h-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleCreateNote}
              disabled={savingNote || !newNoteContent.trim()}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-none text-sm font-medium bg-[#1d283d] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {savingNote ? 'Dodawanie...' : 'Dodaj notatkę'}
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 space-y-2 min-h-0 pr-1">
          {loadingNotes ? (
            <div className="text-sm text-gray-600 text-center py-3">Ładowanie notatek...</div>
          ) : notes.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-3 italic">Brak notatek</div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="bg-gray-50 rounded border border-gray-200 p-2">
                {editingNoteId === note.id ? (
                  <div>
                    <textarea value={editingNoteContent} onChange={(e) => setEditingNoteContent(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d283d] resize-none text-gray-900" rows={3} />
                    <div className="flex justify-end gap-1 mt-1">
                      <button type="button" onClick={cancelEditingNote} className="inline-flex items-center gap-2 px-2 py-1.5 rounded-none text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer">Anuluj</button>
                      <button type="button" onClick={() => handleUpdateNote(note.id)} disabled={savingNote || !editingNoteContent.trim()} className="inline-flex items-center gap-2 px-2 py-1.5 rounded-none text-xs font-medium bg-[#1d283d] text-white hover:opacity-90 disabled:opacity-50 cursor-pointer">{savingNote ? 'Zapisywanie...' : 'Zapisz'}</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1 text-xs text-gray-700 min-w-0">
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="font-medium truncate">{note.admin_user_name || note.admin_user_login || 'Administrator'}</span>
                        <span className="text-gray-500 flex-shrink-0">•</span>
                        <span className="truncate">{formatDateTime(note.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button type="button" onClick={() => startEditingNote(note)} className="p-1 rounded-none text-[#1d283d] hover:bg-gray-200 cursor-pointer" title="Edytuj"><Edit className="w-3 h-3" /></button>
                        <button type="button" onClick={() => handleDeleteNote(note.id)} disabled={deletingNoteId === note.id} className="p-1 rounded-none text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer" title="Usuń"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-800 whitespace-pre-wrap break-words">{note.content}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const rightSidebarEventsContent = (
    <div className="flex-1 min-h-0 flex flex-col border-t border-white/20 p-3 bg-[#1d283d] overflow-y-auto">
      <h3 className="text-sm font-semibold text-white mb-2">Zdarzenia klienta</h3>
      {loadingReservationEvents ? (
        <p className="text-sm text-white/70">Ładowanie…</p>
      ) : reservationEvents.length === 0 ? (
        <p className="text-sm text-white/70 italic">Brak historii zdarzeń</p>
      ) : (
        <div className="space-y-2 text-sm text-white/90">
          {reservationEvents.map((ev) => (
            <div key={ev.id} className="flex flex-col gap-0.5 py-1.5 border-b border-white/20 last:border-b-0">
              <span className="text-white/90">{formatEventAction(ev)}</span>
              <span className="text-white/70 whitespace-nowrap text-xs">{ev.created_at ? formatDateTime(ev.created_at) : '–'}</span>
              <span className="text-white/60 text-xs">{ev.author_role === 'System' ? '(System)' : `${ev.author_display} (${ev.author_role})`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const rightSidebarGetContent = (tab: 'notes' | 'events' | 'documents') => {
    if (tab === 'notes') return rightSidebarNotesContent;
    if (tab === 'events') return rightSidebarEventsContent;
    return rightSidebarDocumentsContent;
  };

  return (
    <SectionGuard section="reservations">
      <AdminLayout>
          <div style={{ marginRight: RIGHT_SIDEBAR_WIDTH }}>
            <div className="h-full min-h-0 flex flex-col lg:flex-row animate-fadeIn -m-4">
              {/* Lewa kolumna: header, banner, karta z zakładkami */}
              <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <ReservationDetailHeader
            reservation={reservation}
            reservationNumber={reservationNumber}
            onBack={() => {
              if (typeof window !== 'undefined' && window.history.length > 1 && document.referrer.includes(window.location.host)) {
                router.back();
              } else {
                const returnParams = new URLSearchParams();
                if (fromPage) returnParams.set('page', fromPage);
                filterParams.forEach((value, key) => returnParams.set(key, value));
                router.push(returnParams.toString() ? `/admin-panel?${returnParams.toString()}` : '/admin-panel');
              }
            }}
            onRestore={async () => {
              if (!reservation?.id || restoringReservation) return;
              setRestoringReservation(true);
              try {
                const response = await authenticatedApiCall<{
                  message: string;
                  reservation_id: number;
                  reservation_number: string;
                  original_id: number;
                  turnus: string;
                  available_spots_after: number;
                }>(`/api/reservations/restore/${reservation.id}`, { method: 'POST' });
                showSuccess(`Rezerwacja została przywrócona pomyślnie! Turnus: ${response.turnus}`, 5000);
                router.push(`/admin-panel/rezerwacja/${response.reservation_number}`);
              } catch (err) {
                console.error('Error restoring reservation:', err);
                const errorMessage = err instanceof Error ? err.message : 'Błąd podczas przywracania rezerwacji';
                if (errorMessage.includes('Brak wolnych miejsc')) {
                  setNoSpotsMessage(errorMessage);
                  setShowNoSpotsModal(true);
                } else {
                  showError(errorMessage, 5000);
                }
              } finally {
                setRestoringReservation(false);
              }
            }}
            onViewClient={async () => {
              if (!reservation?.id) return;
              try {
                const response = await authenticatedApiCall<{
                  user_id: number;
                  user_email: string | null;
                  user_name: string | null;
                  can_view: boolean;
                }>(`/api/admin/client-view/from-reservation/${reservation.id}`);
                if (response.can_view) {
                  window.open(`/client-view/${response.user_id}`, '_blank');
                } else {
                  alert('Nie można wyświetlić profilu tego klienta');
                }
              } catch (err) {
                console.error('Error opening client view:', err);
                alert(err instanceof Error ? err.message : 'Błąd podczas otwierania profilu klienta');
              }
            }}
            onDeleteClick={() => setShowDeleteModal(true)}
            restoringReservation={restoringReservation}
          />

          <div className="p-4 flex-1 min-h-0 overflow-hidden lg:h-[calc(100vh-11rem)]">
            <div className="relative h-full min-h-0">
            <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden rounded-none border border-gray-200 bg-white shadow-sm">
              <nav
                className="flex-shrink-0 flex flex-nowrap rounded-none border-b border-gray-200 bg-gray-50/80 overflow-x-auto"
                role="tablist"
                aria-label="Sekcje rezerwacji"
              >
                {RESERVATION_PANELS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activePanel === id}
                    aria-controls={`panel-${id}`}
                    id={`tab-${id}`}
                    onClick={() => goToPanel(id)}
                    className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap rounded-none border border-transparent -mb-px cursor-pointer ${
                      activePanel === id
                        ? 'bg-[#1d283d] text-white border-t border-x border-[#1d283d] border-b-0'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" aria-hidden />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
                <div
                  id="panel-content"
                  className="flex-1 overflow-auto min-h-0 min-w-0 rounded-none p-4 border-t-0"
                  role="tabpanel"
                  aria-labelledby={`tab-${activePanel}`}
                >
            {activePanel === 'platnosci' && (
              <PaymentsPanel
                reservation={reservation}
                payments={payments}
                manualPayments={manualPayments}
                onManagePayments={() => router.push(`/admin-panel/rezerwacja/${reservationNumber}/payments${fromPage ? `?fromPage=${fromPage}` : ''}`)}
              />
            )}

            {activePanel === 'dane' && (
            <div className="space-y-4">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Obóz i Turnus</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Obóz</span>
                  <span className="text-sm text-gray-900">{reservation.camp_name || <MissingInfo field="camp_name" />}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Turnus</span>
                  <span className="text-sm text-gray-900">{reservation.property_name || <MissingInfo field="property_name" />}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Miasto</span>
                  <span className="text-sm text-gray-900">{reservation.property_city || <MissingInfo field="property_city" />}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Okres</span>
                  <span className="text-sm text-gray-900">{reservation.property_period || <MissingInfo field="property_period" />}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Data rozpoczęcia</span>
                  <span className="text-sm text-gray-900">{formatDate(reservation.property_start_date || null)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Data zakończenia</span>
                  <span className="text-sm text-gray-900">{formatDate(reservation.property_end_date || null)}</span>
                </div>
              </div>
            </div>

            {/* Dane uczestnika */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-slate-700">Dane uczestnika</h2>
                {!editingParticipant && (
                  <button
                    type="button"
                    onClick={() => {
                      setParticipantDraft({
                        participant_first_name: reservation.participant_first_name ?? '',
                        participant_last_name: reservation.participant_last_name ?? '',
                        participant_age: reservation.participant_age ?? '',
                        participant_gender: reservation.participant_gender ?? '',
                        participant_city: reservation.participant_city ?? '',
                      });
                      setEditingParticipant(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-sm text-[#03adf0] hover:underline"
                  >
                    <SquarePen className="h-3.5 w-3.5" aria-hidden />
                    Edytuj
                  </button>
                )}
              </div>
              {editingParticipant ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500">Imię</label>
                    <input
                      type="text"
                      value={participantDraft.participant_first_name}
                      onChange={(e) => setParticipantDraft((p) => ({ ...p, participant_first_name: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Nazwisko</label>
                    <input
                      type="text"
                      value={participantDraft.participant_last_name}
                      onChange={(e) => setParticipantDraft((p) => ({ ...p, participant_last_name: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Rocznik</label>
                    <input
                      type="text"
                      value={participantDraft.participant_age}
                      onChange={(e) => setParticipantDraft((p) => ({ ...p, participant_age: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Płeć</label>
                    <input
                      type="text"
                      value={participantDraft.participant_gender}
                      onChange={(e) => setParticipantDraft((p) => ({ ...p, participant_gender: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Miasto</label>
                    <input
                      type="text"
                      value={participantDraft.participant_city}
                      onChange={(e) => setParticipantDraft((p) => ({ ...p, participant_city: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setEditingParticipant(false)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
                    >
                      Anuluj
                    </button>
                    <button
                      type="button"
                      disabled={savingParticipant || !participantDraft.participant_first_name.trim() || !participantDraft.participant_last_name.trim() || !participantDraft.participant_age.trim() || !participantDraft.participant_gender.trim() || !participantDraft.participant_city.trim()}
                      onClick={async () => {
                        if (!reservationNumber || savingParticipant) return;
                        setSavingParticipant(true);
                        try {
                          const updated = await authenticatedApiCall<ReservationDetails>(
                            `/api/reservations/by-number/${reservationNumber}/participant`,
                            {
                              method: 'PATCH',
                              body: JSON.stringify({
                                participant_first_name: participantDraft.participant_first_name.trim(),
                                participant_last_name: participantDraft.participant_last_name.trim(),
                                participant_age: participantDraft.participant_age.trim(),
                                participant_gender: participantDraft.participant_gender.trim(),
                                participant_city: participantDraft.participant_city.trim(),
                              }),
                            },
                          );
                          setReservation((prev) => prev ? { ...prev, ...updated } : null);
                          setEditingParticipant(false);
                          showSuccess('Dane uczestnika zostały zapisane.');
                          if (reservation?.id) {
                            authenticatedApiCall<ReservationEventItem[]>(`/api/reservations/${reservation.id}/system-events`)
                              .then((data) => setReservationEvents(Array.isArray(data) ? data : []))
                              .catch(() => {});
                          }
                        } catch {
                          showError('Nie udało się zapisać danych uczestnika.');
                        } finally {
                          setSavingParticipant(false);
                        }
                      }}
                      className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingParticipant ? 'Zapisywanie…' : 'Zapisz'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Imię</span>
                    <span className="text-sm text-gray-900">{reservation.participant_first_name || <MissingInfo field="participant_first_name" />}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Nazwisko</span>
                    <span className="text-sm text-gray-900">{reservation.participant_last_name || <MissingInfo field="participant_last_name" />}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Rocznik</span>
                    <span className="text-sm text-gray-900">{reservation.participant_age || <MissingInfo field="participant_age" />}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Płeć</span>
                    <span className="text-sm text-gray-900">{reservation.participant_gender || <MissingInfo field="participant_gender" />}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Miasto</span>
                    <span className="text-sm text-gray-900">{reservation.participant_city || <MissingInfo field="participant_city" />}</span>
                  </div>
                </div>
              )}
            </div>
            </div>
            )}

            {activePanel === 'dokumenty' && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col min-h-0 h-full">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100 flex-shrink-0">Dokumenty</h2>
              <div className="flex gap-4 min-h-0 flex-1 overflow-hidden">
                <div className="flex-1 min-w-0 overflow-y-auto min-h-0">
              <div className="space-y-4">
                {/* Umowa */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="text-xs font-medium text-gray-700">Umowa:</label>
                        <p className="text-sm text-gray-900">
                          {latestSignedContract?.status === 'accepted' || reservation.contract_status === 'approved' ? (
                            <span className="text-green-600 font-medium">✓ Zatwierdzona</span>
                          ) : latestSignedContract?.status === 'rejected' ? (
                            <span className="text-red-600">Odrzucona{latestSignedContract.client_message ? `: ${latestSignedContract.client_message}` : ''}</span>
                          ) : latestSignedContract?.status === 'in_verification' ? (
                            <span className="text-amber-600">W trakcie weryfikacji</span>
                          ) : (
                            reservation.contract_status || 'Brak'
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      <div className="flex items-center gap-2 flex-wrap border border-gray-200 rounded-none px-3 py-2 bg-gray-50">
                        <span className="text-xs font-medium text-gray-700">Przypomnij o podpisaniu:</span>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input type="checkbox" checked={remindSignSms} onChange={(e) => setRemindSignSms(e.target.checked)} className="rounded border-gray-300" />
                          SMS
                        </label>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input type="checkbox" checked={remindSignEmail} onChange={(e) => setRemindSignEmail(e.target.checked)} className="rounded border-gray-300" />
                          E-mail
                        </label>
                        <button
                          type="button"
                          disabled={remindSignLoading || (!remindSignSms && !remindSignEmail)}
                          onClick={handleRemindSign}
                          className="inline-flex items-center px-3 py-1.5 rounded-none bg-slate-700 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {remindSignLoading ? 'Wysyłanie…' : 'Wyślij'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!reservation) return;
                          openDocument(
                            <ContractForm
                              reservationId={reservation.id}
                              reservationData={mapReservationToContractForm(reservation as unknown as ReservationData)}
                              signedPayload={contractSignedPayload ?? undefined}
                            />,
                            'Podgląd umowy',
                          );
                        }}
                        className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none bg-gray-100 text-gray-800 font-medium text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                        title="Podgląd umowy (ten sam widok co w profilu)"
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        Podgląd umowy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!reservation) return;
                          if (typeof window !== 'undefined') {
                            window.location.hash = 'dokumenty/umowa-edycja';
                          }
                          openedContractEditFromHashRef.current = true;
                          openDocument(
                            <ContractEditPanel
                              reservation={reservation}
                              onSaveSuccess={async () => {
                                await refetchReservation();
                                if (reservation?.id) {
                                  const list = await contractArchiveService.list(reservation.id);
                                  setContractArchiveVersions(list);
                                }
                                closeRightPanel();
                              }}
                              onClose={() => {
                                if (typeof window !== 'undefined') window.location.hash = 'dokumenty';
                                openedContractEditFromHashRef.current = false;
                                closeRightPanel();
                              }}
                            />,
                            'Edytuj umowę',
                            () => {
                              if (typeof window !== 'undefined') {
                                window.location.hash = 'dokumenty';
                                openedContractEditFromHashRef.current = false;
                              }
                            },
                          );
                        }}
                        className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none bg-gray-100 text-gray-800 font-medium text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                        title="Edytuj umowę (zapis z archiwum)"
                      >
                        <SquarePen className="w-4 h-4 flex-shrink-0" />
                        Edytuj umowę
                      </button>
                      {latestSignedContract && (
                        <>
                          <div className="flex items-center gap-2 flex-wrap border border-gray-200 rounded-none px-3 py-2 bg-amber-50/80">
                            <span className="text-xs font-medium text-gray-700">Po zaakceptowaniu/odrzuceniu umowy powiadom:</span>
                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <input type="checkbox" checked={notifyContractEmail} onChange={(e) => setNotifyContractEmail(e.target.checked)} className="rounded border-gray-300" />
                              E-mail
                            </label>
                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <input type="checkbox" checked={notifyContractSms} onChange={(e) => setNotifyContractSms(e.target.checked)} className="rounded border-gray-300" />
                              SMS
                            </label>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await authenticatedApiCall(`/api/signed-documents/${latestSignedContract.id}`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({
                                    status: 'accepted',
                                    notify_email: notifyContractEmail,
                                    notify_sms: notifyContractSms,
                                  }),
                                });
                                window.location.reload();
                              } catch (e) {
                                alert(e instanceof Error ? e.message : 'Błąd akceptacji');
                              }
                            }}
                            disabled={latestSignedContract.status === 'accepted'}
                            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            Zaakceptuj umowę
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!latestSignedContract) return;
                              openDocument(
                                <RejectDocumentPanelContent
                                  documentId={latestSignedContract.id}
                                  onSuccess={() => {
                                    closeRightPanel();
                                    showSuccess('Umowa została odrzucona.');
                                    window.location.reload();
                                  }}
                                  onCancel={closeRightPanel}
                                  notifyEmail={notifyContractEmail}
                                  notifySms={notifyContractSms}
                                />,
                                'Odrzuć umowę',
                              );
                            }}
                            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                            Odrzuć umowę
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-none border border-gray-200 flex-wrap gap-3">
                    <span className="text-sm text-gray-700">
                      {latestSignedContract
                        ? `Podpisany dokument: ${latestSignedContract.status === 'accepted' ? 'Zaakceptowana' : latestSignedContract.status === 'rejected' ? `Odrzucona${latestSignedContract.client_message ? ` – ${latestSignedContract.client_message}` : ''}` : 'W trakcie weryfikacji'}`
                        : 'Podpisany dokument: Brak podpisanego dokumentu do weryfikacji (po podpisie przez klienta pojawią się przyciski).'}
                    </span>
                  </div>
                  {contractFiles.length > 0 && (
                    <div className="space-y-1">
                      {contractFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-none border border-gray-200 text-sm">
                          <span className="truncate">{file.file_name}</span>
                          <div className="flex gap-1">
                            <button onClick={async () => { try { await contractService.downloadContractFile(file.id); } catch {} }} className="inline-flex items-center justify-center p-2 rounded-none text-[#03adf0] hover:bg-gray-100 cursor-pointer" title="Pobierz"><Download className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 space-y-2">
                    <span className="text-xs font-medium text-gray-700">Wersje umowy (archiwum)</span>
                    {contractArchiveVersions.length === 0 ? (
                      <p className="text-sm text-gray-500">Brak zapisanych wersji.</p>
                    ) : (
                      <ul className="space-y-1">
                        {contractArchiveVersions.map((v) => (
                          <li key={v.id}>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const version = await contractArchiveService.get(v.id);
                                  const snapshot = version.snapshot as unknown as ReservationData;
                                  openDocument(
                                    <ContractForm
                                      reservationId={reservation.id}
                                      reservationData={mapReservationToContractForm(snapshot)}
                                    />,
                                    `Wersja umowy ${v.created_at ? new Date(v.created_at).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : v.id}`,
                                  );
                                } catch {
                                  showError('Nie udało się wczytać wersji.');
                                }
                              }}
                              className="text-sm text-[#03adf0] hover:underline cursor-pointer"
                            >
                              Wersja z {v.created_at ? new Date(v.created_at).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : `#${v.id}`}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {reservationAnnexes.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <span className="text-xs font-medium text-gray-700">Aneksy do umowy</span>
                      <ul className="space-y-1">
                        {reservationAnnexes.map((a) => (
                          <li key={a.id} className="flex items-center justify-between gap-2 bg-gray-50 p-2 rounded-none border border-gray-200 text-sm">
                            <span className="flex-1">{a.description}</span>
                            <span className="text-xs text-gray-500">{a.status === 'pending_signing' ? 'Do podpisu' : a.status === 'signed' ? 'Podpisany' : 'Anulowany'}</span>
                            {a.status === 'pending_signing' && (
                              <button
                                type="button"
                                onClick={() => { setCancelAnnexId(a.id); setCancelAnnexReason(''); }}
                                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-medium"
                              >
                                Anuluj
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Karta kwalifikacyjna */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="text-xs font-medium text-gray-700">Karta kwalifikacyjna:</label>
                        <p className="text-sm text-gray-900">
                          {latestSignedCard?.status === 'accepted' || reservation.qualification_card_status === 'approved' ? (
                            <span className="text-green-600 font-medium">✓ Zatwierdzona</span>
                          ) : latestSignedCard?.status === 'rejected' ? (
                            <span className="text-red-600">Odrzucona{latestSignedCard.client_message ? `: ${latestSignedCard.client_message}` : ''}</span>
                          ) : latestSignedCard?.status === 'in_verification' ? (
                            <span className="text-amber-600">W trakcie weryfikacji</span>
                          ) : (
                            reservation.qualification_card_status || 'Brak'
                          )}
                        </p>
                      </div>
                    </div>
                    {!latestSignedCard && (
                      <div className="flex items-center gap-2 flex-wrap border border-gray-200 rounded-none px-3 py-2 bg-gray-50">
                        <span className="text-xs font-medium text-gray-700">Przypomnij o podpisaniu karty:</span>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input type="checkbox" checked={remindCardSms} onChange={(e) => setRemindCardSms(e.target.checked)} className="rounded border-gray-300" />
                          SMS
                        </label>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input type="checkbox" checked={remindCardEmail} onChange={(e) => setRemindCardEmail(e.target.checked)} className="rounded border-gray-300" />
                          E-mail
                        </label>
                        <button
                          type="button"
                          disabled={remindCardLoading || (!remindCardSms && !remindCardEmail)}
                          onClick={handleRemindSignCard}
                          className="inline-flex items-center px-3 py-1.5 rounded-none bg-slate-700 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {remindCardLoading ? 'Wysyłanie…' : 'Wyślij'}
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <input
                        ref={cardUploadInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !reservation) return;
                          try {
                            setUploadingCard(true);
                            await qualificationCardService.uploadQualificationCard(reservation.id, file);
                            alert('Karta kwalifikacyjna została przesłana pomyślnie');
                            const cardFilesData = await qualificationCardService.getQualificationCardFiles(reservation.id);
                            setCardFiles(cardFilesData.filter(f => f.source === 'user'));
                            if (cardUploadInputRef.current) {
                              cardUploadInputRef.current.value = '';
                            }
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Nie udało się przesłać karty');
                          } finally {
                            setUploadingCard(false);
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => cardUploadInputRef.current?.click()}
                        disabled={uploadingCard}
                        className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none bg-[#03adf0] text-white text-sm font-medium hover:bg-[#0288c7] disabled:opacity-50 cursor-pointer"
                        title="Wgraj kartę"
                      >
                        <Upload className="w-4 h-4 flex-shrink-0" />
                        {uploadingCard ? '...' : 'Wgraj'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!reservation) return;
                          openDocument(
                            <QualificationTemplateNew
                              reservationId={reservation.id}
                              reservationData={mapReservationToQualificationForm(reservation as unknown as ReservationData)}
                              signedPayload={qualificationCardSignedPayload ?? undefined}
                              previewOnly={true}
                            />,
                            'Podgląd karty kwalifikacyjnej',
                          );
                        }}
                        className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none bg-gray-100 text-gray-800 font-medium text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                        title="Podgląd karty (tylko do odczytu, jak wersja do druku)"
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        Podgląd karty kwalifikacyjnej
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!reservation || !reservationNumber) return;
                          if (typeof window !== 'undefined') window.location.hash = 'dokumenty/karta-edycja';
                          openDocument(
                            <QualificationCardEditPanelLoader
                              reservation={reservation}
                              reservationNumber={reservationNumber}
                              signedPayload={qualificationCardSignedPayload ? (qualificationCardSignedPayload as SignedQualificationPayload) : null}
                              refetchReservation={refetchReservation}
                              closeRightPanel={closeRightPanel}
                              showSuccess={showSuccess}
                              showError={showError}
                            />,
                            'Edytuj kartę kwalifikacyjną',
                            () => {
                              if (typeof window !== 'undefined') window.location.hash = 'dokumenty';
                            },
                          );
                        }}
                        className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none bg-gray-100 text-gray-800 font-medium text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                        title="Formularz edycji karty (zapis wymaga ponownego podpisu przez klienta)"
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        Edytuj kartę kwalifikacyjną
                      </button>
                    </div>
                  </div>
                  {latestSignedCard?.reverted_after_approval ? (
                    <div className="rounded-none border border-amber-400 bg-amber-50 p-3 text-sm text-amber-800">
                      Uwaga! Karta została zmodyfikowana przez klienta po ostatniej akceptacji. Wymagana ponowna weryfikacja.
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-none border border-gray-200 flex-wrap gap-3">
                    <span className="text-sm text-gray-700">
                      {latestSignedCard
                        ? `Podpisany dokument: ${latestSignedCard.status === 'accepted' ? 'Zaakceptowana' : latestSignedCard.status === 'rejected' ? `Odrzucona${latestSignedCard.client_message ? ` – ${latestSignedCard.client_message}` : ''}` : 'W trakcie weryfikacji'}`
                        : 'Podpisany dokument: Brak podpisanego dokumentu do weryfikacji (po podpisie przez klienta pojawią się przyciski).'}
                    </span>
                    {latestSignedCard && (
                      <div className="flex gap-2 flex-wrap items-center">
                        <div className="flex items-center gap-2 flex-wrap border border-gray-200 rounded-none px-2 py-1.5 bg-white">
                          <span className="text-xs font-medium text-gray-600">Po zaakceptowaniu/odrzuceniu karty powiadom:</span>
                          <label className="flex items-center gap-1 text-sm cursor-pointer">
                            <input type="checkbox" checked={notifyCardEmail} onChange={(e) => setNotifyCardEmail(e.target.checked)} className="rounded border-gray-300" />
                            E-mail
                          </label>
                          <label className="flex items-center gap-1 text-sm cursor-pointer">
                            <input type="checkbox" checked={notifyCardSms} onChange={(e) => setNotifyCardSms(e.target.checked)} className="rounded border-gray-300" />
                            SMS
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!reservation) return;
                            openDocument(
                              <QualificationTemplateNew
                                reservationId={reservation.id}
                                reservationData={mapReservationToQualificationForm(reservation as unknown as ReservationData)}
                                signedPayload={qualificationCardSignedPayload ?? undefined}
                                previewOnly={true}
                              />,
                              'Podgląd karty kwalifikacyjnej',
                            );
                          }}
                          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none bg-gray-100 text-gray-800 font-medium text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                          title="Podgląd karty (tylko do odczytu)"
                        >
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          Podgląd karty
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await authenticatedApiCall(`/api/signed-documents/${latestSignedCard.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({
                                  status: 'accepted',
                                  notify_email: notifyCardEmail,
                                  notify_sms: notifyCardSms,
                                }),
                              });
                              window.location.reload();
                            } catch (e) {
                              alert(e instanceof Error ? e.message : 'Błąd akceptacji');
                            }
                          }}
                          disabled={latestSignedCard.status === 'accepted'}
                          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          Zaakceptuj kartę
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!latestSignedCard) return;
                            openDocument(
                              <RejectDocumentPanelContent
                                documentId={latestSignedCard.id}
                                onSuccess={() => {
                                  closeRightPanel();
                                  showSuccess('Karta kwalifikacyjna została odrzucona.');
                                  window.location.reload();
                                }}
                                onCancel={closeRightPanel}
                                notifyEmail={notifyCardEmail}
                                notifySms={notifyCardSms}
                              />,
                              'Odrzuć kartę kwalifikacyjną',
                            );
                          }}
                          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4 flex-shrink-0" />
                          Odrzuć kartę
                        </button>
                      </div>
                    )}
                  </div>
                  {cardFiles.length > 0 && (
                    <div className="space-y-1">
                      {cardFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-none border border-gray-200 text-sm">
                          <span className="truncate">{file.file_name}</span>
                          <div className="flex gap-1">
                            <button onClick={async () => { try { await qualificationCardService.downloadQualificationCardFile(file.id); } catch {} }} className="inline-flex items-center justify-center p-2 rounded-none text-[#03adf0] hover:bg-gray-100 cursor-pointer" title="Pobierz"><Download className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
                </div>
                <div className="w-80 xl:w-96 flex-shrink-0 flex flex-col min-h-0 border-l border-gray-200 pl-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-none bg-[#03adf0] text-white text-sm font-medium hover:bg-[#0288c7] transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4 flex-shrink-0" />
                    Graj
                  </button>
                </div>
              </div>
            </div>
            )}

            {activePanel === 'dane' && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-slate-700">Opiekunowie</h2>
                {guardiansDraft.length < 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (guardiansDraft.length >= 2) return;
                      const nextIndex = guardiansDraft.length;
                      setGuardiansDraft((prev) => [...prev, { firstName: '', lastName: '', email: '', phoneNumber: '', street: '', city: '', postalCode: '' }]);
                      setEditingGuardianIndex(nextIndex);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-none text-sm font-medium text-[#03adf0] hover:bg-gray-100 border border-gray-200"
                  >
                    Dodaj drugiego opiekuna
                  </button>
                )}
              </div>
              {guardiansDraft.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {guardiansDraft.map((parent, index) => (
                    <div key={index} className="bg-gray-50 rounded p-3 border border-gray-100">
                      <h3 className="text-xs font-medium text-gray-500 mb-2">Opiekun {index + 1}</h3>
                      {editingGuardianIndex === index ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Imię"
                              value={parent.firstName ?? ''}
                              onChange={(e) => setGuardiansDraft((prev) => {
                                const next = [...prev];
                                next[index] = { ...next[index], firstName: e.target.value };
                                return next;
                              })}
                              className="text-sm border border-gray-300 rounded px-2 py-1.5"
                            />
                            <input
                              type="text"
                              placeholder="Nazwisko"
                              value={parent.lastName ?? ''}
                              onChange={(e) => setGuardiansDraft((prev) => {
                                const next = [...prev];
                                next[index] = { ...next[index], lastName: e.target.value };
                                return next;
                              })}
                              className="text-sm border border-gray-300 rounded px-2 py-1.5"
                            />
                          </div>
                          <input
                            type="email"
                            placeholder="E-mail"
                            value={parent.email ?? ''}
                            onChange={(e) => setGuardiansDraft((prev) => {
                              const next = [...prev];
                              next[index] = { ...next[index], email: e.target.value };
                              return next;
                            })}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                          />
                          <input
                            type="tel"
                            placeholder="Telefon"
                            value={parent.phoneNumber ?? ''}
                            onChange={(e) => setGuardiansDraft((prev) => {
                              const next = [...prev];
                              next[index] = { ...next[index], phoneNumber: e.target.value };
                              return next;
                            })}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                          />
                          <input
                            type="text"
                            placeholder="Ulica, nr"
                            value={parent.street ?? ''}
                            onChange={(e) => setGuardiansDraft((prev) => {
                              const next = [...prev];
                              next[index] = { ...next[index], street: e.target.value };
                              return next;
                            })}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              placeholder="Kod"
                              value={parent.postalCode ?? ''}
                              onChange={(e) => setGuardiansDraft((prev) => {
                                const next = [...prev];
                                next[index] = { ...next[index], postalCode: e.target.value };
                                return next;
                              })}
                              className="text-sm border border-gray-300 rounded px-2 py-1.5"
                            />
                            <input
                              type="text"
                              placeholder="Miasto"
                              value={parent.city ?? ''}
                              onChange={(e) => setGuardiansDraft((prev) => {
                                const next = [...prev];
                                next[index] = { ...next[index], city: e.target.value };
                                return next;
                              })}
                              className="col-span-2 text-sm border border-gray-300 rounded px-2 py-1.5"
                            />
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => setEditingGuardianIndex(null)}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
                            >
                              Anuluj
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!reservationNumber || savingGuardians) return;
                                setSavingGuardians(true);
                                try {
                                  const payload = guardiansDraft.map((p) => ({
                                    firstName: p.firstName ?? '',
                                    lastName: p.lastName ?? '',
                                    email: p.email ?? '',
                                    phoneNumber: p.phoneNumber ?? '',
                                    street: p.street ?? '',
                                    city: p.city ?? '',
                                    postalCode: p.postalCode ?? '',
                                  }));
                                  const updated = await authenticatedApiCall<ReservationDetails>(
                                    `/api/reservations/by-number/${reservationNumber}/partial`,
                                    { method: 'PATCH', body: JSON.stringify({ parents_data: payload }) },
                                  );
                                  setReservation((prev) => prev ? { ...prev, parents_data: updated.parents_data ?? [] } : null);
                                  setEditingGuardianIndex(null);
                                  showSuccess('Dane opiekunów zostały zapisane.');
                                } catch {
                                  showError('Nie udało się zapisać danych opiekunów.');
                                } finally {
                                  setSavingGuardians(false);
                                }
                              }}
                              disabled={savingGuardians}
                              className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {savingGuardians ? 'Zapisywanie…' : 'Zapisz'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-900">
                              {parent?.firstName || ''} {parent?.lastName || ''}
                              {(!parent?.firstName && !parent?.lastName) && <MissingInfo field="parent.name" />}
                            </p>
                            <p className="text-sm text-gray-600">{parent?.email || <MissingInfo field="parent.email" />}</p>
                            <p className="text-sm text-gray-600">{parent?.phoneNumber || <MissingInfo field="parent.phoneNumber" />}</p>
                            {(parent?.street || parent?.city || parent?.postalCode) && (
                              <p className="text-sm text-gray-600">
                                {parent?.street && <span>{parent.street}, </span>}
                                {parent?.postalCode && <span>{parent.postalCode} </span>}
                                {parent?.city && <span>{parent.city}</span>}
                              </p>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setEditingGuardianIndex(index)}
                              className="inline-flex items-center gap-1 text-sm text-[#03adf0] hover:underline"
                            >
                              <SquarePen className="h-3.5 w-3.5" aria-hidden />
                              Edytuj
                            </button>
                            {index === 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRemoveSecondGuardianReason('');
                                  setRemoveSecondGuardianError(null);
                                  setShowRemoveSecondGuardianModal(true);
                                }}
                                className="inline-flex items-center gap-1 text-sm text-red-600 hover:underline"
                                aria-label="Usuń drugiego opiekuna"
                              >
                                <X className="h-3.5 w-3.5" aria-hidden />
                                Usuń opiekuna
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <MissingInfo field="parents_data" />
              )}
            </div>
            )}

            {activePanel === 'inne' && (
            <>
            {/* Ochrony – stan lokalny (protectionDraft), zapis przyciskiem „Zapisz”, kolory: niebieski=zapisane, zielony=do dodania, wyszarzenie=do usunięcia */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-slate-700">Ochrony</h2>
                {availableProtections.length > 0 && (() => {
                  const saved = (reservation.selected_protection ?? []).map((id) =>
                    typeof id === 'number' ? id : parseInt(String(id).replace(/^protection-/, ''), 10),
                  ).filter((n) => !Number.isNaN(n));
                  const same =
                    saved.length === protectionDraft.length &&
                    saved.every((id) => protectionDraft.includes(id)) &&
                    protectionDraft.every((id) => saved.includes(id));
                  return (
                    <button
                      type="button"
                      disabled={same || savingProtection}
                      onClick={async () => {
                        if (!reservationNumber || savingProtection) return;
                        setSavingProtection(true);
                        try {
                          const updated = await authenticatedApiCall<ReservationDetails>(
                            `/api/reservations/by-number/${reservationNumber}/admin/protection`,
                            { method: 'PATCH', body: JSON.stringify({ selected_protection: protectionDraft }) },
                          );
                          setReservation((prev) => (prev && updated ? { ...prev, ...updated } : updated));
                          setProtectionDraft(
                            (updated.selected_protection ?? []).map((id) =>
                              typeof id === 'number' ? id : parseInt(String(id).replace(/^protection-/, ''), 10),
                            ).filter((n) => !Number.isNaN(n)),
                          );
                          setProtectionDraftDirty(false);
                          showSuccess('Pakiety ochrony zostały zaktualizowane.');
                          const rid = updated?.id ?? reservation?.id;
                          if (rid) {
                            authenticatedApiCall<ReservationEventItem[]>(`/api/reservations/${rid}/system-events`)
                              .then((data) => setReservationEvents(Array.isArray(data) ? data : []))
                              .catch(() => {});
                          }
                        } catch {
                          showError('Nie udało się zapisać pakietów ochrony.');
                        } finally {
                          setSavingProtection(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-none text-sm font-medium text-[#03adf0] hover:bg-gray-100 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingProtection ? 'Zapisywanie…' : 'Zapisz'}
                    </button>
                  );
                })()}
              </div>
              {availableProtections.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Brak pakietów ochrony dla tego turnusu</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {availableProtections.map((prot) => {
                      const savedIds = (reservation.selected_protection ?? []).map((id) =>
                        typeof id === 'number' ? id : parseInt(String(id).replace(/^protection-/, ''), 10),
                      ).filter((n) => !Number.isNaN(n));
                      const isChecked = protectionDraft.includes(prot.id);
                      const isPendingAdded = isChecked && !savedIds.includes(prot.id);
                      const isPendingRemoved = !isChecked && savedIds.includes(prot.id);
                      return (
                        <label
                          key={prot.id}
                          className={`flex items-center justify-between gap-2 cursor-pointer rounded px-2 py-1 -mx-2 ${
                            isPendingAdded ? 'bg-green-50 border border-green-300' : ''
                          } ${isPendingRemoved ? 'opacity-60' : ''}`}
                        >
                          <span className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setProtectionDraft((prev) =>
                                  prev.includes(prot.id)
                                    ? prev.filter((id) => id !== prot.id)
                                    : [...prev, prot.id],
                                );
                                setProtectionDraftDirty(true);
                              }}
                              className={`rounded border-gray-300 ${isPendingAdded ? 'accent-green-600' : ''} ${isChecked && !isPendingAdded ? 'accent-blue-600' : ''}`}
                            />
                            <span
                              className={`text-sm text-gray-900 ${isPendingRemoved ? 'line-through text-gray-500' : ''}`}
                            >
                              {prot.name}
                            </span>
                          </span>
                          <span className="text-sm text-gray-600 shrink-0">{formatCurrency(prot.price ?? 0)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Zielone = dodane, niebieskie = zapisane, wyszarzone = do usunięcia</p>
                </>
              )}
            </div>

            {/* Dodatki – stan lokalny (addonsDraft), zapis wyłącznie przyciskiem „Zapisz”, wizualny diff (zielony / wyszarzenie) */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-slate-700">Dodatki</h2>
                {availableAddons.length > 0 && (() => {
                  const saved = (reservation.selected_addons ?? []).map((id) =>
                    typeof id === 'number' ? id : parseInt(String(id), 10),
                  ).filter((n) => !Number.isNaN(n));
                  const same =
                    saved.length === addonsDraft.length &&
                    saved.every((id) => addonsDraft.includes(id)) &&
                    addonsDraft.every((id) => saved.includes(id));
                  return (
                    <button
                      type="button"
                      disabled={same || savingAddons}
                      onClick={async () => {
                        if (!reservationNumber || savingAddons) return;
                        setSavingAddons(true);
                        try {
                          const updated = await authenticatedApiCall<ReservationDetails>(
                            `/api/reservations/by-number/${reservationNumber}/admin/addons`,
                            { method: 'PATCH', body: JSON.stringify({ selected_addons: addonsDraft }) },
                          );
                          setReservation((prev) => (prev && updated ? { ...prev, ...updated } : updated));
                          setAddonsDraft(
                            (updated.selected_addons ?? []).map((id) =>
                              typeof id === 'number' ? id : parseInt(String(id), 10),
                            ).filter((n) => !Number.isNaN(n)),
                          );
                          setAddonsDraftDirty(false);
                          showSuccess('Dodatki zostały zaktualizowane.');
                          const rid = updated?.id ?? reservation?.id;
                          if (rid) {
                            authenticatedApiCall<ReservationEventItem[]>(`/api/reservations/${rid}/system-events`)
                              .then((data) => setReservationEvents(Array.isArray(data) ? data : []))
                              .catch(() => {});
                          }
                        } catch {
                          showError('Nie udało się zapisać dodatków.');
                        } finally {
                          setSavingAddons(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-none text-sm font-medium text-[#03adf0] hover:bg-gray-100 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingAddons ? 'Zapisywanie…' : 'Zapisz'}
                    </button>
                  );
                })()}
              </div>
              {availableAddons.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Brak dodatków dla tego turnusu</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {availableAddons.map((addon) => {
                      const savedIds = (reservation.selected_addons ?? []).map((id) =>
                        typeof id === 'number' ? id : parseInt(String(id), 10),
                      ).filter((n) => !Number.isNaN(n));
                      const isChecked = addonsDraft.includes(addon.id);
                      const isPendingAdded = isChecked && !savedIds.includes(addon.id);
                      const isPendingRemoved = !isChecked && savedIds.includes(addon.id);
                      return (
                        <label
                          key={addon.id}
                          className={`flex items-center justify-between gap-2 cursor-pointer rounded px-2 py-1 -mx-2 ${
                            isPendingAdded ? 'bg-green-50 border border-green-300' : ''
                          } ${isPendingRemoved ? 'opacity-60' : ''}`}
                        >
                          <span className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setAddonsDraft((prev) =>
                                  prev.includes(addon.id)
                                    ? prev.filter((id) => id !== addon.id)
                                    : [...prev, addon.id],
                                );
                                setAddonsDraftDirty(true);
                              }}
                              className={`rounded border-gray-300 ${isPendingAdded ? 'accent-green-600' : ''}`}
                            />
                            <span
                              className={`text-sm text-gray-900 ${isPendingRemoved ? 'line-through text-gray-500' : ''}`}
                            >
                              {addon.name}
                            </span>
                          </span>
                          <span className="text-sm text-gray-600 shrink-0">{formatCurrency(addon.price ?? 0)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Zielone = dodane, wyszarzone = do usunięcia (zapis po kliku „Zapisz”)</p>
                </>
              )}
            </div>
            </>
            )}

            {activePanel === 'promocje-transport' && (
            <>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Promocje</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-sm font-medium text-gray-700">Promocja:</label>
                  <div className="flex items-center gap-2">
                    <select
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                      value={currentPromotionId ?? ''}
                      onChange={(e) => handlePromotionSelect(e.target.value)}
                    >
                      <option value="">Brak promocji</option>
                      {promotionOptions.map((option) => (
                        <option key={option.relationId} value={option.relationId}>
                          {option.name} — {formatCurrency(option.price)}
                          {option.doesNotReducePrice ? ' (nie obniża ceny)' : ''}
                        </option>
                      ))}
                    </select>
                    {currentPromotionId !== null && (
                      <button
                        type="button"
                        onClick={() => openPromotionModal(null)}
                        className="p-2 rounded-md border border-gray-300 hover:bg-gray-100 transition-colors"
                        aria-label="Usuń promocję"
                      >
                        <X className="h-4 w-4 text-gray-700" />
                      </button>
                    )}
                  </div>
                </div>

                {currentPromotionId !== null && (() => {
                  const promotion = promotions.get(currentPromotionId);
                  if (promotion) {
                    return (
                      <div>
                        <p className="text-sm text-gray-900">{promotion.name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Cena: {formatCurrency(promotion.price)}
                          {promotion.does_not_reduce_price ? ' (promocja informacyjna – nie obniża ceny)' : ''}
                        </p>
                      </div>
                    );
                  }
                  // Fallback: użyj promotion_name z API (dla nieaktywnych promocji)
                  if (reservation.promotion_name) {
                    return (
                      <div>
                        <p className="text-sm text-gray-900 flex items-center justify-between gap-2">
                          <span>{reservation.promotion_name}</span>
                          {reservation.promotion_price !== null && reservation.promotion_price !== undefined && (
                            <span className="text-gray-700">{formatCurrency(reservation.promotion_price)}</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 italic">
                          (promocja nieaktywna - dane historyczne)
                        </p>
                      </div>
                    );
                  }
                  return (
                    <p className="text-sm text-gray-900">
                      <MissingInfo field={`promocja ID: ${reservation.selected_promotion}`} />
                    </p>
                  );
                })()}

                {/* Gdy wybrano "Brak promocji", ale rezerwacja miała promocję – pokaż dane historyczne i uzasadnienie */}
                {currentPromotionId === null && (reservation.promotion_name || reservation.selected_promotion) && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-900 font-medium">
                      {reservation.promotion_name || `Promocja #${reservation.selected_promotion}`}
                    </p>
                    {reservation.promotion_price !== null && reservation.promotion_price !== undefined && (
                      <p className="text-sm text-gray-600">
                        Cena: {formatCurrency(reservation.promotion_price)}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 italic">
                      (promocja nieaktywna - dane historyczne)
                    </p>
                    {hasJustificationData(reservation.promotion_justification) && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Uzasadnienie:</label>
                        <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded mt-1 whitespace-pre-wrap border border-gray-100">
                          {formatJustificationForDisplay(reservation.promotion_justification)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {currentPromotionId !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Uzasadnienie:</label>
                      {!editingJustification && (
                        <button
                          onClick={() => {
                            setJustificationDraft(getJustificationForCurrentPromotion());
                            setEditingJustification(true);
                            setJustificationError(null);
                          }}
                          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium text-[#03adf0] hover:text-[#0288c7] hover:bg-gray-100 cursor-pointer"
                        >
                          Edytuj
                        </button>
                      )}
                    </div>
                    {editingJustification ? (
                      <div className="mt-2 space-y-3">
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
                        {justificationError && (
                          <div className="text-xs sm:text-sm text-red-600">{justificationError}</div>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              setJustificationError(null);
                              const valid = validateJustificationDraft();
                              if (!valid) return;

                              try {
                                setSavingJustification(true);
                                // Filtrujemy uzasadnienie - zapisujemy tylko pola potrzebne dla obecnej promocji
                                const filteredJustification = filterJustificationForSave(justificationDraft);
                                const response = await authenticatedApiCall<ReservationDetails>(
                                  `/api/reservations/${reservation.id}/promotion-justification/admin`,
                                  {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({ promotion_justification: filteredJustification }),
                                  },
                                );
                                setReservation((prev) => (prev && response ? { ...prev, ...response } : response));
                                setEditingJustification(false);
                              } catch (err: any) {
                                setJustificationError(err?.message || 'Nie udało się zapisać uzasadnienia.');
                              } finally {
                                setSavingJustification(false);
                              }
                            }}
                            disabled={savingJustification}
                            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium bg-[#03adf0] text-white hover:bg-[#0288c7] disabled:opacity-60 cursor-pointer"
                          >
                            {savingJustification ? 'Zapisywanie...' : 'Zapisz'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingJustification(false);
                              setJustificationDraft(getJustificationForCurrentPromotion());
                              setJustificationError(null);
                            }}
                            disabled={savingJustification}
                            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium border border-gray-300 hover:bg-gray-100 disabled:opacity-60 cursor-pointer"
                          >
                            Anuluj
                          </button>
                        </div>
                      </div>
                    ) : (
                      (() => {
                        const justification = reservation.promotion_justification;
                        const hasJustification = hasJustificationData(justification);

                        if (!hasJustification) {
                          return (
                            <p className="text-sm text-gray-500 italic mt-1">
                              Klient nie dodał uzasadnienia promocji
                            </p>
                          );
                        }

                        // Format justification in a readable way
                        const formatJustification = (just: any): string => {
                          const parts: string[] = [];

                          if (just.card_number) {
                            parts.push(`Numer karty dużej rodziny: ${just.card_number}`);
                          }

                          if (just.sibling_first_name || just.sibling_last_name) {
                            const siblingName = [just.sibling_first_name, just.sibling_last_name]
                              .filter(Boolean)
                              .join(' ');
                            if (siblingName) {
                              parts.push(`Rodzeństwo: ${siblingName}`);
                            }
                          }

                          if (just.first_camp_date) {
                            parts.push(`Data pierwszego obozu: ${just.first_camp_date}`);
                          }

                          if (just.first_camp_name) {
                            parts.push(`Nazwa pierwszego obozu: ${just.first_camp_name}`);
                          }

                          if (just.reason) {
                            parts.push(`Powód wyboru promocji: ${just.reason}`);
                          }

                          if (just.years) {
                            const yearsStr = Array.isArray(just.years)
                              ? just.years.join(', ')
                              : String(just.years);
                            if (yearsStr) {
                              parts.push(`Lata uczestnictwa: ${yearsStr}`);
                            }
                          }

                          // If there are other fields not covered above, show them
                          const knownFields = ['card_number', 'sibling_first_name', 'sibling_last_name',
                            'first_camp_date', 'first_camp_name', 'reason', 'years'];
                          const otherFields = Object.keys(just).filter(key => !knownFields.includes(key));
                          otherFields.forEach(key => {
                            const value = just[key];
                            if (value !== null && value !== undefined && value !== '') {
                              parts.push(`${key}: ${String(value)}`);
                            }
                          });

                          return parts.length > 0 ? parts.join('\n') : '';
                        };

                        const formattedText = formatJustification(justification);

                        if (!formattedText) {
                          return (
                            <p className="text-sm text-gray-500 italic mt-1">
                              Klient nie dodał uzasadnienia promocji
                            </p>
                          );
                        }

                        return (
                          <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded mt-1 whitespace-pre-wrap">
                            {formattedText}
                          </pre>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-slate-700">Transport</h2>
                {(() => {
                  const r = reservation;
                  const d = transportDraft;
                  const same =
                    (d.departure_type === (r.departure_type ?? 'wlasny')) &&
                    (d.departure_city ?? null) === (r.departure_city ?? null) &&
                    (d.departure_transport_city_id ?? null) === ((r as any).departure_transport_city_id ?? null) &&
                    (d.return_type === (r.return_type ?? 'wlasny')) &&
                    (d.return_city ?? null) === (r.return_city ?? null) &&
                    (d.return_transport_city_id ?? null) === ((r as any).return_transport_city_id ?? null) &&
                    d.transport_different_cities === (r.transport_different_cities ?? false);
                  return (
                    <button
                      type="button"
                      disabled={same || savingTransport}
                      onClick={async () => {
                        if (!reservationNumber || savingTransport) return;
                        setSavingTransport(true);
                        try {
                          const updated = await authenticatedApiCall<ReservationDetails>(
                            `/api/reservations/by-number/${reservationNumber}/admin/transport`,
                            { method: 'PATCH', body: JSON.stringify({
                              departure_type: transportDraft.departure_type,
                              departure_city: transportDraft.departure_city ?? null,
                              departure_transport_city_id: transportDraft.departure_transport_city_id ?? null,
                              return_type: transportDraft.return_type,
                              return_city: transportDraft.return_city ?? null,
                              return_transport_city_id: transportDraft.return_transport_city_id ?? null,
                              transport_different_cities: transportDraft.transport_different_cities,
                            }) },
                          );
                          setReservation((prev) => (prev && updated ? { ...prev, ...updated } : updated));
                          setTransportDraft({
                            departure_type: updated.departure_type ?? 'wlasny',
                            departure_city: updated.departure_city ?? null,
                            departure_transport_city_id: (updated as any).departure_transport_city_id ?? null,
                            return_type: updated.return_type ?? 'wlasny',
                            return_city: updated.return_city ?? null,
                            return_transport_city_id: (updated as any).return_transport_city_id ?? null,
                            transport_different_cities: updated.transport_different_cities ?? false,
                          });
                          showSuccess('Transport został zaktualizowany.');
                          if (reservation?.id) {
                            authenticatedApiCall<ReservationEventItem[]>(`/api/reservations/${reservation.id}/system-events`)
                              .then((data) => setReservationEvents(Array.isArray(data) ? data : []))
                              .catch(() => {});
                          }
                        } catch {
                          showError('Nie udało się zapisać transportu.');
                        } finally {
                          setSavingTransport(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-none text-sm font-medium text-[#03adf0] hover:bg-gray-100 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingTransport ? 'Zapisywanie…' : 'Zapisz'}
                    </button>
                  );
                })()}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Wyjazd</label>
                  <div className="flex gap-2 flex-wrap items-center">
                    <select
                      value={transportDraft.departure_type}
                      onChange={(e) => {
                        const v = e.target.value as 'zbiorowy' | 'wlasny';
                        setTransportDraft((p) => ({
                          ...p,
                          departure_type: v,
                          departure_city: v === 'zbiorowy' ? (transportCities[0]?.city ?? null) : null,
                          departure_transport_city_id: v === 'zbiorowy' ? (transportCities[0]?.id ?? null) : null,
                        }));
                      }}
                      className="text-sm border border-gray-300 rounded px-2 py-1.5"
                    >
                      <option value="wlasny">Własny</option>
                      <option value="zbiorowy">Zbiorowy</option>
                    </select>
                    {transportDraft.departure_type === 'zbiorowy' && (
                      <select
                        value={transportDraft.departure_city ?? ''}
                        onChange={(e) => {
                          const city = e.target.value;
                          const rec = transportCities.find((c) => c.city === city);
                          setTransportDraft((p) => ({
                            ...p,
                            departure_city: city || null,
                            departure_transport_city_id: rec?.id ?? null,
                          }));
                        }}
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 min-w-[140px]"
                      >
                        {transportCities.map((c) => (
                          <option key={c.id} value={c.city}>
                            {c.city}{c.departure_price !== null && c.departure_price !== undefined ? ` (${formatCurrency(c.departure_price)})` : ''}
                          </option>
                        ))}
                        {transportCities.length === 0 && <option value="">Brak miast</option>}
                      </select>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Powrót</label>
                  <div className="flex gap-2 flex-wrap items-center">
                    <select
                      value={transportDraft.return_type}
                      onChange={(e) => {
                        const v = e.target.value as 'zbiorowy' | 'wlasny';
                        setTransportDraft((p) => ({
                          ...p,
                          return_type: v,
                          return_city: v === 'zbiorowy' ? (transportCities[0]?.city ?? null) : null,
                          return_transport_city_id: v === 'zbiorowy' ? (transportCities[0]?.id ?? null) : null,
                        }));
                      }}
                      className="text-sm border border-gray-300 rounded px-2 py-1.5"
                    >
                      <option value="wlasny">Własny</option>
                      <option value="zbiorowy">Zbiorowy</option>
                    </select>
                    {transportDraft.return_type === 'zbiorowy' && (
                      <select
                        value={transportDraft.return_city ?? ''}
                        onChange={(e) => {
                          const city = e.target.value;
                          const rec = transportCities.find((c) => c.city === city);
                          setTransportDraft((p) => ({
                            ...p,
                            return_city: city || null,
                            return_transport_city_id: rec?.id ?? null,
                          }));
                        }}
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 min-w-[140px]"
                      >
                        {transportCities.map((c) => (
                          <option key={c.id} value={c.city}>
                            {c.city}{c.return_price !== null && c.return_price !== undefined ? ` (${formatCurrency(c.return_price)})` : ''}
                          </option>
                        ))}
                        {transportCities.length === 0 && <option value="">Brak miast</option>}
                      </select>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="transport-different-cities"
                    checked={transportDraft.transport_different_cities}
                    onChange={(e) => setTransportDraft((p) => ({ ...p, transport_different_cities: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="transport-different-cities" className="text-sm text-gray-700">Różne miasta wyjazdu i powrotu</label>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-gray-100">
                  <span className="text-gray-600">Dopłata za transport</span>
                  <span className="font-medium text-gray-900">
                    {transportPriceFromDraft > 0 ? `+ ${formatCurrency(transportPriceFromDraft)}` : 'Brak dopłaty'}
                  </span>
                </div>
              </div>
            </div>
            </>
            )}

            {activePanel === 'inne' && (
            <>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-slate-700">Źródło</h2>
                {(() => {
                  const savedSource = reservation.selected_source ?? '';
                  const draftText = (sourceDraft.source_inne_text ?? '').toString().trim() || null;
                  const savedText = (reservation.source_inne_text ?? '').toString().trim() || null;
                  const same =
                    sourceDraft.selected_source === savedSource &&
                    draftText === savedText;
                  return (
                    <button
                      type="button"
                      disabled={same || savingSource}
                      onClick={async () => {
                        if (!reservationNumber || savingSource) return;
                        setSavingSource(true);
                        try {
                          const updated = await authenticatedApiCall<ReservationDetails>(
                            `/api/reservations/by-number/${reservationNumber}/admin/source`,
                            { method: 'PATCH', body: JSON.stringify({ selected_source: sourceDraft.selected_source, source_inne_text: sourceDraft.source_inne_text ?? null }) },
                          );
                          setReservation((prev) => (prev && updated ? { ...prev, ...updated } : updated));
                          setSourceDraft({
                            selected_source: updated.selected_source ?? '',
                            source_inne_text: updated.source_inne_text ?? null,
                          });
                          showSuccess('Źródło zostało zaktualizowane.');
                          if (reservation?.id) {
                            authenticatedApiCall<ReservationEventItem[]>(`/api/reservations/${reservation.id}/system-events`)
                              .then((data) => setReservationEvents(Array.isArray(data) ? data : []))
                              .catch(() => {});
                          }
                        } catch {
                          showError('Nie udało się zapisać źródła.');
                        } finally {
                          setSavingSource(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-none text-sm font-medium text-[#03adf0] hover:bg-gray-100 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingSource ? 'Zapisywanie…' : 'Zapisz'}
                    </button>
                  );
                })()}
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-gray-500">Źródło pozyskania klienta</label>
                <select
                  value={sourceDraft.selected_source}
                  onChange={(e) => setSourceDraft((p) => ({ ...p, selected_source: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                >
                  {sourcesList.map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                  {sourcesList.length === 0 && <option value="">Ładowanie…</option>}
                </select>
                {(sourceDraft.selected_source === 'inne' || (sourceDraft.source_inne_text !== null && sourceDraft.source_inne_text !== undefined)) && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500">Szczegóły (np. inne)</label>
                    <input
                      type="text"
                      value={sourceDraft.source_inne_text ?? ''}
                      onChange={(e) => setSourceDraft((p) => ({ ...p, source_inne_text: e.target.value.trim() || null }))}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                      placeholder="Opis"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-slate-700">Faktura</h2>
                {(() => {
                  const r = reservation;
                  const d = invoiceDraft;
                  const same =
                    (d.wants_invoice ?? r.wants_invoice ?? false) === (r.wants_invoice ?? false) &&
                    (d.invoice_type ?? r.invoice_type ?? 'private') === (r.invoice_type ?? 'private') &&
                    (d.invoice_company_name ?? null) === (r.invoice_company_name ?? null) &&
                    (d.invoice_nip ?? null) === (r.invoice_nip ?? null) &&
                    (d.invoice_first_name ?? null) === (r.invoice_first_name ?? null) &&
                    (d.invoice_last_name ?? null) === (r.invoice_last_name ?? null) &&
                    (d.invoice_email ?? null) === (r.invoice_email ?? null) &&
                    (d.invoice_phone ?? null) === (r.invoice_phone ?? null) &&
                    (d.invoice_street ?? '') === (r.invoice_street ?? '') &&
                    (d.invoice_postal_code ?? '') === (r.invoice_postal_code ?? '') &&
                    (d.invoice_city ?? '') === (r.invoice_city ?? '');
                  return (
                    <button
                      type="button"
                      disabled={same || savingInvoice}
                      onClick={async () => {
                        if (!reservationNumber || savingInvoice) return;
                        setSavingInvoice(true);
                        try {
                          const body = {
                            wants_invoice: invoiceDraft.wants_invoice ?? reservation.wants_invoice ?? false,
                            invoice_type: invoiceDraft.invoice_type || reservation.invoice_type || 'private',
                            invoice_company_name: invoiceDraft.invoice_company_name ?? reservation.invoice_company_name ?? null,
                            invoice_nip: invoiceDraft.invoice_nip ?? reservation.invoice_nip ?? null,
                            invoice_first_name: invoiceDraft.invoice_first_name ?? reservation.invoice_first_name ?? null,
                            invoice_last_name: invoiceDraft.invoice_last_name ?? reservation.invoice_last_name ?? null,
                            invoice_email: invoiceDraft.invoice_email ?? reservation.invoice_email ?? null,
                            invoice_phone: invoiceDraft.invoice_phone ?? reservation.invoice_phone ?? null,
                            invoice_street: invoiceDraft.invoice_street ?? reservation.invoice_street ?? '',
                            invoice_postal_code: invoiceDraft.invoice_postal_code ?? reservation.invoice_postal_code ?? '',
                            invoice_city: invoiceDraft.invoice_city ?? reservation.invoice_city ?? '',
                          };
                          const updated = await authenticatedApiCall<ReservationDetails>(
                            `/api/reservations/by-number/${reservationNumber}/admin/invoice`,
                            { method: 'PATCH', body: JSON.stringify(body) },
                          );
                          setReservation((prev) => (prev && updated ? { ...prev, ...updated } : updated));
                          setInvoiceDraft({
                            wants_invoice: updated.wants_invoice ?? false,
                            invoice_type: updated.invoice_type ?? 'private',
                            invoice_company_name: updated.invoice_company_name ?? null,
                            invoice_nip: updated.invoice_nip ?? null,
                            invoice_first_name: updated.invoice_first_name ?? null,
                            invoice_last_name: updated.invoice_last_name ?? null,
                            invoice_email: updated.invoice_email ?? null,
                            invoice_phone: updated.invoice_phone ?? null,
                            invoice_street: updated.invoice_street ?? null,
                            invoice_postal_code: updated.invoice_postal_code ?? null,
                            invoice_city: updated.invoice_city ?? null,
                          });
                          showSuccess('Dane faktury zostały zapisane.');
                          if (reservation?.id) {
                            authenticatedApiCall<ReservationEventItem[]>(`/api/reservations/${reservation.id}/system-events`)
                              .then((data) => setReservationEvents(Array.isArray(data) ? data : []))
                              .catch(() => {});
                          }
                        } catch {
                          showError('Nie udało się zapisać danych faktury.');
                        } finally {
                          setSavingInvoice(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-none text-sm font-medium text-[#03adf0] hover:bg-gray-100 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingInvoice ? 'Zapisywanie…' : 'Zapisz'}
                    </button>
                  );
                })()}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Chce fakturę</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={invoiceDraft.wants_invoice ?? reservation.wants_invoice ?? false}
                    onClick={() => setInvoiceDraft((p) => ({ ...p, wants_invoice: !(p.wants_invoice ?? reservation.wants_invoice ?? false) }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${(invoiceDraft.wants_invoice ?? reservation.wants_invoice) ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${(invoiceDraft.wants_invoice ?? reservation.wants_invoice) ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-gray-600">{(invoiceDraft.wants_invoice ?? reservation.wants_invoice) ? 'Tak' : 'Nie'}</span>
                </div>
                {(invoiceDraft.wants_invoice ?? reservation.wants_invoice) && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-xs text-gray-500">Typ faktury</label>
                      <select
                        value={invoiceDraft.invoice_type || reservation.invoice_type || 'private'}
                        onChange={(e) => setInvoiceDraft((p) => ({ ...p, invoice_type: e.target.value }))}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                      >
                        <option value="private">Osoba prywatna</option>
                        <option value="company">Firma</option>
                      </select>
                    </div>
                    {(invoiceDraft.invoice_type || reservation.invoice_type) === 'company' ? (
                      <>
                        <div>
                          <label className="block text-xs text-gray-500">Nazwa firmy</label>
                          <input type="text" value={invoiceDraft.invoice_company_name ?? reservation.invoice_company_name ?? ''} onChange={(e) => setInvoiceDraft((p) => ({ ...p, invoice_company_name: e.target.value || null }))} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">NIP</label>
                          <input type="text" value={invoiceDraft.invoice_nip ?? reservation.invoice_nip ?? ''} onChange={(e) => setInvoiceDraft((p) => ({ ...p, invoice_nip: e.target.value || null }))} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs text-gray-500">Imię</label>
                          <input type="text" value={invoiceDraft.invoice_first_name ?? reservation.invoice_first_name ?? ''} onChange={(e) => setInvoiceDraft((p) => ({ ...p, invoice_first_name: e.target.value || null }))} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Nazwisko</label>
                          <input type="text" value={invoiceDraft.invoice_last_name ?? reservation.invoice_last_name ?? ''} onChange={(e) => setInvoiceDraft((p) => ({ ...p, invoice_last_name: e.target.value || null }))} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Email</label>
                          <input type="email" value={invoiceDraft.invoice_email ?? reservation.invoice_email ?? ''} onChange={(e) => setInvoiceDraft((p) => ({ ...p, invoice_email: e.target.value || null }))} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Telefon</label>
                          <input type="text" value={invoiceDraft.invoice_phone ?? reservation.invoice_phone ?? ''} onChange={(e) => setInvoiceDraft((p) => ({ ...p, invoice_phone: e.target.value || null }))} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5" />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-xs text-gray-500">Ulica i nr</label>
                      <input type="text" value={invoiceDraft.invoice_street ?? reservation.invoice_street ?? ''} onChange={(e) => setInvoiceDraft((p) => ({ ...p, invoice_street: e.target.value || null }))} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5" />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500">Kod pocztowy</label>
                        <input type="text" value={invoiceDraft.invoice_postal_code ?? reservation.invoice_postal_code ?? ''} onChange={(e) => setInvoiceDraft((p) => ({ ...p, invoice_postal_code: e.target.value || null }))} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5" />
                      </div>
                      <div className="flex-[2]">
                        <label className="block text-xs text-gray-500">Miasto</label>
                        <input type="text" value={invoiceDraft.invoice_city ?? reservation.invoice_city ?? ''} onChange={(e) => setInvoiceDraft((p) => ({ ...p, invoice_city: e.target.value || null }))} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </>
            )}

            {activePanel === 'zdrowie' && (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-slate-700">Zdrowie</h2>
                  {!editingHealth && (
                    <button
                      type="button"
                      onClick={() => {
                        setHealthDraft({
                          health_questions: reservation.health_questions && typeof reservation.health_questions === 'object' ? { ...reservation.health_questions } : {},
                          health_details: reservation.health_details && typeof reservation.health_details === 'object' ? { ...reservation.health_details } : {},
                          additional_notes: reservation.additional_notes ?? '',
                        });
                        setEditingHealth(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-sm text-[#03adf0] hover:underline"
                    >
                      <SquarePen className="h-3.5 w-3.5" aria-hidden />
                      Edytuj
                    </button>
                  )}
                </div>
                {editingHealth ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500">Choroby przewlekłe – szczegóły</label>
                      <textarea
                        value={typeof healthDraft.health_details?.chronicDiseases === 'string' ? healthDraft.health_details.chronicDiseases : ''}
                        onChange={(e) => setHealthDraft((p) => ({ ...p, health_details: { ...p.health_details, chronicDiseases: e.target.value } }))}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5 min-h-[60px]"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Dysfunkcje – szczegóły</label>
                      <textarea
                        value={typeof healthDraft.health_details?.dysfunctions === 'string' ? healthDraft.health_details.dysfunctions : ''}
                        onChange={(e) => setHealthDraft((p) => ({ ...p, health_details: { ...p.health_details, dysfunctions: e.target.value } }))}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5 min-h-[60px]"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Psychiatryczne – szczegóły</label>
                      <textarea
                        value={typeof healthDraft.health_details?.psychiatric === 'string' ? healthDraft.health_details.psychiatric : ''}
                        onChange={(e) => setHealthDraft((p) => ({ ...p, health_details: { ...p.health_details, psychiatric: e.target.value } }))}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5 min-h-[60px]"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Uwagi dodatkowe</label>
                      <textarea
                        value={healthDraft.additional_notes ?? ''}
                        onChange={(e) => setHealthDraft((p) => ({ ...p, additional_notes: e.target.value }))}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mt-0.5 min-h-[60px]"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={() => setEditingHealth(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100">Anuluj</button>
                      <button
                        type="button"
                        disabled={savingHealth}
                        onClick={async () => {
                          if (!reservationNumber || savingHealth) return;
                          setSavingHealth(true);
                          try {
                            const payload: { health_questions?: Record<string, unknown>; health_details?: Record<string, unknown>; additional_notes?: string | null } = {};
                            if (healthDraft.health_questions !== undefined) payload.health_questions = healthDraft.health_questions;
                            if (healthDraft.health_details !== undefined) payload.health_details = healthDraft.health_details;
                            if (healthDraft.additional_notes !== undefined) payload.additional_notes = healthDraft.additional_notes || null;
                            const updated = await authenticatedApiCall<ReservationDetails>(
                              `/api/reservations/by-number/${reservationNumber}/admin/health`,
                              { method: 'PATCH', body: JSON.stringify(payload) },
                            );
                            setReservation((prev) => (prev && updated ? { ...prev, ...updated } : updated));
                            setEditingHealth(false);
                            showSuccess('Dane zdrowotne zostały zapisane.');
                            if (reservation?.id) {
                              authenticatedApiCall<ReservationEventItem[]>(`/api/reservations/${reservation.id}/system-events`)
                                .then((data) => setReservationEvents(Array.isArray(data) ? data : []))
                                .catch(() => {});
                            }
                          } catch {
                            showError('Nie udało się zapisać danych zdrowotnych.');
                          } finally {
                            setSavingHealth(false);
                          }
                        }}
                        className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingHealth ? 'Zapisywanie…' : 'Zapisz'}
                      </button>
                    </div>
                  </div>
                ) : (reservation.health_questions || reservation.health_details || reservation.additional_notes) ? (
                  <div className="space-y-2">
                    {reservation.health_questions && typeof reservation.health_questions === 'object' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Choroby przewlekłe</span>
                          <span className="text-sm text-gray-900">
                            {reservation.health_questions.chronicDiseases === 'Tak' || reservation.health_questions.chronicDiseases === 'tak' || reservation.health_questions.chronicDiseases === true ? 'Tak' : 'Nie'}
                          </span>
                        </div>
                        {(reservation.health_questions.chronicDiseases === 'Tak' || reservation.health_questions.chronicDiseases === 'tak' || reservation.health_questions.chronicDiseases === true) &&
                          reservation.health_details?.chronicDiseases && (
                          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{reservation.health_details.chronicDiseases}</p>
                        )}
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Dysfunkcje</span>
                          <span className="text-sm text-gray-900">
                            {reservation.health_questions.dysfunctions === 'Tak' || reservation.health_questions.dysfunctions === 'tak' || reservation.health_questions.dysfunctions === true ? 'Tak' : 'Nie'}
                          </span>
                        </div>
                        {(reservation.health_questions.dysfunctions === 'Tak' || reservation.health_questions.dysfunctions === 'tak' || reservation.health_questions.dysfunctions === true) &&
                          reservation.health_details?.dysfunctions && (
                          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{reservation.health_details.dysfunctions}</p>
                        )}
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Psychiatryczne</span>
                          <span className="text-sm text-gray-900">
                            {reservation.health_questions.psychiatric === 'Tak' || reservation.health_questions.psychiatric === 'tak' || reservation.health_questions.psychiatric === true ? 'Tak' : 'Nie'}
                          </span>
                        </div>
                        {(reservation.health_questions.psychiatric === 'Tak' || reservation.health_questions.psychiatric === 'tak' || reservation.health_questions.psychiatric === true) &&
                          reservation.health_details?.psychiatric && (
                          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{reservation.health_details.psychiatric}</p>
                        )}
                      </>
                    )}
                    {reservation.additional_notes && (
                      <>
                        <div className="text-xs text-gray-500 mt-2">Uwagi dodatkowe</div>
                        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap">{reservation.additional_notes}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Brak informacji o zdrowiu</p>
                )}
              </div>
            )}

            {activePanel === 'informacje' && (
            <React.Fragment>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Informacje dodatkowe dotyczące uczestnika</h2>
              <textarea
                value={participantAdditionalInfo}
                onChange={(e) => setParticipantAdditionalInfo(e.target.value)}
                placeholder="Opcjonalne – można uzupełnić z poziomu administracji"
                className="w-full text-sm text-gray-900 border border-gray-300 rounded p-2 min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!reservation) return;
                    setSavingParticipantAdditionalInfo(true);
                    try {
                      const result = await authenticatedApiCall<{ participant_additional_info: string | null }>(
                        `/api/reservations/${reservation.id}/participant-additional-info`,
                        {
                          method: 'PATCH',
                          body: JSON.stringify({
                            participant_additional_info: participantAdditionalInfo.trim() || null,
                          }),
                        },
                      );
                      setReservation((prev) => prev ? { ...prev, participant_additional_info: result.participant_additional_info ?? null } : null);
                      showSuccess('Informacje dodatkowe zostały zapisane.');
                    } catch {
                      showError('Nie udało się zapisać informacji dodatkowych.');
                    } finally {
                      setSavingParticipantAdditionalInfo(false);
                    }
                  }}
                  disabled={savingParticipantAdditionalInfo}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {savingParticipantAdditionalInfo ? 'Zapisywanie…' : 'Zapisz'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Wniosek o zakwaterowanie uczestnika</h2>
              <textarea
                value={accommodationRequest}
                onChange={(e) => setAccommodationRequest(e.target.value)}
                placeholder="Opcjonalne – np. z kim dziecko chce być zakwaterowane"
                className="w-full text-sm text-gray-900 border border-gray-300 rounded p-2 min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!reservation) return;
                    setSavingAccommodationRequest(true);
                    try {
                      const result = await authenticatedApiCall<{ accommodation_request: string | null }>(
                        `/api/reservations/${reservation.id}/accommodation-request`,
                        {
                          method: 'PATCH',
                          body: JSON.stringify({
                            accommodation_request: accommodationRequest.trim() || null,
                          }),
                        },
                      );
                      setReservation((prev) => prev ? { ...prev, accommodation_request: result.accommodation_request ?? null } : null);
                      showSuccess('Wniosek o zakwaterowanie został zapisany.');
                    } catch {
                      showError('Nie udało się zapisać wniosku o zakwaterowanie.');
                    } finally {
                      setSavingAccommodationRequest(false);
                    }
                  }}
                  disabled={savingAccommodationRequest}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {savingAccommodationRequest ? 'Zapisywanie…' : 'Zapisz'}
                </button>
              </div>
            </div>
            </React.Fragment>
            )}

            {activePanel === 'inne' && (
            <div className="contents">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-slate-700">Dieta</h2>
                {turnusDietsList.length > 0 && (() => {
                  const same = (dietDraft ?? null) === (reservation.diet ?? null);
                  return (
                    <button
                      type="button"
                      disabled={same || savingDiet}
                      onClick={async () => {
                        if (!reservationNumber || savingDiet) return;
                        setSavingDiet(true);
                        try {
                          const updated = await authenticatedApiCall<ReservationDetails>(
                            `/api/reservations/by-number/${reservationNumber}/admin/diet`,
                            { method: 'PATCH', body: JSON.stringify({ diet: dietDraft }) },
                          );
                          setReservation((prev) => (prev && updated ? { ...prev, ...updated } : updated));
                          setDietDraft(updated.diet ?? null);
                          showSuccess('Dieta została zaktualizowana.');
                          if (reservation?.id) {
                            authenticatedApiCall<ReservationEventItem[]>(`/api/reservations/${reservation.id}/system-events`)
                              .then((data) => setReservationEvents(Array.isArray(data) ? data : []))
                              .catch(() => {});
                          }
                        } catch {
                          showError('Nie udało się zapisać diety.');
                        } finally {
                          setSavingDiet(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-none text-sm font-medium text-[#03adf0] hover:bg-gray-100 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingDiet ? 'Zapisywanie…' : 'Zapisz'}
                    </button>
                  );
                })()}
              </div>
              {turnusDietsList.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Brak diet dla tego turnusu</p>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs text-gray-500">Wybrana dieta (jedna)</label>
                  <select
                    value={dietDraft !== null && dietDraft !== undefined ? String(dietDraft) : 'none'}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const diet = raw === '' || raw === 'none' ? null : parseInt(raw, 10);
                      if (diet !== null && isNaN(diet)) return;
                      setDietDraft(diet);
                    }}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                  >
                    <option value="none">Standardowa (brak)</option>
                    {turnusDietsList.map((d) => {
                      const val = d.relation_id ?? d.id;
                      return (
                        <option key={val} value={val}>
                          {d.name} {d.price !== null && d.price !== undefined ? ` – ${formatCurrency(d.price)}` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {(dietDraft ?? reservation.diet) !== null && (dietDraft ?? reservation.diet) !== undefined && (() => {
                    const currentId = dietDraft ?? reservation.diet ?? null;
                    const d = turnusDietsList.find((x) => (x.relation_id ?? x.id) === currentId);
                    return d?.price !== null && d?.price !== undefined ? (
                      <p className="text-xs text-gray-500 mt-1">Cena: {formatCurrency(d.price)}</p>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            {/* Zgody */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Zgody</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${reservation.consent1 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-xs text-gray-600">Regulamin i polityka prywatności</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${reservation.consent2 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-xs text-gray-600">Warunki uczestnictwa</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${reservation.consent3 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-xs text-gray-600">Zdjęcia i ich udostępnianie</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${reservation.consent4 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-xs text-gray-600">Składki na fundusze gwarancyjne</span>
                </div>
              </div>
            </div>
            </div>
            )}

              </div>
            </div>
          </div>
          </div>
          </div>
          </div>
          </div>
          <ReservationDetailRightSidebar
            getContent={rightSidebarGetContent}
          />
            <UniversalModal
              isOpen={showPromotionModal}
              onClose={handleCancelPromotion}
              title="Potwierdź zmianę promocji"
              maxWidth="md"
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  Czy na pewno chcesz zapisać zmianę promocji? Cena rezerwacji zostanie zaktualizowana zgodnie z wybraną promocją.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCancelPromotion}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 cursor-pointer"
                  >
                    Wróć
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPromotion}
                    disabled={savingPromotion}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium bg-[#03adf0] text-white hover:bg-[#0288c7] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {savingPromotion ? 'Zapisywanie...' : 'Zapisz'}
                  </button>
                </div>
              </div>
            </UniversalModal>

            {/* Modal archiwizacji rezerwacji */}
            <UniversalModal
              isOpen={showDeleteModal}
              onClose={() => !deletingReservation && setShowDeleteModal(false)}
              title="Archiwizuj rezerwację"
              maxWidth="md"
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 mb-2">
                      Czy na pewno chcesz zarchiwizować rezerwację <strong className="text-gray-900">{reservationNumber}</strong>?
                    </p>
                    <p className="text-xs text-gray-500">
                      Rezerwacja zostanie przeniesiona do archiwum wraz ze wszystkimi powiązanymi danymi
                      (płatności, faktury, dokumenty). Pliki zostaną zachowane.
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                  <div className="flex items-center gap-2 text-amber-800 text-sm">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Dostępność turnusu zostanie zwiększona o 1</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-800 text-sm mt-1">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>W razie potrzeby rezerwację można przywrócić z archiwum</span>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deletingReservation}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={async () => {
                      if (!reservation) return;
                      try {
                        setDeletingReservation(true);
                        await authenticatedApiCall(`/api/reservations/${reservation.id}`, {
                          method: 'DELETE',
                        });
                        showSuccess('Rezerwacja została zarchiwizowana. Dostępność turnusu została zwiększona o 1.');
                        // Build return URL with page and filters
                        const returnParams = new URLSearchParams();
                        if (fromPage) {
                          returnParams.set('page', fromPage);
                        }
                        // Add all filter params
                        filterParams.forEach((value, key) => {
                          returnParams.set(key, value);
                        });
                        const returnUrl = returnParams.toString()
                          ? `/admin-panel?${returnParams.toString()}`
                          : '/admin-panel';
                        router.push(returnUrl);
                      } catch (err) {
                        showError(err instanceof Error ? err.message : 'Błąd podczas archiwizacji rezerwacji');
                      } finally {
                        setDeletingReservation(false);
                        setShowDeleteModal(false);
                      }
                    }}
                    disabled={deletingReservation}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {deletingReservation ? 'Archiwizowanie...' : 'Archiwizuj'}
                  </button>
                </div>
              </div>
            </UniversalModal>

            {/* Modal braku miejsc na turnusie */}
            <UniversalModal
              isOpen={showNoSpotsModal}
              onClose={() => setShowNoSpotsModal(false)}
              title="Nie można przywrócić rezerwacji"
              maxWidth="md"
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 mb-2">
                      Nie można przywrócić rezerwacji <strong className="text-gray-900">{reservationNumber}</strong>
                    </p>
                    <p className="text-sm text-red-600 font-medium">
                      {noSpotsMessage}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-gray-600">
                    Aby przywrócić tę rezerwację, musisz najpierw zwolnić miejsce na tym turnusie
                    (np. przenieść inną rezerwację na inny turnus lub zarchiwizować inną rezerwację).
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setShowNoSpotsModal(false)}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 transition-colors"
                    style={{ borderRadius: 0 }}
                  >
                    Rozumiem
                  </button>
                </div>
              </div>
            </UniversalModal>

            <UniversalModal
              isOpen={showRemoveSecondGuardianModal}
              title="Usuń drugiego opiekuna"
              onClose={() => {
                if (!removingSecondGuardian) {
                  setShowRemoveSecondGuardianModal(false);
                  setRemoveSecondGuardianError(null);
                }
              }}
            >
              <div className="p-4">
                <p className="text-sm text-gray-700 mb-3">
                  Podaj powód usunięcia drugiego opiekuna (wymagane).
                </p>
                <textarea
                  value={removeSecondGuardianReason}
                  onChange={(e) => {
                    setRemoveSecondGuardianReason(e.target.value);
                    setRemoveSecondGuardianError(null);
                  }}
                  placeholder="Powód usunięcia..."
                  rows={3}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {removeSecondGuardianError && (
                  <p className="mt-2 text-sm text-red-600">{removeSecondGuardianError}</p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!removingSecondGuardian) {
                        setShowRemoveSecondGuardianModal(false);
                        setRemoveSecondGuardianError(null);
                      }
                    }}
                    disabled={removingSecondGuardian}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    disabled={removingSecondGuardian}
                    onClick={async () => {
                      const reason = removeSecondGuardianReason.trim();
                      if (!reason) {
                        setRemoveSecondGuardianError('Powód usunięcia jest wymagany.');
                        return;
                      }
                      if (!reservationNumber) return;
                      setRemovingSecondGuardian(true);
                      setRemoveSecondGuardianError(null);
                      try {
                        const updated = await authenticatedApiCall<ReservationDetails>(
                          `/api/reservations/by-number/${reservationNumber}/remove-second-guardian`,
                          { method: 'POST', body: JSON.stringify({ reason }) },
                        );
                        setReservation((prev) => prev ? { ...prev, parents_data: updated.parents_data ?? [] } : null);
                        const nextParents = updated.parents_data && Array.isArray(updated.parents_data)
                          ? updated.parents_data.slice(0, 2).map((p) => ({
                              firstName: p?.firstName ?? '',
                              lastName: p?.lastName ?? '',
                              email: p?.email ?? '',
                              phoneNumber: p?.phoneNumber ?? '',
                              street: p?.street ?? '',
                              city: p?.city ?? '',
                              postalCode: p?.postalCode ?? '',
                            }))
                          : [];
                        setGuardiansDraft(nextParents);
                        setEditingGuardianIndex(null);
                        setShowRemoveSecondGuardianModal(false);
                        setRemoveSecondGuardianReason('');
                        showSuccess('Drugi opiekun został usunięty.');
                        if (reservation?.id) {
                          authenticatedApiCall<ReservationEventItem[]>(`/api/reservations/${reservation.id}/system-events`)
                            .then((data) => setReservationEvents(Array.isArray(data) ? data : []))
                            .catch(() => {});
                        }
                      } catch {
                        showError('Nie udało się usunąć drugiego opiekuna.');
                      } finally {
                        setRemovingSecondGuardian(false);
                      }
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {removingSecondGuardian ? 'Usuwanie…' : 'Usuń opiekuna'}
                  </button>
                </div>
              </div>
            </UniversalModal>

            {/* Modal anulowania aneksu */}
            {cancelAnnexId !== null && cancelAnnexId !== undefined && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4">
                  <p className="text-sm text-gray-700 mb-2">Powód anulowania aneksu (min. 5 znaków):</p>
                  <textarea
                    value={cancelAnnexReason}
                    onChange={(e) => setCancelAnnexReason(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="np. Błąd wprowadzenia"
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => { setCancelAnnexId(null); setCancelAnnexReason(''); }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-700"
                    >
                      Zamknij
                    </button>
                    <button
                      type="button"
                      disabled={cancelAnnexReason.trim().length < 5 || cancelAnnexLoading}
                      onClick={async () => {
                        if (cancelAnnexReason.trim().length < 5) return;
                        setCancelAnnexLoading(true);
                        try {
                          await authenticatedApiCall(`/api/annexes/${cancelAnnexId}/cancel`, {
                            method: 'PATCH',
                            body: JSON.stringify({ reason: cancelAnnexReason.trim() }),
                          });
                          setCancelAnnexId(null);
                          setCancelAnnexReason('');
                          if (reservation?.id) {
                            const list = await authenticatedApiCall<AnnexItem[]>(`/api/annexes/reservation/${reservation.id}`);
                            setReservationAnnexes(Array.isArray(list) ? list : []);
                          }
                          const data = await authenticatedApiCall<ReservationEventItem[]>(`/api/reservations/${reservation!.id}/system-events`);
                          setReservationEvents(Array.isArray(data) ? data : []);
                          showSuccess('Aneks został anulowany.');
                        } catch (e) {
                          showError(e instanceof Error ? e.message : 'Błąd anulowania');
                        } finally {
                          setCancelAnnexLoading(false);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded disabled:opacity-50"
                    >
                      {cancelAnnexLoading ? 'Zapisywanie...' : 'Anuluj aneks'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal edycji uzasadnienia promocji */}
            {showJustificationModal && reservation && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-3">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Uzasadnienie promocji</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                    Edytuj uzasadnienie wybranej promocji.
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
                      className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium border border-gray-300 hover:bg-gray-100 cursor-pointer"
                      disabled={savingJustification}
                    >
                      Anuluj
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveJustification}
                      className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium bg-[#03adf0] text-white hover:bg-[#0288c7] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      disabled={savingJustification}
                    >
                      {savingJustification ? 'Zapisywanie...' : 'Zapisz'}
                    </button>
                  </div>
                </div>
              </div>
            )}
      </AdminLayout>
    </SectionGuard>
  );
}
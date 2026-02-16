'use client';

import { ArrowLeft, Edit, X, FileText, Download, Upload, Trash2, User, Tent, Users, Utensils, Shield, Gift, Bus, FileCheck, Receipt, Heart, MessageSquare, CheckCircle2, RotateCcw, CheckCircle, XCircle, SquarePen } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';

const RESERVATION_PANELS = [
  { id: 'platnosci', label: 'Płatności', icon: Receipt },
  { id: 'dokumenty', label: 'Dokumenty', icon: FileText },
  { id: 'dane', label: 'Dane uczestnika i opiekunów', icon: Users },
  { id: 'promocje-transport', label: 'Promocje i transport', icon: Bus },
  { id: 'zdrowie', label: 'Zdrowie', icon: Heart },
  { id: 'informacje', label: 'Informacje i wniosek', icon: FileCheck },
  { id: 'inne', label: 'Dodatki, diety, faktura, źródło', icon: Utensils },
] as const;
type PanelId = typeof RESERVATION_PANELS[number]['id'];

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { useToast } from '@/components/ToastContainer';
import UniversalModal from '@/components/admin/UniversalModal';
import { useAdminRightPanel } from '@/context/AdminRightPanelContext';
import { ContractForm } from '@/components/profile/ContractForm';
import { ContractEditPanel } from '@/components/admin/ContractEditPanel';
import { ContractTemplateNew } from '@/components/admin/ContractTemplateNew';
import { QualificationTemplateNew } from '@/components/admin/QualificationTemplateNew';
import { contractArchiveService, type ContractArchiveVersionItem } from '@/lib/services/ContractArchiveService';
import type { ReservationData } from '@/lib/contractReservationMapping';
import { mapReservationToContractForm } from '@/lib/contractReservationMapping';
import { mapReservationToQualificationForm } from '@/lib/qualificationReservationMapping';
import { contractService } from '@/lib/services/ContractService';
import { manualPaymentService, ManualPaymentResponse } from '@/lib/services/ManualPaymentService';
import { paymentService, PaymentResponse } from '@/lib/services/PaymentService';
import { qualificationCardService } from '@/lib/services/QualificationCardService';
import { authenticatedApiCall } from '@/utils/api-auth';

interface ReservationDetails {
  id: number;
  camp_id?: number;
  property_id?: number;
  camp_name?: string | null;
  property_name?: string | null;
  property_city?: string | null;
  property_period?: string | null;
  property_start_date?: string | null;
  property_end_date?: string | null;
  participant_first_name?: string | null;
  participant_last_name?: string | null;
  participant_age?: string | null;
  participant_gender?: string | null;
  participant_city?: string | null;
  participant_additional_info?: string | null;
  parents_data?: Array<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    street?: string;
    city?: string;
    postalCode?: string;
  }> | null;
  diet?: number | null;
  diet_name?: string | null;
  diet_price?: number | null;
  selected_diets?: number[] | null;
  selected_addons?: (string | number)[] | null;
  selected_protection?: (string | number)[] | null;
  selected_promotion?: string | null;
  promotion_name?: string | null;
  promotion_price?: number | null;
  promotion_justification?: any;
  departure_type?: string | null;
  departure_city?: string | null;
  return_type?: string | null;
  return_city?: string | null;
  transport_different_cities?: boolean;
  selected_source?: string | null;
  source_name?: string | null;
  source_inne_text?: string | null;
  wants_invoice?: boolean;
  invoice_type?: string | null;
  invoice_first_name?: string | null;
  invoice_last_name?: string | null;
  invoice_email?: string | null;
  invoice_phone?: string | null;
  invoice_company_name?: string | null;
  invoice_nip?: string | null;
  invoice_street?: string | null;
  invoice_postal_code?: string | null;
  invoice_city?: string | null;
  delivery_type?: string | null;
  delivery_different_address?: boolean;
  delivery_street?: string | null;
  delivery_postal_code?: string | null;
  delivery_city?: string | null;
  accommodation_request?: string | null;
  health_questions?: any;
  health_details?: any;
  additional_notes?: string | null;
  consent1?: boolean;
  consent2?: boolean;
  consent3?: boolean;
  consent4?: boolean;
  total_price?: number;
  deposit_amount?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  contract_status?: string | null;
  contract_rejection_reason?: string | null;
  qualification_card_status?: string | null;
  qualification_card_rejection_reason?: string | null;
  // Archive info
  is_archived?: boolean;
  archived_at?: string | null;
  archive_id?: number | null;  // ID from archive_reservations table (needed to fetch archived notes)
}

interface Addon {
  id: number;
  name: string;
  price: number;
}

interface Protection {
  id: number;
  name: string;
  price: number;
}

interface Promotion {
  id: number;
  name: string;
  price: number;
  does_not_reduce_price?: boolean;
  relation_id?: number;
}

interface PromotionOption {
  relationId: number;
  name: string;
  price: number;
  doesNotReducePrice?: boolean;
}

interface Diet {
  id: number;
  name: string;
  price: number;
}

interface ReservationNote {
  id: number;
  reservation_id: number;
  admin_user_id: number | null;
  admin_user_name: string | null;
  admin_user_login: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

/** Formularz uzasadnienia odrzucenia dokumentu (umowa lub karta) – wyświetlany w prawym panelu. */
function RejectDocumentPanelContent({
  documentId,
  onSuccess,
  onCancel,
}: {
  documentId: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('Podaj uzasadnienie odrzucenia');
      return;
    }
    setSubmitting(true);
    try {
      await authenticatedApiCall(`/api/signed-documents/${documentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason.trim() }),
      });
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd podczas odrzucania dokumentu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <label className="block text-sm font-medium text-gray-700">Uzasadnienie odrzucenia</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Podaj uzasadnienie odrzucenia..."
        className="w-full h-32 p-2 border border-gray-300 rounded text-gray-900"
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 cursor-pointer"
        >
          Anuluj
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Zapisywanie...' : 'Zapisz'}
        </button>
      </div>
    </div>
  );
}

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
  const [addons, setAddons] = useState<Map<number, Addon>>(new Map());
  const [protections, setProtections] = useState<Map<number, Protection>>(new Map());
  const [promotions, setPromotions] = useState<Map<number, Promotion>>(new Map());
  const [promotionOptions, setPromotionOptions] = useState<PromotionOption[]>([]);
  const [promotionDraftId, setPromotionDraftId] = useState<number | null>(null);
  const [pendingPromotionId, setPendingPromotionId] = useState<number | null>(null);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [savingPromotion, setSavingPromotion] = useState(false);
  const [diets, setDiets] = useState<Map<number, Diet>>(new Map());
  const [transportCities, setTransportCities] = useState<Array<{ city: string; departure_price: number | null; return_price: number | null }>>([]);
  // Dostępne opcje dla turnusu (do wyświetlania nawet gdy rezerwacja nie ma wybranych)
  const [availableProtections, setAvailableProtections] = useState<Protection[]>([]);
  const [availableAddons, setAvailableAddons] = useState<Addon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractHtmlExists, setContractHtmlExists] = useState(false);
  const [cardHtmlExists, setCardHtmlExists] = useState(false);
  const [contractFiles, setContractFiles] = useState<any[]>([]);
  const [cardFiles, setCardFiles] = useState<any[]>([]);
  const [_rejectingContract, _setRejectingContract] = useState(false);
  const [_rejectingCard, _setRejectingCard] = useState(false);
  const [latestSignedContract, setLatestSignedContract] = useState<{ id: number; status: string; client_message: string | null } | null>(null);
  const [latestSignedCard, setLatestSignedCard] = useState<{ id: number; status: string; client_message: string | null } | null>(null);
  const [qualificationCardSignedPayload, setQualificationCardSignedPayload] = useState<Record<string, unknown> | null>(null);
  const [contractSignedPayload, setContractSignedPayload] = useState<Record<string, unknown> | null>(null);
  const [contractArchiveVersions, setContractArchiveVersions] = useState<ContractArchiveVersionItem[]>([]);
  const [signedDocumentsList, setSignedDocumentsList] = useState<Array<{ id: number; document_type: string; status: string; client_message: string | null; created_at: string; updated_at: string; payload?: string | null }>>([]);
  const [uploadingContract, setUploadingContract] = useState(false);
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
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);

  const [activePanel, setActivePanel] = useState<PanelId>('platnosci');
  /** Krok edycji umowy z hash (1 lub 2) – używany do otwarcia panelu po odświeżeniu. */
  const [contractEditStepFromHash, setContractEditStepFromHash] = useState<1 | 2 | null>(null);
  /** Zapobiega podwójnemu otwarciu panelu (przycisk vs. efekt po hash). */
  const openedContractEditFromHashRef = useRef(false);

  const setPanelFromHash = useCallback(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.slice(1);
    const parts = hash.split('/');
    const panelId = (parts[0] || '') as PanelId;
    const isPanelValid = RESERVATION_PANELS.some((p) => p.id === panelId);
    if (isPanelValid) {
      setActivePanel(panelId);
      if (panelId === 'dokumenty' && parts[1] === 'umowa-edycja') {
        setContractEditStepFromHash(parts[2] === '2' ? 2 : 1);
      } else {
        setContractEditStepFromHash(null);
        openedContractEditFromHashRef.current = false;
      }
    } else {
      setActivePanel('platnosci');
      if (!hash) window.history.replaceState(null, '', `${window.location.pathname}#platnosci`);
      setContractEditStepFromHash(null);
      openedContractEditFromHashRef.current = false;
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

  /** Otwarcie panelu „Edytuj umowę” po odświeżeniu, gdy w adresie jest #dokumenty/umowa-edycja/1 lub /2 */
  useEffect(() => {
    if (!reservation || contractEditStepFromHash === null || openedContractEditFromHashRef.current) return;
    const step = contractEditStepFromHash;
    openedContractEditFromHashRef.current = true;
    setContractEditStepFromHash(null);
    openDocument(
      <ContractEditPanel
        reservation={reservation}
        initialStep={step}
        onStepChange={(s) => {
          if (typeof window !== 'undefined') {
            window.location.hash = `dokumenty/umowa-edycja/${s}`;
          }
        }}
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
    );
  }, [reservation, contractEditStepFromHash, openDocument, closeRightPanel, refetchReservation]);

  useEffect(() => {
    if (!reservation?.id) return;
    contractArchiveService.list(reservation.id).then(setContractArchiveVersions).catch(() => setContractArchiveVersions([]));
  }, [reservation?.id]);

  // Informacje dodatkowe dotyczące uczestnika (sekcja z kroku 1 – edycja tylko tego pola)
  const [participantAdditionalInfo, setParticipantAdditionalInfo] = useState('');
  const [savingParticipantAdditionalInfo, setSavingParticipantAdditionalInfo] = useState(false);

  // Wniosek o zakwaterowanie uczestnika (krok 1 – edycja tylko tego pola)
  const [accommodationRequest, setAccommodationRequest] = useState('');
  const [savingAccommodationRequest, setSavingAccommodationRequest] = useState(false);
  
  const contractUploadInputRef = useRef<HTMLInputElement>(null);
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
                    } catch (generalDietError) {
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
                    } catch (dietError) {
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
                  } catch (err) {
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

        // Fetch transport cities (tylko jeśli transport jest zbiorowy)
        if ((reservationData.departure_type === 'zbiorowy' || reservationData.return_type === 'zbiorowy')
            && reservationData.camp_id && reservationData.property_id) {
          try {
            const citiesResponse = await authenticatedApiCall<Array<{ city: string; departure_price: number | null; return_price: number | null }>>(
              `/api/camps/${reservationData.camp_id}/properties/${reservationData.property_id}/transport/cities`,
            );
            setTransportCities(citiesResponse || []);
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
        const addonsUrl = reservationData.property_id != null
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

  // Load document files and check HTML existence (wywoływane z useEffect i po zapisie umowy)
  const loadDocuments = useCallback(async () => {
    if (!reservation) return;
    if (reservation.is_archived) {
      setContractHtmlExists(false);
      setCardHtmlExists(false);
      setContractFiles([]);
      setCardFiles([]);
      setLatestSignedContract(null);
      setLatestSignedCard(null);
      setQualificationCardSignedPayload(null);
      setSignedDocumentsList([]);
      return;
    }
    try {
      const contractHtmlCheck = await contractService.checkHtmlExists(reservation.id);
      setContractHtmlExists(contractHtmlCheck.exists);
      const cardHtmlCheck = await qualificationCardService.checkHtmlExists(reservation.id);
      setCardHtmlExists(cardHtmlCheck.exists);
      const contractFilesData = await contractService.getContractFiles(reservation.id);
      setContractFiles(contractFilesData.filter(f => f.source === 'user'));
      const cardFilesData = await qualificationCardService.getQualificationCardFiles(reservation.id);
      setCardFiles(cardFilesData.filter(f => f.source === 'user'));
      const signedDocs = await authenticatedApiCall<Array<{ id: number; document_type: string; status: string; client_message: string | null; created_at: string; updated_at: string; payload?: string | null }>>(
        `/api/signed-documents/reservation/${reservation.id}`,
      );
      setSignedDocumentsList(signedDocs);
      const contractDoc = signedDocs.find(d => d.document_type === 'contract');
      const cardDoc = signedDocs.find(d => d.document_type === 'qualification_card');
      setLatestSignedContract(contractDoc ? { id: contractDoc.id, status: contractDoc.status, client_message: contractDoc.client_message } : null);
      setLatestSignedCard(cardDoc ? { id: cardDoc.id, status: cardDoc.status, client_message: cardDoc.client_message } : null);
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
        keys: Object.keys(reservation)
      });
      
      try {
        setLoadingNotes(true);
        
        let notesData: ReservationNote[];
        
        if (reservation.is_archived && reservation.archive_id) {
          // For archived reservations, fetch from archived notes endpoint
          notesData = await authenticatedApiCall<ReservationNote[]>(
            `/api/reservations/archived/${reservation.archive_id}/notes`
          );
        } else {
          // For active reservations, fetch from regular notes endpoint
          notesData = await authenticatedApiCall<ReservationNote[]>(
            `/api/reservations/${reservation.id}/notes`
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

    try {
      setSavingNote(true);
      const newNote = await authenticatedApiCall<ReservationNote>(
        `/api/reservations/${reservation.id}/notes`,
        {
          method: 'POST',
          body: JSON.stringify({ content: newNoteContent.trim() }),
        }
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
        }
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
        { method: 'DELETE' }
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

  const openJustificationModal = () => {
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
      setReservation(response);
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
  const transportPrice = prices.length > 0 ? Math.max(...prices) : 0;

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

  return (
    <SectionGuard section="reservations">
      <AdminLayout>
        <div className="h-full min-h-0 flex flex-col lg:flex-row animate-fadeIn -m-4">
          {/* Lewa kolumna: header, banner, karta z zakładkami */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Header - ciemny pasek jak w PaymentsManagement */}
          <div className="bg-slate-800 shadow-md p-3 sticky top-0 z-20 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    // Check if there's browser history to go back to
                    // window.history.length > 1 means there's history
                    // But we also need to check if we came from within the app
                    if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
                      // Use browser back - preserves all URL params from previous page
                      router.back();
                    } else {
                      // No history (new tab) - navigate to admin-panel with any saved params
                      const returnParams = new URLSearchParams();
                      if (fromPage) {
                        returnParams.set('page', fromPage);
                      }
                      filterParams.forEach((value, key) => {
                        returnParams.set(key, value);
                      });
                      const returnUrl = returnParams.toString()
                        ? `/admin-panel?${returnParams.toString()}`
                        : '/admin-panel';
                      router.push(returnUrl);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-200 rounded"
                  style={{ borderRadius: 0, cursor: 'pointer' }}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    Szczegóły rezerwacji: {reservationNumber}
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Status: <span className="font-medium text-slate-300">{reservation.status || 'Brak danych'}</span> |
                    Utworzona: {formatDateTime(reservation.created_at || null)} |
                    Zaktualizowana: {formatDateTime(reservation.updated_at || null)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
              {/* Hide edit button for archived reservations */}
              {!reservation.is_archived && (
                <button
                  onClick={() => router.push(`/admin-panel/rezerwacja/${reservationNumber}/edit/1/step`)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-all duration-200"
                  style={{ borderRadius: 0 }}
                >
                  <Edit className="w-4 h-4" />
                  <span>Zmiana w rezerwacji</span>
                </button>
              )}
              {/* For archived reservations: Restore button, for active: View client profile */}
              {reservation.is_archived ? (
                <button
                  onClick={async () => {
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
                      }>(`/api/reservations/restore/${reservation.id}`, {
                        method: 'POST'
                      });
                      
                      showSuccess(`Rezerwacja została przywrócona pomyślnie! Turnus: ${response.turnus}`, 5000);
                      
                      // Redirect to the restored reservation using the preserved reservation_number
                      router.push(`/admin-panel/rezerwacja/${response.reservation_number}`);
                    } catch (err) {
                      console.error('Error restoring reservation:', err);
                      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas przywracania rezerwacji';
                      
                      // Check if it's a "no spots" error
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
                  disabled={restoringReservation}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderRadius: 0 }}
                >
                  {restoringReservation ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Przywracanie...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Przywróć rezerwację</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={async () => {
                    if (!reservation?.id) return;
                    try {
                      // Fetch client info from reservation
                      const response = await authenticatedApiCall<{
                        user_id: number;
                        user_email: string | null;
                        user_name: string | null;
                        can_view: boolean;
                      }>(`/api/admin/client-view/from-reservation/${reservation.id}`);

                      if (response.can_view) {
                        // Open client view in new window
                        window.open(`/client-view/${response.user_id}`, '_blank');
                      } else {
                        alert('Nie można wyświetlić profilu tego klienta');
                      }
                    } catch (err) {
                      console.error('Error opening client view:', err);
                      alert(err instanceof Error ? err.message : 'Błąd podczas otwierania profilu klienta');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-all duration-200"
                  style={{ borderRadius: 0 }}
                >
                  <User className="w-4 h-4" />
                  <span>Zobacz profil klienta</span>
                </button>
              )}
              {/* Hide delete button for archived reservations */}
              {!reservation.is_archived && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-all duration-200"
                  style={{ borderRadius: 0 }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Usuń rezerwację</span>
                </button>
              )}
              </div>
            </div>
          </div>

          {/* Archived reservation banner - delikatny, czerwony, bez border-left */}
          {reservation.is_archived && (
            <div className="mx-4 mt-4">
              <div className="rounded-xl bg-red-50 p-4 sm:p-5 shadow-sm ring-1 ring-red-100/80">
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-red-800 font-semibold text-base sm:text-lg">Rezerwacja zarchiwizowana</h3>
                    <p className="text-red-700/90 text-sm mt-1">
                      Ta rezerwacja została zarchiwizowana{reservation.archived_at ? ` dnia ${new Date(reservation.archived_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}.
                      Dane są tylko do odczytu. Edycja i usuwanie są niedostępne.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

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
            {/* Płatności */}
            {activePanel === 'platnosci' && (() => {
              // Oblicz rzeczywiste wpłaty
              const tpayPaid = payments
                .filter(p => p.status === 'paid' || p.status === 'completed' || p.status === 'success')
                .reduce((sum, p) => sum + (p.paid_amount || p.amount || 0), 0);
              const manualPaid = manualPayments.reduce((sum, mp) => sum + (mp.amount || 0), 0);
              const totalPaid = tpayPaid + manualPaid;
              const totalAmount = reservation.total_price || 0;
              const remainingAmount = Math.max(0, totalAmount - totalPaid);

              // Połącz i posortuj wszystkie płatności
              const allPaymentsList = [
                ...payments
                  .filter(p => p.status === 'paid' || p.status === 'completed' || p.status === 'success')
                  .map(p => ({
                    amount: p.paid_amount || p.amount || 0,
                    date: p.paid_at || p.created_at,
                    method: p.channel_id === 64 ? 'BLIK' : p.channel_id === 53 ? 'Karta' : 'Online',
                    source: 'tpay' as const,
                  })),
                ...manualPayments.map(mp => ({
                  amount: mp.amount || 0,
                  date: mp.created_at,
                  method: mp.payment_method || 'Ręczna',
                  source: 'manual' as const,
                })),
              ].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

              return (
                <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-slate-700">Płatności</h2>
                    <button
                      onClick={() => router.push(`/admin-panel/rezerwacja/${reservationNumber}/payments${fromPage ? `?fromPage=${fromPage}` : ''}`)}
                      className="text-xs text-[#03adf0] hover:text-[#0288c7] hover:underline"
                    >
                      Zarządzaj płatnościami
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500 mb-1">Kwota całkowita</p>
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <p className="text-xs text-gray-500 mb-1">Wpłacono</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className={`text-center p-3 rounded ${remainingAmount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                      <p className="text-xs text-gray-500 mb-1">Pozostało</p>
                      <p className={`text-lg font-bold ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(remainingAmount)}
                      </p>
                    </div>
                  </div>
                  {allPaymentsList.length > 0 ? (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Historia wpłat ({allPaymentsList.length})</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {allPaymentsList.map((payment, idx) => (
                          <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                            <span className="text-gray-600">
                              {payment.method} - {formatDate(payment.date)}
                            </span>
                            <span className="text-gray-900 font-medium">{formatCurrency(payment.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Brak zarejestrowanych wpłat</p>
                  )}
                </div>
              );
            })()}

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
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Dane uczestnika</h2>
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
                    <div className="flex gap-2 flex-wrap">
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
                            'Podgląd umowy'
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
                            window.location.hash = 'dokumenty/umowa-edycja/1';
                          }
                          openedContractEditFromHashRef.current = true;
                          openDocument(
                            <ContractEditPanel
                              reservation={reservation}
                              initialStep={1}
                              onStepChange={(s) => {
                                if (typeof window !== 'undefined') {
                                  window.location.hash = `dokumenty/umowa-edycja/${s}`;
                                }
                              }}
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
                            'Edytuj umowę'
                          );
                        }}
                        className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none bg-gray-100 text-gray-800 font-medium text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                        title="Edytuj umowę (krok 1 i 2, zapis z archiwum)"
                      >
                        <SquarePen className="w-4 h-4 flex-shrink-0" />
                        Edytuj umowę
                      </button>
                      {latestSignedContract && (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                await authenticatedApiCall(`/api/signed-documents/${latestSignedContract.id}`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({ status: 'accepted' }),
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
                                />,
                                'Odrzuć umowę'
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
                                    `Wersja umowy ${v.created_at ? new Date(v.created_at).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : v.id}`
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
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-none border border-gray-200 flex-wrap gap-3">
                    <span className="text-sm text-gray-700">
                      {latestSignedCard
                        ? `Podpisany dokument: ${latestSignedCard.status === 'accepted' ? 'Zaakceptowana' : latestSignedCard.status === 'rejected' ? `Odrzucona${latestSignedCard.client_message ? ` – ${latestSignedCard.client_message}` : ''}` : 'W trakcie weryfikacji'}`
                        : 'Podpisany dokument: Brak podpisanego dokumentu do weryfikacji (po podpisie przez klienta pojawią się przyciski).'}
                    </span>
                    {latestSignedCard && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                          if (!reservation) return;
                          openDocument(
                            <QualificationTemplateNew
                              reservationId={reservation.id}
                              reservationData={mapReservationToQualificationForm(reservation as unknown as ReservationData)}
                              signedPayload={qualificationCardSignedPayload ?? undefined}
                              onSaveSuccess={(msg) => showSuccess(msg)}
                            />,
                            'Podgląd karty'
                          );
                        }}
                          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-none bg-gray-100 text-gray-800 font-medium text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          Podgląd karty
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await authenticatedApiCall(`/api/signed-documents/${latestSignedCard.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: 'accepted' }),
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
                              />,
                              'Odrzuć kartę kwalifikacyjną'
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
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 pb-2 border-b border-gray-100 flex-shrink-0">Wersje dokumentów z bazy</h3>
                  <div className="overflow-y-auto min-h-0 flex-1 space-y-2 pr-1">
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
              </div>
            </div>
            )}

            {activePanel === 'dane' && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Opiekunowie</h2>
              {reservation.parents_data && Array.isArray(reservation.parents_data) && reservation.parents_data.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {reservation.parents_data.map((parent, index) => (
                    <div key={index} className="bg-gray-50 rounded p-3">
                      <h3 className="text-xs font-medium text-gray-500 mb-2">Opiekun {index + 1}</h3>
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
            {/* Ochrony */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Ochrony</h2>
              {reservation.selected_protection && reservation.selected_protection.length > 0 ? (
                <div className="space-y-2">
                  {reservation.selected_protection.map((protectionIdValue) => {
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
                    const protection = generalProtectionId ? protections.get(generalProtectionId) : null;
                    return (
                      <div key={String(protectionIdValue)} className="flex justify-between items-center">
                        <span className="text-sm text-gray-900">{protection ? protection.name : `Ochrona ID: ${protectionIdValue}`}</span>
                        {protection && <span className="text-sm font-medium text-gray-900">{formatCurrency(protection.price)}</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Nie wybrano</p>
              )}
            </div>

            {/* Dodatki */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Dodatki</h2>
              {reservation.selected_addons && reservation.selected_addons.length > 0 ? (
                <div className="space-y-2">
                  {reservation.selected_addons.map((addonIdValue) => {
                    const addonId = typeof addonIdValue === 'number' ? addonIdValue : parseInt(String(addonIdValue));
                    const addon = addons.get(addonId);
                    return (
                      <div key={String(addonIdValue)} className="flex justify-between items-center">
                        <span className="text-sm text-gray-900">{addon ? addon.name : `Dodatek ID: ${addonIdValue}`}</span>
                        {addon && <span className="text-sm font-medium text-gray-900">{formatCurrency(addon.price)}</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Nie wybrano</p>
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
                          {reservation.promotion_price != null && reservation.promotion_price !== undefined && (
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
                    {reservation.promotion_price != null && reservation.promotion_price !== undefined && (
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
                                setReservation(response);
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
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Transport</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Wyjazd</span>
                  <span className="text-sm text-gray-900">
                    {reservation.departure_type === 'zbiorowy' ? 'Zbiorowy' : 'Własny'}
                    {reservation.departure_type === 'zbiorowy' && reservation.departure_city && ` (${reservation.departure_city})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Powrót</span>
                  <span className="text-sm text-gray-900">
                    {reservation.return_type === 'zbiorowy' ? 'Zbiorowy' : 'Własny'}
                    {reservation.return_type === 'zbiorowy' && reservation.return_city && ` (${reservation.return_city})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Różne miasta</span>
                  <span className="text-sm text-gray-900">{reservation.transport_different_cities ? 'Tak' : 'Nie'}</span>
                </div>
                {transportPrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Kwota</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(transportPrice)}</span>
                  </div>
                )}
              </div>
            </div>
            </>
            )}

            {activePanel === 'inne' && (
            <>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Źródło</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Źródło</span>
                  <span className="text-sm text-gray-900">
                    {reservation.source_name || reservation.selected_source || <MissingInfo field="selected_source" />}
                  </span>
                </div>
                {reservation.source_inne_text && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Szczegóły</span>
                    <span className="text-sm text-gray-900">{reservation.source_inne_text}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Faktura</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Chce fakturę</span>
                  <span className="text-sm text-gray-900">{reservation.wants_invoice ? 'Tak' : 'Nie'}</span>
                </div>
                {reservation.wants_invoice && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Typ</span>
                      <span className="text-sm text-gray-900">
                        {reservation.invoice_type === 'private' ? 'Osoba prywatna' : 'Firma'}
                      </span>
                    </div>
                    {reservation.invoice_type === 'private' ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Imię i nazwisko</span>
                          <span className="text-sm text-gray-900">{reservation.invoice_first_name} {reservation.invoice_last_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Email</span>
                          <span className="text-sm text-gray-900">{reservation.invoice_email || <MissingInfo field="invoice_email" />}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Telefon</span>
                          <span className="text-sm text-gray-900">{reservation.invoice_phone || <MissingInfo field="invoice_phone" />}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Firma</span>
                          <span className="text-sm text-gray-900">{reservation.invoice_company_name || <MissingInfo field="invoice_company_name" />}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">NIP</span>
                          <span className="text-sm text-gray-900">{reservation.invoice_nip || <MissingInfo field="invoice_nip" />}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Adres</span>
                      <span className="text-sm text-gray-900">{reservation.invoice_street}, {reservation.invoice_postal_code} {reservation.invoice_city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Dostawa</span>
                      <span className="text-sm text-gray-900">
                        {reservation.delivery_type === 'electronic' ? 'Elektroniczna' : 'Papierowa'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            </>
            )}

            {activePanel === 'zdrowie' && (
            (reservation.health_questions || reservation.health_details || reservation.additional_notes) ? (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Zdrowie</h2>
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
              </div>
            ) : (
              <p className="text-sm text-gray-500">Brak informacji o zdrowiu</p>
            )
            )}

            {activePanel === 'informacje' && (
            <>
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
                        }
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
                        }
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
            </>
            )}

            {activePanel === 'inne' && (
            <>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Dieta</h2>
              {reservation.diet ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Wybrana dieta</span>
                    <span className="text-sm text-gray-900">
                      {reservation.diet_name || (diets.get(reservation.diet)?.name || `Dieta ID: ${reservation.diet}`)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Cena</span>
                    <span className="text-sm font-medium text-gray-900">
                      {reservation.diet_price !== null && reservation.diet_price !== undefined
                        ? formatCurrency(reservation.diet_price)
                        : diets.get(reservation.diet)
                        ? formatCurrency(diets.get(reservation.diet)!.price)
                        : formatCurrency(0)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Wybrana dieta</span>
                    <span className="text-sm text-gray-900 italic">Standardowa (domyślna)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Cena</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(0)}</span>
                  </div>
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
            </>
            )}

              </div>
              </div>
            </div>
          </div>
          </div>
          {/* Rightbar – niezależny prawy pasek */}
          <aside
            role="complementary"
            aria-label="Notatki i wydarzenia rezerwacji"
            className="flex-shrink-0 w-full lg:w-[320px] xl:w-[360px] flex flex-col border-t lg:border-t-0 lg:border-l border-[#1d283d] rounded-none bg-[#1d283d] overflow-hidden min-h-[280px] lg:h-[calc(100vh-11rem)] lg:min-h-0 z-20"
          >
                <div className="p-3 min-h-[6rem] flex items-center border-b border-white/20 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-white flex-shrink-0" />
                    <div>
                      <h2 className="text-sm font-semibold text-white leading-tight">Notatki wewnętrzne</h2>
                      <span className="text-xs text-white/80 block mt-0.5">(tylko dla pracowników)</span>
                    </div>
                  </div>
                </div>
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
                    <div className="flex justify-end mt-1">
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
                              <textarea
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d283d] resize-none text-gray-900"
                                rows={3}
                              />
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
                <div className="flex-1 min-h-0 flex flex-col border-t border-white/20 p-3 bg-[#1d283d] overflow-y-auto">
                  <h3 className="text-sm font-semibold text-white mb-2">Zdarzenia klienta</h3>
                  <div className="space-y-2 text-sm text-white/90">
                    <div className="flex justify-between gap-2 py-1.5 border-b border-white/20">
                      <span>Rezerwacja utworzona</span>
                      <span className="text-white/70 whitespace-nowrap">{reservation?.created_at ? formatDateTime(reservation.created_at) : '–'}</span>
                    </div>
                    <div className="flex justify-between gap-2 py-1.5 border-b border-white/20">
                      <span>Ostatnia aktualizacja</span>
                      <span className="text-white/70 whitespace-nowrap">{reservation?.updated_at ? formatDateTime(reservation.updated_at) : '–'}</span>
                    </div>
                    <div className="flex justify-between gap-2 py-1.5 border-b border-white/20">
                      <span>Umowa wysłana</span>
                      <span className="text-white/70">–</span>
                    </div>
                    <div className="flex justify-between gap-2 py-1.5 border-b border-white/20">
                      <span>Umowa podpisana</span>
                      <span className="text-white/70">–</span>
                    </div>
                    <div className="flex justify-between gap-2 py-1.5">
                      <span>Pierwsza wpłata</span>
                      <span className="text-white/70">–</span>
                    </div>
                  </div>
                  <p className="text-xs text-white/60 mt-2 italic">(lista zdarzeń – w przygotowaniu)</p>
                </div>
                </div>
              </aside>
            <>
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

            {/* Modal edycji uzasadnienia promocji */}
            {showJustificationModal && reservation && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3">
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
            </>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}
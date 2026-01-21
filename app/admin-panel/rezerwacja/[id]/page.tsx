'use client';

import { ArrowLeft, Edit, X, FileText, Download, Upload, Trash2 } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import UniversalModal from '@/components/admin/UniversalModal';
import { contractService } from '@/lib/services/ContractService';
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

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractHtmlExists, setContractHtmlExists] = useState(false);
  const [cardHtmlExists, setCardHtmlExists] = useState(false);
  const [contractFiles, setContractFiles] = useState<any[]>([]);
  const [cardFiles, setCardFiles] = useState<any[]>([]);
  const [showContractHtmlModal, setShowContractHtmlModal] = useState(false);
  const [contractHtmlDraft, setContractHtmlDraft] = useState('');
  const [loadingContractHtml, setLoadingContractHtml] = useState(false);
  const [savingContractHtml, setSavingContractHtml] = useState(false);
  const [contractHtmlError, setContractHtmlError] = useState<string | null>(null);
  const [_rejectingContract, _setRejectingContract] = useState(false);
  const [_rejectingCard, _setRejectingCard] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingDocumentType, setRejectingDocumentType] = useState<'contract' | 'card' | null>(null);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingReservation, setDeletingReservation] = useState(false);
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [editingJustification, setEditingJustification] = useState(false);
  const [justificationDraft, setJustificationDraft] = useState<Record<string, any>>({});
  const [savingJustification, setSavingJustification] = useState(false);
  const [justificationError, setJustificationError] = useState<string | null>(null);
  const contractUploadInputRef = useRef<HTMLInputElement>(null);
  const cardUploadInputRef = useRef<HTMLInputElement>(null);

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

  // Load document files and check HTML existence
  useEffect(() => {
    const loadDocuments = async () => {
      if (!reservation) return;

      try {
        // Check if HTML exists
        const contractHtmlCheck = await contractService.checkHtmlExists(reservation.id);
        setContractHtmlExists(contractHtmlCheck.exists);

        const cardHtmlCheck = await qualificationCardService.checkHtmlExists(reservation.id);
        setCardHtmlExists(cardHtmlCheck.exists);

        // Load uploaded files
        const contractFilesData = await contractService.getContractFiles(reservation.id);
        setContractFiles(contractFilesData.filter(f => f.source === 'user'));

        const cardFilesData = await qualificationCardService.getQualificationCardFiles(reservation.id);
        setCardFiles(cardFilesData.filter(f => f.source === 'user'));
      } catch (err) {
        console.error('Error loading documents:', err);
      }
    };

    loadDocuments();
  }, [reservation]);

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

  const openContractHtmlPreview = async () => {
    if (!reservation) return;
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      alert('Nie udało się otworzyć podglądu umowy');
      return;
    }
    previewWindow.document.open();
    previewWindow.document.write('<p style="font-family: Arial, sans-serif; padding: 24px;">Ładowanie umowy...</p>');
    previewWindow.document.close();
    try {
      const html = await contractService.getContractHtml(reservation.id);
      previewWindow.document.open();
      previewWindow.document.write(html);
      previewWindow.document.close();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Nie udało się otworzyć podglądu umowy');
    }
  };

  const openContractHtmlEditor = async () => {
    if (!reservation) return;
    setShowContractHtmlModal(true);
    setLoadingContractHtml(true);
    setContractHtmlError(null);
    try {
      const html = await contractService.getContractHtml(reservation.id);
      setContractHtmlDraft(html);
    } catch (err) {
      setContractHtmlError(err instanceof Error ? err.message : 'Nie udało się wczytać treści umowy');
    } finally {
      setLoadingContractHtml(false);
    }
  };

  const handleSaveContractHtml = async () => {
    if (!reservation) return;
    if (!contractHtmlDraft.trim()) {
      setContractHtmlError('Treść umowy jest wymagana');
      return;
    }
    try {
      setSavingContractHtml(true);
      setContractHtmlError(null);
      await contractService.updateContractHtml(reservation.id, contractHtmlDraft);
      setContractHtmlExists(true);
      setShowContractHtmlModal(false);
    } catch (err) {
      setContractHtmlError(err instanceof Error ? err.message : 'Nie udało się zapisać umowy');
    } finally {
      setSavingContractHtml(false);
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
        <div className="h-full flex flex-col animate-fadeIn">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
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
                }}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 rounded"
                style={{ borderRadius: 0, cursor: 'pointer' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Szczegóły rezerwacji: {reservationNumber}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Status: <span className="font-medium">{reservation.status || 'Brak danych'}</span> |
                  Utworzona: {formatDate(reservation.created_at || null)} |
                  Zaktualizowana: {formatDate(reservation.updated_at || null)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/admin-panel/rezerwacja/${reservationNumber}/edit/1/step`)}
                className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-all duration-200"
                style={{ borderRadius: 0 }}
              >
                <Edit className="w-4 h-4" />
                <span>Zmiana w rezerwacji</span>
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-all duration-200"
                style={{ borderRadius: 0 }}
              >
                <Trash2 className="w-4 h-4" />
                <span>Usuń rezerwację</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-auto">
            {/* Obóz i Turnus */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Obóz i Turnus</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Obóz:</label>
                  <p className="text-sm text-gray-900">{reservation.camp_name || <MissingInfo field="camp_name" />}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Turnus:</label>
                  <p className="text-sm text-gray-900">{reservation.property_name || <MissingInfo field="property_name" />}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Miasto:</label>
                  <p className="text-sm text-gray-900">{reservation.property_city || <MissingInfo field="property_city" />}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Okres:</label>
                  <p className="text-sm text-gray-900">{reservation.property_period || <MissingInfo field="property_period" />}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Data rozpoczęcia:</label>
                  <p className="text-sm text-gray-900">{formatDate(reservation.property_start_date || null)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Data zakończenia:</label>
                  <p className="text-sm text-gray-900">{formatDate(reservation.property_end_date || null)}</p>
                </div>
              </div>
            </div>

            {/* Dane uczestnika */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Dane uczestnika</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Imię:</label>
                  <p className="text-sm text-gray-900">{reservation.participant_first_name || <MissingInfo field="participant_first_name" />}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nazwisko:</label>
                  <p className="text-sm text-gray-900">{reservation.participant_last_name || <MissingInfo field="participant_last_name" />}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Rocznik:</label>
                  <p className="text-sm text-gray-900">{reservation.participant_age || <MissingInfo field="participant_age" />}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Płeć:</label>
                  <p className="text-sm text-gray-900">{reservation.participant_gender || <MissingInfo field="participant_gender" />}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Miasto:</label>
                  <p className="text-sm text-gray-900">{reservation.participant_city || <MissingInfo field="participant_city" />}</p>
                </div>
              </div>
            </div>

            {/* Opiekunowie */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:col-span-2">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Opiekunowie</h2>
              {reservation.parents_data && Array.isArray(reservation.parents_data) && reservation.parents_data.length > 0 ? (
                <div className="space-y-4">
                  {reservation.parents_data.map((parent, index) => (
                    <div key={index} className="border border-gray-200 rounded p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Opiekun {index + 1}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Imię i nazwisko:</label>
                          <p className="text-sm text-gray-900">
                            {parent?.firstName || ''} {parent?.lastName || ''}
                            {(!parent?.firstName && !parent?.lastName) && <MissingInfo field="parent.name" />}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Email:</label>
                          <p className="text-sm text-gray-900">{parent?.email || <MissingInfo field="parent.email" />}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Telefon:</label>
                          <p className="text-sm text-gray-900">{parent?.phoneNumber || <MissingInfo field="parent.phoneNumber" />}</p>
                        </div>
                        {parent?.street && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">Ulica:</label>
                            <p className="text-sm text-gray-900">{parent.street}</p>
                          </div>
                        )}
                        {parent?.city && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">Miasto:</label>
                            <p className="text-sm text-gray-900">{parent.city}</p>
                          </div>
                        )}
                        {parent?.postalCode && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">Kod pocztowy:</label>
                            <p className="text-sm text-gray-900">{parent.postalCode}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <MissingInfo field="parents_data" />
              )}
            </div>

            {/* Dieta główna */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Dieta główna</h2>
              {reservation.diet ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Dieta:</label>
                    <p className="text-sm text-gray-900">
                      {reservation.diet_name || (diets.get(reservation.diet)?.name || `Dieta ID: ${reservation.diet}`)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cena:</label>
                    <p className="text-sm text-gray-900">
                      {reservation.diet_price !== null && reservation.diet_price !== undefined
                        ? formatCurrency(reservation.diet_price)
                        : diets.get(reservation.diet)
                        ? formatCurrency(diets.get(reservation.diet)!.price)
                        : formatCurrency(0)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Dieta:</label>
                    <p className="text-sm text-gray-900 italic">Dieta standardowa (domyślna)</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cena:</label>
                    <p className="text-sm text-gray-900">{formatCurrency(0)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Dodatkowe diety */}
            {reservation.selected_diets && reservation.selected_diets.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Dodatkowe diety</h2>
                <div className="space-y-2">
                  {reservation.selected_diets.map((dietId) => {
                    const diet = diets.get(dietId);
                    return (
                      <div key={dietId} className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="text-sm text-gray-900">
                          {diet ? diet.name : `Dieta ID: ${dietId}`}
                        </span>
                        {diet && (
                          <span className="text-sm text-gray-600">{formatCurrency(diet.price)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ochrony */}
            {reservation.selected_protection && reservation.selected_protection.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Ochrony</h2>
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
                      <div key={String(protectionIdValue)} className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="text-sm text-gray-900">
                          {protection ? protection.name : `Ochrona ID: ${protectionIdValue}`}
                        </span>
                        {protection && (
                          <span className="text-sm text-gray-600">{formatCurrency(protection.price)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dodatki */}
            {reservation.selected_addons && reservation.selected_addons.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Dodatki</h2>
                <div className="space-y-2">
                  {reservation.selected_addons.map((addonIdValue) => {
                    const addonId = typeof addonIdValue === 'number' ? addonIdValue : parseInt(String(addonIdValue));
                    const addon = addons.get(addonId);
                    return (
                      <div key={String(addonIdValue)} className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="text-sm text-gray-900">
                          {addon ? addon.name : `Dodatek ID: ${addonIdValue}`}
                        </span>
                        {addon && (
                          <span className="text-sm text-gray-600">{formatCurrency(addon.price)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Promocje */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Promocje</h2>
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
                  return (
                    <p className="text-sm text-gray-900">
                      <MissingInfo field={`promocja ID: ${reservation.selected_promotion}`} />
                    </p>
                  );
                })()}

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
                          className="text-xs px-2 py-1 text-[#03adf0] hover:text-[#0288c7] hover:underline"
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
                            className="px-3 py-1.5 text-xs bg-[#03adf0] text-white rounded hover:bg-[#0288c7] disabled:opacity-60"
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
                            className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-60"
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

            {/* Transport */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Transport</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Wyjazd:</label>
                  <p className="text-sm text-gray-900">
                    {reservation.departure_type === 'zbiorowy' ? 'Zbiorowy' : 'Własny'}
                    {reservation.departure_type === 'zbiorowy' && reservation.departure_city && (
                      <span className="ml-2">({reservation.departure_city})</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Powrót:</label>
                  <p className="text-sm text-gray-900">
                    {reservation.return_type === 'zbiorowy' ? 'Zbiorowy' : 'Własny'}
                    {reservation.return_type === 'zbiorowy' && reservation.return_city && (
                      <span className="ml-2">({reservation.return_city})</span>
                    )}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Różne miasta wyjazdu i powrotu:</label>
                  <p className="text-sm text-gray-900">
                    {reservation.transport_different_cities ? 'Tak' : 'Nie'}
                    {reservation.transport_different_cities && (
                      <span className="ml-2 text-orange-600 font-medium">
                        ⚠️ Klient wybrał różne miasta dla wyjazdu i powrotu
                      </span>
                    )}
                  </p>
                </div>
                {transportPrice > 0 && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Kwota transportu:</label>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(transportPrice)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Źródło */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Źródło</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Źródło:</label>
                  <p className="text-sm text-gray-900">
                    {reservation.source_name || reservation.selected_source || <MissingInfo field="selected_source" />}
                  </p>
                </div>
                {reservation.source_inne_text && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Inne (szczegóły):</label>
                    <p className="text-sm text-gray-900">{reservation.source_inne_text}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Faktura */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:col-span-2">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Faktura</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Czy chce fakturę:</label>
                  <p className="text-sm text-gray-900">{reservation.wants_invoice ? 'Tak' : 'Nie'}</p>
                </div>
                {reservation.wants_invoice && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Typ faktury:</label>
                      <p className="text-sm text-gray-900">
                        {reservation.invoice_type === 'private' ? 'Osoba prywatna' : 'Firma'}
                      </p>
                    </div>
                    {reservation.invoice_type === 'private' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Imię:</label>
                          <p className="text-sm text-gray-900">{reservation.invoice_first_name || <MissingInfo field="invoice_first_name" />}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Nazwisko:</label>
                          <p className="text-sm text-gray-900">{reservation.invoice_last_name || <MissingInfo field="invoice_last_name" />}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Email:</label>
                          <p className="text-sm text-gray-900">{reservation.invoice_email || <MissingInfo field="invoice_email" />}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Telefon:</label>
                          <p className="text-sm text-gray-900">{reservation.invoice_phone || <MissingInfo field="invoice_phone" />}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Nazwa firmy:</label>
                          <p className="text-sm text-gray-900">{reservation.invoice_company_name || <MissingInfo field="invoice_company_name" />}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">NIP:</label>
                          <p className="text-sm text-gray-900">{reservation.invoice_nip || <MissingInfo field="invoice_nip" />}</p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Ulica:</label>
                        <p className="text-sm text-gray-900">{reservation.invoice_street || <MissingInfo field="invoice_street" />}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Kod pocztowy:</label>
                        <p className="text-sm text-gray-900">{reservation.invoice_postal_code || <MissingInfo field="invoice_postal_code" />}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Miasto:</label>
                        <p className="text-sm text-gray-900">{reservation.invoice_city || <MissingInfo field="invoice_city" />}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Typ dostawy:</label>
                      <p className="text-sm text-gray-900">
                        {reservation.delivery_type === 'electronic' ? 'Elektroniczna' : 'Papierowa'}
                      </p>
                    </div>
                    {reservation.delivery_type === 'paper' && reservation.delivery_different_address && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Ulica dostawy:</label>
                          <p className="text-sm text-gray-900">{reservation.delivery_street || <MissingInfo field="delivery_street" />}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Kod pocztowy dostawy:</label>
                          <p className="text-sm text-gray-900">{reservation.delivery_postal_code || <MissingInfo field="delivery_postal_code" />}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Miasto dostawy:</label>
                          <p className="text-sm text-gray-900">{reservation.delivery_city || <MissingInfo field="delivery_city" />}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Choroby i informacje zdrowotne */}
            {(reservation.health_questions || reservation.health_details || reservation.additional_notes) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Choroby i informacje zdrowotne</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reservation.health_questions && typeof reservation.health_questions === 'object' && (
                    <>
                      {/* Choroby przewlekłe */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Choroby przewlekłe:</label>
                        {reservation.health_questions.chronicDiseases === 'Tak' || reservation.health_questions.chronicDiseases === 'tak' || reservation.health_questions.chronicDiseases === true ? (
                          reservation.health_details && typeof reservation.health_details === 'object' && reservation.health_details.chronicDiseases && reservation.health_details.chronicDiseases.trim() !== '' ? (
                            <div className="mt-1">
                              <p className="text-sm text-gray-900 font-medium">Tak</p>
                              <p className="text-sm text-gray-700 mt-1">{reservation.health_details.chronicDiseases}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-900 mt-1">Tak</p>
                          )
                        ) : (
                          <p className="text-sm text-gray-900 mt-1">Nie</p>
                        )}
                      </div>

                      {/* Dysfunkcje */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Dysfunkcje:</label>
                        {reservation.health_questions.dysfunctions === 'Tak' || reservation.health_questions.dysfunctions === 'tak' || reservation.health_questions.dysfunctions === true ? (
                          reservation.health_details && typeof reservation.health_details === 'object' && reservation.health_details.dysfunctions && reservation.health_details.dysfunctions.trim() !== '' ? (
                            <div className="mt-1">
                              <p className="text-sm text-gray-900 font-medium">Tak</p>
                              <p className="text-sm text-gray-700 mt-1">{reservation.health_details.dysfunctions}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-900 mt-1">Tak</p>
                          )
                        ) : (
                          <p className="text-sm text-gray-900 mt-1">Nie</p>
                        )}
                      </div>

                      {/* Leczenie psychiatryczne/psychologiczne */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Leczenie psychiatryczne/psychologiczne:</label>
                        {reservation.health_questions.psychiatric === 'Tak' || reservation.health_questions.psychiatric === 'tak' || reservation.health_questions.psychiatric === true ? (
                          reservation.health_details && typeof reservation.health_details === 'object' && reservation.health_details.psychiatric && reservation.health_details.psychiatric.trim() !== '' ? (
                            <div className="mt-1">
                              <p className="text-sm text-gray-900 font-medium">Tak</p>
                              <p className="text-sm text-gray-700 mt-1">{reservation.health_details.psychiatric}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-900 mt-1">Tak</p>
                          )
                        ) : (
                          <p className="text-sm text-gray-900 mt-1">Nie</p>
                        )}
                      </div>
                    </>
                  )}
                  {reservation.additional_notes && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Uwagi dodatkowe:</label>
                      <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{reservation.additional_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informacje dodatkowe */}
            {reservation.participant_additional_info && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Informacje dodatkowe</h2>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">{reservation.participant_additional_info}</p>
              </div>
            )}

            {/* Prośba o zakwaterowanie */}
            {reservation.accommodation_request && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Prośba o zakwaterowanie</h2>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{reservation.accommodation_request}</p>
              </div>
            )}

            {/* Zgody */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Zgody</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded ${reservation.consent1 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm text-gray-900">Zgoda 1 (Regulamin portalu i Polityka prywatności)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded ${reservation.consent2 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm text-gray-900">Zgoda 2 (Warunki uczestnictwa)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded ${reservation.consent3 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm text-gray-900">Zgoda 3 (Zdjęcia i ich udostępnianie)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded ${reservation.consent4 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm text-gray-900">Zgoda 4 (Składki na fundusze gwarancyjne)</span>
                </div>
              </div>
            </div>

            {/* Dokumenty */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">Dokumenty</h2>
              </div>
              <div className="space-y-4">
                {/* Umowa */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Status umowy:</label>
                        <p className="text-sm text-gray-900">
                          {reservation.contract_status || 'Brak'}
                        </p>
                      </div>
                      {reservation.contract_status === 'approved' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Zatwierdzona
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={openContractHtmlPreview}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-800 text-xs rounded hover:bg-gray-200"
                        title="Podgląd umowy (HTML)"
                      >
                        Podgląd HTML
                      </button>
                      <button
                        onClick={openContractHtmlEditor}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-800 text-xs rounded hover:bg-gray-200"
                        title="Edytuj umowę (HTML)"
                      >
                        Edytuj umowę
                      </button>
                      <input
                        ref={contractUploadInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !reservation) return;

                          try {
                            setUploadingContract(true);
                            await contractService.uploadContract(reservation.id, file);
                            alert('Umowa została przesłana pomyślnie');
                            // Reload documents
                            const contractFilesData = await contractService.getContractFiles(reservation.id);
                            setContractFiles(contractFilesData.filter(f => f.source === 'user'));
                            if (contractUploadInputRef.current) {
                              contractUploadInputRef.current.value = '';
                            }
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Nie udało się przesłać umowy');
                          } finally {
                            setUploadingContract(false);
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => contractUploadInputRef.current?.click()}
                        disabled={uploadingContract}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#03adf0] text-white text-xs rounded hover:bg-[#0288c7] disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Wgraj umowę za klienta"
                      >
                        <Upload className="w-3 h-3" />
                        {uploadingContract ? 'Wgrywanie...' : 'Wgraj umowę'}
                      </button>
                    </div>
                  </div>
                  {contractHtmlExists ? (
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="text-sm text-green-800 font-medium">✓ Dokumenty dostępne dla klienta</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded p-2">
                      <p className="text-sm text-gray-600">Brak</p>
                    </div>
                  )}
                  {contractFiles.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Wgrane dokumenty:</label>
                      {contractFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-900">{file.file_name}</span>
                            <span className="text-xs text-gray-500">
                              ({new Date(file.uploaded_at).toLocaleDateString('pl-PL')})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await contractService.downloadContractFile(file.id);
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : 'Błąd podczas pobierania pliku');
                                }
                              }}
                              className="p-1 text-[#03adf0] hover:bg-blue-50 rounded"
                              title="Pobierz"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await contractService.updateContractStatus(reservation.id, 'approved');
                                  alert('Umowa została zatwierdzona. Email został wysłany do klienta.');
                                  window.location.reload();
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : 'Błąd podczas zatwierdzania');
                                }
                              }}
                              disabled={reservation.contract_status === 'approved'}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Zatwierdź
                            </button>
                            <button
                              onClick={() => {
                                setRejectingDocumentType('contract');
                                setRejectionReason('');
                              }}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Odrzuć
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {reservation.contract_rejection_reason && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Powód odrzucenia umowy:</label>
                      <p className="text-sm text-gray-900">{reservation.contract_rejection_reason}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Karta kwalifikacyjna */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Status karty kwalifikacyjnej:</label>
                        <p className="text-sm text-gray-900">
                          {reservation.qualification_card_status || 'Brak'}
                        </p>
                      </div>
                      {reservation.qualification_card_status === 'approved' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Zatwierdzona
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
                            // Reload documents
                            const cardFilesData = await qualificationCardService.getQualificationCardFiles(reservation.id);
                            setCardFiles(cardFilesData.filter(f => f.source === 'user'));
                            if (cardUploadInputRef.current) {
                              cardUploadInputRef.current.value = '';
                            }
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Nie udało się przesłać karty kwalifikacyjnej');
                          } finally {
                            setUploadingCard(false);
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => cardUploadInputRef.current?.click()}
                        disabled={uploadingCard}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#03adf0] text-white text-xs rounded hover:bg-[#0288c7] disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Wgraj kartę kwalifikacyjną za klienta"
                      >
                        <Upload className="w-3 h-3" />
                        {uploadingCard ? 'Wgrywanie...' : 'Wgraj kartę'}
                      </button>
                    </div>
                  </div>
                  {cardHtmlExists ? (
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="text-sm text-green-800 font-medium">✓ Dokumenty dostępne dla klienta</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded p-2">
                      <p className="text-sm text-gray-600">Brak</p>
                    </div>
                  )}
                  {cardFiles.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Wgrane dokumenty:</label>
                      {cardFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-900">{file.file_name}</span>
                            <span className="text-xs text-gray-500">
                              ({new Date(file.uploaded_at).toLocaleDateString('pl-PL')})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await qualificationCardService.downloadQualificationCardFile(file.id);
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : 'Błąd podczas pobierania pliku');
                                }
                              }}
                              className="p-1 text-[#03adf0] hover:bg-blue-50 rounded"
                              title="Pobierz"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await qualificationCardService.updateQualificationCardStatus(reservation.id, 'approved');
                                  alert('Karta kwalifikacyjna została zatwierdzona. Email został wysłany do klienta.');
                                  window.location.reload();
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : 'Błąd podczas zatwierdzania');
                                }
                              }}
                              disabled={reservation.qualification_card_status === 'approved'}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Zatwierdź
                            </button>
                            <button
                              onClick={() => {
                                setRejectingDocumentType('card');
                                setRejectionReason('');
                              }}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Odrzuć
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {reservation.qualification_card_rejection_reason && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Powód odrzucenia karty:</label>
                      <p className="text-sm text-gray-900">{reservation.qualification_card_rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

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
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                  >
                    Wróć
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPromotion}
                    disabled={savingPromotion}
                    className="px-4 py-2 bg-[#03adf0] text-white rounded hover:bg-[#0288c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingPromotion ? 'Zapisywanie...' : 'Zapisz'}
                  </button>
                </div>
              </div>
            </UniversalModal>

            {/* Modal usuwania rezerwacji */}
            {showDeleteModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4 text-red-600">
                    Usuń rezerwację
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Czy na pewno chcesz usunąć rezerwację <strong>{reservationNumber}</strong>?
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Ta operacja jest nieodwracalna. Zostaną usunięte wszystkie powiązane dane:
                    płatności, faktury, dokumenty, pliki i wszystkie relacje. Dostępność turnusu zostanie zwiększona o 1.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      disabled={deletingReservation}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          alert('Rezerwacja została usunięta pomyślnie. Dostępność turnusu została zwiększona o 1.');
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
                          alert(err instanceof Error ? err.message : 'Błąd podczas usuwania rezerwacji');
                        } finally {
                          setDeletingReservation(false);
                          setShowDeleteModal(false);
                        }
                      }}
                      disabled={deletingReservation}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingReservation ? 'Usuwanie...' : 'Usuń rezerwację'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal odrzucenia */}
            {rejectingDocumentType && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Odrzuć {rejectingDocumentType === 'contract' ? 'umowę' : 'kartę kwalifikacyjną'}
                  </h3>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Podaj uzasadnienie odrzucenia..."
                    className="w-full h-32 p-2 border border-gray-300 rounded mb-4"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setRejectingDocumentType(null);
                        setRejectionReason('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={async () => {
                        if (!rejectionReason.trim()) {
                          alert('Podaj uzasadnienie odrzucenia');
                          return;
                        }
                        try {
                          if (rejectingDocumentType === 'contract') {
                            await contractService.updateContractStatus(reservation!.id, 'rejected', rejectionReason);
                          } else {
                            await qualificationCardService.updateQualificationCardStatus(reservation!.id, 'rejected', rejectionReason);
                          }
                          alert(`Dokument został odrzucony. Email z uzasadnieniem został wysłany do klienta.`);
                          setRejectingDocumentType(null);
                          setRejectionReason('');
                          window.location.reload();
                        } catch (err) {
                          alert(err instanceof Error ? err.message : 'Błąd podczas odrzucania dokumentu');
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Odrzuć
                    </button>
                  </div>
                </div>
              </div>
            )}

            <UniversalModal
              isOpen={showContractHtmlModal}
              onClose={() => {
                setShowContractHtmlModal(false);
                setContractHtmlError(null);
              }}
              title="Edycja umowy (HTML)"
              maxWidth="2xl"
            >
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-600">
                  Edytujesz treść umowy w formacie HTML.
                </p>
                {contractHtmlError && (
                  <div className="text-sm text-red-600">{contractHtmlError}</div>
                )}
                {loadingContractHtml ? (
                  <div className="text-sm text-gray-700">Ładowanie treści umowy...</div>
                ) : (
                  <textarea
                    value={contractHtmlDraft}
                    onChange={(e) => setContractHtmlDraft(e.target.value)}
                    className="w-full h-96 p-2 border border-gray-300 rounded font-mono text-xs"
                  />
                )}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowContractHtmlModal(false);
                      setContractHtmlError(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveContractHtml}
                    disabled={savingContractHtml || loadingContractHtml}
                    className="px-4 py-2 bg-[#03adf0] text-white rounded hover:bg-[#0288c7] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingContractHtml ? 'Zapisywanie...' : 'Zapisz'}
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
                      className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100"
                      disabled={savingJustification}
                    >
                      Anuluj
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveJustification}
                      className="px-4 py-2 text-sm bg-[#03adf0] text-white rounded hover:bg-[#0288c7] disabled:opacity-60"
                      disabled={savingJustification}
                    >
                      {savingJustification ? 'Zapisywanie...' : 'Zapisz'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Płatności */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:col-span-2">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Płatności</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cena całkowita:</label>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(reservation.total_price || 0)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Zaliczka:</label>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(reservation.deposit_amount || null)}</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Historia płatności (zahardkodowane):</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="text-sm text-gray-900">Zaliczka - {formatDate(reservation.created_at)}</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(reservation.deposit_amount)}</span>
                    </div>
                    {reservation.deposit_amount && reservation.total_price && reservation.deposit_amount < reservation.total_price && (
                      <>
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                          <span className="text-sm text-gray-900">Płatność częściowa - {formatDate(reservation.updated_at || null)}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency((reservation.total_price - reservation.deposit_amount) / 2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                          <span className="text-sm text-gray-900">Płatność końcowa - {formatDate(reservation.updated_at || null)}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency((reservation.total_price - reservation.deposit_amount) / 2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}
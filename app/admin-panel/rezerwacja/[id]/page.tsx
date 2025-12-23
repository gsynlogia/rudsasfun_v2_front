'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
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
  selected_diets?: number[] | null;
  selected_addons?: (string | number)[] | null;
  selected_protection?: (string | number)[] | null;
  selected_promotion?: string | null;
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
}

interface Diet {
  id: number;
  name: string;
  price: number;
}

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  // params.id contains the reservation number (e.g., REZ-2025-001)
  const reservationNumber = params.id as string;

  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [addons, setAddons] = useState<Map<number, Addon>>(new Map());
  const [protections, setProtections] = useState<Map<number, Protection>>(new Map());
  const [promotions, setPromotions] = useState<Map<number, Promotion>>(new Map());
  const [diets, setDiets] = useState<Map<number, Diet>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch reservation by number
        const reservationData = await authenticatedApiCall<ReservationDetails>(
          `/api/reservations/by-number/${reservationNumber}`
        );
        setReservation(reservationData);

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
              const protectionId = typeof protectionIdValue === 'number' ? protectionIdValue : parseInt(String(protectionIdValue));
              if (!isNaN(protectionId)) {
                const protection = await authenticatedApiCall<Protection>(`/api/general-protections/${protectionId}`);
                protectionsMap.set(protectionId, protection);
              }
            } catch (err) {
              console.error(`Error fetching protection ${protectionIdValue}:`, err);
            }
          }
          setProtections(protectionsMap);
        }

        // Fetch promotion details
        // NOTE: selected_promotion is a relation_id (from center_promotion_general_promotions table), not general_promotion_id
        if (reservationData.selected_promotion) {
          try {
            const relationId = typeof reservationData.selected_promotion === 'number' 
              ? reservationData.selected_promotion 
              : parseInt(String(reservationData.selected_promotion));
            if (!isNaN(relationId) && reservationData.camp_id && reservationData.property_id) {
              // Get turnus promotions to find the relation
              try {
                const turnusPromotions = await authenticatedApiCall<any[]>(
                  `/api/camps/${reservationData.camp_id}/properties/${reservationData.property_id}/promotions`
                );
                // Find promotion by relation_id (this is what's stored in selected_promotion)
                const foundPromotion = turnusPromotions.find(
                  (p: any) => p.relation_id === relationId || p.id === relationId
                );
                if (foundPromotion && foundPromotion.general_promotion_id) {
                  // Now fetch the general promotion details
                  try {
                    const generalPromotion = await authenticatedApiCall<Promotion>(
                      `/api/general-promotions/${foundPromotion.general_promotion_id}`
                    );
                    setPromotions(new Map([[relationId, {
                      ...generalPromotion,
                      price: foundPromotion.price || generalPromotion.price, // Use turnus-specific price
                    }]]));
                  } catch (generalPromoError) {
                    // If general promotion not found, use data from turnus promotion
                    setPromotions(new Map([[relationId, {
                      id: foundPromotion.general_promotion_id,
                      name: foundPromotion.name,
                      price: foundPromotion.price || 0,
                      description: foundPromotion.description,
                    }]]));
                  }
                } else {
                  console.warn(`Promotion relation ${relationId} not found in turnus promotions`);
                }
              } catch (turnusPromoError) {
                console.warn(`Could not fetch turnus promotions for relation ${relationId}:`, turnusPromoError);
              }
            }
          } catch (err) {
            console.error(`Error fetching promotion ${reservationData.selected_promotion}:`, err);
          }
        }

        // Fetch diets details
        // NOTE: selected_diets and diet may contain relation_id (from center_diet_general_diets) or diet_id
        if (reservationData.selected_diets && reservationData.selected_diets.length > 0 && reservationData.camp_id && reservationData.property_id) {
          const dietsMap = new Map<number, Diet>();
          // Get turnus diets to find relations
          try {
            const turnusDiets = await authenticatedApiCall<any[]>(
              `/api/camps/${reservationData.camp_id}/properties/${reservationData.property_id}/diets`
            );
            for (const dietIdValue of reservationData.selected_diets) {
              const dietId = typeof dietIdValue === 'number' ? dietIdValue : parseInt(String(dietIdValue));
              if (!isNaN(dietId)) {
                // Find diet by relation_id or id
                const foundDiet = turnusDiets.find(
                  (d: any) => d.relation_id === dietId || d.id === dietId
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
                        description: foundDiet.description,
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
                        description: foundDiet.description,
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

        // Fetch main diet if exists
        // NOTE: diet may be relation_id (from center_diet_general_diets) or diet_id
        if (reservationData.diet && reservationData.camp_id && reservationData.property_id) {
          try {
            const dietId = typeof reservationData.diet === 'number' ? reservationData.diet : parseInt(String(reservationData.diet));
            if (!isNaN(dietId)) {
              // Get turnus diets to find the relation
              try {
                const turnusDiets = await authenticatedApiCall<any[]>(
                  `/api/camps/${reservationData.camp_id}/properties/${reservationData.property_id}/diets`
                );
                // Find diet by relation_id or id
                const foundDiet = turnusDiets.find(
                  (d: any) => d.relation_id === dietId || d.id === dietId
                );
                if (foundDiet) {
                  // If it's a center diet relation, get general_diet_id
                  if (foundDiet.is_center_diet_relation && foundDiet.general_diet_id) {
                    try {
                      const generalDiet = await authenticatedApiCall<Diet>(`/api/general-diets/${foundDiet.general_diet_id}`);
                      setDiets(prev => new Map(prev).set(dietId, {
                        ...generalDiet,
                        price: foundDiet.price || generalDiet.price, // Use turnus-specific price
                      }));
                    } catch (generalDietError) {
                      // If general diet not found, use data from turnus diet
                      setDiets(prev => new Map(prev).set(dietId, {
                        id: foundDiet.general_diet_id,
                        name: foundDiet.name,
                        price: foundDiet.price || 0,
                        description: foundDiet.description,
                      }));
                    }
                  } else {
                    // Regular diet from diets table
                    try {
                      const diet = await authenticatedApiCall<Diet>(`/api/diets/${foundDiet.id}`);
                      setDiets(prev => new Map(prev).set(dietId, diet));
                    } catch (dietError) {
                      // If diet not found, use data from turnus diet
                      setDiets(prev => new Map(prev).set(dietId, {
                        id: foundDiet.id,
                        name: foundDiet.name,
                        price: foundDiet.price || 0,
                        description: foundDiet.description,
                      }));
                    }
                  }
                } else {
                  // Try direct fetch as regular diet
                  try {
                    const diet = await authenticatedApiCall<Diet>(`/api/diets/${dietId}`);
                    setDiets(prev => new Map(prev).set(dietId, diet));
                  } catch (dietError) {
                    // Try as general diet
                    try {
                      const diet = await authenticatedApiCall<Diet>(`/api/general-diets/${dietId}`);
                      setDiets(prev => new Map(prev).set(dietId, diet));
                    } catch (generalDietError) {
                      console.warn(`Main diet ${dietId} not found in turnus diets, regular diets, or general diets`);
                    }
                  }
                }
              } catch (turnusDietsError) {
                console.warn(`Could not fetch turnus diets for main diet:`, turnusDietsError);
              }
            }
          } catch (err) {
            console.error(`Error fetching main diet ${reservationData.diet}:`, err);
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
                onClick={() => router.push('/admin-panel')}
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
            <button
              onClick={() => router.push(`/admin-panel/rezerwacja/${reservationNumber}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-[#03adf0] text-white hover:bg-[#0288c7] transition-all duration-200"
              style={{ borderRadius: 0 }}
            >
              <Edit className="w-4 h-4" />
              <span>Zmiana w rezerwacji</span>
            </button>
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
                  {diets.get(reservation.diet) && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Cena:</label>
                      <p className="text-sm text-gray-900">{formatCurrency(diets.get(reservation.diet)!.price)}</p>
                    </div>
                  )}
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
                    const protectionId = typeof protectionIdValue === 'number' ? protectionIdValue : parseInt(String(protectionIdValue));
                    const protection = protections.get(protectionId);
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
            {reservation.selected_promotion && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Promocje</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Promocja:</label>
                    {(() => {
                      const promotionId = typeof reservation.selected_promotion === 'number' 
                        ? reservation.selected_promotion 
                        : parseInt(String(reservation.selected_promotion));
                      const promotion = promotions.get(promotionId);
                      if (promotion) {
                        return (
                          <>
                            <p className="text-sm text-gray-900">{promotion.name}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Cena: {formatCurrency(promotion.price)}
                            </p>
                          </>
                        );
                      } else {
                        return (
                          <p className="text-sm text-gray-900">
                            <MissingInfo field={`promocja ID: ${reservation.selected_promotion}`} />
                          </p>
                        );
                      }
                    })()}
                  </div>
                  {reservation.promotion_justification && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Uzasadnienie:</label>
                      <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded mt-1 whitespace-pre-wrap">
                        {JSON.stringify(reservation.promotion_justification, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

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
              <h2 className="text-base font-semibold text-gray-900 mb-3">Dokumenty</h2>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status umowy:</label>
                  <p className="text-sm text-gray-900">
                    {reservation.contract_status || <MissingInfo field="contract_status" />}
                  </p>
                </div>
                {reservation.contract_rejection_reason && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Powód odrzucenia umowy:</label>
                    <p className="text-sm text-gray-900">{reservation.contract_rejection_reason}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">Status karty kwalifikacyjnej:</label>
                  <p className="text-sm text-gray-900">
                    {reservation.qualification_card_status || <MissingInfo field="qualification_card_status" />}
                  </p>
                </div>
                {reservation.qualification_card_rejection_reason && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Powód odrzucenia karty:</label>
                    <p className="text-sm text-gray-900">{reservation.qualification_card_rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>

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


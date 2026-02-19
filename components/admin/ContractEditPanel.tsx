'use client';

import { Save } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import EditReservationStep1 from '@/components/admin/EditReservationStep1';
import EditReservationStep2 from '@/components/admin/EditReservationStep2';
import { useToast } from '@/components/ToastContainer';
import { contractArchiveService } from '@/lib/services/ContractArchiveService';
import { authenticatedApiCall } from '@/utils/api-auth';

interface ReservationDetails {
  id: number;
  camp_id?: number;
  property_id?: number;
  property_city?: string | null;
  camp_name?: string | null;
  property_name?: string | null;
  property_period?: string | null;
  property_start_date?: string | null;
  property_end_date?: string | null;
  property_tag?: string | null;
  parents_data?: Array<{
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    phoneNumber?: string;
    street?: string;
    postalCode?: string;
    city?: string;
  }> | null;
  participant_first_name?: string | null;
  participant_last_name?: string | null;
  participant_age?: string | null;
  participant_gender?: string | null;
  participant_city?: string | null;
  diet?: number | null;
  accommodation_request?: string | null;
  health_questions?: any;
  health_details?: any;
  additional_notes?: string | null;
  participant_additional_info?: string | null;
  selected_diets?: number[] | null;
  selected_addons?: (string | number)[] | null;
  selected_protection?: (string | number)[] | null;
  selected_promotion?: string | null;
  promotion_justification?: any;
  departure_type?: string | null;
  departure_city?: string | null;
  departure_transport_city_id?: number | null;
  return_type?: string | null;
  return_city?: string | null;
  return_transport_city_id?: number | null;
  transport_different_cities?: boolean;
  selected_source?: string | null;
  source_inne_text?: string | null;
  promotion_name?: string | null;
  promotion_price?: number | null;
}

interface ContractEditPanelProps {
  reservation: ReservationDetails;
  onSaveSuccess: () => void;
  onClose?: () => void;
}

function mapReservationToStep1(r: ReservationDetails) {
  return {
    parents_data: (r.parents_data || []).map((parent: any, index: number) => ({
      id: parent.id || String(index + 1),
      firstName: parent.firstName || '',
      lastName: parent.lastName || '',
      email: parent.email || '',
      phone: parent.phone || parent.phoneNumber || '',
      phoneNumber: parent.phoneNumber || parent.phone || '',
      street: parent.street || '',
      postalCode: parent.postalCode || '',
      city: parent.city || '',
    })),
    participant_first_name: r.participant_first_name ?? '',
    participant_last_name: r.participant_last_name ?? '',
    participant_age: r.participant_age ?? '',
    participant_gender: r.participant_gender ?? '',
    participant_city: r.participant_city ?? '',
    diet: r.diet,
    accommodation_request: r.accommodation_request ?? '',
    health_questions: r.health_questions,
    health_details: r.health_details,
    additional_notes: r.additional_notes ?? '',
    participant_additional_info: r.participant_additional_info ?? '',
  };
}

function mapReservationToStep2(r: ReservationDetails) {
  return {
    selected_diets: r.selected_diets ?? [],
    selected_addons: r.selected_addons ?? [],
    selected_protection: r.selected_protection ?? [],
    selected_promotion: r.selected_promotion ?? '',
    promotion_justification: r.promotion_justification ?? {},
    departure_type: r.departure_type ?? 'zbiorowy',
    departure_city: r.departure_city ?? '',
    departure_transport_city_id: r.departure_transport_city_id ?? null,
    return_type: r.return_type ?? 'zbiorowy',
    return_city: r.return_city ?? '',
    return_transport_city_id: r.return_transport_city_id ?? null,
    transport_different_cities: r.transport_different_cities ?? false,
    selected_source: r.selected_source ?? '',
    source_inne_text: r.source_inne_text ?? '',
  };
}

export function ContractEditPanel({ reservation, onSaveSuccess, onClose }: ContractEditPanelProps) {
  const { showSuccess, showError: showErrorToast } = useToast();
  const [formData, setFormData] = useState<{ step1: any; step2: any }>({ step1: null, step2: null });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
      step1: mapReservationToStep1(reservation),
      step2: mapReservationToStep2(reservation),
    });
  }, [reservation.id]);

  const handleStep1Change = useCallback((data: any) => {
    setFormData(prev => (JSON.stringify(prev.step1) === JSON.stringify(data) ? prev : { ...prev, step1: data }));
  }, []);
  const handleStep2Change = useCallback((data: any) => {
    setFormData(prev => (JSON.stringify(prev.step2) === JSON.stringify(data) ? prev : { ...prev, step2: data }));
  }, []);

  const handleSave = async () => {
    if (!formData.step1 || !formData.step2) return;
    try {
      setIsSaving(true);
      await contractArchiveService.create(reservation.id, reservation as unknown as Record<string, unknown>);
      const updateRequest: any = {
        step1: {
          parents: formData.step1.parents_data || [],
          participantData: {
            firstName: formData.step1.participant_first_name || '',
            lastName: formData.step1.participant_last_name || '',
            age: formData.step1.participant_age || '',
            gender: formData.step1.participant_gender || '',
            city: formData.step1.participant_city || '',
          },
          selectedDietId: formData.step1.diet,
          accommodationRequest: formData.step1.accommodation_request || '',
          healthQuestions: formData.step1.health_questions || { chronicDiseases: 'Nie', dysfunctions: 'Nie', psychiatric: 'Nie' },
          healthDetails: formData.step1.health_details || { chronicDiseases: '', dysfunctions: '', psychiatric: '' },
          additionalNotes: formData.step1.additional_notes || '',
          participantAdditionalInfo: formData.step1.participant_additional_info ?? undefined,
        },
        step2: {
          selectedDiets: formData.step2.selected_diets || [],
          selectedAddons: formData.step2.selected_addons || [],
          selectedProtection: formData.step2.selected_protection || [],
          selectedPromotion: formData.step2.selected_promotion || '',
          promotionJustification: formData.step2.promotion_justification || {},
          transportData: {
            departureType: formData.step2.departure_type || 'zbiorowy',
            departureCity: formData.step2.departure_city || '',
            departureTransportCityId: formData.step2.departure_transport_city_id ?? undefined,
            returnType: formData.step2.return_type || 'zbiorowy',
            returnCity: formData.step2.return_city || '',
            returnTransportCityId: formData.step2.return_transport_city_id ?? undefined,
            differentCities: formData.step2.transport_different_cities || false,
          },
          selectedSource: formData.step2.selected_source || '',
          inneText: formData.step2.source_inne_text || '',
        },
      };
      await authenticatedApiCall<ReservationDetails>(
        `/api/reservations/${reservation.id}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateRequest) },
      );
      showSuccess('Umowa zapisana. Poprzednia wersja dodana do archiwum.');
      onSaveSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Błąd zapisu';
      showErrorToast(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const campId = reservation.camp_id ?? 0;
  const propertyId = reservation.property_id ?? 0;
  const propertyCity = reservation.property_city ?? undefined;

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
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-3 mb-3">
        <div className="min-w-0 text-sm text-gray-700">
          {reservation.camp_name && <span>Obóz: {reservation.camp_name}</span>}
          {reservation.property_name && (
            <span>{reservation.camp_name ? '. Turnus: ' : 'Turnus: '}{reservation.property_name}</span>
          )}
          {datesText && <span>{reservation.camp_name || reservation.property_name ? '. Daty: ' : 'Daty: '}{datesText}</span>}
          {reservation.property_tag && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#1d283d]/10 text-[#1d283d]">
              {reservation.property_tag}
            </span>
          )}
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
      <div className="flex-1 overflow-auto min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
          <div className="min-w-0">
            {formData.step1 && (
              <EditReservationStep1
                data={formData.step1}
                camp_id={campId}
                property_id={propertyId}
                onChange={handleStep1Change}
              />
            )}
          </div>
          <div className="min-w-0">
            {formData.step2 && (
              <EditReservationStep2
                data={formData.step2}
                camp_id={campId}
                property_id={propertyId}
                property_city={propertyCity}
                onChange={handleStep2Change}
                promotion_name={reservation.promotion_name}
                promotion_price={reservation.promotion_price}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
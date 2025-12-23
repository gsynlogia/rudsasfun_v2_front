'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { authenticatedApiCall } from '@/utils/api-auth';
import { useToast } from '@/components/ToastContainer';
import EditReservationStep1 from '@/components/admin/EditReservationStep1';
import EditReservationStep2 from '@/components/admin/EditReservationStep2';
import EditReservationStep3 from '@/components/admin/EditReservationStep3';
import EditReservationStep4 from '@/components/admin/EditReservationStep4';

interface ReservationDetails {
  id: number;
  camp_id: number;
  property_id: number;
  property_city?: string | null;
  participant_first_name: string;
  participant_last_name: string;
  participant_age: string;
  participant_gender: string;
  participant_city: string;
  parents_data: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneNumber: string;
    street: string;
    postalCode: string;
    city: string;
  }>;
  diet: number | null;
  accommodation_request?: string | null;
  health_questions?: any;
  health_details?: any;
  additional_notes?: string | null;
  selected_diets?: number[] | null;
  selected_addons?: string[] | null;
  selected_protection?: string[] | null;
  selected_promotion?: string | null;
  promotion_justification?: any;
  departure_type: string;
  departure_city?: string | null;
  return_type: string;
  return_city?: string | null;
  transport_different_cities?: boolean;
  selected_source?: string | null;
  source_inne_text?: string | null;
  wants_invoice: boolean;
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
  consent1?: boolean | null;
  consent2?: boolean | null;
  consent3?: boolean | null;
  consent4?: boolean | null;
  total_price?: number | null;
  deposit_amount?: number | null;
}

interface FormData {
  step1: any;
  step2: any;
  step3: any;
  step4: any;
}

export default function EditReservationPage() {
  const params = useParams();
  const router = useRouter();
  const reservationNumber = params.id as string;
  const { showSuccess, showError: showErrorToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    step1: null,
    step2: null,
    step3: null,
    step4: null,
  });

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await authenticatedApiCall<ReservationDetails>(`/api/reservations/by-number/${reservationNumber}`);
        setReservation(data);
      } catch (err) {
        console.error('Error fetching reservation:', err);
        setError(err instanceof Error ? err.message : 'Błąd podczas ładowania rezerwacji');
      } finally {
        setIsLoading(false);
      }
    };

    if (reservationNumber) {
      fetchReservation();
    }
  }, [reservationNumber]);

  const handleStep1Change = useCallback((data: any) => {
    setFormData(prev => {
      // Only update if data actually changed
      if (JSON.stringify(prev.step1) === JSON.stringify(data)) {
        return prev;
      }
      return { ...prev, step1: data };
    });
  }, []);

  const handleStep2Change = useCallback((data: any) => {
    setFormData(prev => {
      if (JSON.stringify(prev.step2) === JSON.stringify(data)) {
        return prev;
      }
      return { ...prev, step2: data };
    });
  }, []);

  const handleStep3Change = useCallback((data: any) => {
    setFormData(prev => {
      if (JSON.stringify(prev.step3) === JSON.stringify(data)) {
        return prev;
      }
      return { ...prev, step3: data };
    });
  }, []);

  const handleStep4Change = useCallback((data: any) => {
    setFormData(prev => {
      if (JSON.stringify(prev.step4) === JSON.stringify(data)) {
        return prev;
      }
      return { ...prev, step4: data };
    });
  }, []);

  const handleSave = async () => {
    if (!reservation) return;

    try {
      setIsSaving(true);
      setError(null);

      // Prepare update request - only include steps that have data
      // Partial update - we can save only Step 1, only Step 2, etc.
      const updateRequest: any = {};

      // Step 1 - only if formData.step1 exists
      if (formData.step1) {
        updateRequest.step1 = {
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
          healthQuestions: formData.step1.health_questions || {
            chronicDiseases: 'Nie',
            dysfunctions: 'Nie',
            psychiatric: 'Nie',
          },
          healthDetails: formData.step1.health_details || {
            chronicDiseases: '',
            dysfunctions: '',
            psychiatric: '',
          },
          additionalNotes: formData.step1.additional_notes || '',
        };
      }

      // Step 2 - only if formData.step2 exists
      if (formData.step2) {
        updateRequest.step2 = {
          selectedDiets: formData.step2.selected_diets || [],
          selectedAddons: formData.step2.selected_addons || [],
          selectedProtection: formData.step2.selected_protection || [],
          selectedPromotion: formData.step2.selected_promotion || '',
          promotionJustification: formData.step2.promotion_justification || {},
          transportData: {
            departureType: formData.step2.departure_type || 'zbiorowy',
            departureCity: formData.step2.departure_city || '',
            returnType: formData.step2.return_type || 'zbiorowy',
            returnCity: formData.step2.return_city || '',
            differentCities: formData.step2.transport_different_cities || false,
          },
          selectedSource: formData.step2.selected_source || '',
          inneText: formData.step2.source_inne_text || '',
        };
      }

      // Step 3 - only if formData.step3 exists
      if (formData.step3) {
        updateRequest.step3 = {
          wantsInvoice: formData.step3.wants_invoice || false,
          invoiceType: (formData.step3.invoice_type as 'private' | 'company') || 'private',
          privateData: formData.step3.wants_invoice && formData.step3.invoice_type === 'private' ? {
            firstName: formData.step3.invoice_first_name || '',
            lastName: formData.step3.invoice_last_name || '',
            email: formData.step3.invoice_email || '',
            phone: formData.step3.invoice_phone || '',
            street: formData.step3.invoice_street || '',
            postalCode: formData.step3.invoice_postal_code || '',
            city: formData.step3.invoice_city || '',
          } : undefined,
          companyData: formData.step3.wants_invoice && formData.step3.invoice_type === 'company' ? {
            companyName: formData.step3.invoice_company_name || '',
            nip: formData.step3.invoice_nip || '',
            street: formData.step3.invoice_street || '',
            postalCode: formData.step3.invoice_postal_code || '',
            city: formData.step3.invoice_city || '',
          } : undefined,
          deliveryType: (formData.step3.delivery_type as 'electronic' | 'paper') || 'electronic',
          deliveryDifferentAddress: formData.step3.delivery_different_address || false,
          deliveryAddress: formData.step3.delivery_different_address ? {
            street: formData.step3.delivery_street || '',
            postalCode: formData.step3.delivery_postal_code || '',
            city: formData.step3.delivery_city || '',
          } : undefined,
        };
      }

      // Step 4 - only if formData.step4 exists
      if (formData.step4) {
        updateRequest.step4 = {
          consent1: formData.step4.consent1 || false,
          consent2: formData.step4.consent2 || false,
          consent3: formData.step4.consent3 || false,
          consent4: formData.step4.consent4 || false,
        };
      }

      // Call PATCH endpoint
      const response = await authenticatedApiCall<ReservationDetails>(
        `/api/reservations/${reservation.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateRequest),
        }
      );

      // Success - show toast and stay on edit page
      showSuccess('Zmiany zostały zapisane pomyślnie');
      
      // Update local reservation state with response data
      setReservation(response);
    } catch (err) {
      console.error('Error saving reservation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas zapisywania rezerwacji';
      setError(errorMessage);
      showErrorToast(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SectionGuard section="reservations">
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
              <div className="text-gray-500">Ładowanie rezerwacji...</div>
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
        <div className="h-full flex flex-col animate-fadeIn relative">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between bg-white border-b border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/admin-panel/rezerwacja/${reservationNumber}`)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 rounded"
                style={{ borderRadius: 0, cursor: 'pointer' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Edycja rezerwacji: {reservationNumber}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Krok {currentStep} z 4
                </p>
              </div>
            </div>
          </div>
          
          {/* Fixed Save Button - always visible at top right */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="fixed top-24 right-8 flex items-center gap-2 px-6 py-3 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 transition-all duration-200 shadow-lg z-50"
            style={{ borderRadius: 0 }}
          >
            <Save className="w-5 h-5" />
            <span className="font-medium">{isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}</span>
          </button>

          {/* Steps Navigation */}
          <div className="mb-6 flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  currentStep === step
                    ? 'bg-[#03adf0] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{ borderRadius: 0 }}
              >
                Krok {step}
              </button>
            ))}
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
            {currentStep === 1 && reservation && (
              <EditReservationStep1
                data={{
                  parents_data: reservation.parents_data,
                  participant_first_name: reservation.participant_first_name,
                  participant_last_name: reservation.participant_last_name,
                  participant_age: reservation.participant_age,
                  participant_gender: reservation.participant_gender,
                  participant_city: reservation.participant_city,
                  diet: reservation.diet,
                  accommodation_request: reservation.accommodation_request,
                  health_questions: reservation.health_questions,
                  health_details: reservation.health_details,
                  additional_notes: reservation.additional_notes,
                }}
                camp_id={reservation.camp_id}
                property_id={reservation.property_id}
                onChange={handleStep1Change}
              />
            )}
            {currentStep === 2 && reservation && (
              <EditReservationStep2
                data={{
                  selected_diets: reservation.selected_diets,
                  selected_addons: reservation.selected_addons,
                  selected_protection: reservation.selected_protection,
                  selected_promotion: reservation.selected_promotion,
                  promotion_justification: reservation.promotion_justification,
                  departure_type: reservation.departure_type,
                  departure_city: reservation.departure_city,
                  return_type: reservation.return_type,
                  return_city: reservation.return_city,
                  transport_different_cities: reservation.transport_different_cities,
                  selected_source: reservation.selected_source,
                  source_inne_text: reservation.source_inne_text,
                }}
                camp_id={reservation.camp_id}
                property_id={reservation.property_id}
                property_city={reservation.property_city}
                onChange={handleStep2Change}
              />
            )}
            {currentStep === 3 && reservation && (
              <EditReservationStep3
                data={{
                  wants_invoice: reservation.wants_invoice,
                  invoice_type: reservation.invoice_type,
                  invoice_first_name: reservation.invoice_first_name,
                  invoice_last_name: reservation.invoice_last_name,
                  invoice_email: reservation.invoice_email,
                  invoice_phone: reservation.invoice_phone,
                  invoice_company_name: reservation.invoice_company_name,
                  invoice_nip: reservation.invoice_nip,
                  invoice_street: reservation.invoice_street,
                  invoice_postal_code: reservation.invoice_postal_code,
                  invoice_city: reservation.invoice_city,
                  delivery_type: reservation.delivery_type,
                  delivery_different_address: reservation.delivery_different_address,
                  delivery_street: reservation.delivery_street,
                  delivery_postal_code: reservation.delivery_postal_code,
                  delivery_city: reservation.delivery_city,
                }}
                onChange={handleStep3Change}
              />
            )}
            {currentStep === 4 && reservation && (
              <EditReservationStep4
                data={{
                  consent1: reservation.consent1,
                  consent2: reservation.consent2,
                  consent3: reservation.consent3,
                  consent4: reservation.consent4,
                }}
                onChange={handleStep4Change}
              />
            )}
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}

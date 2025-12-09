'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, User, Building2, FileText, Shield, Tag, MapPin, Phone, Mail, Calendar, CreditCard, CheckCircle, Download, AlertCircle } from 'lucide-react';
import { reservationService } from '@/lib/services/ReservationService';
import { contractService } from '@/lib/services/ContractService';
import { qualificationCardService } from '@/lib/services/QualificationCardService';
import { authenticatedApiCall } from '@/utils/api-auth';
import SectionGuard from '@/components/admin/SectionGuard';
import AdminLayout from '@/components/admin/AdminLayout';

interface BackendReservation {
  id: number;
  camp_id: number;
  property_id: number;
  status: string;
  total_price: number;
  deposit_amount: number | null;
  created_at: string;
  updated_at: string;
  camp_name: string | null;
  property_name: string | null;
  property_city: string | null;
  property_period: string | null;
  participant_first_name: string | null;
  participant_last_name: string | null;
  participant_age: string | null;
  participant_gender: string | null;
  participant_city: string | null;
  parents_data: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneNumber: string;
    street: string;
    postalCode: string;
    city: string;
  }> | null;
  invoice_type: string | null;
  invoice_first_name: string | null;
  invoice_last_name: string | null;
  invoice_email: string | null;
  invoice_phone: string | null;
  invoice_company_name: string | null;
  invoice_nip: string | null;
  invoice_street: string | null;
  invoice_postal_code: string | null;
  invoice_city: string | null;
  delivery_type?: string | null;
  delivery_different_address?: boolean | null;
  delivery_street?: string | null;
  delivery_postal_code?: string | null;
  delivery_city?: string | null;
  departure_type: string | null;
  departure_city: string | null;
  return_type: string | null;
  return_city: string | null;
  transport_different_cities?: boolean | null;
  diet: number | null;
  diet_name?: string | null;
  selected_diets?: number[] | null;
  accommodation_request: string | null;
  selected_source: string | null;
  source_name?: string | null;
  source_inne_text?: string | null;
  selected_addons?: string[] | null;
  selected_protection?: number[] | null;
  selected_promotion?: string | null;
  promotion_justification?: Record<string, any> | null;
  consent1?: boolean | null;
  consent2?: boolean | null;
  consent3?: boolean | null;
  consent4?: boolean | null;
  health_questions?: Record<string, string> | null;
  health_details?: Record<string, string> | null;
  additional_notes?: string | null;
  contract_status?: string | null;
  contract_rejection_reason?: string | null;
  qualification_card_status?: string | null;
  qualification_card_rejection_reason?: string | null;
}

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = parseInt(params.id as string);
  
  const [reservation, setReservation] = useState<BackendReservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addonsMap, setAddonsMap] = useState<Map<string, string>>(new Map());
  const [protectionsMap, setProtectionsMap] = useState<Map<number, string>>(new Map());
  const [totalPaidAmount, setTotalPaidAmount] = useState<number>(0);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUpdatingContract, setIsUpdatingContract] = useState(false);
  const [qualificationCard, setQualificationCard] = useState<any>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [qualificationCardModalOpen, setQualificationCardModalOpen] = useState(false);
  const [qualificationCardRejectionReason, setQualificationCardRejectionReason] = useState('');
  const [isUpdatingQualificationCard, setIsUpdatingQualificationCard] = useState(false);

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        setIsLoading(true);
        const data = await reservationService.getReservation(reservationId);
        setReservation(data as any);
        
        // Load qualification card
        try {
          setLoadingCard(true);
          const card = await qualificationCardService.getQualificationCard(reservationId);
          setQualificationCard(card);
        } catch (error) {
          console.error('Error loading qualification card:', error);
          setQualificationCard(null);
        } finally {
          setLoadingCard(false);
        }
        
        // Update page title with reservation number
        if (data) {
          const year = new Date((data as any).created_at).getFullYear();
          const paddedId = String((data as any).id).padStart(3, '0');
          const reservationNumber = `REZ-${year}-${paddedId}`;
          document.title = `Rezerwacja ${reservationNumber} - Panel Admin`;
        }
        
        // Fetch payments for this reservation
        if (data) {
          await fetchPaymentsForReservation(data);
        }
      } catch (err: any) {
        setError(err.message || 'Błąd podczas ładowania rezerwacji');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchPaymentsForReservation = async (reservationData: any) => {
      if (!reservationData) return;
      
      try {
        // Fetch all payments and calculate total paid amount for this reservation
        const payments = await authenticatedApiCall<Array<{
          id: number;
          order_id: string;
          status: string;
          amount: number;
          paid_amount: number | null;
        }>>('/api/payments/');
        
        // Filter payments for this reservation (order_id format: "RES-{reservation_id}" or "TARCZA-{reservation_id}-{timestamp}")
        const reservationPayments = payments.filter(p => {
          if (!p.order_id) return false;
          const match = p.order_id.match(/(?:RES-|TARCZA-)(\d+)/);
          if (match) {
            return parseInt(match[1], 10) === reservationData.id;
          }
          return false;
        });
        
        // Calculate total paid amount (only from successful payments)
        const totalPaid = reservationPayments
          .filter(p => p.status === 'success')
          .reduce((sum, p) => sum + (p.paid_amount || p.amount || 0), 0);
        
        setTotalPaidAmount(totalPaid);
      } catch (err) {
        console.error('Error fetching payments:', err);
        // If payments can't be fetched, use deposit_amount as fallback
        setTotalPaidAmount(reservationData.deposit_amount || 0);
      }
    };

    const fetchAddons = async () => {
      try {
        const response = await authenticatedApiCall<{ addons: Array<{ id: number; name: string }>; total: number }>('/api/addons?include_inactive=true');
        const map = new Map<string, string>();
        if (response && response.addons && Array.isArray(response.addons)) {
          response.addons.forEach(addon => {
            map.set(addon.id.toString(), addon.name);
          });
        }
        setAddonsMap(map);
      } catch (err) {
        console.error('Error fetching addons:', err);
      }
    };

    const fetchProtections = async () => {
      try {
        const protections = await authenticatedApiCall<Array<{ id: number; name: string }>>('/api/general-protections/public');
        const map = new Map<number, string>();
        if (protections && Array.isArray(protections)) {
          protections.forEach(protection => {
            map.set(protection.id, protection.name);
          });
        }
        setProtectionsMap(map);
      } catch (err) {
        console.error('Error fetching protections:', err);
      }
    };

    if (reservationId) {
      fetchReservation();
      fetchAddons();
      fetchProtections();
    }
  }, [reservationId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Brak daty';
    try {
      return new Date(dateString).toLocaleDateString('pl-PL');
    } catch {
      return dateString;
    }
  };

  const formatReservationNumber = (reservationId: number, createdAt: string) => {
    const year = new Date(createdAt).getFullYear();
    const paddedId = String(reservationId).padStart(3, '0');
    return `REZ-${year}-${paddedId}`;
  };

  const handleApproveContract = async () => {
    try {
      setIsUpdatingContract(true);
      await contractService.updateContractStatus(
        reservationId,
        'approved',
        undefined
      );
      
      // Refresh reservation data
      const updatedData = await reservationService.getReservation(reservationId);
      setReservation(updatedData as any);
      
      alert('Status umowy został zmieniony na: Zatwierdzona');
    } catch (error: any) {
      console.error('Error updating contract status:', error);
      alert(`Błąd podczas aktualizacji statusu umowy: ${error.message || 'Nieznany błąd'}`);
    } finally {
      setIsUpdatingContract(false);
    }
  };

  const handleRejectContract = async () => {
    if (!rejectionReason.trim()) {
      alert('Proszę podać powód odrzucenia umowy');
      return;
    }

    try {
      setIsUpdatingContract(true);
      await contractService.updateContractStatus(
        reservationId,
        'rejected',
        rejectionReason
      );
      
      // Refresh reservation data
      const updatedData = await reservationService.getReservation(reservationId);
      setReservation(updatedData as any);
      
      setContractModalOpen(false);
      setRejectionReason('');
      alert('Status umowy został zmieniony na: Odrzucona');
    } catch (error: any) {
      console.error('Error updating contract status:', error);
      alert(`Błąd podczas aktualizacji statusu umowy: ${error.message || 'Nieznany błąd'}`);
    } finally {
      setIsUpdatingContract(false);
    }
  };

  const handleDownloadContract = async () => {
    try {
      await contractService.downloadContract(reservationId);
    } catch (error: any) {
      console.error('Error downloading contract:', error);
      alert(`Błąd podczas pobierania umowy: ${error.message || 'Nieznany błąd'}`);
    }
  };

  const handleDownloadQualificationCard = async () => {
    try {
      setDownloadingCard(true);
      await qualificationCardService.downloadQualificationCard(reservationId);
      // Reload card status after download
      const card = await qualificationCardService.getQualificationCard(reservationId);
      setQualificationCard(card);
    } catch (error: any) {
      console.error('Error downloading qualification card:', error);
      alert(`Błąd podczas pobierania karty kwalifikacyjnej: ${error.message || 'Nieznany błąd'}`);
    } finally {
      setDownloadingCard(false);
    }
  };

  const handleApproveQualificationCard = async () => {
    try {
      setIsUpdatingQualificationCard(true);
      await qualificationCardService.updateQualificationCardStatus(
        reservationId,
        'approved',
        undefined
      );
      
      // Refresh reservation data
      const updatedData = await reservationService.getReservation(reservationId);
      setReservation(updatedData as any);
      
      alert('Status karty kwalifikacyjnej został zmieniony na: Zatwierdzona');
    } catch (error: any) {
      console.error('Error updating qualification card status:', error);
      alert(`Błąd podczas aktualizacji statusu karty kwalifikacyjnej: ${error.message || 'Nieznany błąd'}`);
    } finally {
      setIsUpdatingQualificationCard(false);
    }
  };

  const handleRejectQualificationCard = async () => {
    if (!qualificationCardRejectionReason.trim()) {
      alert('Proszę podać powód odrzucenia karty kwalifikacyjnej');
      return;
    }

    try {
      setIsUpdatingQualificationCard(true);
      await qualificationCardService.updateQualificationCardStatus(
        reservationId,
        'rejected',
        qualificationCardRejectionReason
      );
      
      // Refresh reservation data
      const updatedData = await reservationService.getReservation(reservationId);
      setReservation(updatedData as any);
      
      setQualificationCardModalOpen(false);
      setQualificationCardRejectionReason('');
      alert('Status karty kwalifikacyjnej został zmieniony na: Odrzucona');
    } catch (error: any) {
      console.error('Error updating qualification card status:', error);
      alert(`Błąd podczas aktualizacji statusu karty kwalifikacyjnej: ${error.message || 'Nieznany błąd'}`);
    } finally {
      setIsUpdatingQualificationCard(false);
    }
  };

  if (isLoading) {
    return (
      <SectionGuard section="reservations">
        <AdminLayout>
          <div className="text-center">Ładowanie...</div>
        </AdminLayout>
      </SectionGuard>
    );
  }

  if (error || !reservation) {
    return (
      <SectionGuard section="reservations">
        <AdminLayout>
          <div className="text-center text-red-600">{error || 'Rezerwacja nie znaleziona'}</div>
        </AdminLayout>
      </SectionGuard>
    );
  }

  return (
    <SectionGuard section="reservations">
      <AdminLayout>
        <div className="w-full p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do listy rezerwacji
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Rezerwacja #{formatReservationNumber(reservation.id, reservation.created_at)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Utworzona: {formatDate(reservation.created_at)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Camp & Turnus Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Obóz i Turnus</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-600">Obóz:</span>
                    <span className="text-sm font-medium text-gray-900 ml-2">{reservation.camp_name || 'Brak'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-600">Turnus:</span>
                    <span className="text-sm font-medium text-gray-900 ml-2">{reservation.property_name || 'Brak'}</span>
                  </div>
                </div>
                {reservation.property_city && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-600">Miejscowość:</span>
                      <span className="text-sm font-medium text-gray-900 ml-2">{reservation.property_city}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Participant Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Uczestnik</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-600">Imię i nazwisko:</span>
                    <span className="text-sm font-medium text-gray-900 ml-2">
                      {reservation.participant_first_name} {reservation.participant_last_name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-600">Wiek:</span>
                    <span className="text-sm font-medium text-gray-900 ml-2">{reservation.participant_age} lat</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-600">Miejscowość:</span>
                    <span className="text-sm font-medium text-gray-900 ml-2">{reservation.participant_city}</span>
                  </div>
                </div>
                {reservation.participant_gender && (
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-600">Płeć:</span>
                      <span className="text-sm font-medium text-gray-900 ml-2">{reservation.participant_gender}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Health Information */}
            {(reservation.health_questions || reservation.health_details || reservation.additional_notes) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Informacje o zdrowiu uczestnika</h2>
                <div className="space-y-4">
                  {reservation.health_questions && Object.keys(reservation.health_questions).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Pytania o zdrowie:</h3>
                      <div className="space-y-2 text-sm">
                        {Object.entries(reservation.health_questions).map(([key, value]) => (
                          <div key={key} className="flex items-start gap-2">
                            <span className="text-gray-600 font-medium">{key}:</span>
                            <span className="text-gray-900">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {reservation.health_details && Object.keys(reservation.health_details).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Szczegóły zdrowia:</h3>
                      <div className="space-y-2 text-sm">
                        {Object.entries(reservation.health_details).map(([key, value]) => (
                          <div key={key} className="flex items-start gap-2">
                            <span className="text-gray-600 font-medium">{key}:</span>
                            <span className="text-gray-900">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {reservation.additional_notes && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Dodatkowe uwagi:</h3>
                      <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                        {reservation.additional_notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Parents/Guardians */}
            {reservation.parents_data && reservation.parents_data.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {reservation.parents_data.length > 1 ? 'Opiekunowie' : 'Opiekun'}
                </h2>
                <div className="space-y-4">
                  {reservation.parents_data.map((parent, index) => (
                    <div key={parent.id || index} className="border border-gray-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {reservation.parents_data && reservation.parents_data.length > 1 ? `Opiekun ${index + 1}` : 'Opiekun'}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Imię i nazwisko:</span>
                          <span className="text-gray-900">{parent.firstName} {parent.lastName}</span>
                        </div>
                        {parent.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Email:</span>
                            <span className="text-gray-900">{parent.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Telefon:</span>
                          <span className="text-gray-900">{parent.phone || '+48'} {parent.phoneNumber}</span>
                        </div>
                        {parent.street && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Adres:</span>
                            <span className="text-gray-900">
                              {parent.street}
                              {parent.postalCode && parent.city && `, ${parent.postalCode} ${parent.city}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transport */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Transport</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Transport do ośrodka:</span>
                  <span className="text-sm font-medium text-gray-900 ml-2">
                    {reservation.departure_type === 'zbiorowy' 
                      ? `Transport zbiórkowy - ${reservation.departure_city || 'Brak miasta'}`
                      : 'Transport własny'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Transport z ośrodka:</span>
                  <span className="text-sm font-medium text-gray-900 ml-2">
                    {reservation.return_type === 'zbiorowy' 
                      ? `Transport zbiórkowy - ${reservation.return_city || 'Brak miasta'}`
                      : 'Transport własny'}
                  </span>
                </div>
                {reservation.departure_type === 'zbiorowy' && reservation.return_type === 'zbiorowy' && (
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                    {reservation.transport_different_cities ? (
                      <div className="text-green-800">
                        ✓ Użytkownik potwierdził wybór różnych miast dla wyjazdu i powrotu
                      </div>
                    ) : (
                      <div className="text-gray-600">
                        Użytkownik nie potwierdził wyboru różnych miast dla wyjazdu i powrotu
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Addons */}
            {reservation.selected_addons && reservation.selected_addons.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Dodatki</h2>
                <div className="space-y-2">
                  {reservation.selected_addons.map((addonId, index) => {
                    const addonName = addonsMap.get(addonId) || addonId;
                    return (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-gray-900">{addonName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Protections */}
            {reservation.selected_protection && Array.isArray(reservation.selected_protection) && reservation.selected_protection.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-400" />
                  Ochrony
                </h2>
                <div className="space-y-2">
                  {reservation.selected_protection.map((protectionId, index) => {
                    // Parse protection ID - can be "protection-1", "protection-2" or just number
                    let numericId: number;
                    if (typeof protectionId === 'string') {
                      // Extract number from "protection-1" format
                      const match = String(protectionId).match(/protection-(\d+)/);
                      if (match) {
                        numericId = parseInt(match[1], 10);
                      } else {
                        // Try to parse as number directly
                        numericId = parseInt(protectionId, 10);
                      }
                    } else {
                      numericId = Number(protectionId);
                    }
                    
                    const protectionName = protectionsMap.get(numericId) || `Ochrona ID: ${protectionId}`;
                    return (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-gray-900">{protectionName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Promotion */}
            {reservation.selected_promotion && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-gray-400" />
                  Promocja
                </h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Promocja ID:</span>
                    <span className="text-sm font-medium text-gray-900 ml-2">{reservation.selected_promotion}</span>
                  </div>
                  {reservation.promotion_justification && Object.keys(reservation.promotion_justification).length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <div className="text-sm font-medium text-gray-700 mb-2">Uzasadnienie:</div>
                      <div className="space-y-1 text-sm text-gray-600">
                        {Object.entries(reservation.promotion_justification).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invoice Data */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                {reservation.invoice_type === 'private' ? 'Dane do rachunku' : 'Dane do faktury'}
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Typ:</span>
                  <span className="text-sm font-medium text-gray-900 ml-2">
                    {reservation.invoice_type === 'private' ? 'Osoba prywatna' : 'Firma'}
                  </span>
                </div>
                {reservation.invoice_type === 'private' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Imię i nazwisko:</span>
                      <span className="text-sm font-medium text-gray-900 ml-2">
                        {reservation.invoice_first_name} {reservation.invoice_last_name}
                      </span>
                    </div>
                    {reservation.invoice_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Email:</span>
                        <span className="text-sm font-medium text-gray-900 ml-2">{reservation.invoice_email}</span>
                      </div>
                    )}
                    {/* Phone hidden for private person as requested */}
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-sm text-gray-600">Nazwa firmy:</span>
                      <span className="text-sm font-medium text-gray-900 ml-2">{reservation.invoice_company_name || 'Brak'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">NIP:</span>
                      <span className="text-sm font-medium text-gray-900 ml-2">{reservation.invoice_nip || 'Brak'}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Adres:</span>
                  <span className="text-sm font-medium text-gray-900 ml-2">
                    {reservation.invoice_street}, {reservation.invoice_postal_code} {reservation.invoice_city}
                  </span>
                </div>
                {reservation.delivery_type === 'paper' && (
                  <div className="mt-3 p-3 bg-blue-50 rounded">
                    <div className="text-sm font-medium text-gray-700 mb-2">Dostawa faktury papierowej</div>
                    {reservation.delivery_different_address ? (
                      <div className="text-sm text-gray-600">
                        <div>Adres dostawy: {reservation.delivery_street}, {reservation.delivery_postal_code} {reservation.delivery_city}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">Ten sam adres co na fakturze</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Consents */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Zgody i regulaminy</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {reservation.consent1 ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                  <span className="text-sm text-gray-900">Regulamin portalu i Polityka prywatności</span>
                </div>
                <div className="flex items-center gap-2">
                  {reservation.consent2 ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                  <span className="text-sm text-gray-900">Warunki uczestnictwa</span>
                </div>
                <div className="flex items-center gap-2">
                  {reservation.consent3 ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                  <span className="text-sm text-gray-900">Zgoda na zdjęcia</span>
                </div>
                <div className="flex items-center gap-2">
                  {reservation.consent4 ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                  <span className="text-sm text-gray-900">Składka na fundusze gwarancyjne</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-400" />
                Płatność
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Koszt całkowity:</span>
                  <span className="text-sm font-medium text-gray-900">{reservation.total_price.toFixed(2)} PLN</span>
                </div>
                {totalPaidAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Zapłacono:</span>
                    <span className="text-sm font-medium text-gray-900">{totalPaidAmount.toFixed(2)} PLN</span>
                  </div>
                )}
                {totalPaidAmount < reservation.total_price && (
                  <div className="flex justify-between pt-3 border-t">
                    <span className="text-sm font-medium text-gray-900">Pozostała kwota:</span>
                    <span className="text-sm font-medium text-red-600">
                      {(reservation.total_price - totalPaidAmount).toFixed(2)} PLN
                    </span>
                  </div>
                )}
                {totalPaidAmount >= reservation.total_price && (
                  <div className="flex justify-between pt-3 border-t">
                    <span className="text-sm font-medium text-green-600">Status płatności:</span>
                    <span className="text-sm font-medium text-green-600">Opłacone w pełni</span>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t">
                  <span className="text-sm text-gray-600">Status rezerwacji:</span>
                  <span className={`text-sm font-medium ml-2 ${
                    reservation.status === 'completed' ? 'text-green-600' :
                    reservation.status === 'cancelled' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {reservation.status === 'completed' ? 'Zakończona' :
                     reservation.status === 'cancelled' ? 'Anulowana' :
                     'Aktywna'}
                  </span>
                </div>
              </div>
            </div>

            {/* Source */}
            {reservation.source_name && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Źródło</h2>
                <div className="text-sm text-gray-900">{reservation.source_name}</div>
                {reservation.source_inne_text && (
                  <div className="mt-2 text-sm text-gray-600">{reservation.source_inne_text}</div>
                )}
              </div>
            )}

            {/* Diet */}
            {reservation.diet_name && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Dieta</h2>
                <div className="text-sm text-gray-900">{reservation.diet_name}</div>
              </div>
            )}

            {/* Contract Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Umowa
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status umowy:</span>
                  <span className={`text-sm font-medium ${
                    reservation.contract_status === 'approved' ? 'text-green-600' :
                    reservation.contract_status === 'rejected' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {reservation.contract_status === 'approved' ? 'Zatwierdzona' :
                     reservation.contract_status === 'rejected' ? 'Niezatwierdzona' :
                     'Oczekuje'}
                  </span>
                </div>
                {reservation.contract_rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-xs text-red-800 font-medium mb-1">Powód odrzucenia:</p>
                    <p className="text-sm text-red-700">{reservation.contract_rejection_reason}</p>
                  </div>
                )}
                <div className="flex flex-col gap-2 pt-3 border-t">
                  <button
                    onClick={handleDownloadContract}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#03adf0] text-white rounded hover:bg-[#0288c7] transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Pobierz umowę
                  </button>
                  {reservation.contract_status?.toLowerCase() === 'approved' ? (
                    <button
                      disabled
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded opacity-50 cursor-not-allowed text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Umowa zatwierdzona
                    </button>
                  ) : (
                    <button
                      onClick={handleApproveContract}
                      disabled={isUpdatingContract}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isUpdatingContract ? 'Zapisywanie...' : 'Umowa zatwierdzona'}
                    </button>
                  )}
                  {reservation.contract_status?.toLowerCase() === 'rejected' ? (
                    <button
                      onClick={() => {
                        setRejectionReason(reservation.contract_rejection_reason || '');
                        setContractModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm font-medium"
                    >
                      <X className="w-4 h-4" />
                      Zmień
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setRejectionReason('');
                        setContractModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      <X className="w-4 h-4" />
                      Umowa niezatwierdzona
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Qualification Card Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Karta kwalifikacyjna
              </h2>
              <div className="space-y-3">
                {loadingCard ? (
                  <div className="text-sm text-gray-500">Sprawdzanie...</div>
                ) : qualificationCard ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status karty:</span>
                      <span className={`text-sm font-medium ${
                        reservation.qualification_card_status === 'approved' ? 'text-green-600' :
                        reservation.qualification_card_status === 'rejected' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {reservation.qualification_card_status === 'approved' ? 'Zatwierdzona' :
                         reservation.qualification_card_status === 'rejected' ? 'Niezatwierdzona' :
                         'Oczekuje'}
                      </span>
          </div>
                    {reservation.qualification_card_rejection_reason && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-xs text-red-800 font-medium mb-1">Powód odrzucenia:</p>
                        <p className="text-sm text-red-700">{reservation.qualification_card_rejection_reason}</p>
                      </div>
                    )}
                    {qualificationCard.card_filename && (
                      <div className="bg-gray-50 border border-gray-200 rounded p-3">
                        <p className="text-xs text-gray-600 mb-1">Nazwa pliku:</p>
                        <p className="text-sm text-gray-900">{qualificationCard.card_filename}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Utworzono: {new Date(qualificationCard.created_at).toLocaleDateString('pl-PL')}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-col gap-2 pt-3 border-t">
                      <button
                        onClick={handleDownloadQualificationCard}
                        disabled={downloadingCard}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#03adf0] text-white rounded hover:bg-[#0288c7] transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" />
                        {downloadingCard ? 'Pobieranie...' : 'Pobierz kartę kwalifikacyjną'}
                      </button>
                      {reservation.qualification_card_status?.toLowerCase() === 'approved' ? (
                        <button
                          disabled
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded opacity-50 cursor-not-allowed text-sm font-medium"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Karta zatwierdzona
                        </button>
                      ) : (
                        <button
                          onClick={handleApproveQualificationCard}
                          disabled={isUpdatingQualificationCard}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {isUpdatingQualificationCard ? 'Zapisywanie...' : 'Karta zatwierdzona'}
                        </button>
                      )}
                      {reservation.qualification_card_status?.toLowerCase() === 'rejected' ? (
                        <button
                          onClick={() => {
                            setQualificationCardRejectionReason(reservation.qualification_card_rejection_reason || '');
                            setQualificationCardModalOpen(true);
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm font-medium"
                        >
                          <X className="w-4 h-4" />
                          Zmień
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setQualificationCardRejectionReason('');
                            setQualificationCardModalOpen(true);
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          <X className="w-4 h-4" />
                          Karta niezatwierdzona
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status karty:</span>
                      <span className="text-sm font-medium text-yellow-600">
                        Nie wygenerowana
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 p-3 bg-gray-50 border border-gray-200 rounded">
                      Karta kwalifikacyjna nie została jeszcze wygenerowana
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Contract Rejection Modal */}
        {contractModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Odrzuć umowę
              </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Powód odrzucenia umowy <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Wprowadź powód odrzucenia umowy..."
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm"
                    rows={4}
                  />
                </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setContractModalOpen(false);
                    setRejectionReason('');
                  }}
                  disabled={isUpdatingContract}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleRejectContract}
                  disabled={isUpdatingContract || !rejectionReason.trim()}
                  className={`px-4 py-2 text-white rounded transition-colors text-sm font-medium disabled:opacity-50 ${
                    reservation?.contract_status?.toLowerCase() === 'rejected'
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isUpdatingContract ? 'Zapisywanie...' : reservation?.contract_status?.toLowerCase() === 'rejected' ? 'Zmień' : 'Odrzuć'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Qualification Card Rejection Modal */}
        {qualificationCardModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Odrzuć kartę kwalifikacyjną
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Powód odrzucenia karty kwalifikacyjnej <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={qualificationCardRejectionReason}
                  onChange={(e) => setQualificationCardRejectionReason(e.target.value)}
                  placeholder="Wprowadź powód odrzucenia karty kwalifikacyjnej..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#03adf0] text-sm"
                  rows={4}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setQualificationCardModalOpen(false);
                    setQualificationCardRejectionReason('');
                  }}
                  disabled={isUpdatingQualificationCard}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleRejectQualificationCard}
                  disabled={isUpdatingQualificationCard || !qualificationCardRejectionReason.trim()}
                  className={`px-4 py-2 text-white rounded transition-colors text-sm font-medium disabled:opacity-50 ${
                    reservation?.qualification_card_status?.toLowerCase() === 'rejected'
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isUpdatingQualificationCard ? 'Zapisywanie...' : reservation?.qualification_card_status?.toLowerCase() === 'rejected' ? 'Zmień' : 'Odrzuć'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </SectionGuard>
  );
}


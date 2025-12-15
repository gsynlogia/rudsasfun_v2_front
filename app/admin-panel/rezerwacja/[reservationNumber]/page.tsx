'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import { reservationService, ReservationResponse } from '@/lib/services/ReservationService';
import { contractService } from '@/lib/services/ContractService';
import { qualificationCardService } from '@/lib/services/QualificationCardService';
import { certificateService } from '@/lib/services/CertificateService';
import { paymentService } from '@/lib/services/PaymentService';
import { 
  User, Mail, Phone, MapPin, Calendar, FileText, Download, Eye, 
  CheckCircle, XCircle, AlertCircle, ArrowLeft, CreditCard, 
  UtensilsCrossed, Tag, Shield, Truck, Building2, Package
} from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/utils/api-config';

interface ContractFile {
  id: number;
  reservation_id: number;
  file_name: string;
  file_path: string;
  source: string;
  uploaded_at: string;
  created_at: string;
}

interface QualificationCardFile {
  id: number;
  reservation_id: number;
  file_name: string;
  file_path: string;
  source: string;
  uploaded_at: string;
  created_at: string;
}

interface CertificateFile {
  id: number;
  reservation_id: number;
  file_name: string;
  file_path: string;
  uploaded_at: string;
  file_url?: string | null;
}

interface Payment {
  id: number;
  transaction_id: string;
  order_id: string;
  amount: number;
  paid_amount: number | null;
  status: string;
  payer_email: string;
  created_at: string;
  paid_at: string | null;
  payment_date: string | null;
}

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reservationNumber = params.reservationNumber as string;
  
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [contractFiles, setContractFiles] = useState<ContractFile[]>([]);
  const [qualificationCardFiles, setQualificationCardFiles] = useState<QualificationCardFile[]>([]);
  const [certificateFiles, setCertificateFiles] = useState<CertificateFile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dietNames, setDietNames] = useState<Map<number, string>>(new Map());
  const [promotionName, setPromotionName] = useState<string | null>(null);
  const [protectionNames, setProtectionNames] = useState<Map<string, string>>(new Map());
  const [addonNames, setAddonNames] = useState<Map<string, string>>(new Map());
  
  const [updatingContractStatus, setUpdatingContractStatus] = useState(false);
  const [updatingCardStatus, setUpdatingCardStatus] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load reservation
        const res = await reservationService.getReservationByNumber(reservationNumber);
        setReservation(res);
        
        // Load files
        const [contracts, cards, certificates] = await Promise.all([
          contractService.getContractFiles(res.id).catch(() => []),
          qualificationCardService.getQualificationCardFiles(res.id).catch(() => []),
          certificateService.getCertificates(res.id).catch(() => ({ certificates: [] }))
        ]);
        
        setContractFiles(contracts);
        setQualificationCardFiles(cards);
        setCertificateFiles(certificates.certificates || []);
        
        // Load payments
        const allPayments = await paymentService.listPayments(0, 1000);
        const reservationPayments = allPayments.filter(p => {
          const orderId = p.order_id || '';
          if (orderId === String(res.id)) return true;
          if (orderId === `RES-${res.id}`) return true;
          const match = orderId.match(/^RES-(\d+)(?:-|$)/);
          if (match && parseInt(match[1], 10) === res.id) return true;
          return false;
        });
        setPayments(reservationPayments);
        
        // Load diet names for selected_diets
        if ((res as any).selected_diets && (res as any).selected_diets.length > 0) {
          try {
            const { authService } = await import('@/lib/services/AuthService');
            const token = authService.getToken();
            if (token) {
              // Fetch all diets and map IDs to names
              const dietsResponse = await fetch(`${API_BASE_URL}/api/diets/?limit=1000`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              if (dietsResponse.ok) {
                const dietsData = await dietsResponse.json();
                const namesMap = new Map<number, string>();
                if (dietsData.diets) {
                  dietsData.diets.forEach((diet: { id: number; name: string }) => {
                    namesMap.set(diet.id, diet.name);
                  });
                }
                setDietNames(namesMap);
              }
            }
          } catch (dietErr) {
            console.error('Error loading diet names:', dietErr);
          }
        }
        
        // Load promotion name if selected_promotion is an ID
        if ((res as any).selected_promotion) {
          try {
            const { authService } = await import('@/lib/services/AuthService');
            const token = authService.getToken();
            if (token) {
              // Check if selected_promotion is a number (ID)
              const promotionId = parseInt((res as any).selected_promotion, 10);
              if (!isNaN(promotionId)) {
                // Try to fetch promotion by ID (try general promotions first, then center promotions)
                try {
                  const generalPromoResponse = await fetch(`${API_BASE_URL}/api/general-promotions/${promotionId}`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                  });
                  if (generalPromoResponse.ok) {
                    const promoData = await generalPromoResponse.json();
                    setPromotionName(promoData.name || promoData.display_name || (res as any).selected_promotion);
                  } else {
                    // Try center promotions
                    const centerPromoResponse = await fetch(`${API_BASE_URL}/api/center-promotions/${promotionId}`, {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    });
                    if (centerPromoResponse.ok) {
                      const promoData = await centerPromoResponse.json();
                      setPromotionName(promoData.name || promoData.display_name || (res as any).selected_promotion);
                    } else {
                      // If not found, use the value as-is (might be a name already)
                      setPromotionName((res as any).selected_promotion);
                    }
                  }
                } catch (promoErr) {
                  console.error('Error loading promotion name:', promoErr);
                  setPromotionName((res as any).selected_promotion);
                }
              } else {
                // Not a number, assume it's already a name
                setPromotionName((res as any).selected_promotion);
              }
            }
          } catch (promoErr) {
            console.error('Error loading promotion:', promoErr);
            setPromotionName((res as any).selected_promotion || null);
          }
        } else {
          setPromotionName(null);
        }
        
        // Load protection names for selected_protection
        if (res.selected_protection && res.selected_protection.length > 0) {
          try {
            const { authService } = await import('@/lib/services/AuthService');
            const token = authService.getToken();
            if (token) {
              // Fetch all general protections and map IDs to names
              // Backend has max limit of 100, so fetch with limit=100
              const protectionsResponse = await fetch(`${API_BASE_URL}/api/general-protections/?page=1&limit=100`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              if (protectionsResponse.ok) {
                const protectionsData = await protectionsResponse.json();
                const namesMap = new Map<string, string>();
                
                // Handle response format: { protections: [...], total: number, page: number, limit: number }
                const protectionsList = protectionsData.protections || [];
                
                if (Array.isArray(protectionsList)) {
                  protectionsList.forEach((protection: { id: number; name: string }) => {
                    if (protection.id !== undefined && protection.name) {
                      // Map both formats: "protection-{id}" and just "{id}"
                      const idStr = String(protection.id);
                      namesMap.set(`protection-${idStr}`, protection.name);
                      namesMap.set(idStr, protection.name);
                    }
                  });
                }
                
                setProtectionNames(namesMap);
              } else {
                const errorText = await protectionsResponse.text().catch(() => '');
                console.error('Failed to fetch protections:', protectionsResponse.status, protectionsResponse.statusText, errorText);
              }
            }
          } catch (protectionErr) {
            console.error('Error loading protection names:', protectionErr);
          }
        }
        
        // Load addon names for selected_addons
        if (res.selected_addons && Array.isArray(res.selected_addons) && res.selected_addons.length > 0) {
          try {
            const { authService } = await import('@/lib/services/AuthService');
            const token = authService.getToken();
            if (token) {
              // Fetch all addons and map IDs to names
              const addonsResponse = await fetch(`${API_BASE_URL}/api/addons/?include_inactive=true`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              if (addonsResponse.ok) {
                const addonsData = await addonsResponse.json();
                const namesMap = new Map<string, string>();
                
                // Handle response format: { addons: [...], total: number }
                const addonsList = addonsData.addons || [];
                
                if (Array.isArray(addonsList)) {
                  addonsList.forEach((addon: { id: number; name: string }) => {
                    if (addon.id !== undefined && addon.name) {
                      // Map ID as string
                      const idStr = String(addon.id);
                      namesMap.set(idStr, addon.name);
                    }
                  });
                }
                
                setAddonNames(namesMap);
              } else {
                const errorText = await addonsResponse.text().catch(() => '');
                console.error('Failed to fetch addons:', addonsResponse.status, addonsResponse.statusText, errorText);
              }
            }
          } catch (addonErr) {
            console.error('Error loading addon names:', addonErr);
          }
        }
        
      } catch (err: any) {
        setError(err.message || 'Nie udało się załadować danych rezerwacji');
      } finally {
        setLoading(false);
      }
    };
    
    if (reservationNumber) {
      loadData();
    }
  }, [reservationNumber]);

  const handleUpdateContractStatus = async (status: 'pending' | 'approved' | 'rejected', rejectionReason?: string) => {
    if (!reservation) return;
    
    try {
      setUpdatingContractStatus(true);
      await contractService.updateContractStatus(reservation.id, status, rejectionReason);
      
      // Reload reservation to get updated status
      const updated = await reservationService.getReservationByNumber(reservationNumber);
      setReservation(updated);
    } catch (err: any) {
      alert(err.message || 'Nie udało się zaktualizować statusu umowy');
    } finally {
      setUpdatingContractStatus(false);
    }
  };

  const handleUpdateCardStatus = async (status: 'pending' | 'approved' | 'rejected', rejectionReason?: string) => {
    if (!reservation) return;
    
    try {
      setUpdatingCardStatus(true);
      await qualificationCardService.updateQualificationCardStatus(reservation.id, status, rejectionReason);
      
      // Reload reservation to get updated status
      const updated = await reservationService.getReservationByNumber(reservationNumber);
      setReservation(updated);
    } catch (err: any) {
      alert(err.message || 'Nie udało się zaktualizować statusu karty');
    } finally {
      setUpdatingCardStatus(false);
    }
  };

  const handleViewFile = async (fileUrl: string | null | undefined, fileName: string) => {
    try {
      if (!fileUrl) {
        alert('Brak URL do pliku');
        return;
      }
      
      // Fetch the file with authentication
      const { authService } = await import('@/lib/services/AuthService');
      const token = authService.getToken();
      
      if (!token) {
        alert('Brak autoryzacji');
        return;
      }

      const response = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Nie udało się pobrać pliku');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Open PDF in new window without address bar
      const newWindow = window.open('', '_blank', 'toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=800,height=600');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>${fileName}</title>
              <style>
                body { margin: 0; padding: 0; }
                iframe { width: 100%; height: 100vh; border: none; }
              </style>
            </head>
            <body>
              <iframe src="${url}"></iframe>
            </body>
          </html>
        `);
      }
    } catch (err: any) {
      alert(err.message || 'Nie udało się otworzyć pliku');
    }
  };

  const handleDownloadFile = async (type: 'contract' | 'card' | 'certificate', fileId: number) => {
    try {
      let blob: Blob;
      let filename: string;
      
      if (type === 'contract') {
        blob = await contractService.downloadContractFile(fileId);
        filename = `umowa_${reservationNumber}.pdf`;
      } else if (type === 'card') {
        blob = await qualificationCardService.downloadQualificationCardFile(fileId);
        filename = `karta_kwalifikacyjna_${reservationNumber}.pdf`;
      } else {
        blob = await certificateService.downloadCertificate(fileId);
        filename = `certificate_${fileId}.pdf`;
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Nie udało się pobrać pliku');
    }
  };

  if (loading) {
    return (
      <SectionGuard section="reservations">
        <AdminLayout>
          <div className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Ładowanie...</div>
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
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error || 'Rezerwacja nie została znaleziona'}</p>
              <Link href="/admin-panel" className="text-blue-600 hover:underline mt-2 inline-block">
                ← Powrót do listy rezerwacji
              </Link>
            </div>
          </div>
        </AdminLayout>
      </SectionGuard>
    );
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Brak';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Brak';
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'text-gray-500';
    switch (status) {
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string | null | undefined) => {
    if (!status) return <AlertCircle className="w-4 h-4" />;
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <SectionGuard section="reservations">
      <AdminLayout>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <Link href="/admin-panel" className="text-blue-600 hover:underline mb-2 inline-flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Powrót do listy rezerwacji
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Szczegóły rezerwacji</h1>
              <p className="text-gray-600 mt-1">{reservationNumber}</p>
            </div>
          </div>

          {/* Reservation Info Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Participant Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Uczestnik
              </h2>
              <div className="space-y-2">
                <p><span className="font-medium">Imię i nazwisko:</span> {reservation.participant_first_name} {reservation.participant_last_name}</p>
                <p><span className="font-medium">Wiek:</span> {reservation.participant_age}</p>
                <p><span className="font-medium">Płeć:</span> {reservation.participant_gender}</p>
                <p><span className="font-medium">Miasto:</span> {reservation.participant_city}</p>
              </div>
            </div>

            {/* Camp Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Obóz
              </h2>
              <div className="space-y-2">
                <p><span className="font-medium">Nazwa:</span> {reservation.camp_name || 'Brak'}</p>
                <p><span className="font-medium">Turnus:</span> {reservation.property_name || 'Brak'}</p>
                <p><span className="font-medium">Okres:</span> {reservation.property_period || 'Brak'}</p>
                {reservation.property_start_date && reservation.property_end_date && (
                  <p><span className="font-medium">Termin:</span> {formatDate(reservation.property_start_date)} - {formatDate(reservation.property_end_date)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Parents/Guardians */}
          {reservation.parents_data && reservation.parents_data.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Opiekunowie
              </h2>
              <div className="space-y-4">
                {reservation.parents_data.map((parent, index) => {
                  // Format phone number: combine phone (country code) and phoneNumber
                  const phoneDisplay = (parent.phone || '+48') + ' ' + (parent.phoneNumber || '');
                  const hasPhone = parent.phoneNumber && parent.phoneNumber.trim();
                  
                  return (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <p className="font-medium">{parent.firstName} {parent.lastName}</p>
                      {parent.email && (
                        <p className="text-sm text-gray-600"><Mail className="w-3 h-3 inline mr-1" />{parent.email}</p>
                      )}
                      {hasPhone && (
                        <p className="text-sm text-gray-600"><Phone className="w-3 h-3 inline mr-1" />{phoneDisplay.trim()}</p>
                      )}
                      {(parent.street || parent.postalCode || parent.city) && (
                        <p className="text-sm text-gray-600"><MapPin className="w-3 h-3 inline mr-1" />{[parent.street, parent.postalCode, parent.city].filter(Boolean).join(', ')}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional Services */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Diets */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5" />
                Diety
              </h2>
              <div className="space-y-2">
                {(() => {
                  const allDiets: string[] = [];
                  
                  // Add main diet if exists
                  if (reservation.diet_name) {
                    allDiets.push(reservation.diet_name);
                  }
                  
                  // Add additional diets if exist
                  if ((reservation as any).selected_diets && (reservation as any).selected_diets.length > 0) {
                    const additionalDietNames = (reservation as any).selected_diets
                      .map((dietId: number) => dietNames.get(dietId) || null)
                      .filter((name: string | null): name is string => name !== null);
                    
                    if (additionalDietNames.length > 0) {
                      allDiets.push(...additionalDietNames);
                    } else {
                      // If names not loaded yet, show IDs
                      (reservation as any).selected_diets.forEach((dietId: number) => {
                        allDiets.push(`Dieta ID: ${dietId}`);
                      });
                    }
                  }
                  
                  if (allDiets.length > 0) {
                    return <p><span className="font-medium">Wybrane diety:</span> {allDiets.join(', ')}</p>;
                  } else {
                    return <p className="text-gray-500">Brak wybranych diet</p>;
                  }
                })()}
              </div>
            </div>

            {/* Promotions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Promocje
              </h2>
              <div className="space-y-2">
                {promotionName || (reservation as any).selected_promotion ? (
                  <p><span className="font-medium">Wybrana promocja:</span> {promotionName || (reservation as any).selected_promotion}</p>
                ) : (
                  <p className="text-gray-500">Brak promocji</p>
                )}
              </div>
            </div>

            {/* Protections */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Ochrony
              </h2>
              <div className="space-y-2">
                {reservation.selected_protection && reservation.selected_protection.length > 0 ? (() => {
                  const protectionNamesList = reservation.selected_protection
                    .map((protectionId: string) => {
                      // Extract numeric ID from "protection-{id}" format or use as-is
                      let numericId: string | null = null;
                      if (protectionId.startsWith('protection-')) {
                        numericId = protectionId.replace('protection-', '');
                      } else {
                        numericId = protectionId;
                      }
                      
                      // Try to get name from map (check both formats)
                      const name = protectionNames.get(protectionId) || 
                                   protectionNames.get(`protection-${numericId}`) || 
                                   protectionNames.get(numericId) ||
                                   null;
                      
                      return name || protectionId;
                    })
                    .filter(Boolean);
                  
                  if (protectionNamesList.length > 0) {
                    return (
                      <p><span className="font-medium">Wybrane ochrony:</span> {protectionNamesList.join(', ')}</p>
                    );
                  } else {
                    // Fallback: show IDs if names not loaded yet
                    return (
                      <p><span className="font-medium">Wybrane ochrony:</span> {reservation.selected_protection.join(', ')}</p>
                    );
                  }
                })() : (
                  <p className="text-gray-500">Brak wybranych ochron</p>
                )}
              </div>
            </div>

            {/* Addons */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Dodatki
              </h2>
              <div className="space-y-2">
                {reservation.selected_addons && Array.isArray(reservation.selected_addons) && reservation.selected_addons.length > 0 ? (() => {
                  const addonNamesList = reservation.selected_addons
                    .map((addonId: string | number) => {
                      // Convert to string if needed
                      const idStr = String(addonId);
                      // Try to get name from map
                      const name = addonNames.get(idStr) || null;
                      return name || `Dodatek ID: ${idStr}`;
                    })
                    .filter(Boolean);
                  
                  if (addonNamesList.length > 0) {
                    return (
                      <p><span className="font-medium">Wybrane dodatki:</span> {addonNamesList.join(', ')}</p>
                    );
                  } else {
                    // Fallback: show IDs if names not loaded yet
                    return (
                      <p><span className="font-medium">Wybrane dodatki:</span> {reservation.selected_addons.map((id: string | number) => String(id)).join(', ')}</p>
                    );
                  }
                })() : (
                  <p className="text-gray-500">Brak wybranych dodatków</p>
                )}
              </div>
            </div>
          </div>

          {/* Transport */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Transport
            </h2>
            <div className="space-y-2">
              <p><span className="font-medium">Wyjazd:</span> {reservation.departure_type === 'zbiorowy' ? 'Zbiorowy' : 'Własny'}</p>
              {reservation.departure_type === 'zbiorowy' && reservation.departure_city && (
                <p><span className="font-medium">Miasto wyjazdu:</span> {reservation.departure_city}</p>
              )}
              <p><span className="font-medium">Powrót:</span> {reservation.return_type === 'zbiorowy' ? 'Zbiorowy' : 'Własny'}</p>
              {reservation.return_type === 'zbiorowy' && reservation.return_city && (
                <p><span className="font-medium">Miasto powrotu:</span> {reservation.return_city}</p>
              )}
            </div>
          </div>

          {/* Payments */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Płatności
            </h2>
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID transakcji</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kwota</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-2 text-sm">{payment.transaction_id}</td>
                        <td className="px-4 py-2 text-sm">{payment.paid_amount || payment.amount} PLN</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            payment.status === 'success' ? 'bg-green-100 text-green-800' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">{formatDateTime(payment.paid_at || payment.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">Brak płatności</p>
            )}
          </div>

          {/* Files Section */}
          <div className="space-y-6">
            {/* Contracts */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Umowy
              </h2>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Status: <span className={getStatusColor(reservation.contract_status)}>{reservation.contract_status || 'Brak'}</span></p>
                {reservation.contract_rejection_reason && (
                  <p className="text-sm text-red-600">Powód odrzucenia: {reservation.contract_rejection_reason}</p>
                )}
              </div>
              {contractFiles.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {contractFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{file.file_name}</p>
                        <p className="text-xs text-gray-500">Wgrana: {formatDateTime(file.uploaded_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewFile(`${API_BASE_URL}/api/contracts/file/${file.id}/download`, file.file_name)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Podgląd
                        </button>
                        <button
                          onClick={() => handleDownloadFile('contract', file.id)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Pobierz
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 mb-4">Brak umów</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateContractStatus('approved')}
                  disabled={updatingContractStatus}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Zaakceptuj
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Podaj powód odrzucenia:');
                    if (reason) handleUpdateContractStatus('rejected', reason);
                  }}
                  disabled={updatingContractStatus}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Odrzuć
                </button>
                <button
                  onClick={() => handleUpdateContractStatus('pending')}
                  disabled={updatingContractStatus}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  Do poprawy
                </button>
              </div>
            </div>

            {/* Qualification Cards */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Karty kwalifikacyjne
              </h2>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Status: <span className={getStatusColor(reservation.qualification_card_status)}>{reservation.qualification_card_status || 'Brak'}</span></p>
                {reservation.qualification_card_rejection_reason && (
                  <p className="text-sm text-red-600">Powód odrzucenia: {reservation.qualification_card_rejection_reason}</p>
                )}
              </div>
              {qualificationCardFiles.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {qualificationCardFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{file.file_name}</p>
                        <p className="text-xs text-gray-500">Wgrana: {formatDateTime(file.uploaded_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewFile(`${API_BASE_URL}/api/qualification-cards/file/${file.id}/download`, file.file_name)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Podgląd
                        </button>
                        <button
                          onClick={() => handleDownloadFile('card', file.id)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Pobierz
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 mb-4">Brak kart kwalifikacyjnych</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateCardStatus('approved')}
                  disabled={updatingCardStatus}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Zaakceptuj
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Podaj powód odrzucenia:');
                    if (reason) handleUpdateCardStatus('rejected', reason);
                  }}
                  disabled={updatingCardStatus}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Odrzuć
                </button>
                <button
                  onClick={() => handleUpdateCardStatus('pending')}
                  disabled={updatingCardStatus}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  Do poprawy
                </button>
              </div>
            </div>

            {/* Certificates */}
            {certificateFiles.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Zaświadczenia
                </h2>
                <div className="space-y-2">
                  {certificateFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{file.file_name}</p>
                        <p className="text-xs text-gray-500">Wgrana: {formatDateTime(file.uploaded_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => file.file_url && handleViewFile(file.file_url, file.file_name)}
                          disabled={!file.file_url}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Eye className="w-4 h-4" />
                          Podgląd
                        </button>
                        <button
                          onClick={() => handleDownloadFile('certificate', file.id)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Pobierz
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </SectionGuard>
  );
}


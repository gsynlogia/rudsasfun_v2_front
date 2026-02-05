'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { ContractForm } from '@/components/profile/ContractForm';
import { authService } from '@/lib/services/AuthService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ReservationData {
  id: number;
  reservation_number: string;
  participant_first_name: string;
  participant_last_name: string;
  participant_city: string;
  participant_age: string;
  participant_gender: string;
  parents_data: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneNumber: string;
    city: string;
  }>;
  camp_name: string;
  property_name: string;
  property_city: string;
  property_start_date: string;
  property_end_date: string;
  departure_type: string;
  departure_city: string;
  return_type: string;
  return_city: string;
  total_price: number;
  deposit_amount: number;
  base_price: number;
  diet_name?: string;
  diet_price?: number;
  addons_data?: Array<{ name: string; price: number }>;
  protection_names?: Record<string, string>;
  protection_prices?: Record<string, number>;
  promotion_name?: string;
  promotion_price?: number;
  transport_price?: number;
  delivery_type?: string;
}

/**
 * Contract Page
 * Route: /profil/aktualne-rezerwacje/[id]/umowa
 * Renders the contract form for a specific reservation with data from API
 */
export default function ContractPage() {
  const params = useParams();
  const reservationId = params?.id ? String(params.id) : '';
  
  const [reservationData, setReservationData] = useState<ReservationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservation = async () => {
      if (!reservationId) return;
      
      try {
        setLoading(true);
        
        // Pobierz token uwierzytelniający
        const token = authService.getToken();
        if (!token) {
          throw new Error('Brak autoryzacji. Zaloguj się ponownie.');
        }
        
        // reservationId może być w formacie "REZ-2026-442" lub "442"
        const isFullNumber = reservationId.startsWith('REZ-');
        const endpoint = isFullNumber 
          ? `${API_URL}/api/reservations/by-number/${reservationId}`
          : `${API_URL}/api/reservations/${reservationId}`;
        
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Sesja wygasła. Zaloguj się ponownie.');
          }
          throw new Error('Nie udało się pobrać danych rezerwacji');
        }
        
        const data = await response.json();
        setReservationData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Wystąpił błąd');
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [reservationId]);

  // Mapowanie danych z API na format ContractForm
  const mapReservationToContractForm = (data: ReservationData) => {
    const firstParent = data.parents_data?.[0] || {};
    
    // Format daty DD.MM.YYYY
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('pl-PL');
    };
    
    // Format kwoty
    const formatAmount = (amount: number) => {
      return amount?.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
    };
    
    // Mapowanie płci
    const mapGender = (gender: string) => {
      const genderMap: Record<string, string> = {
        'Kobieta': 'Kobieta',
        'Female': 'Kobieta',
        'Mężczyzna': 'Mężczyzna',
        'Male': 'Mężczyzna',
        'Chłopiec': 'Mężczyzna',
        'Dziewczynka': 'Kobieta',
      };
      return genderMap[gender] || 'Mężczyzna';
    };
    
    // Budowanie nazwy turnusu z datami
    const tournamentDates = `${formatDate(data.property_start_date)} - ${formatDate(data.property_end_date)}`;
    const tournamentName = `${data.camp_name}, ${data.property_name}`;
    
    // Transport
    const transportTo = data.departure_type === 'wlasny' ? 'Własny transport' : (data.departure_city || '');
    const transportFrom = data.return_type === 'wlasny' ? 'Własny transport' : (data.return_city || '');
    
    // Budowanie dodatków (atrakcji) - lista tekstowa
    const addonsText = data.addons_data?.map(a => `${a.name} + ${formatAmount(a.price)}`).join('\n') || '';
    
    // Ochrony
    let insurance1 = '';
    let insurance2 = '';
    if (data.protection_names && data.protection_prices) {
      for (const [id, name] of Object.entries(data.protection_names)) {
        const price = data.protection_prices[name.toLowerCase()] || 0;
        if (name.toLowerCase().includes('tarcza')) {
          insurance1 = `${name} + ${formatAmount(price)}`;
        } else if (name.toLowerCase().includes('oaza')) {
          insurance2 = `${name} + ${formatAmount(price)}`;
        }
      }
    }
    
    // Promocja
    const promotions = data.promotion_name 
      ? `${data.promotion_name} ${data.promotion_price ? formatAmount(data.promotion_price) : ''}`
      : '';
    
    // Faktura - mapowanie delivery_type na format wyświetlany
    const mapInvoice = (deliveryType: string | undefined) => {
      if (deliveryType === 'paper') {
        return 'Papierowa + 30,00';
      } else if (deliveryType === 'electronic') {
        return 'Elektroniczna';
      }
      return 'Elektroniczna'; // domyślnie elektroniczna
    };
    
    return {
      reservationNumber: data.reservation_number || `REZ-2026-${data.id}`,
      tournamentName: tournamentName,
      tournamentDates: tournamentDates,
      parentName: `${firstParent.firstName || ''} ${firstParent.lastName || ''}`.trim() || 'Brak danych',
      parentEmail: firstParent.email || '',
      parentPhone: `${firstParent.phone || ''} ${firstParent.phoneNumber || ''}`.trim() || '',
      parentCity: firstParent.city || '',
      childName: `${data.participant_first_name || ''} ${data.participant_last_name || ''}`.trim() || 'Brak danych',
      childCity: data.participant_city || '',
      childYear: data.participant_age || '',
      childGender: mapGender(data.participant_gender || ''),
      locationName: `${tournamentName} (${tournamentDates})`,
      locationAddress: data.property_city || '',
      facilityName: data.property_name || '',
      transportTo: transportTo,
      transportFrom: transportFrom,
      baseCost: formatAmount(data.base_price || 0),
      diet: data.diet_name ? `${data.diet_name} + ${formatAmount(data.diet_price || 0)}` : '',
      attractions: addonsText,
      insurance1: insurance1,
      insurance2: insurance2,
      transport: data.transport_price ? `+ ${formatAmount(data.transport_price)}` : '',
      totalCost: formatAmount(data.total_price || 0),
      deposit: formatAmount(data.deposit_amount || 0),
      departurePlace: transportTo,
      returnPlace: transportFrom,
      promotions: promotions,
      invoice: mapInvoice(data.delivery_type),
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie umowy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl mb-2">Błąd</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractForm 
        reservationData={reservationData ? mapReservationToContractForm(reservationData) : {
          reservationNumber: reservationId.startsWith('REZ-') ? reservationId : `REZ-2026-${reservationId}`
        }}
      />
    </div>
  );
}

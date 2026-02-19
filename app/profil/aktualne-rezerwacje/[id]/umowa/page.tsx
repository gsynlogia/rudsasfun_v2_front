'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { ContractForm } from '@/components/profile/ContractForm';
import {
  type ReservationData,
  mapReservationToContractForm,
} from '@/lib/contractReservationMapping';
import { authService } from '@/lib/services/AuthService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Contract Page
 * Route: /profil/aktualne-rezerwacje/[id]/umowa
 * Renders the contract form for a specific reservation with data from API
 */
export default function ContractPage() {
  const params = useParams();
  const reservationId = params?.id ? String(params.id) : '';

  const [reservationData, setReservationData] = useState<ReservationData | null>(null);
  const [contractSignedPayload, setContractSignedPayload] = useState<Record<string, unknown> | null>(null);
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

  // Gdy brak zapisanego dokumentu w signed_documents (brak payloadu) – dane do umowy z rezerwacji (obecne zachowanie).
  // Gdy jest zapisany dokument z payloadem – dane wczytywane z signed_documents (przekazane do ContractForm jako signedPayload).
  useEffect(() => {
    if (!reservationData?.id) return;
    const token = authService.getToken();
    if (!token) return;
    fetch(`${API_URL}/api/signed-documents/reservation/${reservationData.id}?document_type=contract`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((docs: Array<{ payload?: string | null }>) => {
        const latest = docs[0];
        try {
          setContractSignedPayload(latest?.payload ? JSON.parse(latest.payload) : null);
        } catch {
          setContractSignedPayload(null);
        }
      })
      .catch(() => setContractSignedPayload(null));
  }, [reservationData?.id]);

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
        reservationId={reservationData?.id}
        reservationData={reservationData ? mapReservationToContractForm(reservationData) : {
          reservationNumber: reservationId.startsWith('REZ-') ? reservationId : `REZ-2026-${reservationId}`,
        }}
        signedPayload={contractSignedPayload ?? undefined}
      />
    </div>
  );
}
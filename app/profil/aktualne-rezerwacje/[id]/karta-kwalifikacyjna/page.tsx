'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { QualificationForm } from '@/components/profile/QualificationForm';
import { authService } from '@/lib/services/AuthService';
import type { ReservationData } from '@/lib/contractReservationMapping';
import { mapReservationToQualificationForm } from '@/lib/qualificationReservationMapping';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Qualification Card Page
 * Route: /profil/aktualne-rezerwacje/[id]/karta-kwalifikacyjna
 * Pobiera dane rezerwacji z API i przekazuje do karty kwalifikacyjnej (żółte pola wypełnione z profilu, edytowalne).
 */
export default function QualificationCardPage() {
  const params = useParams();
  const reservationId = params?.id ? String(params.id) : '';

  const [reservationData, setReservationData] = useState<ReservationData | null>(null);
  const [qualificationCardSignedPayload, setQualificationCardSignedPayload] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservation = async () => {
      if (!reservationId) return;

      try {
        setLoading(true);
        const token = authService.getToken();
        if (!token) {
          throw new Error('Brak autoryzacji. Zaloguj się ponownie.');
        }

        const isFullNumber = reservationId.startsWith('REZ-');
        const endpoint = isFullNumber
          ? `${API_URL}/api/reservations/by-number/${reservationId}`
          : `${API_URL}/api/reservations/${reservationId}`;

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
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

  useEffect(() => {
    if (!reservationData?.id) return;
    const token = authService.getToken();
    if (!token) return;
    fetch(`${API_URL}/api/signed-documents/reservation/${reservationData.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((docs: Array<{ document_type: string; payload?: string | null }>) => {
        const cardDoc = docs.find((d) => d.document_type === 'qualification_card');
        try {
          setQualificationCardSignedPayload(cardDoc?.payload ? JSON.parse(cardDoc.payload!) : null);
        } catch {
          setQualificationCardSignedPayload(null);
        }
      })
      .catch(() => setQualificationCardSignedPayload(null));
  }, [reservationData?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mx-auto mb-4" />
          <p className="text-gray-600">Ładowanie karty kwalifikacyjnej...</p>
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

  const qualificationData = reservationData
    ? mapReservationToQualificationForm(reservationData)
    : { reservationId: reservationId.startsWith('REZ-') ? reservationId : `REZ-2026-${reservationId}` };

  return (
    <div className="min-h-screen bg-gray-50">
      <QualificationForm
        reservationId={reservationData?.id}
        reservationData={qualificationData}
        signedPayload={qualificationCardSignedPayload ?? undefined}
      />
    </div>
  );
}

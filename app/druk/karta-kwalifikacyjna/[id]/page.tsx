'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { QualificationForm } from '@/components/profile/QualificationForm';
import type { ReservationData } from '@/lib/contractReservationMapping';
import { mapReservationToQualificationForm } from '@/lib/qualificationReservationMapping';
import { authService } from '@/lib/services/AuthService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Print Qualification Card Page
 * Route: /druk/karta-kwalifikacyjna/[id]
 * Pobiera te same dane z API co strona profilu i przekazuje do QualificationForm – dane jeden do jednego.
 */
export default function PrintQualificationCardPage() {
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
    <>
      {/* Druk karty kwalifikacyjnej — poprawki @media print SCOPED do tej strony (rozkaz Pana 2026-06-29:
          „tylko karta, reszty nie dotykaj"). Naprawia: (1) pustą 1. stronę — globalne tło/Banner (tlo2.png +
          DevBanner) i offset 56px spychały .page (page-break-inside:avoid) na 2. stronę; (2) zawijanie w pion
          przy domyślnych marginesach drukarki — @page margin:0 sprawia, że .page 210mm mieści się na A4.
          Efekt: w drukarce identycznie jak w podglądzie na ekranie. */}
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            background-image: none !important;
          }
          /* Pokaż TYLKO formularz druku — schowaj globalny chrome (DevBanner/TestBanner/puste divy),
             żeby .page zaczynała się od góry 1. strony i nie generowała pustej kartki. */
          body > *:not(.print-layout) { display: none !important; }
          .print-layout {
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          /* .page w druku: białe tło (na ekranie białe było tylko @media screen), bez cienia/marginesu,
             dokładnie jeden arkusz A4 na .page. */
          .page {
            background: #ffffff !important;
            box-shadow: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
      <QualificationForm
        reservationData={qualificationData}
        signedPayload={qualificationCardSignedPayload ?? undefined}
        printMode={true}
      />
    </>
  );
}
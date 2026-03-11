'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { QualificationForm } from '@/components/profile/QualificationForm';
import type { ReservationData } from '@/lib/contractReservationMapping';
import { mapReservationToQualificationForm } from '@/lib/qualificationReservationMapping';
import { authService } from '@/lib/services/AuthService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Qualification Card Page
 * Route: /profil/aktualne-rezerwacje/[id]/karta-kwalifikacyjna
 * Gdy w query jest document_id – wyświetlany jest ten snapshot (np. z Do pobrania). Bez document_id – najnowsza wersja (przycisk „Karta kwalifikacyjna” w aktualne-rezerwacje).
 */
export default function QualificationCardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const reservationId = params?.id ? String(params.id) : '';
  const documentIdParam = searchParams?.get('document_id');
  const documentId = documentIdParam ? parseInt(documentIdParam, 10) : null;
  const isSpecificSnapshot = documentId != null && !Number.isNaN(documentId);

  const [reservationData, setReservationData] = useState<ReservationData | null>(null);
  const [qualificationCardSignedPayload, setQualificationCardSignedPayload] = useState<Record<string, unknown> | null>(null);
  const [latestCardStatus, setLatestCardStatus] = useState<string | null>(null);
  const [latestCardSignedAt, setLatestCardSignedAt] = useState<string | null>(null);
  const [formSnapshotFromDb, setFormSnapshotFromDb] = useState<Record<string, unknown> | null>(null);
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

  /** Gdy jest document_id (np. z Do pobrania) – ładujemy ten snapshot. W przeciwnym razie – najnowszy z listy. */
  useEffect(() => {
    if (!reservationData?.id) return;
    const token = authService.getToken();
    if (!token) return;

    if (isSpecificSnapshot && documentId != null) {
      fetch(`${API_URL}/api/signed-documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((doc: { document_type?: string; payload?: string | null } | null) => {
          if (doc && doc.document_type === 'qualification_card' && doc.payload) {
            try {
              setQualificationCardSignedPayload(JSON.parse(doc.payload) as Record<string, unknown>);
            } catch {
              setQualificationCardSignedPayload(null);
            }
          } else {
            setQualificationCardSignedPayload(null);
          }
          setLatestCardStatus(null);
        })
        .catch(() => {
          setQualificationCardSignedPayload(null);
          setLatestCardStatus(null);
        });
      return;
    }

    fetch(`${API_URL}/api/signed-documents/reservation/${reservationData.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((docs: Array<{ document_type: string; payload?: string | null; status?: string; signed_at?: string | null }>) => {
        const cardDoc = docs.find((d) => d.document_type === 'qualification_card');
        setLatestCardStatus(cardDoc?.status ?? null);
        setLatestCardSignedAt(cardDoc?.signed_at ?? null);
        try {
          setQualificationCardSignedPayload(cardDoc?.payload ? JSON.parse(cardDoc.payload!) : null);
        } catch {
          setQualificationCardSignedPayload(null);
        }
      })
      .catch(() => {
        setQualificationCardSignedPayload(null);
        setLatestCardStatus(null);
        setLatestCardSignedAt(null);
      });
  }, [reservationData?.id, isSpecificSnapshot, documentId]);

  const refetchFormSnapshot = useCallback(() => {
    if (!reservationData?.id) return;
    const token = authService.getToken();
    if (!token) return;
    fetch(`${API_URL}/api/qualification-cards/${reservationData.id}/data`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { form_snapshot?: string | null } | null) => {
        if (data?.form_snapshot && typeof data.form_snapshot === 'string') {
          try {
            setFormSnapshotFromDb(JSON.parse(data.form_snapshot) as Record<string, unknown>);
          } catch {
            setFormSnapshotFromDb(null);
          }
        } else {
          setFormSnapshotFromDb(null);
        }
      })
      .catch(() => setFormSnapshotFromDb(null));
  }, [reservationData?.id]);

  const refetchSignedDocs = useCallback(() => {
    if (!reservationData?.id) return;
    const token = authService.getToken();
    if (!token) return;
    fetch(`${API_URL}/api/signed-documents/reservation/${reservationData.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((docs: Array<{ document_type: string; payload?: string | null; status?: string; signed_at?: string | null }>) => {
        const cardDoc = docs.find((d) => d.document_type === 'qualification_card');
        setLatestCardStatus(cardDoc?.status ?? null);
        setLatestCardSignedAt(cardDoc?.signed_at ?? null);
        try {
          setQualificationCardSignedPayload(cardDoc?.payload ? JSON.parse(cardDoc.payload!) : null);
        } catch {
          setQualificationCardSignedPayload(null);
        }
      })
      .catch(() => {
        setQualificationCardSignedPayload(null);
        setLatestCardStatus(null);
        setLatestCardSignedAt(null);
      });
  }, [reservationData?.id]);

  useEffect(() => {
    refetchFormSnapshot();
  }, [refetchFormSnapshot]);

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

  const cardAlert =
    latestCardStatus === 'requires_signature'
      ? { type: 'red' as const, text: 'Karta wymaga podpisu' }
      : latestCardStatus === 'in_verification'
        ? { type: 'yellow' as const, text: 'Karta w trakcie weryfikacji' }
        : latestCardStatus === 'accepted'
          ? { type: 'green' as const, text: 'Karta zaakceptowana' }
          : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {cardAlert && (
        <div
          className={`px-4 py-3 text-center font-medium ${
            cardAlert.type === 'red'
              ? 'bg-red-100 text-red-800 border-b border-red-200'
              : cardAlert.type === 'yellow'
                ? 'bg-amber-100 text-amber-800 border-b border-amber-200'
                : 'bg-green-100 text-green-800 border-b border-green-200'
          }`}
        >
          {cardAlert.text}
        </div>
      )}
      <QualificationForm
        reservationId={reservationData?.id}
        reservationData={qualificationData}
        signedPayload={qualificationCardSignedPayload ?? undefined}
        formSnapshotFromDb={formSnapshotFromDb ?? undefined}
        onSaveSuccess={() => {
          refetchFormSnapshot();
          refetchSignedDocs();
        }}
        latestCardStatusFromParent={latestCardStatus}
        latestCardSignedAtFromParent={latestCardSignedAt}
      />
    </div>
  );
}
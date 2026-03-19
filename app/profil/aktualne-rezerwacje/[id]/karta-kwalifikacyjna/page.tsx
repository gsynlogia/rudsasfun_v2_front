'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';

import { QualificationForm } from '@/components/profile/QualificationForm';
import type { ReservationData } from '@/lib/contractReservationMapping';
import { mapReservationToQualificationForm } from '@/lib/qualificationReservationMapping';
import { authService } from '@/lib/services/AuthService';

/** Z payloadu snapshotu wyciąga drugiego opiekuna (sekcjaI.drugiOpiekun) – ten sam obiekt co dla opiekun 1. */
function getSecondParentFromPayloadPage(payload: Record<string, unknown> | null | undefined): { name: string; address: string; phone: string } | null {
  if (!payload || typeof payload !== 'object') return null;
  const s1 = payload.sekcjaI as Record<string, unknown> | undefined;
  if (!s1 || typeof s1 !== 'object') return null;
  const d = s1.drugiOpiekun as Record<string, unknown> | undefined;
  if (!d || typeof d !== 'object') return null;
  const name = String(d.imieNazwisko ?? d.imionaNazwiska ?? '').trim();
  const address = String(d.adres ?? '').trim();
  const phone = String(d.telefon ?? '').trim();
  if (!name && !address && !phone) return null;
  return { name, address, phone };
}

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
  // Podpisany SMS-em payload (osobny od qualificationCardSignedPayload ktory moze miec niezweryfikowane)
  const [verifiedSignedPayload, setVerifiedSignedPayload] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Przelaczanie widoku: wersja robocza (draft) vs zatwierdzona (podpisana SMS-em)
  const [viewMode, setViewMode] = useState<'robocza' | 'zatwierdzona'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1);
      if (hash === 'wersja-zatwierdzona') return 'zatwierdzona';
    }
    return 'robocza';
  });

  const refetchReservation = useCallback(async () => {
    if (!reservationId) return;
    const token = authService.getToken();
    if (!token) return;
    const isFullNumber = reservationId.startsWith('REZ-');
    const endpoint = isFullNumber
      ? `${API_URL}/api/reservations/by-number/${reservationId}`
      : `${API_URL}/api/reservations/${reservationId}`;
    try {
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (response.ok) {
        const data = await response.json();
        setReservationData(data);
      }
    } catch { /* */ }
  }, [reservationId]);

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
      .then((docs: Array<{ document_type: string; payload?: string | null; status?: string; signed_at?: string | null; sms_verified_at?: string | null }>) => {
        const cardDocs = docs.filter((d) => d.document_type === 'qualification_card');
        // Najnowszy snapshot z payloadem i aktywnym statusem — wyświetla aktualne dane do podpisu.
        const activeStatuses = ['accepted', 'in_verification', 'requires_signature'];
        const cardDoc =
          cardDocs.find((d) => d.payload && activeStatuses.includes(d.status ?? '')) ??
          cardDocs.find((d) => d.payload) ??
          cardDocs[0];
        // Status in_verification uznajemy tylko gdy SMS zweryfikowany (sms_verified_at).
        // Bez tego karta bylaby oznaczona jako "podpisana" po samym wyslaniu kodu (przed wpisaniem).
        const docStatus = cardDoc?.status ?? null;
        if (docStatus === 'in_verification' && !cardDoc?.sms_verified_at) {
          setLatestCardStatus(null);
        } else {
          setLatestCardStatus(docStatus);
        }
        setLatestCardSignedAt(cardDoc?.signed_at ?? null);
        try {
          setQualificationCardSignedPayload(cardDoc?.payload ? JSON.parse(cardDoc.payload) : null);
        } catch {
          setQualificationCardSignedPayload(null);
        }
        // Zapisz osobno payload z podpisanego SMS-em dokumentu (do trybu "Wersja zatwierdzona")
        const verifiedDoc = cardDocs
          .filter((d) => !!d.sms_verified_at && !!d.payload)
          .sort((a, b) => (b.sms_verified_at || '').localeCompare(a.sms_verified_at || ''))[0];
        try {
          setVerifiedSignedPayload(verifiedDoc?.payload ? JSON.parse(verifiedDoc.payload) : null);
        } catch {
          setVerifiedSignedPayload(null);
        }
      })
      .catch(() => {
        setQualificationCardSignedPayload(null);
        setVerifiedSignedPayload(null);
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
      .then((docs: Array<{ document_type: string; payload?: string | null; status?: string; signed_at?: string | null; sms_verified_at?: string | null }>) => {
        const cardDocs = docs.filter((d) => d.document_type === 'qualification_card');
        const activeStatuses = ['accepted', 'in_verification', 'requires_signature'];
        const cardDoc =
          cardDocs.find((d) => d.payload && activeStatuses.includes(d.status ?? '')) ??
          cardDocs.find((d) => d.payload) ??
          cardDocs[0];
        // Status in_verification uznajemy tylko gdy SMS zweryfikowany (sms_verified_at).
        // Bez tego karta bylaby oznaczona jako "podpisana" po samym wyslaniu kodu (przed wpisaniem).
        const docStatus = cardDoc?.status ?? null;
        if (docStatus === 'in_verification' && !cardDoc?.sms_verified_at) {
          setLatestCardStatus(null);
        } else {
          setLatestCardStatus(docStatus);
        }
        setLatestCardSignedAt(cardDoc?.signed_at ?? null);
        try {
          setQualificationCardSignedPayload(cardDoc?.payload ? JSON.parse(cardDoc.payload) : null);
        } catch {
          setQualificationCardSignedPayload(null);
        }
        const verifiedDoc = cardDocs
          .filter((d) => !!d.sms_verified_at && !!d.payload)
          .sort((a, b) => (b.sms_verified_at || '').localeCompare(a.sms_verified_at || ''))[0];
        try {
          setVerifiedSignedPayload(verifiedDoc?.payload ? JSON.parse(verifiedDoc.payload) : null);
        } catch {
          setVerifiedSignedPayload(null);
        }
      })
      .catch(() => {
        setQualificationCardSignedPayload(null);
        setVerifiedSignedPayload(null);
        setLatestCardStatus(null);
        setLatestCardSignedAt(null);
      });
  }, [reservationData?.id]);

  useEffect(() => {
    refetchFormSnapshot();
  }, [refetchFormSnapshot]);

  const secondParentFromPayload = useMemo(
    () => getSecondParentFromPayloadPage(qualificationCardSignedPayload),
    [qualificationCardSignedPayload],
  );

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

  // Alert karty — logika zalezy od trybu widoku
  const getCardAlert = () => {
    if (viewMode === 'zatwierdzona') {
      return { color: 'bg-green-500', icon: 'check', text: 'Wersja zatwierdzona SMS-em', sub: 'Podgląd danych podpisanych przez opiekuna — tylko odczyt.' };
    }
    if (latestCardStatus === 'requires_signature') {
      return { color: 'bg-orange-500', icon: 'warn', text: 'Karta wymaga podpisu', sub: 'Administrator wprowadził zmiany w karcie. Proszę zweryfikować dane i podpisać ponownie.' };
    }
    if (latestCardStatus === 'rejected') {
      return { color: 'bg-red-500', icon: 'warn', text: 'Karta odrzucona', sub: 'Administrator odrzucił kartę. Proszę poprawić dane i podpisać ponownie.' };
    }
    if (latestCardStatus === 'accepted') {
      return { color: 'bg-green-500', icon: 'check', text: 'Karta zaakceptowana', sub: 'Karta została zaakceptowana przez organizatora.' };
    }
    if (latestCardStatus === 'in_verification') {
      return { color: 'bg-[#03adf0]', icon: 'info', text: 'Karta w trakcie weryfikacji', sub: 'Karta została podpisana i oczekuje na weryfikację przez organizatora.' };
    }
    return null;
  };
  const cardAlert = getCardAlert();

  return (
    <div className="min-h-screen bg-gray-50">
      {cardAlert && (
        <div className="no-print max-w-[210mm] mx-auto px-4 pt-4">
          <div className={`${cardAlert.color} p-3 rounded-xl`}>
            <div className="flex items-center gap-3">
              {cardAlert.icon === 'check' ? (
                <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : cardAlert.icon === 'info' ? (
                <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{cardAlert.text}</p>
                <p className="text-xs text-white/80 mt-0.5">{cardAlert.sub}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <QualificationForm
        key={viewMode}
        reservationId={reservationData?.id}
        reservationData={qualificationData}
        signedPayload={viewMode === 'zatwierdzona' ? verifiedSignedPayload ?? undefined : qualificationCardSignedPayload ?? undefined}
        secondParentFromPayload={viewMode === 'zatwierdzona'
          ? getSecondParentFromPayloadPage(verifiedSignedPayload)
          : (getSecondParentFromPayloadPage(formSnapshotFromDb) ?? secondParentFromPayload)
        }
        formSnapshotFromDb={viewMode === 'zatwierdzona' ? undefined : formSnapshotFromDb ?? undefined}
        printMode={false}
        onSaveSuccess={() => {
          refetchFormSnapshot();
          refetchSignedDocs();
          refetchReservation();
        }}
        latestCardStatusFromParent={viewMode === 'zatwierdzona' ? 'accepted' : latestCardStatus}
        latestCardSignedAtFromParent={latestCardSignedAt}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          if (typeof window !== 'undefined') window.history.replaceState(null, '', `${window.location.pathname}#wersja-${mode}`);
        }}
        hasVerifiedVersion={!!verifiedSignedPayload}
      />
    </div>
  );
}
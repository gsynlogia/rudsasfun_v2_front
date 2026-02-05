'use client';

import { useParams } from 'next/navigation';

import { QualificationForm } from '@/components/profile/QualificationForm';

/**
 * Qualification Card Page
 * Route: /profil/aktualne-rezerwacje/[id]/karta-kwalifikacyjna
 * Renders the qualification card form for a specific reservation
 */
export default function QualificationCardPage() {
  const params = useParams();
  const reservationId = params?.id ? String(params.id) : '';

  // TODO: W przyszłości - pobieranie danych rezerwacji z API i przekazanie do QualificationForm
  // const [reservationData, setReservationData] = useState(null);
  // useEffect(() => { fetch reservation data }, [reservationId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <QualificationForm 
        reservationData={{
          reservationId: reservationId
          // Inne dane będą pobierane z API w przyszłości
        }}
      />
    </div>
  );
}

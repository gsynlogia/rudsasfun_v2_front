'use client';

import { useParams } from 'next/navigation';

import { AuthorizationForm } from '@/components/profile/AuthorizationForm';

/**
 * Authorization Page
 * Route: /profil/aktualne-rezerwacje/[id]/upowaznienia
 * Renders the authorization form for a specific reservation
 */
export default function AuthorizationPage() {
  const params = useParams();
  const reservationId = params?.id ? String(params.id) : '';

  // TODO: W przyszłości - pobieranie danych rezerwacji z API i przekazanie do AuthorizationForm
  // const [reservationData, setReservationData] = useState(null);
  // useEffect(() => { fetch reservation data }, [reservationId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthorizationForm 
        reservationData={{
          reservationId: reservationId,
          parentPhone: '+48 724680812' // TODO: pobierać z API
        }}
      />
    </div>
  );
}

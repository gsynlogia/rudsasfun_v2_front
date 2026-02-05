'use client';

import { useParams } from 'next/navigation';

import { ContractForm } from '@/components/profile/ContractForm';

/**
 * Contract Page
 * Route: /profil/aktualne-rezerwacje/[id]/umowa
 * Renders the contract form for a specific reservation
 */
export default function ContractPage() {
  const params = useParams();
  const reservationId = params?.id ? String(params.id) : '';

  // TODO: W przyszłości - pobieranie danych rezerwacji z API i przekazanie do ContractForm
  // const [reservationData, setReservationData] = useState(null);
  // useEffect(() => { fetch reservation data }, [reservationId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractForm 
        reservationData={{
          reservationNumber: reservationId.startsWith('REZ-') ? reservationId : `REZ-2026-${reservationId}`
        }}
      />
    </div>
  );
}

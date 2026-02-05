'use client';

import { useParams } from 'next/navigation';
import { ContractForm } from '@/components/profile/ContractForm';

/**
 * Print Contract Page
 * Route: /druk/umowa/[id]
 * Renders ONLY the contract form for printing - no layout, no navbar, no sidebar
 */
export default function PrintContractPage() {
  const params = useParams();
  const reservationId = params?.id ? String(params.id) : '';

  return (
    <ContractForm 
      reservationData={{
        reservationNumber: reservationId.startsWith('REZ-') ? reservationId : `REZ-2026-${reservationId}`
      }}
      printMode={true}
    />
  );
}

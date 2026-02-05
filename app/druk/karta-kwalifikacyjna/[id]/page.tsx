'use client';

import { useParams } from 'next/navigation';
import { QualificationForm } from '@/components/profile/QualificationForm';

/**
 * Print Qualification Card Page
 * Route: /druk/karta-kwalifikacyjna/[id]
 * Renders ONLY the qualification card form for printing - no layout, no navbar, no sidebar
 */
export default function PrintQualificationCardPage() {
  const params = useParams();
  const reservationId = params?.id ? String(params.id) : '';

  return (
    <QualificationForm 
      reservationData={{
        // TODO: fetch actual reservation data from API
      }}
      printMode={true}
    />
  );
}

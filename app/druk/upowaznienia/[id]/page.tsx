'use client';

import { useParams } from 'next/navigation';

import { AuthorizationForm } from '@/components/profile/AuthorizationForm';

/**
 * Print Authorization Page
 * Route: /druk/upowaznienia/[id]
 * Renders ONLY the authorization form for printing - no layout, no navbar, no sidebar
 */
export default function PrintAuthorizationPage() {
  const params = useParams();
  const _reservationId = params?.id ? String(params.id) : '';

  return (
    <AuthorizationForm
      reservationData={{
        parentPhone: '+48 724680812', // TODO: fetch from API
      }}
      printMode={true}
    />
  );
}
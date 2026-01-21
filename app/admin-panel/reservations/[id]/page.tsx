'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';

/**
 * Reservation Details Page
 * Route: /admin-panel/reservations/[id]
 *
 * Displays reservation details - redirects to edit page for now
 */
export default function ReservationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const reservationId = params.id as string;

  useEffect(() => {
    // Redirect to edit page
    if (reservationId) {
      router.push(`/admin-panel/reservations/${reservationId}/edit`);
    } else {
      router.push('/admin-panel/reservations');
    }
  }, [reservationId, router]);

  return (
    <AdminLayout>
      <div className="p-6">
        <p>Przekierowywanie...</p>
      </div>
    </AdminLayout>
  );
}
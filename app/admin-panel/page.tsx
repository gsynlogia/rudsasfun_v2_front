'use client';

import { Suspense } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import ReservationsTable from '@/components/admin/ReservationsTable';
import SectionGuard from '@/components/admin/SectionGuard';

/**
 * Admin Panel Main Page
 * Route: /admin-panel
 *
 * Displays reservations table
 */
function ReservationsTableWrapper() {
  return <ReservationsTable />;
}

export default function AdminPanelPage() {
  return (
    <SectionGuard section="reservations">
      <AdminLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
              <div className="text-gray-500">Ładowanie...</div>
            </div>
          </div>
        }>
          <ReservationsTableWrapper />
        </Suspense>
      </AdminLayout>
    </SectionGuard>
  );
}

'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import ReservationsTable from '@/components/admin/ReservationsTable';
import SectionGuard from '@/components/admin/SectionGuard';

/**
 * Admin Panel Main Page
 * Route: /admin-panel
 *
 * Displays reservations table
 */
export default function AdminPanelPage() {
  return (
    <SectionGuard section="reservations">
      <AdminLayout>
        <ReservationsTable />
      </AdminLayout>
    </SectionGuard>
  );
}

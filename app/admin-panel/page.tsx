'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import ReservationsManagement from '@/components/admin/ReservationsManagement';
import SectionGuard from '@/components/admin/SectionGuard';

/**
 * Admin Panel Main Page
 * Route: /admin-panel
 *
 * Displays reservations management
 */
export default function AdminPanelPage() {
  return (
    <SectionGuard section="reservations">
      <AdminLayout>
        <ReservationsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}

import AdminLayout from '@/components/admin/AdminLayout';
import ReservationsManagement from '@/components/admin/ReservationsManagement';

/**
 * Admin Panel - Reservations Page
 * Route: /admin-panel/reservations
 *
 * Displays hardcoded sample reservations
 */
export const dynamic = 'force-dynamic';

export default function ReservationsPage() {
  return (
    <AdminLayout>
      <ReservationsManagement />
    </AdminLayout>
  );
}
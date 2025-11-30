import AdminLayout from '@/components/admin/AdminLayout';
import PaymentsManagement from '@/components/admin/PaymentsManagement';

/**
 * Admin Panel - Payments Page
 * Route: /admin-panel/payments
 * 
 * Displays payments management with detailed payment verification
 */
export const dynamic = 'force-dynamic';

export default function PaymentsPage() {
  return (
    <AdminLayout>
      <PaymentsManagement />
    </AdminLayout>
  );
}


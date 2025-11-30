'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import PaymentsManagement from '@/components/admin/PaymentsManagement';
import SectionGuard from '@/components/admin/SectionGuard';

/**
 * Admin Panel - Payments Page
 * Route: /admin-panel/payments
 * 
 * Displays payments management with detailed payment verification
 */
export default function PaymentsPage() {
  return (
    <SectionGuard section="payments">
      <AdminLayout>
        <PaymentsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}


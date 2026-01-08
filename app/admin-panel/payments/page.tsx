'use client';

import { Suspense } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import PaymentsManagement from '@/components/admin/PaymentsManagement';
import SectionGuard from '@/components/admin/SectionGuard';

/**
 * Admin Panel - Payments Page
 * Route: /admin-panel/payments
 *
 * Displays payments management with detailed payment verification
 */
function PaymentsManagementWrapper() {
  return <PaymentsManagement />;
}

export default function PaymentsPage() {
  return (
    <SectionGuard section="payments">
      <AdminLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
              <div className="text-gray-500">Ładowanie...</div>
            </div>
          </div>
        }>
          <PaymentsManagementWrapper />
        </Suspense>
      </AdminLayout>
    </SectionGuard>
  );
}


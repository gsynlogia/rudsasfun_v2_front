'use client';

import { Suspense } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import ReservationsTableNew from '@/components/admin/ReservationsTableNew';
import SectionGuard from '@/components/admin/SectionGuard';

/**
 * Admin Panel - Payments Page
 * Route: /admin-panel/payments
 *
 * Ta sama tabela co /admin-panel; filtry i wyszukiwarka identyczne.
 * Klik wiersza prowadzi do szczegółów płatności rezerwacji (/admin-panel/rezerwacja/[id]/payments).
 */
function PaymentsTableWrapper() {
  return <ReservationsTableNew detailTarget="payment" tableModule="payments" />;
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
          <PaymentsTableWrapper />
        </Suspense>
      </AdminLayout>
    </SectionGuard>
  );
}
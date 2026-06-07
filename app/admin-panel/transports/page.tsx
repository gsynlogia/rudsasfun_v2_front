'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import TransportsManagement from '@/components/admin/TransportsManagement';

export default function TransportsPage() {
  return (
    <SectionGuard section="transports">
      <AdminLayout>
        <TransportsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}
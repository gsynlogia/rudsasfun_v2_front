'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import TransportsManagement from '@/components/admin/TransportsManagement';
import SectionGuard from '@/components/admin/SectionGuard';

export default function TransportsPage() {
  return (
    <SectionGuard section="transports">
      <AdminLayout>
        <TransportsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}


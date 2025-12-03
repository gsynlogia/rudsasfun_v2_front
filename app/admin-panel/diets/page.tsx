'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import DietsManagement from '@/components/admin/DietsManagement';
import SectionGuard from '@/components/admin/SectionGuard';

export default function DietsPage() {
  return (
    <SectionGuard section="diets">
      <AdminLayout>
        <DietsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}


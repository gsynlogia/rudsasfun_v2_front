'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import GeneralDietsManagement from '@/components/admin/GeneralDietsManagement';
import SectionGuard from '@/components/admin/SectionGuard';

export default function GeneralDietsPage() {
  return (
    <SectionGuard section="diets">
      <AdminLayout>
        <GeneralDietsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}








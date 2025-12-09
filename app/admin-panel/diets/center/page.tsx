'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import CenterDietsManagement from '@/components/admin/CenterDietsManagement';
import SectionGuard from '@/components/admin/SectionGuard';

export default function CenterDietsPage() {
  return (
    <SectionGuard section="diets">
      <AdminLayout>
        <CenterDietsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}








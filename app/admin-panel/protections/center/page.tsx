'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import CenterProtectionsManagement from '@/components/admin/CenterProtectionsManagement';
import SectionGuard from '@/components/admin/SectionGuard';

export default function CenterProtectionsPage() {
  return (
    <SectionGuard section="protections">
      <AdminLayout>
        <CenterProtectionsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}


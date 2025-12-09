'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import CenterProtectionsManagement from '@/components/admin/CenterProtectionsManagement';

export default function CenterProtectionsPage() {
  return (
    <SectionGuard section="protections">
      <AdminLayout>
        <CenterProtectionsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}


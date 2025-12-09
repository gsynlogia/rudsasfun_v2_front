'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import GeneralProtectionsManagement from '@/components/admin/GeneralProtectionsManagement';

export default function GeneralProtectionsPage() {
  return (
    <SectionGuard section="protections">
      <AdminLayout>
        <GeneralProtectionsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}


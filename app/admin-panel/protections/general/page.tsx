'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import GeneralProtectionsManagement from '@/components/admin/GeneralProtectionsManagement';
import SectionGuard from '@/components/admin/SectionGuard';

export default function GeneralProtectionsPage() {
  return (
    <SectionGuard section="protections">
      <AdminLayout>
        <GeneralProtectionsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}
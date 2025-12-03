'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import SourcesManagement from '@/components/admin/SourcesManagement';
import SectionGuard from '@/components/admin/SectionGuard';

export default function SourceManagementPage() {
  return (
    <SectionGuard section="sources">
      <AdminLayout>
        <SourcesManagement />
      </AdminLayout>
    </SectionGuard>
  );
}


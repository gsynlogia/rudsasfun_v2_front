'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import SourcesManagement from '@/components/admin/SourcesManagement';

export default function SourcesPage() {
  return (
    <SectionGuard section="sources">
      <AdminLayout>
        <SourcesManagement />
      </AdminLayout>
    </SectionGuard>
  );
}


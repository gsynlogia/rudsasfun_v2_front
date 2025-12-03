'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import SectionGuard from '@/components/admin/SectionGuard';
import DocumentsManagement from '@/components/admin/DocumentsManagement';

export default function DocumentsPage() {
  return (
    <SectionGuard section="cms">
      <AdminLayout>
        <DocumentsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}


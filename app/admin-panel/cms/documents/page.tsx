'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import DocumentsManagement from '@/components/admin/DocumentsManagement';
import SectionGuard from '@/components/admin/SectionGuard';

export default function DocumentsPage() {
  return (
    <SectionGuard section="cms">
      <AdminLayout>
        <DocumentsManagement />
      </AdminLayout>
    </SectionGuard>
  );
}


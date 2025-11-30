'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import CampsManagementTable from '@/components/admin/CampsManagementTable';
import SectionGuard from '@/components/admin/SectionGuard';

/**
 * Admin Panel - Camps Page
 * Route: /admin-panel/camps
 * 
 * Displays camps management table
 */
export default function CampsPage() {
  return (
    <SectionGuard section="camps">
      <AdminLayout>
        <CampsManagementTable />
      </AdminLayout>
    </SectionGuard>
  );
}


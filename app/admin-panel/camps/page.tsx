'use client';

import { Suspense } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import CampsManagementTable from '@/components/admin/CampsManagementTable';
import SectionGuard from '@/components/admin/SectionGuard';

/**
 * Admin Panel - Camps Page
 * Route: /admin-panel/camps
 *
 * Displays camps management table
 */
function CampsManagementTableWrapper() {
  return <CampsManagementTable />;
}

export default function CampsPage() {
  return (
    <SectionGuard section="camps">
      <AdminLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
              <div className="text-gray-500">Ładowanie...</div>
            </div>
          </div>
        }>
          <CampsManagementTableWrapper />
        </Suspense>
      </AdminLayout>
    </SectionGuard>
  );
}
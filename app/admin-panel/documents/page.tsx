'use client';

import { Suspense } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import DocumentsOverviewTable from '@/components/admin/DocumentsOverviewTable';
import SectionGuard from '@/components/admin/SectionGuard';

/**
 * Admin Panel — strona "Dokumenty"
 * Route: /admin-panel/documents
 *
 * Lista wszystkich rezerwacji ze statusem umowy i karty kwalifikacyjnej + akcje
 * przypomnienia (email / SMS / email+SMS) per row.
 *
 * Backend: REUSE GET /api/reservations/paginated + POST /api/reservations/by-number/{N}/remind-sign.
 * SectionGuard: admin (groups.admin) automatycznie ma dostęp; pozostali wymagają
 * `documents` w user.accessible_sections (backend permissions — poza zakresem tego zadania).
 */
export default function DocumentsPage() {
  return (
    <SectionGuard section="documents">
      <AdminLayout>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03adf0] mb-4"></div>
                <div className="text-gray-500">Ładowanie...</div>
              </div>
            </div>
          }
        >
          <DocumentsOverviewTable />
        </Suspense>
      </AdminLayout>
    </SectionGuard>
  );
}

import AdminLayout from '@/components/admin/AdminLayout';
import CampsManagementTable from '@/components/admin/CampsManagementTable';

/**
 * Admin Panel - Camps Page
 * Route: /admin-panel/camps
 * 
 * Displays camps management table
 */
export const dynamic = 'force-dynamic';

export default function CampsPage() {
  return (
    <AdminLayout>
      <CampsManagementTable />
    </AdminLayout>
  );
}


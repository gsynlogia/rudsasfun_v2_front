import AdminLayout from '@/components/admin/AdminLayout';
import ReservationsManagement from '@/components/admin/ReservationsManagement';

/**
 * Admin Panel Main Page
 * Route: /admin-panel
 * 
 * This is a Server Component
 * Future: Will include authentication/authorization checks here
 */
export const dynamic = 'force-dynamic';

export default function AdminPanelPage() {
  // Future: Add authentication check here
  // if (!isAuthenticated || !isAdmin) {
  //   redirect('/login');
  // }
  
  return (
    <AdminLayout>
      <ReservationsManagement />
    </AdminLayout>
  );
}

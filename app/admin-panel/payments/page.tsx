import AdminLayout from '@/components/admin/AdminLayout';

/**
 * Admin Panel - Payments Page
 * Route: /admin-panel/payments
 * 
 * Placeholder for payments management
 */
export const dynamic = 'force-dynamic';

export default function PaymentsPage() {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Płatności</h1>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Funkcjonalność płatności będzie tutaj...</p>
        </div>
      </div>
    </AdminLayout>
  );
}


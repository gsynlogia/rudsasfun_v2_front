import AdminLayout from '@/components/admin/AdminLayout';

/**
 * Admin Panel - Settings Page
 * Route: /admin-panel/settings
 * 
 * Placeholder for settings management
 */
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Ustawienia</h1>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Funkcjonalność ustawień będzie tutaj...</p>
        </div>
      </div>
    </AdminLayout>
  );
}


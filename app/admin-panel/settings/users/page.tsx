'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import AdminLayout from '@/components/admin/AdminLayout';
import UsersManagement from '@/components/admin/UsersManagement';

/**
 * Admin Panel - Settings Users Page
 * Route: /admin-panel/settings/users
 *
 * Users management page with back button to settings
 */
export default function SettingsUsersPage() {
  return (
    <AdminLayout>
      <div className="w-full">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link
            href="/admin-panel/settings"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Powrót do ustawień</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Użytkownicy</h1>
        </div>

        {/* Users Management */}
        <UsersManagement />
      </div>
    </AdminLayout>
  );
}

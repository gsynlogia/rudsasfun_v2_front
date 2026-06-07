'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import AdminLayout from '@/components/admin/AdminLayout';
import AdminUsersManagement from '@/components/admin/AdminUsersManagement';

/**
 * Admin Panel - Settings Admin Users Page
 * Route: /admin-panel/settings/users/admins
 *
 * System administrator users management page (admin_users table)
 */
export default function SettingsAdminUsersPage() {
  return (
    <AdminLayout>
      <div className="w-full">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link
            href="/admin-panel/settings/users"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Powrót do użytkowników</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Użytkownicy systemu</h1>
          <p className="text-gray-600 text-sm">Zarządzaj kontami administratorów i operatorów panelu administracyjnego</p>
        </div>

        {/* Admin Users Management */}
        <AdminUsersManagement />
      </div>
    </AdminLayout>
  );
}